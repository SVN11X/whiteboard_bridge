import { memo, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useEditor } from './store';
import { type Board, type BoardObject, type Point, type Viewport, makeObject } from '../models/document';
import { SpatialIndex, boundsOf, center, descendants, intersects, isLocked, pointInPolygon, rootId, rotatedBounds, screenToWorld, zoomAt } from './geometry';
import { primitiveMarkup } from '../graphics/render';
import { Icon } from '../components/Icon';
import { type Tool, type ToolOptions } from './tools';

const ObjectView = memo(function ObjectView({ object }: { object: BoardObject }) {
  return <g data-object={object.id} transform={`translate(${object.x} ${object.y}) rotate(${object.rotation} ${object.width / 2} ${object.height / 2})`} opacity={object.opacity} aria-label={object.label || ('text' in object ? object.text : object.type)}>
    {/* This markup is generated only from typed primitives and escaped text; imported SVG/HTML is never used. */}
    <g dangerouslySetInnerHTML={{ __html: primitiveMarkup(object) }}/>
    <rect width={object.width} height={object.height} fill="transparent" stroke="transparent" strokeWidth="8"/>
  </g>;
});
type Gesture = { kind: 'pan'; start: Point; viewport: Viewport } | { kind: 'move' | 'resize' | 'rotate'; start: Point; before: Board } | { kind: 'marquee' | 'lasso'; start: Point; points: Point[]; shift: boolean } | { kind: 'draw'; start: Point; points: (Point & { pressure: number })[]; object: BoardObject } | { kind: 'erase'; before: Board; removed: Set<string> };
export function Canvas({ tool, setTool, options, notify, onContext, onFileDrop, onDoubleClick }: { tool: Tool; setTool: (t: Tool) => void; options: ToolOptions; notify: (s: string) => void; onContext: (p: Point) => void; onFileDrop: (file: File, point: Point) => Promise<void>; onDoubleClick?: () => void }) {
  const board = useEditor(s => s.board), selected = useEditor(s => s.selected);
  const pane = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), gesture = useRef<Gesture | null>(null);
  const space = useRef(false), pointers = useRef(new Map<number, Point>()), pinch = useRef<{ distance: number; midpoint: Point; viewport: Viewport } | null>(null);
  const [size, setSize] = useState({ width: 1000, height: 700 }), [overlay, setOverlay] = useState<Point[]>([]), [draft, setDraft] = useState<BoardObject | null>(null), [editing, setEditing] = useState<string | null>(null), [editValue, setEditValue] = useState(''), [connector, setConnector] = useState<string | null>(null);
  const index = useMemo(() => new SpatialIndex(board.objects), [board.objects]);
  const v = board.viewport;
  const visible = useMemo(() => index.query({ x: (-v.x - 120) / v.zoom, y: (-v.y - 120) / v.zoom, width: (size.width + 240) / v.zoom, height: (size.height + 240) / v.zoom }), [index, v.x, v.y, v.zoom, size]);
  const chosen = useMemo(() => board.objects.filter(o => selected.includes(o.id)), [board.objects, selected]), bounds = boundsOf(chosen);
  const selectedAll = useMemo(() => descendants(board.objects, selected), [board.objects, selected]);
  const edit = board.objects.find(o => o.id === editing);
  const point = (client: Point) => { const r = pane.current!.getBoundingClientRect(); return { x: client.x - r.left, y: client.y - r.top }; };
  const world = (e: { clientX: number; clientY: number }) => screenToWorld(point({ x: e.clientX, y: e.clientY }), useEditor.getState().board.viewport);
  const hit = (target: EventTarget | null) => (target as Element)?.closest?.('[data-object]')?.getAttribute('data-object');
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
  useEffect(() => { setConnector(null); }, [tool, board.id]);
  function finishEdit() { if (edit && 'text' in edit && edit.text !== editValue) { const s = useEditor.getState(); s.commit(s.board.objects.map(o => o.id === edit.id ? { ...o, text: editValue } as BoardObject : o)); } setEditing(null); }
  function beginEdit(id: string) { const o = board.objects.find(o => o.id === id); if (o && 'text' in o && !isLocked(o, board.objects)) { setEditing(id); setEditValue(o.text); } }
  const eraseAt = (p: Point, g: Extract<Gesture, { kind: 'erase' }>) => {
    const nearby = index.query({ x: p.x - 8 / v.zoom, y: p.y - 8 / v.zoom, width: 16 / v.zoom, height: 16 / v.zoom });
    for (const o of nearby) if (!isLocked(o, g.before.objects)) for (const id of descendants(g.before.objects, [rootId(o, g.before.objects)])) g.removed.add(id);
    useEditor.getState().preview(g.before.objects.filter(o => !g.removed.has(o.id)));
  };
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
    const handle = (e.target as Element).getAttribute('data-handle');
    if (handle && selected.length && chosen.every(o => !isLocked(o, board.objects))) { gesture.current = { kind: handle as 'resize' | 'rotate', start: p, before: s.board }; return; }
    let id = hit(e.target);
    if (tool === 'connector') {
      if (!id) { notify('Haz clic en un objeto de origen y después en el destino.'); return; }
      if (!connector) { setConnector(id); notify('Ahora selecciona el objeto de destino.'); return; }
      if (id !== connector) { s.add([makeObject('line', p, { fromId: connector, toId: id, stroke: options.color, arrow: 'end' })]); setConnector(null); setTool('select'); } return;
    }
    if (tool === 'eraser') { const g: Extract<Gesture, { kind: 'erase' }> = { kind: 'erase', before: s.board, removed: new Set() }; gesture.current = g; eraseAt(p, g); return; }
    if (tool === 'select' && id) {
      const object = s.board.objects.find(o => o.id === id)!; if (!e.altKey) id = rootId(object, s.board.objects);
      const next = e.shiftKey || e.ctrlKey || e.metaKey ? selected.includes(id) ? selected.filter(c => c !== id) : [...selected, id] : selected.includes(id) ? selected : [id];
      s.select(next); if (!isLocked(object, s.board.objects) && next.includes(id)) gesture.current = { kind: 'move', start: p, before: s.board }; return;
    }
    if (tool === 'select' || tool === 'lasso') { if (!e.shiftKey) s.select([]); gesture.current = { kind: tool === 'lasso' ? 'lasso' : 'marquee', start: p, points: [p], shift: e.shiftKey }; setOverlay([p]); return; }
    const drawing = ['pen', 'marker', 'highlighter'].includes(tool), isLine = ['line', 'arrow', 'both'].includes(tool);
    let obj = makeObject(drawing ? 'ink' : isLine ? 'line' : tool === 'text' ? 'text' : tool === 'sticky' ? 'sticky' : 'shape', p, {
      ...(drawing ? { tool: tool as 'pen' | 'marker' | 'highlighter', strokeWidth: tool === 'highlighter' ? Math.max(16, options.width) : tool === 'marker' ? Math.max(6, options.width) : options.width, opacity: tool === 'highlighter' ? Math.min(0.4, options.opacity) : options.opacity } : { strokeWidth: options.width, opacity: options.opacity }),
      ...(isLine ? { arrow: tool === 'line' ? 'none' : tool === 'both' ? 'both' : 'end' } : {}),
      ...(!drawing && !isLine && tool !== 'text' && tool !== 'sticky' ? { shape: tool as 'rect' | 'ellipse' | 'triangle' | 'diamond' } : {}),
      stroke: options.color, ...(tool === 'text' ? { textColor: options.color } : {}),
    });
    if (tool === 'text' || tool === 'sticky') { s.add([obj]); setTool('select'); if (tool === 'text') { setEditing(obj.id); setEditValue(obj.type === 'text' ? obj.text : ''); } return; }
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
    if (g.kind === 'pan') { s.viewport({ ...g.viewport, x: g.viewport.x + e.clientX - g.start.x, y: g.viewport.y + e.clientY - g.start.y }); return; }
    if (g.kind === 'move') { s.transform(g.before, p.x - g.start.x, p.y - g.start.y); return; }
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
        g.object = { ...g.object, x: Math.min(g.start.x, g.start.x + dx), y: Math.min(g.start.y, g.start.y + dy), width: Math.max(1, Math.abs(dx)), height: Math.max(1, Math.abs(dy)), ...(g.object.type === 'line' ? { reversed: dx * dy < 0, startAtEnd: dx < 0 } : {}) };
      } setDraft(g.object);
    }
  }
  function up(e: ReactPointerEvent<SVGSVGElement>, cancel = false) {
    pointers.current.delete(e.pointerId); if (pinch.current) { if (pointers.current.size < 2) pinch.current = null; gesture.current = null; return; }
    const g = gesture.current; gesture.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* capture already released */ }
    setOverlay([]); setDraft(null); if (!g) return;
    const s = useEditor.getState();
    if (cancel) { if ('before' in g) s.cancelPreview(g.before); return; }
    if (['move', 'resize', 'rotate', 'erase'].includes(g.kind) && 'before' in g) { if (s.busy) s.commit(s.board.objects, g.before); return; }
    if (g.kind === 'draw') { if (g.object.width < 3 && g.object.height < 3 && g.object.type !== 'ink') g.object = { ...g.object, width: 180, height: 120 }; s.add([g.object]); if (g.object.type !== 'ink') setTool('select'); }
    if (g.kind === 'marquee' || g.kind === 'lasso') {
      const last = g.points[g.points.length - 1], box = { x: Math.min(g.start.x, last.x), y: Math.min(g.start.y, last.y), width: Math.abs(last.x - g.start.x), height: Math.abs(last.y - g.start.y) };
      const hits = s.board.objects.filter(o => o.type !== 'group' && (g.kind === 'lasso' ? g.points.length > 2 && pointInPolygon(center(o), g.points) : box.width > 3 && intersects(rotatedBounds(o), box))).map(o => rootId(o, s.board.objects));
      s.select([...new Set([...(g.shift ? s.selected : []), ...hits])]);
    }
  }
  function fit() { const b = boundsOf(board.objects); if (!b) { useEditor.getState().viewport({ x: 0, y: 0, zoom: 1 }); return; } const zoom = Math.max(0.05, Math.min(1.3, (size.width - 120) / b.width, (size.height - 160) / b.height)); useEditor.getState().viewport({ x: (size.width - b.width * zoom) / 2 - b.x * zoom, y: (size.height - b.height * zoom) / 2 - b.y * zoom, zoom }); }
  return <div ref={pane} className={`canvas-pane tool-${tool}`} data-testid="canvas-pane" onDragOver={e => { e.preventDefault(); }} onDrop={async e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) await onFileDrop(file, world(e)); }}>
    <svg ref={svg} className="board-canvas" data-testid="board-canvas" role="application" aria-label="Editor de pizarra. V para seleccionar, N para crear nota, flechas para mover, ayuda en el botón Atajos." tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={e => up(e)} onPointerCancel={e => up(e, true)} onContextMenu={e => { e.preventDefault(); const id = hit(e.target); if (id && !selectedAll.has(id)) { const o = board.objects.find(o => o.id === id)!; useEditor.getState().select([rootId(o, board.objects)]); } onContext({ x: e.clientX, y: e.clientY }); }} onDoubleClick={e => { const id = hit(e.target); if (id) beginEdit(id); onDoubleClick?.(); }}>
      <defs><pattern id="dots" width={24 * v.zoom} height={24 * v.zoom} patternUnits="userSpaceOnUse" x={v.x % (24 * v.zoom)} y={v.y % (24 * v.zoom)}><circle cx={1} cy={1} r={0.8} fill="var(--dot)"/></pattern></defs>
      <rect width="100%" height="100%" fill="var(--canvas)"/><rect width="100%" height="100%" fill="url(#dots)"/>
      <g transform={`translate(${v.x} ${v.y}) scale(${v.zoom})`}>
        {visible.map(o => <ObjectView key={o.id} object={o}/>)}
        {draft && <ObjectView object={draft}/>}
        {connector && (() => { const o = board.objects.find(o => o.id === connector); return o ? <rect {...rotatedBounds(o)} className="selection-box"/> : null; })()}
        {bounds && <g className="selection-decoration"><rect x={bounds.x - 5 / v.zoom} y={bounds.y - 5 / v.zoom} width={bounds.width + 10 / v.zoom} height={bounds.height + 10 / v.zoom} className="selection-box" strokeWidth={1.5 / v.zoom}/>{chosen.every(o => !isLocked(o, board.objects)) && <><line x1={bounds.x + bounds.width / 2} y1={bounds.y - 5 / v.zoom} x2={bounds.x + bounds.width / 2} y2={bounds.y - 30 / v.zoom} stroke="var(--accent)" strokeWidth={1 / v.zoom}/><circle data-handle="rotate" cx={bounds.x + bounds.width / 2} cy={bounds.y - 30 / v.zoom} r={7 / v.zoom} className="handle rotate-handle" strokeWidth={1.5 / v.zoom}/><rect data-handle="resize" x={bounds.x + bounds.width - 6 / v.zoom} y={bounds.y + bounds.height - 6 / v.zoom} width={12 / v.zoom} height={12 / v.zoom} rx={2 / v.zoom} className="handle resize-handle" strokeWidth={1.5 / v.zoom}/></>}</g>}
        {overlay.length > 1 && (tool === 'lasso' ? <polygon points={overlay.map(p => `${p.x},${p.y}`).join(' ')} className="marquee" strokeWidth={1 / v.zoom}/> : <rect x={Math.min(overlay[0].x, overlay[1].x)} y={Math.min(overlay[0].y, overlay[1].y)} width={Math.abs(overlay[1].x - overlay[0].x)} height={Math.abs(overlay[1].y - overlay[0].y)} className="marquee" strokeWidth={1 / v.zoom}/>)}
      </g>
    </svg>
    <div className="canvas-caption"><span className="dot"/> TU ESPACIO DE IDEAS <span className="caption-line"/> <span>{tool === 'connector' ? connector ? 'Selecciona el destino' : 'Selecciona el origen' : 'Sin límites para imaginar'}</span></div>
    {edit && 'text' in edit && <textarea className="inline-editor" aria-label="Editar texto en lienzo" autoFocus value={editValue} maxLength={20_000} onChange={e => setEditValue(e.target.value)} onBlur={finishEdit} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) finishEdit(); }} style={{ left: edit.x * v.zoom + v.x, top: edit.y * v.zoom + v.y, width: Math.max(140, edit.width * v.zoom), height: Math.max(75, edit.height * v.zoom), fontSize: edit.fontSize * v.zoom, transform: `rotate(${edit.rotation}deg)`, background: edit.type === 'sticky' ? edit.fill : 'var(--surface)', color: edit.textColor }}/ >}
    <div className="zoom-controls"><button className="icon-button" onClick={() => useEditor.getState().viewport(zoomAt(v, { x: size.width / 2, y: size.height / 2 }, 1 / 1.2))} title="Alejar" aria-label="Alejar"><Icon name="minus" size={17}/></button><button onClick={() => useEditor.getState().viewport(zoomAt(v, { x: size.width / 2, y: size.height / 2 }, 1 / v.zoom))} title="Restablecer a 100 %">{Math.round(v.zoom * 100)} %</button><button className="icon-button" onClick={() => useEditor.getState().viewport(zoomAt(v, { x: size.width / 2, y: size.height / 2 }, 1.2))} title="Acercar" aria-label="Acercar"><Icon name="plus" size={17}/></button><span/><button className="icon-button" onClick={fit} title="Ajustar contenido" aria-label="Ajustar contenido"><Icon name="fit" size={17}/></button></div>
    <div className="canvas-count" data-testid="object-count">{board.objects.filter(o => o.type !== 'group').length} objetos{selected.length ? ` · ${selected.length} seleccionados` : ''}<span>SVG · {visible.length} visibles</span></div>
  </div>;
}
