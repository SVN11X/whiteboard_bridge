import type { BoardObject, Point, Viewport } from '../models/document';
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
  const w = screenToWorld(p, v), zoom = Math.max(0.05, Math.min(8, v.zoom * factor));
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
export function reconcile(objects: BoardObject[]): BoardObject[] {
  const map = new Map(objects.map(o => [o.id, o]));
  let out = objects.map(o => {
    if (o.type !== 'line' || (!o.fromId && !o.toId)) return o;
    const from = o.fromId ? map.get(o.fromId) : undefined, to = o.toId ? map.get(o.toId) : undefined;
    const a = from ? center(from) : { x: o.x, y: o.y + (o.reversed ? o.height : 0) };
    const b = to ? center(to) : { x: o.x + o.width, y: o.y + (o.reversed ? 0 : o.height) };
    return { ...o, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.max(1, Math.abs(b.x - a.x)), height: Math.max(1, Math.abs(b.y - a.y)), rotation: 0, startAtEnd: a.x > b.x, reversed: (a.x <= b.x) !== (a.y <= b.y), fromId: from?.id ?? null, toId: to?.id ?? null };
  });
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
