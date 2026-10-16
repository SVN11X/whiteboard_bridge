import type { Point } from '../models/document';
type Bounds = { x: number; y: number; width: number; height: number };
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
export function simplifyRoute(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const p of points) {
    if (result.length && distance(result.at(-1)!, p) < 1e-7) continue;
    while (result.length > 1) {
      const a = result.at(-2)!, b = result.at(-1)!, u = { x: b.x - a.x, y: b.y - a.y }, v = { x: p.x - b.x, y: p.y - b.y };
      if (Math.abs(u.x * v.y - u.y * v.x) > 1e-7 || u.x * v.x + u.y * v.y < 0) break;
      result.pop();
    }
    result.push(p);
  }
  return result.length > 1 ? result : [points[0], points[0]];
}
function crosses(a: Point, b: Point, r: Bounds) {
  const epsilon = 1e-5;
  if (Math.abs(a.x - b.x) < epsilon) return a.x > r.x + epsilon && a.x < r.x + r.width - epsilon && Math.max(a.y, b.y) > r.y + epsilon && Math.min(a.y, b.y) < r.y + r.height - epsilon;
  return a.y > r.y + epsilon && a.y < r.y + r.height - epsilon && Math.max(a.x, b.x) > r.x + epsilon && Math.min(a.x, b.x) < r.x + r.width - epsilon;
}
export function orthogonalRoute(start: Point, end: Point, startDirection: Point, endDirection: Point, obstacles: Bounds[], bend: Point | null): Point[] {
  const gap = 24, a = { x: start.x + startDirection.x * gap, y: start.y + startDirection.y * gap }, b = { x: end.x + endDirection.x * gap, y: end.y + endDirection.y * gap };
  if (bend) return simplifyRoute([start, a, { x: bend.x, y: a.y }, bend, { x: b.x, y: bend.y }, b, end]);
  const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
  const left = Math.min(a.x, b.x, ...obstacles.map(o => o.x)) - gap, right = Math.max(a.x, b.x, ...obstacles.map(o => o.x + o.width)) + gap;
  const top = Math.min(a.y, b.y, ...obstacles.map(o => o.y)) - gap, bottom = Math.max(a.y, b.y, ...obstacles.map(o => o.y + o.height)) + gap;
  const candidates = [
    [a, { x: b.x, y: a.y }, b], [a, { x: a.x, y: b.y }, b],
    ...[midX, left, right].map(x => [a, { x, y: a.y }, { x, y: b.y }, b]),
    ...[midY, top, bottom].map(y => [a, { x: a.x, y }, { x: b.x, y }, b]),
  ].map(points => simplifyRoute([start, ...points, end]));
  const score = (points: Point[]) => points.slice(1).reduce((cost, p, i) => cost + distance(points[i], p) + obstacles.filter(o => crosses(points[i], p, o)).length * 1_000_000, points.length * 12);
  return candidates.reduce((best, route) => score(route) < score(best) ? route : best);
}
export function routeMidpoint(points: Point[]): Point {
  const lengths = points.slice(1).map((p, i) => distance(points[i], p)); let remaining = lengths.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) { const t = lengths[i] ? remaining / lengths[i] : 0; return { x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t }; }
    remaining -= lengths[i];
  }
  return points[0];
}
