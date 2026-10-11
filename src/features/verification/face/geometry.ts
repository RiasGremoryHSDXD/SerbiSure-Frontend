import type { FaceLandmarks, Point2D } from './types';

export function distance(a: Point2D, b: Point2D) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function landmark(face: FaceLandmarks, index: number) {
  return face.points[index] ?? null;
}

export function averagePoint(points: Point2D[]) {
  const total = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
      z: (sum.z ?? 0) + (point.z ?? 0),
    }),
    { x: 0, y: 0, z: 0 as number },
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
    z: (total.z ?? 0) / points.length,
  };
}

export function normalizedMovement(a: FaceLandmarks, b: FaceLandmarks) {
  const count = Math.min(a.points.length, b.points.length);
  if (count === 0) {
    return Number.POSITIVE_INFINITY;
  }

  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += distance(a.points[index]!, b.points[index]!);
  }

  const faceScale = Math.max(a.bounds.width, a.bounds.height, 1);
  return total / count / faceScale;
}
