import { memo, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useEditor } from './store';
import { type Board, type BoardObject, type Point, type Viewport, makeObject, MAX_ZOOM, MIN_ZOOM } from '../models/document';
import { SpatialIndex, boundsOf, canConnect, center, connectionAnchor, descendants, intersects, isLocked, lineBetween, lineEndpoints, pointInPolygon, resolveConnector, rotatePoint, rootId, rotatedBounds, screenToWorld, zoomAt, type LineObject } from './geometry';
import { primitiveMarkup } from '../graphics/render';
import { Icon } from '../components/Icon';
import { CanvasBackground } from '../components/CanvasBackground';
import { type Tool, type ToolOptions } from './tools';

const ObjectView = memo(function ObjectView({ object, editing = false }: { object: BoardObject; editing?: boolean }) {
  return <g data-object={object.id} data-object-type={object.type} transform={`translate(${object.x} ${object.y}) rotate(${object.rotation} ${object.width / 2} ${object.height / 2})`} opacity={object.opacity} aria-label={object.label || ('text' in object ? object.text : object.type)}>
    {/* This markup is generated only from typed primitives and escaped text; imported SVG/HTML is never used. */}
    <g dangerouslySetInnerHTML={{ __html: primitiveMarkup(object, !editing) }}/>
    <rect width={object.width} height={object.height} fill="transparent" stroke="transparent" strokeWidth="8"/>
  </g>;
});
type Gesture = { kind: 'reconnect'; before: Board; object: LineObject; end: 'start' | 'end' } | { kind: 'pan'; start: Point; viewport: Viewport } | { kind: 'move' | 'resize' | 'rotate'; start: Point; before: Board; clickId?: string; pointerStart?: Point; moved?: boolean } | { kind: 'marquee' | 'lasso'; start: Point; points: Point[]; shift: boolean } | { kind: 'draw'; start: Point; points: (Point & { pressure: number })[]; object: BoardObject } | { kind: 'erase'; before: Board; removed: Set<string> };
export function Canvas({ tool, setTool, options, notify, onContext, onFileDrop, editRequest, onCopy, onCopyOptions, onProperties }: { tool: Tool; setTool: (t: Tool) => void; options: ToolOptions; notify: (s: string) => void; onContext: (p: Point) => void; onFileDrop: (file: File, point: Point) => Promise<void>; editRequest?: string | null; onCopy: () => void; onCopyOptions: () => void; onProperties: () => void }) {
  const board = useEditor(s => s.board), selected = useEditor(s => s.selected);
  const pane = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), gesture = useRef<Gesture | null>(null);
  const space = useRef(false), pointers = useRef(new Map<number, Point>()), pinch = useRef<{ distance: number; midpoint: Point; viewport: Viewport } | null>(null);
  const editBefore = useRef<Board | null>(null);
  const [size, setSize] = useState({ width: 1000, height: 700 }), [overlay, setOverlay] = useState<Point[]>([]), [draft, setDraft] = useState<BoardObject | null>(null), [editing, setEditing] = useState<string | null>(null), [editValue, setEditValue] = useState(''), [connector, setConnector] = useState<string | null>(null);
  const index = useMemo(() => new SpatialIndex(board.objects), [board.objects]);
  const v = board.viewport;
  const visible = useMemo(() => index.query({ x: (-v.x - 120) / v.zoom, y: (-v.y - 120) / v.zoom, width: (size.width + 240) / v.zoom, height: (size.height + 240) / v.zoom }), [index, v.x, v.y, v.zoom, size]);
  const chosen = useMemo(() => board.objects.filter(o => selected.includes(o.id)), [board.objects, selected]), bounds = boundsOf(chosen);
  const selectedAll = useMemo(() => descendants(board.objects, selected), [board.objects, selected]);
  const edit = board.objects.find(o => o.id === editing);
  const selectedLink = chosen.length === 1 && 'text' in chosen[0] ? chosen[0].text.match(/https?:\/\/[^\s<>"']+/)?.[0] : undefined;
  const point = (client: Point) => { const r = pane.current!.getBoundingClientRect(); return { x: client.x - r.left, y: client.y - r.top }; };
  const world = (e: { clientX: number; clientY: number }) => screenToWorld(point({ x: e.clientX, y: e.clientY }), useEditor.getState().board.viewport);
  const hit = (target: EventTarget | null) => (target as Element)?.closest?.('[data-object],[data-connect-from]')?.getAttribute('data-object') ?? (target as Element)?.closest?.('[data-connect-from]')?.getAttribute('data-connect-from');
  useEffect(() => { const el = pane.current!; const ro = new ResizeObserver(entries => { const r = entries[0].contentRect; setSize({ width: r.width, height: r.height }); }); ro.observe(el); return () => ro.disconnect(); }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes((e.target as Element).tagName)) { e.preventDefault(); space.current = true; } };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') space.current = false; };
    const blur = () => { space.current = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);
  useEffect(() => {
    const el = pane.current!;
    const wheel = (e: WheelEvent) => {
      e.preventDefault(); const s = useEditor.getState();
      if (e.ctrlKey || e.metaKey) s.viewport(zoomAt(s.board.viewport, point({ x: e.clientX, y: e.clientY }), Math.exp(-e.deltaY * 0.008)));
      else s.viewport({ ...s.board.viewport, x: s.board.viewport.x - e.deltaX, y: s.board.viewport.y - e.deltaY });
    }; el.addEventListener('wheel', wheel, { passive: false }); return () => el.removeEventListener('wheel', wheel);
  }, []);
  useEffect(() => { if (tool !== 'connector') setConnector(null); }, [tool]);
  useEffect(() => { setConnector(null); }, [board.id]);
  useEffect(() => { if (editRequest) beginEdit(editRequest); }, [editRequest]);
  useEffect(() => { editBefore.current = null; setEditing(null); }, [board.id]);
  function finishEdit(save = true) {
    const before = editBefore.current, s = useEditor.getState(); editBefore.current = null;
    if (before && before.id === s.board.id) {
      const original = before.objects.find(o => o.id === editing), current = s.board.objects.find(o => o.id === editing);
      if (!save || original && current && 'text' in original && 'text' in current && original.text === current.text) s.cancelPreview(before);
      else s.commit(s.board.objects, before);
    }
    setEditing(null);
  }
  function beginEdit(id: string) {
    const s = useEditor.getState(), o = s.board.objects.find(o => o.id === id);
    if (o && 'text' in o && !isLocked(o, s.board.objects)) { if (editBefore.current && editing === id) return; editBefore.current = s.board; s.select([id]); setEditing(id); setEditValue(o.text); }
  }
  function changeText(text: string) {
    setEditValue(text); const s = useEditor.getState();
    s.preview(s.board.objects.map(o => o.id === editing && 'text' in o ? { ...o, text } : o));
  }
  const eraseAt = (p: Point, g: Extract<Gesture, { kind: 'erase' }>) => {
    const nearby = index.query({ x: p.x - 8 / v.zoom, y: p.y - 8 / v.zoom, width: 16 / v.zoom, height: 16 / v.zoom });
    for (const o of nearby) if (!isLocked(o, g.before.objects)) for (const id of descendants(g.before.objects, [rootId(o, g.before.objects)])) g.removed.add(id);
    useEditor.getState().preview(g.before.objects.filter(o => !g.removed.has(o.id)));
  };
  function connectableAt(clientX: number, clientY: number, exclude?: string): BoardObject | undefined {
    const objects = useEditor.getState().board.objects;
    for (const element of document.elementsFromPoint(clientX, clientY)) {
      const id = hit(element), object = objects.find(o => o.id === id);
      if (object && object.id !== exclude && canConnect(object)) return object;
    }
  }
  function chooseConnector(id: string) {
    const s = useEditor.getState(), object = s.board.objects.find(o => o.id === id);
    if (!object || !canConnect(object)) { notify('Elige una figura, una nota, un texto o una imagen.'); return; }
    if (!connector) { setConnector(id); notify('Ahora selecciona el objeto de destino.'); return; }
    if (id !== connector) {
      s.add([makeObject('line', center(object), { fromId: connector, toId: id, stroke: options.color, strokeWidth: Math.max(1, options.width), arrow: 'end' })]);
      setConnector(null); setTool('select');
    }
  }
  function down(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault(); svg.current?.focus();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      if (gesture.current && 'before' in gesture.current) useEditor.getState().cancelPreview(gesture.current.before);
      gesture.current = null; setDraft(null); setOverlay([]);
      pinch.current = { distance: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y), midpoint: point({ x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }), viewport: useEditor.getState().board.viewport }; return;
    }
    finishEdit(); const p = world(e), s = useEditor.getState();
    if (space.current || tool === 'hand' || e.button === 1) { gesture.current = { kind: 'pan', start: { x: e.clientX, y: e.clientY }, viewport: s.board.viewport }; return; }
    const endpoint = (e.target as Element).getAttribute('data-line-end');
    if (endpoint && chosen.length === 1 && chosen[0].type === 'line' && !isLocked(chosen[0], board.objects)) {
      gesture.current = { kind: 'reconnect', before: s.board, object: chosen[0], end: endpoint as 'start' | 'end' }; return;
    }
    const sourceId = (e.target as Element).getAttribute('data-connect-from');
    if (sourceId && tool === 'select') {
      const object = makeObject('line', p, { fromId: sourceId, stroke: options.color, strokeWidth: Math.max(1, options.width), arrow: 'end', width: 0, height: 0 });
      gesture.current = { kind: 'draw', start: p, object, points: [] }; setDraft(object); return;
    }
    const handle = (e.target as Element).getAttribute('data-handle');
    if (handle && selected.length && chosen.every(o => !isLocked(o, board.objects))) { gesture.current = { kind: handle as 'resize' | 'rotate', start: p, before: s.board }; return; }
    let id = hit(e.target);
    if (tool === 'connector') { if (id) chooseConnector(id); else notify('Haz clic en una figura de origen y después en el destino.'); return; }
    if (tool === 'eraser') { const g: Extract<Gesture, { kind: 'erase' }> = { kind: 'erase', before: s.board, removed: new Set() }; gesture.current = g; eraseAt(p, g); return; }
    if (tool === 'select' && id) {
      const object = s.board.objects.find(o => o.id === id)!; if (!e.altKey) id = rootId(object, s.board.objects);
      const next = e.shiftKey || e.ctrlKey || e.metaKey ? selected.includes(id) ? selected.filter(c => c !== id) : [...selected, id] : selected.includes(id) ? selected : [id];
      s.select(next); if (!isLocked(object, s.board.objects) && next.includes(id)) gesture.current = { kind: 'move', start: p, before: s.board, pointerStart: { x: e.clientX, y: e.clientY }, clickId: next.length === 1 && object.id === id && !e.shiftKey && !e.ctrlKey && !e.metaKey ? id : undefined }; return;
    }
    if (tool === 'select' || tool === 'lasso') { if (!e.shiftKey) s.select([]); gesture.current = { kind: tool === 'lasso' ? 'lasso' : 'marquee', start: p, points: [p], shift: e.shiftKey }; setOverlay([p]); return; }
    const drawing = ['pen', 'marker', 'highlighter'].includes(tool), isLine = ['line', 'arrow', 'both'].includes(tool);
    let obj = makeObject(drawing ? 'ink' : isLine ? 'line' : tool === 'text' || tool === 'reaction' ? 'text' : tool === 'sticky' || tool === 'comment' ? 'sticky' : 'shape', p, {
      ...(drawing ? { tool: tool as 'pen' | 'marker' | 'highlighter', strokeWidth: tool === 'highlighter' ? Math.max(16, options.width) : tool === 'marker' ? Math.max(6, options.width) : options.width, opacity: tool === 'highlighter' ? Math.min(0.4, options.opacity) : options.opacity } : { strokeWidth: options.width, opacity: options.opacity }),
      ...(isLine ? { arrow: tool === 'line' ? 'none' : tool === 'both' ? 'both' : 'end', fromId: e.altKey ? null : connectableAt(e.clientX, e.clientY)?.id ?? null, strokeWidth: Math.max(1, options.width) } : {}),
      ...(!drawing && !isLine && !['text', 'sticky', 'reaction', 'comment'].includes(tool) ? { shape: tool as Extract<BoardObject, { type: 'shape' }>['shape'], fill: '#b5ddf5', stroke: '#242424', strokeWidth: 1.5 } : {}),
      stroke: options.color, ...(tool === 'text' ? { textColor: options.color } : {}),
      ...(tool === 'sticky' ? { fill: options.noteColor ?? '#ffe6a1', strokeWidth: 0 } : {}),
      ...(tool === 'comment' ? { fill: '#e8edff', label: 'Comentario local', strokeWidth: 0 } : {}),
      ...(tool === 'reaction' ? { text: options.reaction ?? '❤️', fontSize: 64, width: 100, height: 100, label: 'Reacción', strokeWidth: 0 } : {}),
    });
    if (['text', 'sticky', 'comment', 'reaction'].includes(tool)) { s.add([obj]); setTool('select'); if (tool !== 'reaction') beginEdit(obj.id); return; }
    obj = { ...obj, width: 1, height: 1 }; gesture.current = { kind: 'draw', start: p, object: obj, points: [{ ...p, pressure: e.pointerType === 'pen' ? e.pressure : 0.5 }] }; setDraft(obj);
  }
  function move(e: ReactPointerEvent<SVGSVGElement>) {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const p = [...pointers.current.values()], initial = pinch.current;
      const mid = point({ x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 });
      const next = zoomAt(initial.viewport, initial.midpoint, Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) / Math.max(1, initial.distance));
      useEditor.getState().viewport({ ...next, x: next.x + mid.x - initial.midpoint.x, y: next.y + mid.y - initial.midpoint.y }); return;
    }
    const g = gesture.current; if (!g) return; const p = world(e), s = useEditor.getState();
    if (g.kind === 'reconnect') {
      const endpoints = lineEndpoints(g.object), otherId = g.end === 'start' ? g.object.toId : g.object.fromId;
      const target = e.altKey ? undefined : connectableAt(e.clientX, e.clientY, otherId ?? undefined);
      const object = lineBetween({ ...g.object, [g.end === 'start' ? 'fromId' : 'toId']: target?.id ?? null }, g.end === 'start' ? p : endpoints.start, g.end === 'end' ? p : endpoints.end);
      s.preview(g.before.objects.map(o => o.id === object.id ? object : o)); return;
    }
    if (g.kind === 'pan') { s.viewport({ ...g.viewport, x: g.viewport.x + e.clientX - g.start.x, y: g.viewport.y + e.clientY - g.start.y }); return; }
    if (g.kind === 'move') { if (!g.moved && g.pointerStart && Math.hypot(e.clientX - g.pointerStart.x, e.clientY - g.pointerStart.y) < 4) return; g.moved = true; s.transform(g.before, p.x - g.start.x, p.y - g.start.y); return; }
    if (g.kind === 'resize') { const b = boundsOf(g.before.objects.filter(o => selected.includes(o.id))); if (b) { let sx = Math.max(0.03, (p.x - b.x) / b.width), sy = Math.max(0.03, (p.y - b.y) / b.height); if (e.shiftKey) sx = sy = Math.max(sx, sy); s.transform(g.before, 0, 0, sx, sy); } return; }
    if (g.kind === 'rotate') { const b = boundsOf(g.before.objects.filter(o => selected.includes(o.id))); if (b) { const c = center(b); let deg = (Math.atan2(p.y - c.y, p.x - c.x) - Math.atan2(g.start.y - c.y, g.start.x - c.x)) * 180 / Math.PI; if (e.shiftKey) deg = Math.round(deg / 15) * 15; s.transform(g.before, 0, 0, 1, 1, deg); } return; }
    if (g.kind === 'erase') { eraseAt(p, g); return; }
    if (g.kind === 'marquee') { g.points = [g.start, p]; setOverlay(g.points); return; }
    if (g.kind === 'lasso') { if (g.points.length < 5000) g.points.push(p); setOverlay([...g.points]); return; }
    if (g.kind === 'draw') {
      if (g.object.type === 'ink') {
        const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
        for (const event of events) { const q = world(event); const last = g.points[g.points.length - 1]; if (g.points.length < 10_000 && Math.hypot(q.x - last.x, q.y - last.y) > 0.8 / v.zoom) g.points.push({ ...q, pressure: e.pointerType === 'pen' ? event.pressure : 0.5 }); }
        const x = Math.min(...g.points.map(p => p.x)), y = Math.min(...g.points.map(p => p.y)), width = Math.max(1, ...g.points.map(p => p.x - x)), height = Math.max(1, ...g.points.map(p => p.y - y));
        g.object = { ...g.object, x, y, width, height, points: g.points.map(p => ({ x: (p.x - x) / width, y: (p.y - y) / height, pressure: p.pressure })) };
      } else {
        let dx = p.x - g.start.x, dy = p.y - g.start.y;
        if (e.shiftKey && g.object.type === 'shape') { const side = Math.max(Math.abs(dx), Math.abs(dy)); dx = Math.sign(dx || 1) * side; dy = Math.sign(dy || 1) * side; }
        g.object = { ...g.object, x: Math.min(g.start.x, g.start.x + dx), y: Math.min(g.start.y, g.start.y + dy), width: Math.max(g.object.type === 'line' ? 0 : 1, Math.abs(dx)), height: Math.max(g.object.type === 'line' ? 0 : 1, Math.abs(dy)), ...(g.object.type === 'line' ? { reversed: dx ? dx * dy < 0 : dy < 0, startAtEnd: dx < 0 } : {}) };
      }
      if (g.object.type === 'line') {
        const line = g.object, target = e.altKey ? undefined : connectableAt(e.clientX, e.clientY, line.fromId ?? undefined);
        g.object = resolveConnector({ ...line, toId: target?.id ?? null }, s.board.objects.find(o => o.id === line.fromId), target);
      }
      setDraft(g.object);
    }
  }
  function up(e: ReactPointerEvent<SVGSVGElement>, cancel = false) {
    pointers.current.delete(e.pointerId); if (pinch.current) { if (pointers.current.size < 2) pinch.current = null; gesture.current = null; return; }
    const g = gesture.current; gesture.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* capture already released */ }
    setOverlay([]); setDraft(null); if (!g) return;
    const s = useEditor.getState();
    if (cancel) { if ('before' in g) s.cancelPreview(g.before); return; }
    if (['move', 'resize', 'rotate', 'erase', 'reconnect'].includes(g.kind) && 'before' in g) { if (s.busy) s.commit(s.board.objects, g.before); if (g.kind === 'move' && !g.moved && g.clickId) beginEdit(g.clickId); return; }
    if (g.kind === 'draw') { if (g.object.width < 3 && g.object.height < 3 && g.object.type !== 'ink') g.object = { ...g.object, width: 180, height: 120 }; s.add([g.object]); if (g.object.type !== 'ink') setTool('select'); }
    if (g.kind === 'marquee' || g.kind === 'lasso') {
      const last = g.points[g.points.length - 1], box = { x: Math.min(g.start.x, last.x), y: Math.min(g.start.y, last.y), width: Math.abs(last.x - g.start.x), height: Math.abs(last.y - g.start.y) };
      const hits = s.board.objects.filter(o => o.type !== 'group' && (g.kind === 'lasso' ? g.points.length > 2 && pointInPolygon(center(o), g.points) : box.width > 3 && intersects(rotatedBounds(o), box))).map(o => rootId(o, s.board.objects));
      s.select([...new Set([...(g.shift ? s.selected : []), ...hits])]);
    }
  }
  function fit() { const b = boundsOf(board.objects); if (!b) { useEditor.getState().viewport({ x: 0, y: 0, zoom: 1 }); return; } const zoom = Math.max(0.05, Math.min(1.3, (size.width - 120) / b.width, (size.height - 160) / b.height)); useEditor.getState().viewport({ x: (size.width - b.width * zoom) / 2 - b.x * zoom, y: (size.height - b.height * zoom) / 2 - b.y * zoom, zoom }); }
  return <div ref={pane} className={`canvas-pane tool-${tool}`} data-testid="canvas-pane" onDragOver={e => { e.preventDefault(); }} onDrop={async e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) await onFileDrop(file, world(e)); }}>
    <svg ref={svg} className="board-canvas" data-testid="board-canvas" data-object-count={board.objects.filter(o => o.type !== 'group').length} role="application" aria-label="Editor de pizarra. Haz clic en una nota para escribir; arrástrala para moverla. Enter o F2 edita la selección." tabIndex={0} onKeyDown={e => { if (['Enter', 'F2'].includes(e.key) && selected.length === 1) { e.preventDefault(); e.stopPropagation(); beginEdit(selected[0]); } }} onPointerDown={down} onPointerMove={move} onPointerUp={e => up(e)} onPointerCancel={e => up(e, true)} onContextMenu={e => { e.preventDefault(); const id = hit(e.target); if (id && !selectedAll.has(id)) { const o = board.objects.find(o => o.id === id)!; useEditor.getState().select([rootId(o, board.objects)]); } onContext({ x: e.clientX, y: e.clientY }); }} onDoubleClick={e => { const id = hit(e.target); if (id) beginEdit(id); }}>
      <CanvasBackground board={board}/>
      <g transform={`translate(${v.x} ${v.y}) scale(${v.zoom})`}>
        {visible.map(o => <ObjectView key={o.id} object={o} editing={editing === o.id}/>)}
        {draft && <g pointerEvents="none"><ObjectView object={draft}/></g>}
        {connector && (() => { const o = board.objects.find(o => o.id === connector); return o ? <rect {...rotatedBounds(o)} className="selection-box"/> : null; })()}
        {bounds && tool === 'select' && <g className="selection-decoration"><rect x={bounds.x - 5 / v.zoom} y={bounds.y - 5 / v.zoom} width={bounds.width + 10 / v.zoom} height={bounds.height + 10 / v.zoom} className="selection-box" strokeWidth={1.5 / v.zoom}/>{chosen.every(o => !isLocked(o, board.objects)) && !(chosen.length === 1 && chosen[0].type === 'line') && <><line x1={bounds.x + bounds.width / 2} y1={bounds.y - 5 / v.zoom} x2={bounds.x + bounds.width / 2} y2={bounds.y - 30 / v.zoom} stroke="var(--accent)" strokeWidth={1 / v.zoom}/><circle data-handle="rotate" cx={bounds.x + bounds.width / 2} cy={bounds.y - 30 / v.zoom} r={7 / v.zoom} className="handle rotate-handle" strokeWidth={1.5 / v.zoom}/><rect data-handle="resize" x={bounds.x + bounds.width - 6 / v.zoom} y={bounds.y + bounds.height - 6 / v.zoom} width={12 / v.zoom} height={12 / v.zoom} rx={2 / v.zoom} className="handle resize-handle" strokeWidth={1.5 / v.zoom}/></>}</g>}
        {!editing && !draft && visible.filter(o => canConnect(o) && (tool === 'connector' || tool === 'select' && selected.length === 1 && selected[0] === o.id && !isLocked(o, board.objects))).map(o => {
          const c = center(o), directions = [{ x: c.x, y: o.y - o.height, label: 'arriba' }, { x: o.x + o.width * 2, y: c.y, label: 'derecha' }, { x: c.x, y: o.y + o.height * 2, label: 'abajo' }, { x: o.x - o.width, y: c.y, label: 'izquierda' }];
          return <g key={`anchors-${o.id}`} className="connection-points">{directions.map(direction => {
            const p = connectionAnchor(o, rotatePoint(direction, c, o.rotation));
            return <circle key={direction.label} data-connect-from={o.id} cx={p.x} cy={p.y} r={5 / v.zoom} strokeWidth={1.5 / v.zoom} className="connection-point" role="button" tabIndex={0} aria-label={`Conectar ${o.label || ('text' in o && o.text) || 'figura'} desde ${direction.label}`} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setTool('connector'); chooseConnector(o.id); } }}><title>Arrastra para conectar con otra figura</title></circle>;
          })}</g>;
        })}
        {!editing && !draft && tool === 'select' && chosen.length === 1 && chosen[0].type === 'line' && !isLocked(chosen[0], board.objects) && Object.entries(lineEndpoints(chosen[0])).map(([end, p]) => <circle key={end} data-line-end={end} cx={p.x} cy={p.y} r={6 / v.zoom} className="connection-point" strokeWidth={1.5 / v.zoom} aria-label={end === 'start' ? 'Extremo de origen' : 'Extremo de destino'}><title>Arrastra el extremo para unirlo a una figura</title></circle>)}
        {overlay.length > 1 && (tool === 'lasso' ? <polygon points={overlay.map(p => `${p.x},${p.y}`).join(' ')} className="marquee" strokeWidth={1 / v.zoom}/> : <rect x={Math.min(overlay[0].x, overlay[1].x)} y={Math.min(overlay[0].y, overlay[1].y)} width={Math.abs(overlay[1].x - overlay[0].x)} height={Math.abs(overlay[1].y - overlay[0].y)} className="marquee" strokeWidth={1 / v.zoom}/>)}
      </g>
    </svg>
    {tool === 'connector' && <div className="canvas-hint">{connector ? 'Selecciona el objeto de destino' : 'Selecciona el objeto de origen'}</div>}
    {bounds && !draft && tool === 'select' && <div className="selection-toolbar floating-panel" role="toolbar" aria-label="Acciones de selección" style={{ left: Math.max(8, Math.min(size.width - 285, (bounds.x + bounds.width / 2) * v.zoom + v.x - 135)), top: Math.max(10, Math.min(size.height - 150, bounds.y * v.zoom + v.y >= 110 ? bounds.y * v.zoom + v.y - 100 : (bounds.y + bounds.height) * v.zoom + v.y + 20)) }}>
      {chosen.length === 1 && 'text' in chosen[0] && <button className="icon-button" aria-label="Editar texto" title="Editar texto · Enter" disabled={isLocked(chosen[0], board.objects)} onClick={() => beginEdit(chosen[0].id)}><Icon name="pen" size={20}/></button>}
      {chosen.length === 1 && <input type="color" className="selection-color" aria-label="Color de la selección" title="Color de la selección" disabled={isLocked(chosen[0], board.objects)} value={chosen[0].type === 'text' ? chosen[0].textColor : ['line', 'ink'].includes(chosen[0].type) ? chosen[0].stroke : chosen[0].fill} onChange={e => useEditor.getState().patch(chosen[0].type === 'text' ? { textColor: e.target.value } : ['line', 'ink'].includes(chosen[0].type) ? { stroke: e.target.value } : { fill: e.target.value })}/>}
      {selectedLink && <a className="icon-button" aria-label="Abrir enlace" title="Abrir enlace" href={selectedLink} target="_blank" rel="noopener noreferrer"><Icon name="external" size={19}/></a>}
      <button className="icon-button" aria-label="Copiar objetos seleccionados" title="Copiar selección · Ctrl C" onClick={onCopy}><Icon name="copy" size={21}/></button><button className="icon-button" aria-label="Opciones de copia" title="Elegir destino de copia" onClick={onCopyOptions}><Icon name="chevron" size={16}/></button><button className="icon-button" aria-label="Eliminar selección" title="Eliminar" onClick={() => useEditor.getState().remove()}><Icon name="trash" size={21}/></button><button className="icon-button" aria-label="Mostrar propiedades" title="Propiedades y capas" onClick={onProperties}><Icon name="more" size={22}/></button>
    </div>}
    {edit && 'text' in edit && <textarea className="inline-editor" aria-label="Editar texto en lienzo" autoFocus placeholder={edit.type === 'sticky' ? 'Escribe una nota…' : 'Escribe aquí…'} value={editValue} maxLength={20_000} onChange={e => changeText(e.target.value)} onBlur={() => finishEdit()} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); finishEdit(false); svg.current?.focus(); } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); finishEdit(); svg.current?.focus(); } }} style={{ left: edit.x * v.zoom + v.x, top: edit.y * v.zoom + v.y, width: Math.max(24, edit.width * v.zoom), height: Math.max(24, edit.height * v.zoom), padding: (edit.type === 'text' ? 2 : 18) * v.zoom, fontSize: edit.fontSize * v.zoom, textAlign: edit.align, transform: `rotate(${edit.rotation}deg)`, background: edit.type === 'sticky' ? edit.fill : 'transparent', color: edit.textColor }}/ >}
    <div className="zoom-controls"><button className="icon-button" onClick={() => useEditor.getState().viewport(zoomAt(v, { x: size.width / 2, y: size.height / 2 }, 1 / 1.2))} title="Alejar" aria-label="Alejar" disabled={v.zoom <= MIN_ZOOM}><Icon name="minus" size={17}/></button><button onClick={() => useEditor.getState().viewport(zoomAt(v, { x: size.width / 2, y: size.height / 2 }, 1 / v.zoom))} title="Restablecer a 100 %">{Math.round(v.zoom * 100)} %</button><button className="icon-button" onClick={() => useEditor.getState().viewport(zoomAt(v, { x: size.width / 2, y: size.height / 2 }, 1.2))} title="Acercar" aria-label="Acercar" disabled={v.zoom >= MAX_ZOOM}><Icon name="plus" size={17}/></button><span/><button className="icon-button" onClick={fit} title="Ajustar contenido" aria-label="Ajustar contenido"><Icon name="fit" size={17}/></button></div>
  </div>;
}
