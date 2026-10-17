import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { deserializeProject, readImportFile } from '../../src/models/projectFile';
import { encodeWhiteboard, WHITEBOARD_NOTE_COLORS, WHITEBOARD_SHAPES } from '../../src/clipboard/whiteboard';
import { textTop, wrapText } from '../../src/graphics/render';

// The agent package lives in public/agente and is published with the site. These checks keep it in sync with the code.
const read = (file: string) => readFileSync(`public/agente/${file}`, 'utf8');
const instructions = read('instrucciones.txt'), knowledge = read('conocimiento-pizarras-bridge.txt'), config = read('configuracion.txt');
const exampleText = read('ejemplo-pizarra.json');
const section = (name: string) => config.split(`[${name}]`)[1]?.split('\n[')[0].trim() ?? '';
const mutate = (change: (board: Record<string, unknown> & { objects: Record<string, unknown>[] }) => void) => {
  const board = JSON.parse(exampleText); change(board);
  try { deserializeProject(JSON.stringify(board)); return 'aceptado'; } catch (error) { return String(error); }
};

describe('Paquete del agente de IA', () => {
  it('cabe en los límites del creador de agentes de Microsoft 365 Copilot', () => {
    expect([...instructions].length).toBeGreaterThan(1000);
    expect([...instructions].length).toBeLessThanOrEqual(8000);
    expect([...section('NOMBRE')].length).toBeLessThanOrEqual(30);
    expect([...section('DESCRIPCIÓN')].length).toBeLessThanOrEqual(1000);
    for (const name of ['NOMBRE', 'DESCRIPCIÓN', 'INSTRUCCIONES', 'CONOCIMIENTO', 'CAPACIDADES', 'INICIADORES DE CONVERSACIÓN', 'PASOS']) expect(section(name)).not.toBe('');
    expect(instructions).toContain('conocimiento-pizarras-bridge.txt');
  });
  it('describe exactamente las figuras y colores que admite la copia a Microsoft', () => {
    for (const text of [instructions, knowledge]) {
      for (const shape of Object.keys(WHITEBOARD_SHAPES)) expect(text).toContain(shape);
      for (const color of WHITEBOARD_NOTE_COLORS) expect(text).toContain(color);
      for (const forbidden of ['line', 'ink', 'image', 'group', 'arrow-shape']) expect(text).toContain(forbidden);
    }
  });
  it('el ejemplo se importa y se copia completo a Microsoft sin advertencias ni textos cortados', async () => {
    const result = await readImportFile(new File([exampleText], 'ejemplo-pizarra.json', { type: 'application/json' }));
    expect(result.kind).toBe('project'); if (result.kind !== 'project') return;
    const { objects, warnings } = encodeWhiteboard(result.board.objects);
    expect(warnings).toEqual([]); expect(objects).toBe(result.board.objects.length);
    result.board.objects.forEach((o, i) => {
      expect(o.zIndex).toBe(i); expect(o.groupId).toBeNull();
      if (!('text' in o) || !o.text) return;
      const padding = o.type === 'text' ? 2 : 18;
      expect(textTop(o) + wrapText(o.text, o.width - 2 * padding, o.fontSize).length * o.fontSize * 1.25).toBeLessThanOrEqual(o.height + 1);
    });
  });
  it('el conocimiento incluye el mismo ejemplo y su script de validación', () => {
    const block = knowledge.match(/```json\n([\s\S]*?)```/)?.[1];
    expect(block && JSON.parse(block)).toEqual(JSON.parse(exampleText));
    const script = knowledge.match(/```python\n([\s\S]*?)```/)?.[1] ?? '';
    for (const name of ['def lineas', 'def validar', 'def guardar', 'def carril', 'def nota', 'def flecha']) expect(script).toContain(name);
  });
  it('la tabla de errores del conocimiento coincide con los mensajes reales de Bridge', () => {
    const cases: [string, (b: Record<string, unknown> & { objects: Record<string, unknown>[] }) => void][] = [
      ['Invalid ISO datetime', b => { b.createdAt = '2026-10-17'; }],
      ['expected string, received undefined', b => { delete b.objects[3].label; }],
      ['expected number, received string', b => { b.objects[3].width = '120'; }],
      ['Invalid option', b => { b.objects[3].align = 'justify'; }],
      ['Invalid discriminator value', b => { b.objects[3].type = 'note'; }],
      ['must match pattern', b => { b.objects[3].fill = 'rojo'; }],
      ['Hay identificadores duplicados', b => { b.objects[4].id = b.objects[3].id; }],
      ['Grupo inválido', b => { b.objects[3].groupId = 'g1'; }],
      ['Invalid input: expected 2', b => { b.version = 3; }],
    ];
    for (const [reason, change] of cases) {
      const message = mutate(change);
      expect(message).toContain('Proyecto no válido');
      expect(message).toContain(reason);
      expect(knowledge).toContain(reason);
    }
    expect(mutate(b => { delete b.objects[3].label; })).toContain(`objeto 4 (id ${String(JSON.parse(exampleText).objects[3].id)}), campo label`);
  });
});
