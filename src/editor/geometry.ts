import { clampZoom, type BoardObject, type Point, type Viewport, type AnchorSide } from '../models/document';
import { orthogonalRoute } from './routing';
import { shapePolygon } from '../graphics/shapes';
export type Bounds = { x: number; y: number; width: number; height: number };
export const center = (o: Bounds): Point => ({ x: o.x + o.width / 2, y: o.y + o.height / 2 });
export function rotatePoint(p: Point, pivot: Point, deg: number): Point {
  const r = deg * Math.PI / 180, dx = p.x - pivot.x, dy = p.y - pivot.y;
  return { x: pivot.x + dx * Math.cos(r) - dy * Math.sin(r), y: pivot.y + dx * Math.sin(r) + dy * Math.cos(r) };
}
export function rotatedBounds(o: BoardObject): Bounds {
  const c = center(o), p = [{ x: o.x, y: o.y }, { x: o.x + o.width, y: o.y }, { x: o.x, y: o.y + o.height }, { x: o.x + o.width, y: o.y + o.height }].map(p => rotatePoint(p, c, o.rotation));
  const x = Math.min(...p.map(p => p.x)), y = Math.min(...p.map(p => p.y));
  return { x, y, width: Math.max(...p.map(p => p.x)) - x, height: Math.max(...p.map(p => p.y)) - y };
}
export function boundsOf(objects: BoardObject[]): Bounds | null {
  if (!objects.length) return null;
  let x = Infinity, y = Infinity, right = -Infinity, bottom = -Infinity;
  for (const o of objects) { const b = rotatedBounds(o); x = Math.min(x, b.x); y = Math.min(y, b.y); right = Math.max(right, b.x + b.width); bottom = Math.max(bottom, b.y + b.height); }
  return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
}
export const intersects = (a: Bounds, b: Bounds) => a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
export const screenToWorld = (p: Point, v: Viewport): Point => ({ x: (p.x - v.x) / v.zoom, y: (p.y - v.y) / v.zoom });
export function zoomAt(v: Viewport, p: Point, factor: number): Viewport {
  const w = screenToWorld(p, v), zoom = clampZoom(v.zoom * factor);
  return { x: p.x - w.x * zoom, y: p.y - w.y * zoom, zoom };
}
export function descendants(objects: BoardObject[], ids: string[]): Set<string> {
  const result = new Set(ids), map = new Map(objects.map(o => [o.id, o]));
  const visit = (id: string) => { const o = map.get(id); if (o?.type === 'group') for (const c of o.children) if (!result.has(c)) { result.add(c); visit(c); } };
  ids.forEach(visit); return result;
}
export function rootId(o: BoardObject, objects: BoardObject[]): string {
  if (!o.groupId) return o.id;
  const map = new Map(objects.map(o => [o.id, o])); let current = o;
  while (current.groupId && map.has(current.groupId)) current = map.get(current.groupId)!;
  return current.id;
}
export function isLocked(o: BoardObject, objects: BoardObject[]): boolean {
  if (o.locked || !o.groupId) return o.locked;
  const map = new Map(objects.map(o => [o.id, o])); let current: BoardObject | undefined = o;
  while (current) { if (current.locked) return true; current = current.groupId ? map.get(current.groupId) : undefined; } return false;
}
export type LineObject = Extract<BoardObject, { type: 'line' }>;
export const canConnect = (o: BoardObject) => ['shape', 'sticky', 'text', 'image'].includes(o.type);
export function lineWorldPoints(o: LineObject): Point[] {
  const points = o.routePoints.length > 1 ? o.routePoints.map(p => ({ x: o.x + p.x * o.width, y: o.y + p.y * o.height })) : (() => {
    const left = { x: o.x, y: o.y + (o.reversed ? o.height : 0) }, right = { x: o.x + o.width, y: o.y + (o.reversed ? 0 : o.height) };
    return o.startAtEnd ? [right, left] : [left, right];
  })();
  return points.map(p => rotatePoint(p, center(o), o.rotation));
}
export function lineEndpoints(o: LineObject): { start: Point; end: Point } {
  const points = lineWorldPoints(o); return { start: points[0], end: points.at(-1)! };
}
export function lineFromPoints(o: LineObject, points: Point[]): LineObject {
  const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y)), width = Math.max(...points.map(p => p.x)) - x, height = Math.max(...points.map(p => p.y)) - y;
  const start = points[0], end = points.at(-1)!;
  return { ...o, x, y, width, height, rotation: 0, startAtEnd: end.x < start.x, reversed: end.x !== start.x ? (end.x - start.x) * (end.y - start.y) < 0 : end.y < start.y, routePoints: points.map(p => ({ x: width ? Math.max(0, Math.min(1, (p.x - x) / width)) : 0, y: height ? Math.max(0, Math.min(1, (p.y - y) / height)) : 0 })) };
}
export const lineBetween = (o: LineObject, start: Point, end: Point) => lineFromPoints(o, [start, end]);
export function connectionAnchor(o: BoardObject, toward: Point): Point {
  const pivot = center(o), local = rotatePoint(toward, pivot, -o.rotation);
  const dx = local.x - pivot.x, dy = local.y - pivot.y, hw = o.width / 2, hh = o.height / 2;
  if (Math.hypot(dx, dy) < 1e-9) return rotatePoint({ x: pivot.x + hw, y: pivot.y }, pivot, o.rotation);
  let t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  if (o.type === 'shape' && o.shape === 'ellipse') t = 1 / Math.hypot(dx / hw, dy / hh);
  else if (o.type === 'shape' && o.shape === 'capsule') {
    const radius = Math.min(hw, hh); let low = 0, high = t;
    for (let pass = 0; pass < 40; pass++) {
      const mid = (low + high) / 2, x = Math.max(0, Math.abs(dx * mid) - hw + radius), y = Math.max(0, Math.abs(dy * mid) - hh + radius);
      if (x * x + y * y <= radius * radius) low = mid; else high = mid;
    }
    t = low;
  } else if (o.type === 'shape') {
    const polygon = shapePolygon(o);
    if (polygon) {
      t = Infinity;
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i], b = polygon[(i + 1) % polygon.length], ax = a.x - hw, ay = a.y - hh, sx = b.x - a.x, sy = b.y - a.y;
        const cross = dx * sy - dy * sx; if (Math.abs(cross) < 1e-9) continue;
        const distance = (ax * sy - ay * sx) / cross, segment = (ax * dy - ay * dx) / cross;
        if (distance >= 0 && segment >= -1e-9 && segment <= 1 + 1e-9) t = Math.min(t, distance);
      }
    }
  }
  return rotatePoint({ x: pivot.x + dx * t, y: pivot.y + dy * t }, pivot, o.rotation);
}
export const SIDE_NAMES: Record<AnchorSide, string> = { top: 'arriba', right: 'derecha', bottom: 'abajo', left: 'izquierda' };
const sideVectors: Record<AnchorSide, Point> = { top: { x: 0, y: -1 }, right: { x: 1, y: 0 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 } };
export function portPosition(o: BoardObject, side: AnchorSide): Point {
  const c = center(o), d = sideVectors[side];
  return connectionAnchor(o, rotatePoint({ x: c.x + d.x * o.width, y: c.y + d.y * o.height }, c, o.rotation));
}
export function facingSide(o: BoardObject, toward: Point): AnchorSide {
  const local = rotatePoint(toward, center(o), -o.rotation), dx = (local.x - center(o).x) / Math.max(1, o.width), dy = (local.y - center(o).y) / Math.max(1, o.height);
  return Math.abs(dx) >= Math.abs(dy) ? dx >= 0 ? 'right' : 'left' : dy >= 0 ? 'bottom' : 'top';
}
export function nearestSide(o: BoardObject, p: Point, toward?: Point): AnchorSide {
  const local = rotatePoint(p, center(o), -o.rotation), c = center(o);
  if (toward && Math.abs(local.x - c.x) < o.width * .22 && Math.abs(local.y - c.y) < o.height * .22) return facingSide(o, toward);
  return (Object.keys(sideVectors) as AnchorSide[]).reduce((best, side) => { const a = portPosition(o, best), b = portPosition(o, side); return Math.hypot(p.x - a.x, p.y - a.y) <= Math.hypot(p.x - b.x, p.y - b.y) ? best : side; }, 'top');
}
function cardinal(vector: Point): Point { return Math.abs(vector.x) >= Math.abs(vector.y) ? { x: Math.sign(vector.x) || 1, y: 0 } : { x: 0, y: Math.sign(vector.y) || 1 }; }
function portDirection(o: BoardObject, side: AnchorSide): Point {
  const c = center(o), d = sideVectors[side], p = rotatePoint({ x: c.x + d.x, y: c.y + d.y }, c, o.rotation); return cardinal({ x: p.x - c.x, y: p.y - c.y });
}
export function resolveConnector(o: LineObject, from?: BoardObject, to?: BoardObject, force = false): LineObject {
  const refs = { fromId: from?.id ?? null, toId: to?.id ?? null };
  if (!o.followsObjects && !force) return { ...o, ...refs };
  const points = lineWorldPoints(o), free = lineEndpoints(o);
  const fromAnchor = from ? o.fromAnchor ?? facingSide(from, to ? center(to) : free.end) : null;
  const toAnchor = to ? o.toAnchor ?? facingSide(to, from ? center(from) : free.start) : null;
  const start = o.followsObjects && from && fromAnchor ? portPosition(from, fromAnchor) : free.start, end = o.followsObjects && to && toAnchor ? portPosition(to, toAnchor) : free.end;
  const startDirection = o.followsObjects && from && fromAnchor ? portDirection(from, fromAnchor) : cardinal({ x: (points[1]?.x ?? end.x) - free.start.x, y: (points[1]?.y ?? end.y) - free.start.y });
  const endDirection = o.followsObjects && to && toAnchor ? portDirection(to, toAnchor) : cardinal({ x: (points.at(-2)?.x ?? start.x) - free.end.x, y: (points.at(-2)?.y ?? start.y) - free.end.y });
  const route = o.routing === 'straight' ? [start, end] : orthogonalRoute(start, end, startDirection, endDirection, o.followsObjects ? [from, to].filter((x): x is BoardObject => !!x).map(rotatedBounds) : [], o.bend);
  return lineFromPoints({ ...o, ...refs, fromAnchor, toAnchor }, route);
}
export function reconcile(objects: BoardObject[]): BoardObject[] {
  const map = new Map(objects.map(o => [o.id, o]));
  let out = objects.map(o => o.type === 'line' && (o.fromId || o.toId) ? resolveConnector(o, o.fromId ? map.get(o.fromId) : undefined, o.toId ? map.get(o.toId) : undefined) : o);
  for (let pass = 0; pass < 16; pass++) {
    const nextMap = new Map(out.map(o => [o.id, o])); let changed = false;
    out = out.map(o => {
      if (o.type !== 'group') return o;
      const children = o.children.map(c => nextMap.get(c)).filter((c): c is BoardObject => !!c), b = boundsOf(children);
      if (!b) return o;
      if (o.x !== b.x || o.y !== b.y || o.width !== b.width || o.height !== b.height) { changed = true; return { ...o, ...b, rotation: 0 }; } return o;
    }); if (!changed) break;
  }
  return out;
}
export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) if (((poly[i].y > p.y) !== (poly[j].y > p.y)) && p.x < (poly[j].x - poly[i].x) * (p.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) inside = !inside;
  return inside;
}
// Sparse spatial index. Large objects use a separate bucket to cap index growth.
export class SpatialIndex {
  private cells = new Map<string, BoardObject[]>(); private large: BoardObject[] = [];
  constructor(objects: BoardObject[], private cellSize = 500) {
    for (const o of objects) {
      if (o.type === 'group') continue;
      const b = rotatedBounds(o), x0 = Math.floor(b.x / cellSize), y0 = Math.floor(b.y / cellSize), x1 = Math.floor((b.x + b.width) / cellSize), y1 = Math.floor((b.y + b.height) / cellSize);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > 100) { this.large.push(o); continue; }
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const key = `${x},${y}`; const list = this.cells.get(key) ?? []; list.push(o); this.cells.set(key, list); }
    }
  }
  query(b: Bounds): BoardObject[] {
    const result = new Map<string, BoardObject>();
    const add = (o: BoardObject) => { if (!result.has(o.id) && intersects(rotatedBounds(o), b)) result.set(o.id, o); };
    const x0 = Math.floor(b.x / this.cellSize), x1 = Math.floor((b.x + b.width) / this.cellSize), y0 = Math.floor(b.y / this.cellSize), y1 = Math.floor((b.y + b.height) / this.cellSize);
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 10_000) { this.cells.forEach(list => list.forEach(add)); }
    else for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) this.cells.get(`${x},${y}`)?.forEach(add);
    this.large.forEach(add); return [...result.values()].sort((a, b) => a.zIndex - b.zIndex);
  }
}
