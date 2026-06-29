/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  DieGeometry,
  geometries,
  getRotationMatrix,
  rotateVector,
  getTopFaceValue,
  dotProduct,
  normalize
} from '../utils/diceGeometries';
import { diceAudio } from '../utils/audio';

export interface DieState {
  id: number;
  type: 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20';
  size: 'small' | 'large';
  radius: number;
  mass: number;
  colorName: string;
  colorBase: string;
  colorLight: string;
  colorDark: string;
  textColor: string;
  
  // Physics 2D
  x: number;
  y: number;
  vx: number;
  vy: number;
  
  // Rotation 3D
  rx: number;
  ry: number;
  rz: number;
  drx: number;
  dry: number;
  drz: number;
  
  currentValue: number;
}

interface DiceCanvasProps {
  dice: DieState[];
  isRolling: boolean;
  isMasked: boolean;
  onDiceUpdate: (updatedDice: DieState[]) => void;
  onRollingSettled: () => void;
  shakeForce: { x: number; y: number }; // Injected from shake detection
}

export const DiceCanvas: React.FC<DiceCanvasProps> = ({
  dice,
  isRolling,
  isMasked,
  onDiceUpdate,
  onRollingSettled,
  shakeForce,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const diceRef = useRef<DieState[]>([]);
  const isRollingRef = useRef<boolean>(false);
  const lastSoundTimes = useRef<Record<string, number>>({});

  // Synchronize prop state with ref for animation loop
  useEffect(() => {
    // If the dice positions in prop are different or we started a roll, sync
    if (isRolling && !isRollingRef.current) {
      // Triggering a fresh roll! Give them random positions and high velocity
      const w = dimensions.width;
      const h = dimensions.height;
      const updated = dice.map((d) => {
        // Distribute them nicely around the edges or scattered
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 80 + 100;
        const x = w / 2 + Math.cos(angle) * dist;
        const y = h / 2 + Math.sin(angle) * dist;
        
        // Throw towards center with high velocity + random spin
        const speed = 14 + Math.random() * 12;
        const toCenterAngle = Math.atan2(h / 2 - y, w / 2 - x) + (Math.random() * 0.4 - 0.2);
        
        return {
          ...d,
          x,
          y,
          vx: Math.cos(toCenterAngle) * speed,
          vy: Math.sin(toCenterAngle) * speed,
          rx: Math.random() * Math.PI * 2,
          ry: Math.random() * Math.PI * 2,
          rz: Math.random() * Math.PI * 2,
          drx: (Math.random() * 2 - 1) * 0.4,
          dry: (Math.random() * 2 - 1) * 0.4,
          drz: (Math.random() * 2 - 1) * 0.4,
        };
      });
      diceRef.current = updated;
    } else if (diceRef.current.length === 0 || (!isRolling && diceRef.current.some(d => d.vx !== 0))) {
      // Direct update of dice array when idle
      diceRef.current = JSON.parse(JSON.stringify(dice));
    }
    isRollingRef.current = isRolling;
  }, [dice, isRolling, dimensions]);

  // Handle Resize of the container
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = Math.max(width, 300);
        const h = Math.max(height, 350);
        setDimensions({ width: w, height: h });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Main animation loop
  useEffect(() => {
    let animationId: number;
    let settledTimer: number | null = null;

    const updatePhysics = () => {
      const currentDice = diceRef.current;
      if (currentDice.length === 0) return;

      const friction = 0.985; // Damping factor
      const angularFriction = 0.98;
      const bounceRestitution = 0.65; // Bounciness against walls
      const stopThreshold = 0.08;
      const angularStopThreshold = 0.005;

      const w = dimensions.width;
      const h = dimensions.height;
      const borderPadding = 12; // Wall offset

      // Apply shake forces if any
      if (shakeForce.x !== 0 || shakeForce.y !== 0) {
        currentDice.forEach((d) => {
          d.vx += shakeForce.x * (1 / d.mass) * 0.3;
          d.vy += shakeForce.y * (1 / d.mass) * 0.3;
          // Add some spin from shake
          d.drx += (Math.random() * 2 - 1) * 0.05;
          d.dry += (Math.random() * 2 - 1) * 0.05;
          d.drz += (Math.random() * 2 - 1) * 0.05;
        });
      }

      // 1. Position & Angular Updates + Wall Collisions
      currentDice.forEach((d) => {
        // Move
        d.x += d.vx;
        d.y += d.vy;

        // Rotate 3D
        d.rx += d.drx;
        d.ry += d.dry;
        d.rz += d.drz;

        // Apply friction
        d.vx *= friction;
        d.vy *= friction;

        // Align rx and ry to nearest multiple of Math.PI / 2 when slowing down or stopped,
        // so that the die lands perfectly flat (top-down view only)
        const linearSpeed = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
        if (linearSpeed < 3.0 && linearSpeed > 0) {
          const targetRx = Math.round(d.rx / (Math.PI / 2)) * (Math.PI / 2);
          const targetRy = Math.round(d.ry / (Math.PI / 2)) * (Math.PI / 2);
          
          // Smoothly attract rx, ry to flat alignment
          d.rx += (targetRx - d.rx) * 0.18;
          d.ry += (targetRy - d.ry) * 0.18;
          
          // Suppress angular velocity on X and Y to stabilize the landing flat
          d.drx *= 0.82;
          d.dry *= 0.82;
        } else if (linearSpeed === 0) {
          const targetRx = Math.round(d.rx / (Math.PI / 2)) * (Math.PI / 2);
          const targetRy = Math.round(d.ry / (Math.PI / 2)) * (Math.PI / 2);
          d.rx = targetRx;
          d.ry = targetRy;
          d.drx = 0;
          d.dry = 0;
        }

        d.drx *= angularFriction;
        d.dry *= angularFriction;
        d.drz *= angularFriction;

        // Stop if too slow
        if (Math.abs(d.vx) < stopThreshold) d.vx = 0;
        if (Math.abs(d.vy) < stopThreshold) d.vy = 0;
        if (Math.abs(d.drx) < angularStopThreshold) d.drx = 0;
        if (Math.abs(d.dry) < angularStopThreshold) d.dry = 0;
        if (Math.abs(d.drz) < angularStopThreshold) d.drz = 0;

        // Wall collisions (Left & Right)
        if (d.x - d.radius < borderPadding) {
          d.x = borderPadding + d.radius;
          const impact = Math.abs(d.vx);
          d.vx = -d.vx * bounceRestitution;
          d.drz += d.vy * 0.01; // Spin on wall friction
          if (impact > 1.5) playSound('wall', d.id, impact / 15);
        } else if (d.x + d.radius > w - borderPadding) {
          d.x = w - borderPadding - d.radius;
          const impact = Math.abs(d.vx);
          d.vx = -d.vx * bounceRestitution;
          d.drz -= d.vy * 0.01;
          if (impact > 1.5) playSound('wall', d.id, impact / 15);
        }

        // Wall collisions (Top & Bottom)
        if (d.y - d.radius < borderPadding) {
          d.y = borderPadding + d.radius;
          const impact = Math.abs(d.vy);
          d.vy = -d.vy * bounceRestitution;
          d.drx += d.vx * 0.01;
          if (impact > 1.5) playSound('wall', d.id, impact / 15);
        } else if (d.y + d.radius > h - borderPadding) {
          d.y = h - borderPadding - d.radius;
          const impact = Math.abs(d.vy);
          d.vy = -d.vy * bounceRestitution;
          d.drx -= d.vx * 0.01;
          if (impact > 1.5) playSound('wall', d.id, impact / 15);
        }
      });

      // 2. Dice-to-Dice Collisions (Double loop)
      for (let i = 0; i < currentDice.length; i++) {
        for (let j = i + 1; j < currentDice.length; j++) {
          const d1 = currentDice[i];
          const d2 = currentDice[j];

          const dx = d2.x - d1.x;
          const dy = d2.y - d1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = d1.radius + d2.radius;

          if (dist < minDist) {
            // Overlap detected!
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            // Separate bodies based on inverse mass
            const totalMass = d1.mass + d2.mass;
            d1.x -= nx * overlap * (d2.mass / totalMass);
            d1.y -= ny * overlap * (d2.mass / totalMass);
            d2.x += nx * overlap * (d1.mass / totalMass);
            d2.y += ny * overlap * (d1.mass / totalMass);

            // Relative velocity
            const rvx = d2.vx - d1.vx;
            const rvy = d2.vy - d1.vy;

            // Relative velocity along collision normal
            const velAlongNormal = rvx * nx + rvy * ny;

            // Do not resolve if velocities are separating
            if (velAlongNormal < 0) {
              const restitution = 0.6; // Bounciness between dice
              const impulseScalar = -(1 + restitution) * velAlongNormal / (1 / d1.mass + 1 / d2.mass);

              // Apply impulse
              d1.vx -= nx * (impulseScalar / d1.mass);
              d1.vy -= ny * (impulseScalar / d1.mass);
              d2.vx += nx * (impulseScalar / d2.mass);
              d2.vy += ny * (impulseScalar / d2.mass);

              // Transfer linear speed to angular spin (friction of impact)
              const tangentX = -ny;
              const tangentY = nx;
              const velAlongTangent = rvx * tangentX + rvy * tangentY;
              const frictionScalar = velAlongTangent * 0.01;
              d1.drz += frictionScalar * (d2.mass / totalMass);
              d2.drz -= frictionScalar * (d1.mass / totalMass);
              d1.drx += (Math.random() - 0.5) * 0.05;
              d2.dry += (Math.random() - 0.5) * 0.05;

              // Play collision sound
              const impactSpeed = Math.abs(velAlongNormal);
              if (impactSpeed > 0.8) {
                playSound(`dice_${d1.id}_${d2.id}`, d1.id, impactSpeed / 12);
              }
            }
          }
        }
      }

      // 3. Compute top values based on latest orientations
      currentDice.forEach((d) => {
        const R = getRotationMatrix(d.rx, d.ry, d.rz);
        const geom = geometries[d.type]();
        d.currentValue = getTopFaceValue(geom, R);
      });

      // 4. Check if settled (all dice speeds are 0)
      const allSettled = currentDice.every((d) => d.vx === 0 && d.vy === 0);
      if (allSettled && isRollingRef.current) {
        // Trigger settled callback after a tiny lag to ensure stability
        if (settledTimer === null) {
          settledTimer = window.setTimeout(() => {
            onRollingSettled();
            settledTimer = null;
          }, 400);
        }
      } else {
        if (settledTimer !== null) {
          clearTimeout(settledTimer);
          settledTimer = null;
        }
      }

      // Propagate state changes to React
      onDiceUpdate([...currentDice]);
    };

    // Throttle sound synthesis to avoid overlapping clicking overload
    const playSound = (soundId: string, dieId: number, intensity: number) => {
      const now = performance.now();
      const lastTime = lastSoundTimes.current[soundId] || 0;
      // Allow the same collision type only every 60ms to keep audio clean and crisp
      if (now - lastTime > 60) {
        lastSoundTimes.current[soundId] = now;
        if (soundId.startsWith('wall')) {
          diceAudio.playWallCollision(intensity);
        } else {
          diceAudio.playDiceCollision(intensity);
        }
      }
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear Canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // 1. Draw Arena Felt background (Vibrant Emerald felt)
      const grad = ctx.createRadialGradient(
        dimensions.width / 2,
        dimensions.height / 2,
        50,
        dimensions.width / 2,
        dimensions.height / 2,
        Math.max(dimensions.width, dimensions.height) * 0.7
      );
      grad.addColorStop(0, '#064e3b'); // Rich bright emerald green center
      grad.addColorStop(1, '#022c22'); // Deep rich dark emerald margins
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Sleek internal accent line
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.15)'; // Emerald highlight stroke
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, dimensions.width - 8, dimensions.height - 8);

      const currentDice = diceRef.current;

      // 2. Draw Soft 3D Shadow under all dice FIRST (for realistic depth layering)
      currentDice.forEach((d) => {
        ctx.save();
        ctx.translate(d.x + 3, d.y + 6); // Offset shadow down-right
        ctx.beginPath();
        // Blur shadow slightly based on whether it is moving fast (pseudo-height)
        const speed = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
        const shadowBlur = Math.min(speed * 0.4, 5);
        ctx.filter = `blur(${3 + shadowBlur}px)`;
        ctx.ellipse(0, 0, d.radius * 0.95, d.radius * 0.95, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fill();
        ctx.restore();
      });

      // 3. Draw Each 3D projected Die
      currentDice.forEach((d) => {
        ctx.save();
        ctx.translate(d.x, d.y);

        // Precalculate rotation matrix and geometry vertices
        const R = getRotationMatrix(d.rx, d.ry, d.rz);
        const geom = geometries[d.type]();

        // Project vertices in 3D
        const projectedVertices = geom.vertices.map((v) => {
          const rotated = rotateVector(v, R);
          return {
            x: rotated.x * d.radius,
            y: -rotated.y * d.radius, // Invert Y because canvas coordinates go down
            z: rotated.z,
          };
        });

        // Setup Virtual Lighting direction (from top-left, slightly in front)
        const L = normalize({ x: -1, y: 1, z: 1.5 });

        // Separate and sort/filter faces
        const visibleFaces = geom.faces
          .map((face) => {
            if (!face.normal) return null;
            const rotatedNormal = rotateVector(face.normal, R);
            
            // Back-face culling: if normal points away from viewer (rotatedNormal.z <= 0), cull it!
            if (rotatedNormal.z <= 0) return null;

            // Compute face centroid for depth rendering/sorting if needed (for non-convexities, but convex works with normal check)
            let sumZ = 0;
            face.indices.forEach((idx) => {
              sumZ += projectedVertices[idx].z;
            });
            const avgZ = sumZ / face.indices.length;

            return {
              face,
              normal: rotatedNormal,
              avgZ,
            };
          })
          .filter((f): f is Exclude<typeof f, null> => f !== null);

        // Render visible faces
        visibleFaces.forEach(({ face, normal }) => {
          // 1. Shading: Lambertian Cosine Shading with subtle ambient highlight
          const lightFactor = dotProduct(normal, L);
          const intensity = 0.35 + 0.65 * Math.max(0, lightFactor);

          // Render face path
          ctx.beginPath();
          const firstIdx = face.indices[0];
          ctx.moveTo(projectedVertices[firstIdx].x, projectedVertices[firstIdx].y);
          for (let k = 1; k < face.indices.length; k++) {
            const idx = face.indices[k];
            ctx.lineTo(projectedVertices[idx].x, projectedVertices[idx].y);
          }
          ctx.closePath();

          // Hex to RGB shading interpolation
          const rgb = hexToRgb(d.colorBase);
          if (rgb) {
            const r = Math.round(rgb.r * intensity);
            const g = Math.round(rgb.g * intensity);
            const b = Math.round(rgb.b * intensity);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          } else {
            ctx.fillStyle = d.colorBase;
          }
          ctx.fill();

          // Stroke face edges for a sharp 3D look
          ctx.strokeStyle = d.colorLight + '44'; // Slightly transparent highlights
          ctx.lineWidth = d.size === 'large' ? 1.5 : 1.0;
          ctx.stroke();

          // 2. Render Dice Pips on face (realistic dots)
          // Calculate face centroid in 2D
          let sumX = 0;
          let sumY = 0;
          face.indices.forEach((idx) => {
            sumX += projectedVertices[idx].x;
            sumY += projectedVertices[idx].y;
          });
          const cx = sumX / face.indices.length;
          const cy = sumY / face.indices.length;

          // Draw the pips if the face is visible and aligned with the viewer
          const faceViewerAlignment = normal.z; // Ranges from 0 to 1 (perfectly facing us)
          
          if (faceViewerAlignment > 0.35) {
            ctx.save();
            ctx.translate(cx, cy);

            // Scale based on tilted normal for perspective effect
            ctx.scale(faceViewerAlignment, faceViewerAlignment);

            // Calculate rotation angle to align pips with the face edges
            const dx0 = projectedVertices[face.indices[0]].x - cx;
            const dy0 = projectedVertices[face.indices[0]].y - cy;
            const angle = Math.atan2(dy0, dx0);
            
            // Rotate the context so X and Y align with the square edges of the D6
            ctx.rotate(angle - Math.PI / 4);

            // Styling for pips
            ctx.fillStyle = d.textColor;
            ctx.globalAlpha = Math.min(1.0, (faceViewerAlignment - 0.2) * 1.5);

            // Face half-side 'a' and pip spacing parameters
            const a = d.radius * 0.55;
            const rPip = a * 0.16; // Perfectly sized pip radius
            const dist = a * 0.5;  // Spacing distance from center
            
            const value = face.value;

            // Helper to draw a single pip
            const drawPip = (px: number, py: number) => {
              ctx.beginPath();
              ctx.arc(px, py, rPip, 0, Math.PI * 2);
              ctx.fill();
            };

            // Standard D6 pip layouts
            if (value === 1) {
              drawPip(0, 0);
            } else if (value === 2) {
              drawPip(-dist, -dist);
              drawPip(dist, dist);
            } else if (value === 3) {
              drawPip(-dist, -dist);
              drawPip(0, 0);
              drawPip(dist, dist);
            } else if (value === 4) {
              drawPip(-dist, -dist);
              drawPip(dist, -dist);
              drawPip(-dist, dist);
              drawPip(dist, dist);
            } else if (value === 5) {
              drawPip(-dist, -dist);
              drawPip(dist, -dist);
              drawPip(0, 0);
              drawPip(-dist, dist);
              drawPip(dist, dist);
            } else if (value === 6) {
              drawPip(-dist, -dist);
              drawPip(dist, -dist);
              drawPip(-dist, 0);
              drawPip(dist, 0);
              drawPip(-dist, dist);
              drawPip(dist, dist);
            }

            ctx.restore();
          }
        });

        ctx.restore();
      });
    };

    const loop = () => {
      updatePhysics();
      draw();
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
      if (settledTimer !== null) clearTimeout(settledTimer);
    };
  }, [dimensions, shakeForce]);

  // Utility to convert hex to RGB
  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex-1 border-8 border-slate-800 rounded-[36px] sm:rounded-[48px] md:rounded-[64px] shadow-2xl bg-slate-950 overflow-hidden flex flex-col"
      id="dice-arena-wrapper"
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className={`absolute inset-0 w-full h-full block transition-opacity duration-700 ${
          isMasked ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        id="dice-physics-canvas"
      />
      {isMasked && (
        <div 
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in transition-all duration-700 z-10"
          id="reveal-overlay"
        >
          <div className="bg-slate-900/90 border border-slate-700/60 p-8 md:p-12 rounded-[32px] max-w-md flex flex-col items-center text-center shadow-2xl mx-4" id="reveal-screen-content">
            <div className="w-16 h-16 rounded-2xl border border-amber-500/30 flex items-center justify-center bg-amber-500/10 mb-6 text-amber-400 font-mono text-sm animate-pulse shadow-lg">
              10s ⏳
            </div>
            <h3 className="text-white font-sans font-black uppercase tracking-wider text-xl mb-3">
              Tirage Masqué
            </h3>
            <p className="text-slate-400 font-sans text-sm mb-6 leading-relaxed">
              Le temps de lancer s'est écoulé ! Le plateau a été masqué pour préserver le suspense du résultat.
            </p>
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">
              Cliquez sur révéler ci-dessous
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
