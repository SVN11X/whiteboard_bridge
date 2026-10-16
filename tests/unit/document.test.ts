import { describe, expect, it } from 'vitest';
import { createBoard, demoBoard, deserializeBoard, makeObject, parseBoard, serializeBoard } from '../../src/models/document';
import { cloneObjects, useEditor } from '../../src/editor/store';
import { boundsOf, center, connectionAnchor, descendants, lineEndpoints, reconcile, rotatePoint, rotatedBounds, screenToWorld, SpatialIndex, zoomAt } from '../../src/editor/geometry';
import { primitiveMarkup, svgFor, wrapText } from '../../src/graphics/render';
import { WebCustomAdapter } from '../../src/clipboard/adapters';
import { validateObservation, type LabRecord } from '../../src/interoperability/experiments';

describe('Documentos y migración', () => {
  it('recupera un documento completo sin perder identidades o propiedades', () => { const b = demoBoard(); expect(deserializeBoard(serializeBoard(b))).toEqual(b); });
  it('migra el JSON real del laboratorio anterior', () => { const b = deserializeBoard(JSON.stringify({ version: 1, objects: [{ id: 'o1', type: 'note', x: 10, y: 20, w: 200, h: 180, color: '#f8df84', text: 'Conservado' }, { type: 'ellipse', x: 40, y: 50, w: 100, h: 70, color: '#ff0000', text: '' }] })); expect(b.version).toBe(2); expect(b.objects[0]).toMatchObject({ type: 'sticky', text: 'Conservado', width: 200, x: 10 }); expect(b.objects[1]).toMatchObject({ type: 'shape', shape: 'ellipse' }); });
  it('rechaza valores no finitos, IDs duplicados, versiones futuras e imágenes activas', () => {
    const b = demoBoard(); expect(() => parseBoard({ ...b, version: 99 })).toThrow();
    expect(() => parseBoard({ ...b, objects: [...b.objects, b.objects[0]] })).toThrow();
    expect(() => parseBoard({ ...b, objects: [{ ...b.objects[0], x: Infinity }] })).toThrow();
    expect(() => parseBoard({ ...b, objects: [makeObject('image', { x: 0, y: 0 }, { dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' })] })).toThrow();
  });
  it('rechaza relaciones rotas y ciclos en los grupos', () => {
    const b = createBoard(), a = makeObject('group', { x: 0, y: 0 }), c = makeObject('group', { x: 0, y: 0 });
    if (a.type !== 'group' || c.type !== 'group') return;
    a.groupId = c.id; a.children = [c.id]; c.groupId = a.id; c.children = [a.id]; b.objects = [a, c]; expect(() => parseBoard(b)).toThrow(/cíclico/);
  });
});
describe('Geometría y coordenadas', () => {
  it('mantiene el punto del mundo debajo del cursor al ampliar', () => { const v = { x: 125, y: -60, zoom: 0.6 }, p = { x: 631, y: 323 }; const before = screenToWorld(p, v), after = screenToWorld(p, zoomAt(v, p, 1.8)); expect(after.x).toBeCloseTo(before.x); expect(after.y).toBeCloseTo(before.y); });
  it('limita el zoom al 500% y conserva el punto del cursor incluso en el límite', () => {
    const v = { x: 125, y: -60, zoom: 4.9 }, p = { x: 631, y: 323 }, next = zoomAt(v, p, 10);
    expect(next.zoom).toBe(5); expect(screenToWorld(p, next).x).toBeCloseTo(screenToWorld(p, v).x);
    useEditor.getState().load(createBoard()); useEditor.getState().viewport({ ...v, zoom: 12 }); expect(useEditor.getState().board.viewport.zoom).toBe(5);
    expect(zoomAt(v, p, .0001).zoom).toBe(.05);
  });
  it('normaliza vistas antiguas de 800% sin perder objetos ni modificar el archivo original', () => {
    const b = demoBoard(); b.viewport.zoom = 8; const parsed = parseBoard(b);
    expect(parsed.viewport.zoom).toBe(5); expect(parsed.objects).toEqual(b.objects); expect(b.viewport.zoom).toBe(8);
    expect(() => parseBoard({ ...b, viewport: { ...b.viewport, zoom: Infinity } })).toThrow();
  });
  it('incluye las esquinas de objetos rotados en la selección', () => { const o = makeObject('shape', { x: 0, y: 0 }, { width: 100, height: 20, rotation: 90 }); const b = rotatedBounds(o); expect(b.width).toBeCloseTo(20); expect(b.height).toBeCloseTo(100); });
  it('el índice maneja posiciones negativas y objetos grandes', () => { const objects = [makeObject('shape', { x: -600, y: -100 }), makeObject('shape', { x: 20_000, y: 20_000 }), makeObject('shape', { x: -5000, y: -5000 }, { width: 100_000, height: 100_000 })]; const index = new SpatialIndex(objects); expect(index.query({ x: -650, y: -150, width: 300, height: 300 }).map(o => o.id)).toEqual([objects[0].id, objects[2].id]); });
  it('recalcula conectores cuando se mueven sus extremos', () => { const a = makeObject('shape', { x: 600, y: 100 }), b = makeObject('shape', { x: 0, y: 0 }), line = makeObject('line', { x: 0, y: 0 }, { fromId: a.id, toId: b.id }); const reconciled = reconcile([a, b, line]); const result = reconciled[2]; if (result.type !== 'line') throw new Error('Línea esperada'); const { start, end } = lineEndpoints(result); expect(start.x).toBeCloseTo(600); expect(end.x).toBeCloseTo(200); expect(start.y).toBeCloseTo(165); expect(end.y).toBeCloseTo(65); });
  it('ancla la flecha al contorno de una elipse rotada y de un triángulo', () => {
    const ellipse = makeObject('shape', { x: 100, y: 80 }, { shape: 'ellipse', width: 200, height: 100, rotation: 35 });
    const anchor = connectionAnchor(ellipse, { x: 600, y: 220 }), local = rotatePoint(anchor, center(ellipse), -35);
    expect(((local.x - 200) / 100) ** 2 + ((local.y - 130) / 50) ** 2).toBeCloseTo(1);
    const triangle = makeObject('shape', { x: 0, y: 0 }, { shape: 'triangle', width: 200, height: 100 });
    expect(connectionAnchor(triangle, { x: 500, y: 50 })).toEqual({ x: 150, y: 50 });
  });
  it('conserva conectores verticales exactos y su dirección al borrar el origen', () => {
    const a = makeObject('shape', { x: 0, y: 400 }), b = makeObject('shape', { x: 0, y: 0 });
    const line = reconcile([a, b, makeObject('line', { x: 0, y: 0 }, { fromId: a.id, toId: b.id })])[2];
    if (line.type !== 'line') throw new Error('Línea esperada');
    expect(line.width).toBe(0); expect(lineEndpoints(line)).toEqual({ start: { x: 100, y: 400 }, end: { x: 100, y: 130 } });
    const detached = reconcile([b, line])[1]; if (detached.type !== 'line') throw new Error('Línea esperada');
    expect(detached.fromId).toBeNull(); expect(lineEndpoints(detached)).toEqual(lineEndpoints(line));
    const board = createBoard(); board.objects = [b, detached]; expect(parseBoard(board)).toBeTruthy();
    expect(primitiveMarkup(line)).toContain('data-arrowhead="end" fill=');
  });
});
describe('Edición transaccional', () => {
  it('agrupa, mueve, duplica y deshace preservando relaciones', () => {
    const b = createBoard(); b.objects = [makeObject('sticky', { x: 0, y: 0 }), makeObject('shape', { x: 300, y: 0 })]; useEditor.getState().load(b);
    useEditor.getState().select(b.objects.map(o => o.id)); useEditor.getState().group();
    let s = useEditor.getState(); const groupId = s.selected[0]; expect(descendants(s.board.objects, [groupId]).size).toBe(3); expect(parseBoard(s.board)).toBeTruthy();
    const before = s.board; s.transform(before, 50, 30); s.commit(useEditor.getState().board.objects, before); s = useEditor.getState(); expect(s.board.objects[0].x).toBe(50);
    s.duplicate(); s = useEditor.getState(); expect(s.board.objects.length).toBe(6); expect(parseBoard(s.board)).toBeTruthy();
    s.undo(); expect(useEditor.getState().board.objects.length).toBe(3); s = useEditor.getState(); s.undo(); expect(useEditor.getState().board.objects[0].x).toBe(0);
  });
  it('no mueve ni elimina objetos bloqueados', () => { const b = createBoard(); b.objects = [makeObject('sticky', { x: 0, y: 0 }, { locked: true })]; useEditor.getState().load(b); useEditor.getState().select([b.objects[0].id]); const s = useEditor.getState(); s.transform(b, 300, 100); expect(useEditor.getState().board.objects[0].x).toBe(0); s.remove(); expect(useEditor.getState().board.objects).toHaveLength(1); });
  it('clona conectores y grupos con referencias nuevas', () => { const b = createBoard(); const a = makeObject('shape', { x: 0, y: 0 }), c = makeObject('shape', { x: 300, y: 0 }), line = makeObject('line', { x: 0, y: 0 }, { fromId: a.id, toId: c.id }); b.objects = [a, c, line]; const copied = cloneObjects(b.objects); expect(copied[2]).toMatchObject({ fromId: copied[0].id, toId: copied[1].id }); expect(copied[0].id).not.toBe(a.id); });
  it('desagrupa un grupo anidado sin romper al padre y elimina ancestros vacíos', () => {
    const b = createBoard(), a = makeObject('shape', { x: 0, y: 0 }), child = makeObject('group', { x: 0, y: 0 }), parent = makeObject('group', { x: 0, y: 0 });
    if (child.type !== 'group' || parent.type !== 'group') return;
    a.groupId = child.id; child.children = [a.id]; child.groupId = parent.id; parent.children = [child.id]; b.objects = reconcile([a, child, parent]);
    useEditor.getState().load(parseBoard(b)); useEditor.getState().select([child.id]); useEditor.getState().ungroup();
    expect(parseBoard(useEditor.getState().board).objects.find(o => o.id === a.id)?.groupId).toBe(parent.id);
    useEditor.getState().select([a.id]); useEditor.getState().remove(); expect(useEditor.getState().board.objects).toHaveLength(0);
  });
});
describe('Intercambio y render seguro', () => {
  it('el formato propio recupera objetos y permite pegar en otra ubicación', () => { const b = demoBoard(), raw = WebCustomAdapter.encode(b.objects), objects = WebCustomAdapter.decode(raw, { x: 600, y: 200 }); expect(objects.length).toBe(b.objects.length); expect(objects[0].id).not.toBe(b.objects[0].id); expect(boundsOf(objects)?.x).toBeCloseTo(600); expect(boundsOf(objects)?.y).toBeCloseTo(200); });
  it('escapa texto y nunca convierte el contenido en nodos SVG activos', () => { const o = makeObject('text', { x: 0, y: 0 }, { text: '<script>alert(1)</script>', width: 1000 }); const markup = primitiveMarkup(o); expect(markup).not.toContain('<script>'); expect(markup).toContain('&lt;script&gt;'); });
  it('exporta flechas de trazo grueso sin recortar sus puntas', () => {
    const o = makeObject('line', { x: 0, y: 0 }, { width: 2000, height: 0, strokeWidth: 100, arrow: 'both' });
    const svg = svgFor([o]), view = svg.match(/viewBox="([^"]+)"/)![1].split(' ').map(Number);
    const heads = [...svg.matchAll(/data-arrowhead="[^"]+"[^>]+d="([^"]+)"/g)]; expect(heads).toHaveLength(2);
    for (const head of heads) {
      const coordinates = head[1].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      for (let i = 0; i < coordinates.length; i += 2) {
        expect(coordinates[i] - 50).toBeGreaterThanOrEqual(view[0]); expect(coordinates[i] + 50).toBeLessThanOrEqual(view[0] + view[2]);
        expect(coordinates[i + 1] - 50).toBeGreaterThanOrEqual(view[1]); expect(coordinates[i + 1] + 50).toBeLessThanOrEqual(view[1] + view[3]);
      }
    }
  });
  it('divide palabras largas sin perder caracteres', () => { const raw = 'abcdefghijklmnopqrstuvwxy'; expect(wrapText(raw, 30, 10).join('')).toBe(raw); });
  it('no permite clasificar PNG como éxito de edición nativa', () => { const raw: LabRecord = { id: 'x', date: new Date().toISOString(), source: 'Bridge', target: 'Whiteboard Web', object: 'Nota adhesiva', mode: 'png', browser: 'Chrome', browserVersion: '150', account: 'Trabajo', outcome: 'Aprobado', representation: 'Imagen', checks: { pasted: 'Sí', nativeType: 'No', editable: 'No', repeated: 'Sí' }, note: '', evidence: 'local-01', session: 's1', actualFormats: ['image/png'] }; expect(() => validateObservation(raw)).toThrow(/natividad/); });
});
