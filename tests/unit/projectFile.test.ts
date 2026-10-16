import { describe, expect, it } from 'vitest';
import { createBoard, demoBoard, makeObject, parseBoard } from '../../src/models/document';
import { deserializeProject, importedProject, projectFileName, projectSelection, readImportFile, serializeProject } from '../../src/models/projectFile';
import { reconcile } from '../../src/editor/geometry';

function richDocument() {
  const board = createBoard('Ideas de diseño'), note = makeObject('sticky', { x: -20, y: 20 }, { text: 'Texto editable', fill: '#ffcc66', rotation: 24 }), shape = makeObject('shape', { x: 300, y: 70 }, { shape: 'diamond' });
  const group = makeObject('group', { x: 0, y: 0 }), line = makeObject('line', { x: 0, y: 0 }, { fromId: note.id, toId: shape.id });
  if (group.type !== 'group') throw new Error('Invalid fixture');
  group.children = [note.id, shape.id, line.id]; note.groupId = shape.groupId = line.groupId = group.id;
  const ink = makeObject('ink', { x: 40, y: 260 }, { points: [{ x: 0, y: 0, pressure: .2 }, { x: 1, y: 1, pressure: .8 }] }), image = makeObject('image', { x: 420, y: 250 });
  board.objects = reconcile([note, shape, line, group, ink, image]); board.viewport = { x: -125, y: 40, zoom: 1.5 };
  return parseBoard(board);
}

describe('Archivos editables .wbridge', () => {
  it('hace round-trip completo de grupos, conectores, tinta, imágenes y viewport', async () => {
    const board = richDocument(), result = await readImportFile(new File([serializeProject(board)], 'equipo.WBRIDGE', { type: 'application/octet-stream' }));
    expect(result.kind).toBe('project'); if (result.kind === 'project') expect(result.board).toEqual(board);
  });
  it('abre una copia nueva sin cambiar IDs de objetos, relaciones ni el documento de origen', () => {
    const board = richDocument(), before = structuredClone(board), imported = importedProject(board);
    expect(imported.id).not.toBe(board.id); expect(imported.objects).toEqual(board.objects); expect(imported.name.endsWith('(importada)')).toBe(true); expect(board).toEqual(before);
  });
  it('exporta un grupo completo e independiente, y separa hijos seleccionados de padres externos', () => {
    const board = richDocument(), group = board.objects.find(o => o.type === 'group')!, selection = projectSelection(board, [group.id]);
    expect(selection.objects).toHaveLength(4); expect(selection.id).not.toBe(board.id); expect(() => parseBoard(selection)).not.toThrow();
    const note = board.objects.find(o => o.type === 'sticky')!, noteOnly = projectSelection(board, [note.id]); expect(noteOnly.objects).toHaveLength(1); expect(noteOnly.objects[0].groupId).toBeNull();
  });
  it('desvincula extremos que no están en una selección y rechaza selección vacía', () => {
    const board = richDocument(), line = board.objects.find(o => o.type === 'line')!, selection = projectSelection(board, [line.id]);
    expect(selection.objects[0]).toMatchObject({ groupId: null, fromId: null, toId: null }); expect(() => projectSelection(board, [])).toThrow(/Selecciona/);
  });
  it('mantiene JSON v1/v2 y acepta BOM UTF-8', async () => {
    const board = demoBoard(); expect(deserializeProject(`\uFEFF${serializeProject(board)}`)).toEqual(board);
    const old = await readImportFile(new File(['{"version":1,"objects":[]}'], 'viejo.json', { type: 'application/json' })); expect(old.kind).toBe('project'); if (old.kind === 'project') expect(old.board.version).toBe(2);
  });
  it('genera nombres seguros y portables', () => {
    expect(projectFileName('Mi pizarra / acción:*?')).toBe('mi-pizarra-accion.wbridge'); expect(projectFileName('CON')).toBe('pizarra-con.wbridge'); expect(projectFileName('   ')).toBe('pizarra.wbridge'); expect(projectFileName('Clase', true)).toBe('clase-seleccion.wbridge');
  });
  it('rechaza estructuras corruptas, archivos de Microsoft y backups en el flujo de una pizarra', async () => {
    expect(() => deserializeProject('{')).toThrow(/JSON válido/); expect(() => deserializeProject(JSON.stringify({ schema: 'whiteboard-bridge', version: 999 }))).toThrow();
    expect(() => deserializeProject(JSON.stringify({ schema: 'whiteboard-bridge-backup', boards: [] }))).toThrow(/Restaurar respaldo/);
    await expect(readImportFile(new File([serializeProject(demoBoard())], 'microsoft.whiteboard'))).rejects.toThrow(/sin|validado/);
    await expect(readImportFile(new File(['<svg/>'], 'vector.svg'))).rejects.toThrow(/Formato no admitido/);
  });
  it('respeta límites de archivo antes de interpretar el contenido y valida raster por firma', async () => {
    await expect(readImportFile(new File([new Uint8Array(32 * 1024 * 1024 + 1)], 'grande.wbridge'))).rejects.toThrow(/32 MiB/);
    await expect(readImportFile(new File(['<svg onload="alert(1)"/>'], 'disfrazado.png', { type: 'image/png' }))).rejects.toThrow(/firma/);
    const png = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0])], 'raster.PNG');
    const result = await readImportFile(png); expect(result.kind).toBe('image'); if (result.kind === 'image') expect(result.file.type).toBe('image/png');
  });
});
