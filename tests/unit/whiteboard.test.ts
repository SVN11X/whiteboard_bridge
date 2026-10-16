import { describe, expect, it } from 'vitest';
import { createBoard, makeObject, parseBoard } from '../../src/models/document';
import { boundsOf } from '../../src/editor/geometry';
import { decodeWhiteboard, encodeWhiteboard, whiteboardPayload, WhiteboardNativeAdapter, WHITEBOARD_SHAPES } from '../../src/clipboard/whiteboard';

describe('Formato de Whiteboard — datos sintéticos, sin sesión Microsoft', () => {
  it('envía notas y figuras separadas en el contenedor HTML y conserva texto escapado como datos', () => {
    const note = makeObject('sticky', { x: 20, y: 40 }, { text: 'Una nota\n<script>no ejecutar</script>', fill: '#ffe6a1' });
    const shape = makeObject('shape', { x: 300, y: 70 }, { shape: 'ellipse', text: 'Editable', rotation: 25 });
    const encoded = encodeWhiteboard([note, shape]);
    expect(encoded.warnings).toEqual([]); expect(encoded.html).toMatch(/^<whiteboard-tag whiteboardcontent="%7B/); expect(encoded.html).not.toContain('<script>');
    const raw = whiteboardPayload(encoded.html) as { boardItems: { content: { contentType: string; type?: number } }[] };
    expect(raw.boardItems.map(item => item.content.contentType)).toEqual(['note', 'shape']); expect(raw.boardItems[1].content.type).toBe(34);
    const decoded = decodeWhiteboard(encoded.html, { x: 500, y: 600 })!;
    expect(decoded[0]).toMatchObject({ type: 'sticky', text: note.type === 'sticky' ? note.text : '', x: 500, fill: '#ffe6a1' });
    expect(decoded[1]).toMatchObject({ type: 'shape', shape: 'ellipse', x: 780, rotation: 25 });
    expect(boundsOf(decoded)?.y).toBeCloseTo(600); expect(decoded[1].y - decoded[0].y).toBeCloseTo(30);
    expect(decoded[0].id).not.toBe(note.id); expect(WhiteboardNativeAdapter.verification.automatedMicrosoftTest).toBe(false);
  });
  it('conserva las siete figuras admitidas y sus colores, tamaños y posiciones relativas', () => {
    const objects = Object.keys(WHITEBOARD_SHAPES).map((shape, i) => makeObject('shape', { x: i * 250, y: 20 }, { shape: shape as keyof typeof WHITEBOARD_SHAPES, fill: '#abcdef', stroke: '#123456', strokeWidth: 4, text: shape }));
    const decoded = decodeWhiteboard(encodeWhiteboard(objects).html, { x: 0, y: 20 })!;
    expect(decoded.map(o => o.type === 'shape' && o.shape)).toEqual(Object.keys(WHITEBOARD_SHAPES));
    decoded.forEach((object, i) => expect(object).toMatchObject({ x: i * 250, width: 200, height: 130, fill: '#abcdef', stroke: '#123456', strokeWidth: 4 }));
  });
  it('rechaza una selección con contenido no admitido y no sustituye objetos por imagen', () => {
    expect(() => encodeWhiteboard([makeObject('sticky', { x: 0, y: 0 }), makeObject('ink', { x: 0, y: 0 })])).toThrow(/No se ha sustituido/);
    expect(() => encodeWhiteboard([makeObject('shape', { x: 0, y: 0 }, { shape: 'arrow-shape' })])).toThrow();
  });
  it('informa de la separación de grupos y la aproximación a la paleta de notas', () => {
    const result = encodeWhiteboard([makeObject('group', { x: 0, y: 0 }), makeObject('sticky', { x: 0, y: 0 }, { fill: '#112233' })]);
    expect(result.objects).toBe(1); expect(result.warnings.join(' ')).toContain('grupos'); expect(result.warnings.join(' ')).toContain('aproximan');
  });
  it('lee solo el atributo de datos y rechaza estructuras desconocidas, tamaños inválidos y tipos activos', () => {
    expect(whiteboardPayload('<img src="https://invalid.example/x"><script>throw 1</script>')).toBeNull();
    expect(() => whiteboardPayload('<whiteboard-tag whiteboardcontent="%broken">')).toThrow(/incompleto/);
    const wrap = (payload: unknown) => `<whiteboard-tag whiteboardcontent="${encodeURIComponent(JSON.stringify(payload))}"></whiteboard-tag>`;
    expect(() => decodeWhiteboard(wrap({ futureVersion: 3, entities: [] }), { x: 0, y: 0 })).toThrow(/estructura/);
    expect(() => decodeWhiteboard(wrap({ boardItems: [{ position: { x: 0, y: 0 }, size: { width: 100, height: 100 }, content: { contentType: 'hyperlink', iframe: '<iframe/>' } }] }), { x: 0, y: 0 })).toThrow(/estructura/);
    const raw = whiteboardPayload(encodeWhiteboard([makeObject('sticky', { x: 0, y: 0 })]).html) as { boardItems: { scale: number }[] };
    raw.boardItems[0].scale = 100;
    const decoded = decodeWhiteboard(wrap(raw), { x: 0, y: 0 }); expect(decoded?.[0].width).toBe(20_000);
  });
});

describe('Fondo del documento', () => {
  it('abre documentos anteriores con fondo blanco de puntos y conserva el fondo elegido al guardar', () => {
    const board = createBoard(), { background: _background, ...old } = board;
    expect(parseBoard(old).background).toEqual({ color: '#ffffff', grid: 'dot' });
    board.background = { color: '#202020', grid: 'triangle' };
    expect(parseBoard(JSON.parse(JSON.stringify(board))).background).toEqual(board.background);
  });
});
