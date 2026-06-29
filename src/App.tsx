/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { DiceCanvas, DieState } from './components/DiceCanvas';
import { diceAudio } from './utils/audio';
import { 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Play, 
  Sparkles, 
  Smartphone,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Award,
  ArrowRight,
  ChevronRight,
  Settings,
  Dices
} from 'lucide-react';

const INITIAL_DICE_SPECS: Omit<DieState, 'x' | 'y' | 'vx' | 'vy' | 'rx' | 'ry' | 'rz' | 'drx' | 'dry' | 'drz' | 'currentValue'>[] = [
  // Pair 1: Rouge
  { id: 0, type: 'D6', size: 'large', radius: 34, mass: 3.5, colorName: 'Rouge Sanguine', colorBase: '#DC2626', colorLight: '#FCA5A5', colorDark: '#991B1B', textColor: '#FFFFFF' },
  { id: 1, type: 'D6', size: 'small', radius: 24, mass: 1.0, colorName: 'Rose Pastel', colorBase: '#FCA5A5', colorLight: '#FFF1F2', colorDark: '#991B1B', textColor: '#991B1B' },
  
  // Pair 2: Bleu
  { id: 2, type: 'D6', size: 'large', radius: 34, mass: 3.5, colorName: 'Bleu Royal', colorBase: '#1D4ED8', colorLight: '#93C5FD', colorDark: '#1E40AF', textColor: '#FFFFFF' },
  { id: 3, type: 'D6', size: 'small', radius: 24, mass: 1.0, colorName: 'Bleu Céleste', colorBase: '#93C5FD', colorLight: '#EFF6FF', colorDark: '#1E40AF', textColor: '#1E3A8A' },
  
  // Pair 3: Vert
  { id: 4, type: 'D6', size: 'large', radius: 34, mass: 3.5, colorName: 'Vert Impérial', colorBase: '#15803D', colorLight: '#86EFAC', colorDark: '#14532D', textColor: '#FFFFFF' },
  { id: 5, type: 'D6', size: 'small', radius: 24, mass: 1.0, colorName: 'Menthe Claire', colorBase: '#86EFAC', colorLight: '#F0FDF4', colorDark: '#14532D', textColor: '#14532D' },
  
  // Pair 4: Jaune (Strict yellow, absolutely no amber/brown)
  { id: 6, type: 'D6', size: 'large', radius: 34, mass: 3.5, colorName: 'Jaune Impérial', colorBase: '#EAB308', colorLight: '#FEF08A', colorDark: '#854D0E', textColor: '#000000' },
  { id: 7, type: 'D6', size: 'small', radius: 24, mass: 1.0, colorName: 'Crème de Citron', colorBase: '#FEF08A', colorLight: '#FFFFF0', colorDark: '#854D0E', textColor: '#854D0E' },
  
  // Pair 5: Orange (Strict vibrant orange, absolutely no amber/yellow)
  { id: 8, type: 'D6', size: 'large', radius: 34, mass: 3.5, colorName: 'Orange Vif', colorBase: '#EA580C', colorLight: '#FFEDD5', colorDark: '#7C2D12', textColor: '#FFFFFF' },
  { id: 9, type: 'D6', size: 'small', radius: 24, mass: 1.0, colorName: 'Pêche Douce', colorBase: '#FDBA74', colorLight: '#FFF7ED', colorDark: '#7C2D12', textColor: '#7C2D12' },
  
  // Pair 6: Violet
  { id: 10, type: 'D6', size: 'large', radius: 34, mass: 3.5, colorName: 'Améthyste Sombre', colorBase: '#6D28D9', colorLight: '#E9D5FF', colorDark: '#4C1D95', textColor: '#FFFFFF' },
  { id: 11, type: 'D6', size: 'small', radius: 24, mass: 1.0, colorName: 'Lilas Pastel', colorBase: '#C084FC', colorLight: '#FAF5FF', colorDark: '#4C1D95', textColor: '#4C1D95' },
];

type GameState = 'idle' | 'rolling' | 'masked' | 'revealed';
type ScreenState = 'start' | 'arena' | 'results';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [screen, setScreen] = useState<ScreenState>('start');
  const [dice, setDice] = useState<DieState[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10.0);
  const [shakeSupported, setShakeSupported] = useState(false);
  const [shakePermission, setShakePermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [shakeEnabled, setShakeEnabled] = useState(true);
  const [shakeForce, setShakeForce] = useState({ x: 0, y: 0 });

  const gameStateRef = useRef<GameState>('idle');
  const shakeEnabledRef = useRef(true);
  const timerIntervalRef = useRef<number | null>(null);

  // Sync state with ref to avoid closure issues in listeners
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    shakeEnabledRef.current = shakeEnabled;
  }, [shakeEnabled]);

  // Initial local placement
  useEffect(() => {
    const defaultWidth = 600;
    const defaultHeight = 450;
    const initial = INITIAL_DICE_SPECS.map((spec, index) => {
      // Circle layout in center
      const angle = (index / INITIAL_DICE_SPECS.length) * Math.PI * 2;
      const dist = spec.size === 'large' ? 120 : 65;
      return {
        ...spec,
        x: defaultWidth / 2 + Math.cos(angle) * dist,
        y: defaultHeight / 2 + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        rx: 0,
        ry: 0,
        rz: Math.random() * Math.PI * 2,
        drx: 0,
        dry: 0,
        drz: 0,
        currentValue: 1,
      };
    });
    setDice(initial);

    // Check if shake/gyroscope is supported
    if ('DeviceMotionEvent' in window) {
      setShakeSupported(true);
      // On iOS 13+ we need explicit user permission
      const devMotion = window.DeviceMotionEvent as any;
      if (typeof devMotion.requestPermission !== 'function') {
        setShakePermission('granted'); // Auto granted on desktop/Android
      }
    }
  }, []);

  // Set up DeviceMotion event listener if granted
  useEffect(() => {
    if (shakePermission !== 'granted') return;

    let lastX: number | null = null;
    let lastY: number | null = null;
    let lastZ: number | null = null;
    let lastUpdate = Date.now();

    const handleMotionEvent = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity || event.acceleration;
      if (!acceleration) return;

      const { x, y, z } = acceleration;
      if (x === null || y === null || z === null) return;

      const currTime = Date.now();
      const diffTime = currTime - lastUpdate;

      if (diffTime > 80) {
        if (lastX !== null && lastY !== null && lastZ !== null) {
          const dx = x - lastX;
          const dy = y - lastY;
          const dz = z - lastZ;
          const speed = (Math.sqrt(dx * dx + dy * dy + dz * dz) / diffTime) * 10000;

          // Shake detected
          if (speed > 800 && shakeEnabledRef.current) {
            if (gameStateRef.current === 'idle' || gameStateRef.current === 'revealed') {
              triggerRoll();
            } else if (gameStateRef.current === 'rolling') {
              // Add physical impulse directly to active rolling dice
              setShakeForce({ x: x * 6, y: -y * 6 });
              setTimeout(() => setShakeForce({ x: 0, y: 0 }), 100);
            }
          }
        }

        lastX = x;
        lastY = y;
        lastZ = z;
        lastUpdate = currTime;
      }
    };

    window.addEventListener('devicemotion', handleMotionEvent);
    return () => window.removeEventListener('devicemotion', handleMotionEvent);
  }, [shakePermission]);

  // Request accelerometer permission
  const requestAccelerometer = async () => {
    const devMotion = window.DeviceMotionEvent as any;
    if (devMotion && typeof devMotion.requestPermission === 'function') {
      try {
        const response = await devMotion.requestPermission();
        setShakePermission(response);
      } catch (err) {
        console.error('Permission gyro error:', err);
        setShakePermission('denied');
      }
    } else {
      setShakePermission('granted');
    }
  };

  // Start the physical throw
  const triggerRoll = () => {
    // Suspend any running timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    setGameState('rolling');
    setScreen('arena');
    setTimeLeft(10.0);

    // Play initial sound clatter
    diceAudio.playDiceCollision(1.0);
    setTimeout(() => diceAudio.playWallCollision(0.8), 120);

    // 10s Timer ticking down
    const start = Date.now();
    timerIntervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, 10.0 - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        
        // Transition to Black Screen Mask
        setGameState('masked');
      }
    }, 50); // Fluid 20fps ticking
  };

  // Reveal the hidden dice throw
  const handleReveal = () => {
    setGameState('revealed');
    // Subtle play soft click sound on reveal
    diceAudio.playDiceCollision(0.3);
  };

  // Reset the board to idle state
  const handleReset = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setGameState('idle');
    setTimeLeft(10.0);
    // Shuffle positions slightly
    setDice((prev) =>
      prev.map((d, i) => {
        const angle = (i / prev.length) * Math.PI * 2;
        const dist = d.size === 'large' ? 120 : 65;
        return {
          ...d,
          vx: 0,
          vy: 0,
          x: d.x + (Math.random() - 0.5) * 15,
          y: d.y + (Math.random() - 0.5) * 15,
          rx: 0,
          ry: 0,
          rz: Math.random() * Math.PI * 2,
          drx: 0,
          dry: 0,
          drz: 0,
        };
      })
    );
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const muted = diceAudio.toggleMute();
    setIsMuted(muted);
  };

  // Navigation actions
  const handleGoToResults = () => {
    setScreen('results');
  };

  const handleBackToStart = () => {
    handleReset();
    setScreen('start');
  };

  // Callback from Canvas when physics has calculated a step
  const handleDiceUpdate = (updatedDice: DieState[]) => {
    setDice(updatedDice);
  };

  // Callback when all dice natural friction stops them
  const handleRollingSettled = () => {
    // If we've settled but are still in rolling, we just let them stay static until the 10s timer ends
  };

  // Stats calculation
  const totalScore = dice.reduce((sum, d) => sum + d.currentValue, 0);
  const maxVal = dice.reduce((max, d) => Math.max(max, d.currentValue), 0);
  
  const largeDice = dice.filter((d) => d.size === 'large');
  const smallDice = dice.filter((d) => d.size === 'small');
  
  const largeSum = largeDice.reduce((sum, d) => sum + d.currentValue, 0);
  const smallSum = smallDice.reduce((sum, d) => sum + d.currentValue, 0);

  // Find duplicate value counts (Pairs/Triples etc)
  const valCounts: Record<number, number> = {};
  dice.forEach((d) => {
    valCounts[d.currentValue] = (valCounts[d.currentValue] || 0) + 1;
  });
  
  const duplicates = Object.entries(valCounts)
    .filter(([_, count]) => count >= 2)
    .map(([val, count]) => ({ value: Number(val), count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans antialiased selection:bg-pink-500 selection:text-white relative overflow-x-hidden" id="app-root">
      {/* Dynamic Background subtle ambient grid glow & radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0f172a_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none" />

      {/* Screen 1: Start Screen */}
      {screen === 'start' && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl w-full mx-auto" id="start-screen-container">
          <div className="w-full bg-slate-800/40 border border-slate-700/60 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col items-center text-center gap-8 animate-fade-in" id="start-card">
            {/* Background decorative glows */}
            <div className="absolute -right-24 -bottom-24 w-48 h-48 bg-pink-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -left-24 -top-24 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

            {/* Logo Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-2xl shadow-indigo-500/35 relative group" id="start-logo">
                <Dices className="w-10 h-10 text-white animate-pulse" />
              </div>
              <div className="flex flex-col items-center mt-2">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" id="start-title">
                  Dice Pool
                </h1>
              </div>
            </div>

            {/* Separator line */}
            <div className="w-full h-px bg-slate-700/50" />

            {/* Options / Settings Area */}
            <div className="w-full flex flex-col gap-4 max-w-md" id="start-options-section">
              <h2 className="font-sans font-extrabold text-[11px] text-slate-400 uppercase tracking-widest text-left flex items-center gap-2 mb-1">
                <Settings className="w-4 h-4 text-slate-500" />
                Options de Simulation
              </h2>

              {/* Option 1: Sound Toggle */}
              <button
                onClick={handleToggleMute}
                className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                  !isMuted 
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15'
                    : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:bg-slate-900'
                }`}
                id="toggle-sound-card"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${!isMuted ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
                    {!isMuted ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div>
                    <span className="block font-sans font-bold text-sm text-slate-200">Retour Sonore Spatial</span>
                    <span className="block font-mono text-[10px] text-slate-400 leading-normal mt-0.5">
                      {!isMuted ? 'Activé (Bruitages de collision)' : 'Désactivé (Silencieux)'}
                    </span>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 ${!isMuted ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${!isMuted ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>

              {/* Option 2: Shake/Gyro Toggle */}
              {shakeSupported ? (
                <button
                  onClick={async () => {
                    if (shakePermission !== 'granted') {
                      await requestAccelerometer();
                    }
                    setShakeEnabled(!shakeEnabled);
                  }}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                    shakeEnabled && shakePermission === 'granted'
                      ? 'bg-pink-500/10 border-pink-500/40 text-pink-400 hover:bg-pink-500/15'
                      : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:bg-slate-900'
                  }`}
                  id="toggle-shake-card"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${shakeEnabled && shakePermission === 'granted' ? 'bg-pink-500/20' : 'bg-slate-800'}`}>
                      <Smartphone className={`w-5 h-5 ${shakeEnabled && shakePermission === 'granted' ? 'text-pink-400 animate-bounce' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <span className="block font-sans font-bold text-sm text-slate-200">Lancer par Secousse</span>
                      <span className="block font-mono text-[10px] text-slate-400 leading-normal mt-0.5">
                        {shakePermission === 'granted'
                          ? (shakeEnabled ? 'Activé (Secouez le mobile)' : 'Désactivé')
                          : 'Cliquez pour autoriser l\'accéléromètre'}
                      </span>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 ${shakeEnabled && shakePermission === 'granted' ? 'bg-pink-500' : 'bg-slate-700'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${shakeEnabled && shakePermission === 'granted' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
              ) : (
                <div className="w-full p-4 rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-500 text-left flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-800">
                    <Smartphone className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <span className="block font-sans font-bold text-sm text-slate-400">Secousse non disponible</span>
                    <span className="block font-mono text-[10px] text-slate-600 leading-normal">
                      Accéléromètre non supporté par ce terminal
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Launch Action Section */}
            <div className="w-full max-w-sm mt-4 flex flex-col gap-3" id="start-actions-section">
              <button
                onClick={triggerRoll}
                className="w-full py-4 px-8 bg-white text-slate-900 rounded-2xl text-lg font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-slate-900 transition-all duration-150 shadow-2xl shadow-white/10 ring-4 ring-white/20 flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer"
                id="throw-dice-start-btn"
              >
                <Play className="w-5 h-5 fill-slate-900 text-slate-900 animate-pulse" />
                Lancer les dés
              </button>
              <p className="font-mono text-[10px] text-slate-500">
                Lancement automatique d'un plateau physique de 12 dés colorés.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Screen 2: Roll Arena Screen */}
      {screen === 'arena' && (
        <div className="relative z-10 flex-1 flex flex-col p-4 sm:p-6 max-w-7xl w-full mx-auto" id="arena-screen-container">

          {/* Main 2.5D Canvas Area */}
          <div className="flex-1 bg-slate-950/40 rounded-3xl border border-slate-800 overflow-hidden relative min-h-[400px] flex flex-col" id="arena-viewport">
            <DiceCanvas
              dice={dice}
              isRolling={gameState === 'rolling'}
              isMasked={gameState === 'masked'}
              onDiceUpdate={handleDiceUpdate}
              onRollingSettled={handleRollingSettled}
              shakeForce={shakeForce}
            />

            {/* Centered Opaque overlay if masked */}
            {gameState === 'masked' && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 z-20 backdrop-blur-sm animate-fade-in" id="reveal-overlay">
                <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-700/60 max-w-md text-center flex flex-col items-center gap-6 shadow-2xl m-4">
                  <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 animate-bounce">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-sans font-extrabold text-lg text-slate-100">Le gobelet est posé !</h3>
                    <p className="font-sans text-xs text-slate-400 mt-2 leading-relaxed">
                      La trajectoire physique s'est arrêtée. Les 12 dés sont cachés en dessous. Prêt à soulever ?
                    </p>
                  </div>
                  <button
                    onClick={handleReveal}
                    className="w-full py-4 px-8 bg-yellow-400 hover:bg-yellow-300 text-slate-900 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    id="reveal-overlay-btn"
                  >
                    <Sparkles className="w-4 h-4 fill-slate-900" />
                    Révéler le tirage
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls / Action Bar */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-800/20 border border-slate-700/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in" id="arena-footer">
            <div className="font-mono text-[11px] text-slate-400 flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {shakeEnabled && shakePermission === 'granted' 
                  ? "Secouez votre appareil pour ré-influencer les dés !" 
                  : "Glissez les dés sur l'écran pour les faire rebondir."}
              </span>
            </div>

            {/* Navigation Button to the End Screen */}
            <div className="w-full sm:w-auto">
              {gameState === 'revealed' ? (
                <button
                  onClick={handleGoToResults}
                  className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all duration-150 hover:translate-x-0.5 cursor-pointer"
                  id="go-to-results-btn"
                >
                  Consulter les Statistiques
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  disabled
                  className="w-full sm:w-auto py-3 px-6 bg-slate-800/40 border border-slate-700/30 text-slate-500 font-bold text-sm uppercase tracking-wider rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                  id="go-to-results-disabled-btn"
                >
                  Statistiques (En attente du tirage)
                  <ArrowRight className="w-4 h-4 opacity-30" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Screen 3: Results & Stats Screen */}
      {screen === 'results' && (
        <div className="relative z-10 flex-1 flex flex-col p-4 sm:p-6 max-w-7xl w-full mx-auto gap-6 animate-fade-in" id="results-screen-container">
          
          {/* Header row with navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4" id="results-screen-header">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                Rapport de Tirage
              </h2>
              <p className="font-mono text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                Statistiques complètes de la simulation physique
              </p>
            </div>

            <button
              onClick={handleBackToStart}
              className="py-3 px-6 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl font-mono text-xs uppercase font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              id="results-new-throw-top-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Nouveau Lancer
            </button>
          </div>

          {/* Grid Layout: Stats (Left side) vs Dice Inventory (Right side) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="results-layout-grid">
            
            {/* Stats Panel (2/3 space on desktop) */}
            <div className="lg:col-span-2 flex flex-col gap-6" id="stats-panel-section">
              
              {/* Score total card */}
              <div className="p-6 rounded-3xl bg-slate-800/40 border border-slate-700/60 relative overflow-hidden flex items-center justify-between shadow-xl" id="total-score-card">
                <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
                <div className="flex-1 relative z-10">
                  <span className="font-mono text-xs text-slate-400 uppercase tracking-widest block font-bold">Score Total Cumulé</span>
                  <span className="font-sans font-black text-6xl text-white tracking-tight block mt-1" id="final-total-score">
                    {totalScore}
                  </span>
                  <p className="font-sans text-xs text-slate-300 mt-2">
                    Somme des faces supérieures de l'ensemble des 12 dés stabilisés.
                  </p>
                </div>
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                  <Award className="w-10 h-10 text-indigo-400 animate-pulse" />
                </div>
              </div>

              {/* Metrics grid cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="metrics-cards-grid">
                
                {/* Max & Moyenne */}
                <div className="p-5 rounded-2xl bg-slate-850/40 border border-slate-700/50 flex flex-col justify-between gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-400 uppercase tracking-widest font-bold">Valeur Maximale</span>
                    <span className="font-sans font-bold text-2xl text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-xl border border-yellow-400/20">
                      {maxVal}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Le dé ayant obtenu le meilleur résultat possible sur une face.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-850/40 border border-slate-700/50 flex flex-col justify-between gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-400 uppercase tracking-widest font-bold">Moyenne</span>
                    <span className="font-sans font-bold text-2xl text-pink-400 bg-pink-400/10 px-2.5 py-1 rounded-xl border border-pink-400/20">
                      {(totalScore / 12).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Valeur moyenne par dé sur ce tirage physique de 12 dés.
                  </p>
                </div>

                {/* Sub-sums (Large vs Small) */}
                <div className="p-5 rounded-2xl bg-slate-850/40 border border-slate-700/50 flex flex-col justify-between gap-4">
                  <div>
                    <span className="font-mono text-xs text-slate-400 uppercase tracking-widest font-bold block">Somme des 6 Grands Dés</span>
                    <span className="font-sans font-extrabold text-3xl text-emerald-400 block mt-1">
                      {largeSum}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Dés grands formats (radius 34px, masse 3.5).
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-850/40 border border-slate-700/50 flex flex-col justify-between gap-4">
                  <div>
                    <span className="font-mono text-xs text-slate-400 uppercase tracking-widest font-bold block">Somme des 6 Petits Dés</span>
                    <span className="font-sans font-extrabold text-3xl text-indigo-400 block mt-1">
                      {smallSum}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Dés petits formats (radius 24px, masse 1.0).
                  </p>
                </div>
              </div>

              {/* Duplicate Combinations Box */}
              <div className="p-6 rounded-3xl bg-slate-800/30 border border-slate-700/50 flex flex-col gap-4" id="combinations-results-box">
                <h3 className="font-sans font-bold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-pink-400" />
                  Combinaisons et Alignements Détectés
                </h3>

                {duplicates.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {duplicates.map((dup, i) => (
                      <div
                        key={i}
                        className="px-4 py-3 rounded-2xl bg-slate-900/60 border border-slate-700/40 flex items-center gap-3 font-mono text-xs text-slate-200"
                      >
                        <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400">
                          {dup.count}x
                        </div>
                        <span>
                          Le chiffre <strong className="text-white font-black text-sm px-1.5 py-0.5 rounded bg-slate-800">{dup.value}</strong> est apparu {dup.count} fois.
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-sans text-xs text-slate-400 italic">
                    Aucun doublon trouvé ! Tous les dés ont des valeurs très dispersées.
                  </p>
                )}
              </div>
            </div>

            {/* Inventory List Card (1/3 space on desktop) */}
            <div className="flex flex-col gap-6" id="inventory-panel-section">
              <div className="p-6 rounded-3xl bg-slate-800/40 border border-slate-700/60 flex flex-col gap-4" id="results-dice-list-card">
                <h3 className="font-sans font-bold text-xs text-slate-300 uppercase tracking-widest border-b border-slate-700/40 pb-3">
                  Valeurs individuelles des 12 Dés
                </h3>

                <div className="flex flex-col gap-2.5 max-h-[460px] overflow-y-auto pr-1" id="results-dice-list">
                  {dice.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-900/50 border border-slate-700/40 hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Custom Color block */}
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[9px] font-bold shadow-sm"
                          style={{ backgroundColor: d.colorBase, color: d.textColor }}
                        >
                          {d.type}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-sans text-xs text-slate-200 leading-none font-bold">
                            {d.type} • {d.size === 'large' ? 'Grand' : 'Petit'}
                          </span>
                          <span className="font-mono text-[9px] text-slate-500 leading-normal mt-0.5">
                            {d.colorName}
                          </span>
                        </div>
                      </div>

                      {/* Display exact value block */}
                      <span
                        className="font-mono font-black text-sm px-3 py-1 rounded-xl border shadow-sm"
                        style={{
                          backgroundColor: d.colorDark + '22',
                          borderColor: d.colorBase + '55',
                          color: d.colorLight,
                        }}
                      >
                        {d.currentValue}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Big CTA button at bottom of results screen */}
              <button
                onClick={handleBackToStart}
                className="w-full py-4 px-8 bg-white text-slate-900 hover:bg-yellow-400 hover:text-slate-900 rounded-2xl text-base font-black uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                id="results-new-throw-bottom-btn-cta"
              >
                <RotateCcw className="w-4 h-4" />
                Relancer une session
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
