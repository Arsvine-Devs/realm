import * as THREE from 'three';

export interface BatteryPosition3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

const CUBE_EDGES = [
  [0, 1],
  [1, 3],
  [3, 2],
  [2, 0],
  [4, 5],
  [5, 7],
  [7, 6],
  [6, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
] as const;

export const TESSERACT_EDGES: ReadonlyArray<readonly [number, number]> = [
  ...CUBE_EDGES,
  ...CUBE_EDGES.map(([start, end]) => [start + 8, end + 8] as const),
  ...Array.from({ length: 8 }, (_, index) => [index, index + 8] as const),
];

export function createTesseractVertices(outerSize = 0.4, innerSize = 0.2) {
  const vertices: THREE.Vector3[] = [];
  for (const size of [outerSize, innerSize]) {
    const half = size / 2;
    for (let index = 0; index < 8; index += 1) {
      vertices.push(
        new THREE.Vector3(
          (index & 1 ? 1 : -1) * half,
          (index & 2 ? 1 : -1) * half,
          (index & 4 ? 1 : -1) * half,
        ),
      );
    }
  }
  return vertices;
}

export function createTesseractLineGeometry(outerSize = 0.4, innerSize = 0.2) {
  const vertices = createTesseractVertices(outerSize, innerSize);
  const points: number[] = [];
  for (const [startIndex, endIndex] of TESSERACT_EDGES) {
    points.push(vertices[startIndex].x, vertices[startIndex].y, vertices[startIndex].z);
    points.push(vertices[endIndex].x, vertices[endIndex].y, vertices[endIndex].z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

export function resolveBatteryAnchorPosition(
  canvasRect: DOMRect,
  iconRect: DOMRect,
): BatteryPosition3D | null {
  if (
    canvasRect.width <= 0 ||
    canvasRect.height <= 0 ||
    iconRect.width <= 0 ||
    iconRect.height <= 0
  ) {
    return null;
  }

  const relativeX = iconRect.right + 4 - canvasRect.left;
  const relativeY = iconRect.top + iconRect.height / 2 - canvasRect.top;

  return {
    x: (relativeX / canvasRect.width) * 2 - 1,
    y: -(relativeY / canvasRect.height) * 2 + 1,
    z: 0.1,
  };
}

export function projectWorldPositionToCanvas(
  worldPosition: THREE.Vector3,
  camera: THREE.Camera,
  canvasRect: DOMRect,
): Point2D {
  const projected = worldPosition.clone().project(camera);
  return {
    x: canvasRect.left + ((projected.x + 1) / 2) * canvasRect.width,
    y: canvasRect.top + ((1 - projected.y) / 2) * canvasRect.height,
  };
}

export function resolveBatteryWorldPosition(
  batteryPosition3D: BatteryPosition3D,
  camera: THREE.Camera,
  out: THREE.Vector3,
) {
  out.set(batteryPosition3D.x, batteryPosition3D.y, 0.5);
  out.unproject(camera);
  out.sub(camera.position).normalize();
  const distance = (batteryPosition3D.z - camera.position.z) / out.z;
  out.multiplyScalar(distance).add(camera.position);
  return out;
}

export function computeBatteryAttractionOffset({
  tesseractScreen,
  iconRect,
  currentOffset,
  maxOffset = 14,
}: {
  tesseractScreen: Point2D;
  iconRect: DOMRect;
  currentOffset: Point2D;
  maxOffset?: number;
}) {
  const iconCenterX = iconRect.left + iconRect.width / 2 - currentOffset.x;
  const iconCenterY = iconRect.top + iconRect.height / 2 - currentOffset.y;
  const deltaX = tesseractScreen.x - iconCenterX;
  const deltaY = tesseractScreen.y - iconCenterY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
  const strength = 1 / (1 + distance / 120);

  return {
    x: (deltaX / distance) * maxOffset * strength,
    y: (deltaY / distance) * maxOffset * strength,
  };
}
