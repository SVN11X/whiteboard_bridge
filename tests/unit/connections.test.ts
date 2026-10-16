import { describe, expect, it } from 'vitest';
import { ANCHOR_SIDES, createBoard, makeObject, parseBoard, serializeBoard, deserializeBoard, type BoardObject } from '../../src/models/document';
import { lineEndpoints, lineWorldPoints, portPosition, reconcile, resolveConnector, type LineObject } from '../../src/editor/geometry';
import { cloneObjects, useEditor } from '../../src/editor/store';
import { createTemplate, TEMPLATES } from '../../src/templates/catalog';
import { svgFor, primitiveMarkup } from '../../src/graphics/render';

function scene() {
  const from = makeObject('shape', { x: 100, y: 100 }, { width: 160, height: 100 }), to = makeObject('shape', { x: 620, y: 320 }, { width: 180, height: 140 });
  const line = makeObject('line', { x: 0, y: 0 }, { fromId: from.id, toId: to.id, fromAnchor: 'right', toAnchor: 'left' }) as LineObject;
  return { from, to, line: resolveConnector(line, from, to) };
}
const orthogonal = (line: LineObject) => {
  const points = lineWorldPoints(line);
  for (let i = 1; i < points.length; i++) expect(Math.min(Math.abs(points[i].x - points[i - 1].x), Math.abs(points[i].y - points[i - 1].y))).toBeLessThan(1e-6);
};
describe('Conexiones con puntos fijos y codos', () => {
  it('conserva el mismo lado al mover el destino al otro lado y al rotar o redimensionar el origen', () => {
    const { from, to, line } = scene(), moved = { ...to, x: -450, y: 700 };
    const nextFrom = { ...from, x: 180, y: 250, width: 240, rotation: 35 }, next = resolveConnector(line, nextFrom, moved);
    expect(next.fromAnchor).toBe('right'); expect(next.toAnchor).toBe('left');
    const endpoints = lineEndpoints(next), start = portPosition(nextFrom, 'right'), end = portPosition(moved, 'left');
    expect(endpoints.start.x).toBeCloseTo(start.x); expect(endpoints.start.y).toBeCloseTo(start.y); expect(endpoints.end.x).toBeCloseTo(end.x); expect(endpoints.end.y).toBeCloseTo(end.y); orthogonal(next);
  });
  it('une las 16 combinaciones de lados con segmentos horizontales y verticales', () => {
    const { from, to, line } = scene();
    for (const fromAnchor of ANCHOR_SIDES) for (const toAnchor of ANCHOR_SIDES) {
      const value = resolveConnector({ ...line, fromAnchor, toAnchor }, from, to);
      orthogonal(value); expect(lineEndpoints(value)).toEqual({ start: portPosition(from, fromAnchor), end: portPosition(to, toAnchor) });
      const points = lineWorldPoints(value);
      for (const shape of [from, to]) for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        expect(mid.x > shape.x + 1e-5 && mid.x < shape.x + shape.width - 1e-5 && mid.y > shape.y + 1e-5 && mid.y < shape.y + shape.height - 1e-5).toBe(false);
      }
    }
  });
  it('mantiene el codo manual en su posición al mover una figura', () => {
    const { from, to, line } = scene(), bend = { x: 430, y: 540 };
    const routed = resolveConnector({ ...line, bend }, from, to), next = resolveConnector(routed, { ...from, y: 20 }, to);
    expect(next.bend).toEqual(bend); orthogonal(next);
    expect(lineWorldPoints(next).some(p => Math.hypot(p.x - bend.x, p.y - bend.y) < 1e-6)).toBe(true);
  });
  it('fijar en lienzo conserva toda la ruta al mover figuras y permite moverla manualmente y deshacer', () => {
    const { from, to, line } = scene(), board = createBoard(), movedTarget = { ...to, x: -450 };
    const routed = resolveConnector(line, from, movedTarget); board.objects = [from, movedTarget, routed]; useEditor.getState().load(board);
    useEditor.getState().select([line.id]); useEditor.getState().patch({ followsObjects: false });
    const fixed = useEditor.getState().board.objects[2] as LineObject, original = lineWorldPoints(fixed);
    expect(original).toEqual(lineWorldPoints(routed));
    useEditor.getState().select([from.id]); useEditor.getState().patch({ x: 800, y: 600 });
    expect(lineWorldPoints(useEditor.getState().board.objects[2] as LineObject)).toEqual(original);
    useEditor.getState().select([line.id]); const before = useEditor.getState().board; useEditor.getState().transform(before, 50, 70); useEditor.getState().commit(useEditor.getState().board.objects, before);
    const translated = lineWorldPoints(useEditor.getState().board.objects[2] as LineObject); translated.forEach((p, i) => { expect(p.x).toBeCloseTo(original[i].x + 50); expect(p.y).toBeCloseTo(original[i].y + 70); });
    useEditor.getState().undo(); expect(lineWorldPoints(useEditor.getState().board.objects[2] as LineObject)).toEqual(original);
  });
  it('serializa y valida rutas, anclajes, codo y modo fijo, rechazando puntos inválidos', () => {
    const { from, to, line } = scene(), board = createBoard(); board.objects = [from, to, { ...line, followsObjects: false, bend: { x: 430, y: 540 } }];
    expect(deserializeBoard(serializeBoard(board))).toEqual(board);
    for (const routePoints of [[{ x: 2, y: 0 }, { x: 1, y: 1 }], [{ x: 0, y: 0 }], Array.from({ length: 25 }, () => ({ x: 0, y: 0 }))]) expect(() => parseBoard({ ...board, objects: [from, to, { ...line, routePoints }] })).toThrow();
  });
  it('duplica rutas y codos con referencias nuevas y el mismo desplazamiento', () => {
    const { from, to, line } = scene(), original = resolveConnector({ ...line, bend: { x: 430, y: 540 } }, from, to);
    const copied = reconcile(cloneObjects([from, to, original], 250, -100)), value = copied[2] as LineObject;
    expect(value).toMatchObject({ fromId: copied[0].id, toId: copied[1].id, bend: { x: 680, y: 440 } });
    lineWorldPoints(value).forEach((p, i) => { const old = lineWorldPoints(original)[i]; expect(p.x).toBeCloseTo(old.x + 250); expect(p.y).toBeCloseTo(old.y - 100); });
  });
  it('abre líneas anteriores sin puntos y conserva la opción de recorrido recto', () => {
    const { from, to, line } = scene(), board = createBoard();
    const old = { ...line } as Record<string, unknown>; for (const key of ['fromAnchor', 'toAnchor', 'routing', 'followsObjects', 'routePoints', 'bend']) delete old[key];
    const parsed = parseBoard({ ...board, objects: [from, to, old] }); const migrated = reconcile(parsed.objects)[2] as LineObject;
    expect(migrated.routePoints.length).toBeGreaterThan(2); orthogonal(migrated);
    const straight = resolveConnector({ ...migrated, routing: 'straight' }, from, to); expect(straight.routePoints).toHaveLength(2);
  });
  it('sitúa el texto dentro de un rombo sin desplazar la escritura de las notas', () => {
    const shape = makeObject('shape', { x: 0, y: 0 }, { shape: 'diamond', width: 190, height: 135, text: '¿Aprobada?', fontSize: 21 });
    const y = Number(primitiveMarkup(shape).match(/<tspan[^>]*y="([^"]+)"/)![1]); expect(y).toBeGreaterThan(60); expect(y).toBeLessThan(90);
    const note = makeObject('sticky', { x: 0, y: 0 }, { text: 'Nota', fontSize: 21 }); expect(primitiveMarkup(note)).toContain('y="39"');
  });
  it('exporta la polilínea y orienta cada punta sobre su segmento final', () => {
    const { from, to, line } = scene(), value = resolveConnector({ ...line, arrow: 'both', bend: { x: 450, y: 620 } }, from, to), svg = svgFor([from, to, value]);
    expect(svg).toContain('data-line-path="true"'); expect(svg.match(/data-arrowhead=/g)).toHaveLength(2); expect(svg).not.toMatch(/NaN|Infinity/); expect(lineWorldPoints(value).length).toBeGreaterThan(3);
  });
});
describe('Catálogo de plantillas editables', () => {
  it('crea las 12 plantillas con identidades nuevas, conexiones válidas y contenido editable que se conserva al guardar', () => {
    expect(TEMPLATES).toHaveLength(12);
    for (const template of TEMPLATES) {
      const board = createBoard(template.name); board.objects = createTemplate(template.id, { x: -1200, y: 2500 });
      const writable = board.objects.find((o): o is Extract<BoardObject, { type: 'sticky' }> => o.type === 'sticky') ?? board.objects.find((o): o is Extract<BoardObject, { type: 'shape' }> => o.type === 'shape')!;
      writable.text = 'Mi contenido editable';
      const restored = deserializeBoard(serializeBoard(board)); expect(restored.objects.find(o => o.id === writable.id)).toMatchObject({ text: 'Mi contenido editable' });
      expect(new Set(restored.objects.map(o => o.id)).size).toBe(board.objects.length);
      const second = createTemplate(template.id); expect(second.every(o => board.objects.every(old => old.id !== o.id))).toBe(true);
      for (const o of restored.objects) if (o.type === 'line') orthogonal(o);
    }
  });
});
