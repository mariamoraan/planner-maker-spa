export interface Point {
  x: number;
  y: number;
}

export interface MeasureMetrics {
  dx: number;
  dy: number;
  distance: number;
}

export function computeMeasureMetrics(p1: Point, p2: Point): MeasureMetrics {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return { dx, dy, distance: Math.hypot(dx, dy) };
}
