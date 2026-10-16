import { create } from 'zustand';
import { createBoard, uid, MAX_OBJECTS, type Board, type BoardObject, type Viewport } from '../models/document';
import { boundsOf, center, descendants, isLocked, reconcile, rotatePoint } from './geometry';

type State = {
  board: Board; selected: string[]; past: Board[]; future: Board[]; revision: number; busy: boolean;
  load: (b: Board) => void;
  select: (ids: string[]) => void;
  commit: (objects: BoardObject[], previous?: Board) => void;
  preview: (objects: BoardObject[]) => void;
  cancelPreview: (b: Board) => void;
  add: (objects: BoardObject[]) => void;
  patch: (changes: Record<string, unknown>) => void;
  remove: () => void;
  duplicate: () => void;
  undo: () => void; redo: () => void;
  viewport: (v: Viewport) => void; rename: (name: string) => void;
  background: (value: Board['background']) => void;
  group: () => void; ungroup: () => void;
  arrange: (mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'horizontal' | 'vertical') => void;
  layer: (mode: 'front' | 'back') => void;
  transform: (b: Board, dx: number, dy: number, sx?: number, sy?: number, degrees?: number) => void;
};
function history(past: Board[], board: Board): Board[] {
  // Structural sharing keeps ordinary edits small; cap snapshots for large imported images/ink.
  const max = board.objects.length > 5000 ? 8 : 50;
  return [...past.slice(-(max - 1)), board];
}
export function cloneObjects(objects: BoardObject[], dx = 32, dy = 32): BoardObject[] {
  const ids = new Map(objects.map(o => [o.id, uid()]));
  return objects.map(o => ({ ...structuredClone(o), id: ids.get(o.id)!, x: o.x + dx, y: o.y + dy,
    groupId: o.groupId ? ids.get(o.groupId) ?? null : null,
    ...(o.type === 'group' ? { children: o.children.filter(c => ids.has(c)).map(c => ids.get(c)!) } : {}),
    ...(o.type === 'line' ? { fromId: o.fromId ? ids.get(o.fromId) ?? null : null, toId: o.toId ? ids.get(o.toId) ?? null : null } : {}),
  } as BoardObject));
}
export const useEditor = create<State>((set, get) => ({
  board: createBoard('Whiteboard'), selected: [], past: [], future: [], revision: 0, busy: false,
  load: board => set({ board, selected: [], past: [], future: [], revision: 0, busy: false }),
  select: selected => set({ selected }),
  commit: (objects, previous) => set(s => ({ board: { ...s.board, objects: reconcile(objects), updatedAt: new Date().toISOString() }, past: history(s.past, previous ?? s.board), future: [], revision: s.revision + 1, busy: false })),
  preview: objects => set(s => ({ board: { ...s.board, objects: reconcile(objects) }, busy: true })),
  cancelPreview: board => set({ board, busy: false }),
  add: objects => {
    const s = get(); if (s.board.objects.length + objects.length > MAX_OBJECTS) throw new Error('Límite de 20.000 objetos.');
    let points = 0, images = 0;
    for (const o of [...s.board.objects, ...objects]) { if (o.type === 'ink') points += o.points.length; if (o.type === 'image') images += o.dataUrl.length; }
    if (points > 500_000 || images > 24_000_000) throw new Error('Límite del documento: 500.000 puntos o 24 MB de imágenes. Exporta y crea otra pizarra.');
    const z = Math.max(0, ...s.board.objects.map(o => o.zIndex)) + 1;
    get().commit([...s.board.objects, ...objects.map((o, i) => ({ ...o, zIndex: z + i }))]);
    set({ selected: objects.filter(o => !o.groupId || !objects.some(p => p.id === o.groupId)).map(o => o.id) });
  },
  patch: changes => {
    const s = get(), ids = descendants(s.board.objects, s.selected);
    get().commit(s.board.objects.map(o => ids.has(o.id) && (!isLocked(o, s.board.objects) || 'locked' in changes) ? { ...o, ...changes } as BoardObject : o));
  },
  remove: () => {
    const s = get(), ids = descendants(s.board.objects, s.selected.filter(id => { const o = s.board.objects.find(o => o.id === id); return o && !isLocked(o, s.board.objects); }));
    if (!ids.size) return;
    let changed = true;
    while (changed) { changed = false; for (const o of s.board.objects) if (o.type === 'group' && !ids.has(o.id) && o.children.every(id => ids.has(id))) { ids.add(o.id); changed = true; } }
    const objects = s.board.objects.filter(o => !ids.has(o.id)).map(o => o.type === 'group' ? { ...o, children: o.children.filter(id => !ids.has(id)) } : o);
    get().commit(objects); set({ selected: [] });
  },
  duplicate: () => { const s = get(), ids = descendants(s.board.objects, s.selected); get().add(cloneObjects(s.board.objects.filter(o => ids.has(o.id)))); },
  undo: () => set(s => s.past.length ? { board: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.board, ...s.future], selected: [], revision: s.revision + 1 } : {}),
  redo: () => set(s => s.future.length ? { board: s.future[0], future: s.future.slice(1), past: history(s.past, s.board), selected: [], revision: s.revision + 1 } : {}),
  viewport: viewport => set(s => ({ board: { ...s.board, viewport } })),
  background: background => set(s => ({ board: { ...s.board, background, updatedAt: new Date().toISOString() }, past: history(s.past, s.board), future: [], revision: s.revision + 1 })),
  rename: name => { if (name.trim()) set(s => ({ board: { ...s.board, name: name.trim().slice(0, 120), updatedAt: new Date().toISOString() }, revision: s.revision + 1 })); },
  group: () => {
    const s = get(), selected = s.board.objects.filter(o => s.selected.includes(o.id) && !isLocked(o, s.board.objects) && !o.groupId), b = boundsOf(selected);
    if (!b || selected.length < 2) return;
    const id = uid(), members = new Set(selected.map(o => o.id));
    const group: BoardObject = { id, type: 'group', ...b, rotation: 0, zIndex: Math.max(...selected.map(o => o.zIndex)), opacity: 1, locked: false, groupId: null, fill: '#ffffff', stroke: '#24574e', strokeWidth: 0, label: 'Grupo', children: [...members] };
    get().commit([...s.board.objects.map(o => members.has(o.id) ? { ...o, groupId: id } : o), group]); set({ selected: [id] });
  },
  ungroup: () => {
    const s = get(), groups = s.board.objects.filter(o => o.type === 'group' && s.selected.includes(o.id) && !isLocked(o, s.board.objects));
    const groupIds = new Set(groups.map(o => o.id)), map = new Map(s.board.objects.map(o => [o.id, o]));
    const expand = (id: string): string[] => { const o = map.get(id); return o?.type === 'group' && groupIds.has(id) ? o.children.flatMap(expand) : [id]; };
    get().commit(s.board.objects.filter(o => !groupIds.has(o.id)).map(o => {
      let parent = o.groupId; while (parent && groupIds.has(parent)) parent = map.get(parent)?.groupId ?? null;
      return { ...o, groupId: parent, ...(o.type === 'group' ? { children: o.children.flatMap(expand) } : {}) } as BoardObject;
    }));
    set({ selected: [...new Set(groups.flatMap(o => o.type === 'group' ? o.children.flatMap(expand) : []))] });
  },
  arrange: mode => {
    const s = get(), roots = s.board.objects.filter(o => s.selected.includes(o.id) && !isLocked(o, s.board.objects)), all = boundsOf(roots); if (!all || roots.length < 2) return;
    const shifts = new Map<string, { dx: number; dy: number }>();
    const horizontal = mode === 'horizontal', vertical = mode === 'vertical';
    const sorted = [...roots].sort((a, b) => horizontal ? a.x - b.x : a.y - b.y);
    const total = roots.reduce((sum, o) => sum + (horizontal ? o.width : o.height), 0), gap = ((horizontal ? all.width : all.height) - total) / Math.max(1, roots.length - 1);
    let cursor = horizontal ? all.x : all.y;
    for (const o of horizontal || vertical ? sorted : roots) {
      const dx = mode === 'left' ? all.x - o.x : mode === 'center' ? all.x + (all.width - o.width) / 2 - o.x : mode === 'right' ? all.x + all.width - o.x - o.width : horizontal ? cursor - o.x : 0;
      const dy = mode === 'top' ? all.y - o.y : mode === 'middle' ? all.y + (all.height - o.height) / 2 - o.y : mode === 'bottom' ? all.y + all.height - o.y - o.height : vertical ? cursor - o.y : 0;
      for (const id of descendants(s.board.objects, [o.id])) shifts.set(id, { dx, dy });
      cursor += (horizontal ? o.width : o.height) + gap;
    }
    get().commit(s.board.objects.map(o => { const d = shifts.get(o.id); return d ? { ...o, x: o.x + d.dx, y: o.y + d.dy } : o; }));
  },
  layer: mode => { const s = get(), ids = descendants(s.board.objects, s.selected), z = mode === 'front' ? Math.max(0, ...s.board.objects.map(o => o.zIndex)) + 1 : Math.min(0, ...s.board.objects.map(o => o.zIndex)) - ids.size - 1; let i = 0; get().commit(s.board.objects.map(o => ids.has(o.id) && !isLocked(o, s.board.objects) ? { ...o, zIndex: z + i++ } : o)); },
  transform: (before, dx, dy, sx = 1, sy = 1, degrees = 0) => {
    const s = get(), ids = descendants(before.objects, s.selected), selected = before.objects.filter(o => s.selected.includes(o.id)), bounds = boundsOf(selected); if (!bounds) return;
    const pivot = center(bounds);
    get().preview(before.objects.map(o => {
      if (!ids.has(o.id) || o.type === 'group' || isLocked(o, before.objects)) return o;
      const c = rotatePoint(center(o), pivot, degrees);
      return { ...o, x: degrees ? c.x - o.width / 2 : bounds.x + (o.x - bounds.x) * sx + dx, y: degrees ? c.y - o.height / 2 : bounds.y + (o.y - bounds.y) * sy + dy, width: Math.max(1, Math.min(100_000, o.width * sx)), height: Math.max(1, Math.min(100_000, o.height * sy)), rotation: ((o.rotation + degrees) % 360 + 360) % 360 };
    }));
  },
}));
