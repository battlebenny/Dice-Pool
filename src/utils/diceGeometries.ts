/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Face {
  indices: number[];
  value: number;
  normal?: Vector3D; // Base normal before rotation
}

export interface DieGeometry {
  type: 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20';
  vertices: Vector3D[];
  faces: Face[];
}

// 3D vector helper functions
export function normalize(v: Vector3D): Vector3D {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function crossProduct(v1: Vector3D, v2: Vector3D): Vector3D {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
}

export function dotProduct(v1: Vector3D, v2: Vector3D): number {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

export function getRotationMatrix(rx: number, ry: number, rz: number): number[][] {
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);

  // Rotation matrix: R = Rz * Ry * Rx
  return [
    [
      cy * cz,
      sx * sy * cz - cx * sz,
      cx * sy * cz + sx * sz
    ],
    [
      cy * sz,
      sx * sy * sz + cx * cz,
      cx * sy * sz - sx * cz
    ],
    [
      -sy,
      sx * cy,
      cx * cy
    ]
  ];
}

export function rotateVector(v: Vector3D, R: number[][]): Vector3D {
  return {
    x: R[0][0] * v.x + R[0][1] * v.y + R[0][2] * v.z,
    y: R[1][0] * v.x + R[1][1] * v.y + R[1][2] * v.z,
    z: R[2][0] * v.x + R[2][1] * v.y + R[2][2] * v.z,
  };
}

// Calculate the base normal for a face
export function calculateFaceNormal(vertices: Vector3D[], faceIndices: number[]): Vector3D {
  const p0 = vertices[faceIndices[0]];
  const p1 = vertices[faceIndices[1]];
  const p2 = vertices[faceIndices[2]];

  const edge1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
  const edge2 = { x: p2.x - p0.x, y: p2.y - p0.y, z: p2.z - p0.z };

  return normalize(crossProduct(edge1, edge2));
}

// Ensure all normals point outwards from the center of the polyhedron
export function buildGeometry(type: DieGeometry['type'], rawVertices: Vector3D[], rawFaces: { indices: number[]; value: number }[]): DieGeometry {
  // Normalize vertices to lie on unit sphere (radius 1)
  const vertices = rawVertices.map(normalize);

  const faces: Face[] = rawFaces.map((f) => {
    let normal = calculateFaceNormal(vertices, f.indices);
    // Check if the normal points inward (dot product with center-to-vertex is negative)
    const firstVertex = vertices[f.indices[0]];
    if (dotProduct(normal, firstVertex) < 0) {
      // Reverse face order to flip normal outward
      const reversedIndices = [...f.indices].reverse();
      normal = calculateFaceNormal(vertices, reversedIndices);
      return { indices: reversedIndices, value: f.value, normal };
    }
    return { indices: f.indices, value: f.value, normal };
  });

  return { type, vertices, faces };
}

// Geometry Generators

// 1. Tétraèdre (D4)
function generateD4(): DieGeometry {
  const rawVertices: Vector3D[] = [
    { x: 1, y: 1, z: 1 },
    { x: -1, y: -1, z: 1 },
    { x: -1, y: 1, z: -1 },
    { x: 1, y: -1, z: -1 },
  ];

  const rawFaces = [
    { indices: [0, 1, 2], value: 1 },
    { indices: [0, 2, 3], value: 2 },
    { indices: [0, 3, 1], value: 3 },
    { indices: [1, 3, 2], value: 4 },
  ];

  return buildGeometry('D4', rawVertices, rawFaces);
}

// 2. Cube (D6)
function generateD6(): DieGeometry {
  const rawVertices: Vector3D[] = [
    { x: -1, y: -1, z: -1 }, // 0
    { x: 1, y: -1, z: -1 },  // 1
    { x: 1, y: 1, z: -1 },   // 2
    { x: -1, y: 1, z: -1 },  // 3
    { x: -1, y: -1, z: 1 },  // 4
    { x: 1, y: -1, z: 1 },   // 5
    { x: 1, y: 1, z: 1 },    // 6
    { x: -1, y: 1, z: 1 },   // 7
  ];

  // Opposing faces sum to 7 (1-6, 2-5, 3-4)
  const rawFaces = [
    { indices: [4, 5, 6, 7], value: 1 }, // Front (+Z)
    { indices: [0, 3, 2, 1], value: 6 }, // Back (-Z)
    { indices: [2, 3, 7, 6], value: 2 }, // Top (+Y)
    { indices: [0, 1, 5, 4], value: 5 }, // Bottom (-Y)
    { indices: [1, 2, 6, 5], value: 3 }, // Right (+X)
    { indices: [0, 4, 7, 3], value: 4 }, // Left (-X)
  ];

  return buildGeometry('D6', rawVertices, rawFaces);
}

// 3. Octaèdre (D8)
function generateD8(): DieGeometry {
  const rawVertices: Vector3D[] = [
    { x: 0, y: 0, z: 1 },  // 0 (Top)
    { x: 1, y: 0, z: 0 },  // 1 (Right)
    { x: 0, y: 1, z: 0 },  // 2 (Front)
    { x: -1, y: 0, z: 0 }, // 3 (Left)
    { x: 0, y: -1, z: 0 }, // 4 (Back)
    { x: 0, y: 0, z: -1 }, // 5 (Bottom)
  ];

  const rawFaces = [
    { indices: [0, 1, 2], value: 1 },
    { indices: [0, 2, 3], value: 2 },
    { indices: [0, 3, 4], value: 3 },
    { indices: [0, 4, 1], value: 4 },
    { indices: [5, 2, 1], value: 5 },
    { indices: [5, 3, 2], value: 6 },
    { indices: [5, 4, 3], value: 7 },
    { indices: [5, 1, 4], value: 8 },
  ];

  return buildGeometry('D8', rawVertices, rawFaces);
}

// 4. Trapézoèdre Pentagonal (D10)
function generateD10(): DieGeometry {
  const vertices: Vector3D[] = [
    { x: 0, y: 0, z: 1 }, // 0 (Top apex)
    { x: 0, y: 0, z: -1 }, // 1 (Bottom apex)
  ];

  const angleStep = (2 * Math.PI) / 5;
  const radius = 0.95;
  const zOffset = 0.25;

  // Top ring of 5 vertices
  for (let i = 0; i < 5; i++) {
    const angle = i * angleStep;
    vertices.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      z: zOffset,
    });
  }

  // Bottom ring of 5 vertices, rotated by 36 degrees (half step)
  for (let i = 0; i < 5; i++) {
    const angle = (i + 0.5) * angleStep;
    vertices.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      z: -zOffset,
    });
  }

  // 10 kite faces:
  // Top-facing: 0 -> Ring1(i) -> Ring2(i) -> Ring1(i+1)
  // Bottom-facing: 1 -> Ring2(i) -> Ring1(i+1) -> Ring2(i+1)
  // Indices: 0, 1, Ring1 is [2..6], Ring2 is [7..11]
  const rawFaces: { indices: number[]; value: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const r1_this = 2 + i;
    const r1_next = 2 + ((i + 1) % 5);
    const r2_this = 7 + i;
    const r2_prev = 7 + ((i - 1 + 5) % 5);

    // Face top
    rawFaces.push({
      indices: [0, r1_this, r2_this, r1_next],
      value: 1 + i * 2, // Odd numbers on top: 1, 3, 5, 7, 9
    });

    // Face bottom
    rawFaces.push({
      indices: [1, r2_this, r1_next, 7 + ((i + 1) % 5)],
      value: 2 + i * 2, // Even numbers on bottom: 2, 4, 6, 8, 10
    });
  }

  return buildGeometry('D10', vertices, rawFaces);
}

// 5. Dodécaèdre (D12)
function generateD12(): DieGeometry {
  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
  const invPhi = 1 / phi;

  // 20 vertices
  const rawVertices: Vector3D[] = [
    // 8 standard cube-like vertices
    { x: -1, y: -1, z: -1 }, // 0
    { x: 1, y: -1, z: -1 },  // 1
    { x: 1, y: 1, z: -1 },   // 2
    { x: -1, y: 1, z: -1 },  // 3
    { x: -1, y: -1, z: 1 },  // 4
    { x: 1, y: -1, z: 1 },   // 5
    { x: 1, y: 1, z: 1 },    // 6
    { x: -1, y: 1, z: 1 },   // 7

    // 4 orange/green-ish coordinates
    { x: 0, y: -invPhi, z: -phi }, // 8
    { x: 0, y: invPhi, z: -phi },  // 9
    { x: 0, y: -invPhi, z: phi },  // 10
    { x: 0, y: invPhi, z: phi },   // 11

    { x: -invPhi, y: -phi, z: 0 }, // 12
    { x: invPhi, y: -phi, z: 0 },  // 13
    { x: -invPhi, y: phi, z: 0 },  // 14
    { x: invPhi, y: phi, z: 0 },   // 15

    { x: -phi, y: 0, z: -invPhi }, // 16
    { x: phi, y: 0, z: -invPhi },  // 17
    { x: -phi, y: 0, z: invPhi },  // 18
    { x: phi, y: 0, z: invPhi },   // 19
  ];

  // 12 pentagonal faces
  const rawFaces = [
    { indices: [11, 6, 15, 14, 7], value: 1 },
    { indices: [3, 14, 15, 2, 9], value: 2 },
    { indices: [10, 4, 18, 11, 7], value: 3 },
    { indices: [5, 10, 11, 6, 19], value: 4 },
    { indices: [1, 17, 19, 5, 13], value: 5 },
    { indices: [2, 17, 19, 6, 15], value: 6 },
    { indices: [0, 8, 9, 3, 16], value: 7 },
    { indices: [8, 1, 13, 12, 0], value: 8 },
    { indices: [18, 16, 0, 12, 4], value: 9 },
    { indices: [10, 5, 13, 12, 4], value: 10 },
    { indices: [2, 9, 8, 1, 17], value: 11 },
    { indices: [14, 3, 16, 18, 7], value: 12 },
  ];

  return buildGeometry('D12', rawVertices, rawFaces);
}

// 6. Icosaèdre (D20)
function generateD20(): DieGeometry {
  const phi = (1 + Math.sqrt(5)) / 2;

  // 12 vertices
  const rawVertices: Vector3D[] = [
    { x: -1, y: phi, z: 0 },  // 0
    { x: 1, y: phi, z: 0 },   // 1
    { x: -1, y: -phi, z: 0 }, // 2
    { x: 1, y: -phi, z: 0 },  // 3

    { x: 0, y: -1, z: phi },  // 4
    { x: 0, y: 1, z: phi },   // 5
    { x: 0, y: -1, z: -phi }, // 6
    { x: 0, y: 1, z: -phi },  // 7

    { x: phi, y: 0, z: -1 },  // 8
    { x: phi, y: 0, z: 1 },   // 9
    { x: -phi, y: 0, z: -1 }, // 10
    { x: -phi, y: 0, z: 1 },  // 11
  ];

  // 20 triangular faces
  const rawFaces = [
    { indices: [0, 11, 5], value: 1 },
    { indices: [0, 5, 1], value: 2 },
    { indices: [0, 1, 7], value: 3 },
    { indices: [0, 7, 10], value: 4 },
    { indices: [0, 10, 11], value: 5 },
    { indices: [1, 5, 9], value: 6 },
    { indices: [5, 11, 4], value: 7 },
    { indices: [11, 10, 2], value: 8 },
    { indices: [10, 7, 6], value: 9 },
    { indices: [7, 1, 8], value: 10 },
    { indices: [3, 9, 4], value: 11 },
    { indices: [3, 4, 2], value: 12 },
    { indices: [3, 2, 6], value: 13 },
    { indices: [3, 6, 8], value: 14 },
    { indices: [3, 8, 9], value: 15 },
    { indices: [4, 9, 5], value: 16 },
    { indices: [2, 4, 11], value: 17 },
    { indices: [6, 2, 10], value: 18 },
    { indices: [8, 6, 7], value: 19 },
    { indices: [9, 8, 1], value: 20 },
  ];

  return buildGeometry('D20', rawVertices, rawFaces);
}

// Map geometry types to generators
export const geometries: Record<DieGeometry['type'], () => DieGeometry> = {
  D4: generateD4,
  D6: generateD6,
  D8: generateD8,
  D10: generateD10,
  D12: generateD12,
  D20: generateD20,
};

// Returns the value of the face pointing most directly towards the viewer (+Z)
export function getTopFaceValue(geom: DieGeometry, R: number[][]): number {
  let maxZ = -Infinity;
  let topFaceValue = 1;

  for (const face of geom.faces) {
    if (!face.normal) continue;
    // Rotate the face normal
    const rotatedNormal = rotateVector(face.normal, R);
    // Since viewer is looking down +Z towards origin, face with largest +Z normal points towards us
    if (rotatedNormal.z > maxZ) {
      maxZ = rotatedNormal.z;
      topFaceValue = face.value;
    }
  }

  return topFaceValue;
}
