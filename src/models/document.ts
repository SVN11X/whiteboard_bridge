import { z } from 'zod';

export const MAX_FILE_BYTES = 32 * 1024 * 1024;
export const MAX_OBJECTS = 20_000;
const finite = z.number().finite();
const coordinate = finite.min(-10_000_000).max(10_000_000);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const id = z.string().min(1).max(100);
const base = z.object({
  id, x: coordinate, y: coordinate, width: finite.min(1).max(100_000), height: finite.min(1).max(100_000),
  rotation: finite.min(-3600).max(3600), zIndex: z.number().int(), opacity: finite.min(0).max(1),
  locked: z.boolean(), groupId: id.nullable(), fill: color, stroke: color,
  strokeWidth: finite.min(0).max(100), label: z.string().max(200),
});
const textProps = { text: z.string().max(20_000), fontSize: finite.min(8).max(300), textColor: color, align: z.enum(['left', 'center', 'right']) };
const text = base.extend({ type: z.literal('text'), ...textProps });
const sticky = base.extend({ type: z.literal('sticky'), ...textProps });
const shape = base.extend({ type: z.literal('shape'), shape: z.enum(['rect', 'ellipse', 'triangle', 'diamond', 'pentagon', 'parallelogram', 'arrow-shape', 'capsule']), ...textProps });
const line = base.extend({ type: z.literal('line'), arrow: z.enum(['none', 'end', 'both']), fromId: id.nullable(), toId: id.nullable(), reversed: z.boolean(), startAtEnd: z.boolean().default(false) });
const ink = base.extend({ type: z.literal('ink'), tool: z.enum(['pen', 'marker', 'highlighter']), points: z.array(z.object({ x: finite.min(0).max(1), y: finite.min(0).max(1), pressure: finite.min(0).max(1) })).min(1).max(10_000) });
const image = base.extend({ type: z.literal('image'), dataUrl: z.string().max(8_000_000).regex(/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/), alt: z.string().max(500) });
const group = base.extend({ type: z.literal('group'), children: z.array(id).min(1).max(MAX_OBJECTS) });
export const objectSchema = z.discriminatedUnion('type', [text, sticky, shape, line, ink, image, group]);
export type BoardObject = z.infer<typeof objectSchema>;
export type ObjectType = BoardObject['type'];
export type Point = { x: number; y: number };
export type Viewport = { x: number; y: number; zoom: number };
export const backgroundSchema = z.object({ color, grid: z.enum(['solid', 'dot', 'square', 'graph', 'hybrid', 'diamond', 'wide-rule', 'triangle', 'narrow-rule']) });
export const boardSchema = z.object({
  schema: z.literal('whiteboard-bridge'), version: z.literal(2), id,
  name: z.string().trim().min(1).max(120),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
  viewport: z.object({ x: coordinate, y: coordinate, zoom: finite.min(0.05).max(8) }),
  background: backgroundSchema.default({ color: '#ffffff', grid: 'dot' }),
  objects: z.array(objectSchema).max(MAX_OBJECTS),
}).superRefine((board, ctx) => {
  const map = new Map(board.objects.map(o => [o.id, o]));
  const error = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (map.size !== board.objects.length) error('Hay identificadores duplicados.');
  let pointCount = 0, imageBytes = 0;
  for (const o of board.objects) {
    if (o.type === 'ink') pointCount += o.points.length;
    if (o.type === 'image') imageBytes += o.dataUrl.length;
    if (o.groupId && (map.get(o.groupId)?.type !== 'group' || !(map.get(o.groupId) as z.infer<typeof group>).children.includes(o.id))) error(`Grupo inválido: ${o.id}`);
    if (o.type === 'group') {
      if (new Set(o.children).size !== o.children.length) error('Hijos de grupo duplicados.');
      for (const child of o.children) if (map.get(child)?.groupId !== o.id) error(`Relación de grupo inválida: ${child}`);
    }
    if (o.type === 'line') for (const ref of [o.fromId, o.toId]) if (ref && (!map.has(ref) || ref === o.id || map.get(ref)?.type === 'group')) error('Conector inválido.');
    let current: BoardObject | undefined = o;
    const visited = new Set<string>();
    while (current?.groupId) {
      if (visited.has(current.id) || visited.size >= 16) { error('Grupo cíclico o anidación mayor a 16.'); break; }
      visited.add(current.id); current = map.get(current.groupId);
    }
  }
  if (pointCount > 500_000) error('Demasiados puntos de tinta.');
  if (imageBytes > 24_000_000) error('Demasiados datos de imágenes.');
});
export type Board = z.infer<typeof boardSchema>;
export const uid = () => crypto.randomUUID();
export function createBoard(name = 'Pizarra sin título'): Board {
  const now = new Date().toISOString();
  return { schema: 'whiteboard-bridge', version: 2, id: uid(), name, createdAt: now, updatedAt: now, viewport: { x: 0, y: 0, zoom: 1 }, background: { color: '#ffffff', grid: 'dot' }, objects: [] };
}
export function makeObject(type: ObjectType, p: Point, extra: Partial<BoardObject> = {}): BoardObject {
  const shared = { id: uid(), x: p.x, y: p.y, width: 200, height: 130, rotation: 0, zIndex: Date.now(), opacity: 1, locked: false, groupId: null, fill: '#dceae6', stroke: '#24574e', strokeWidth: 2, label: '' };
  const typography = { text: '', fontSize: 24, textColor: '#203a35', align: 'left' as const };
  const variants: Record<ObjectType, object> = {
    text: { ...typography, width: 300, height: 80, text: '', strokeWidth: 0 },
    sticky: { ...typography, width: 200, height: 200, fill: '#ffe6a1', textColor: '#242424', strokeWidth: 0, text: '' },
    shape: { ...typography, shape: 'rect', align: 'center' },
    line: { height: 80, fill: '#24574e', arrow: 'end', fromId: null, toId: null, reversed: false, startAtEnd: false, strokeWidth: 3 },
    ink: { tool: 'pen', points: [{ x: 0, y: 0, pressure: 0.5 }], strokeWidth: 3 },
    image: { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', alt: 'Imagen' },
    group: { children: [] },
  };
  return { ...shared, type, ...variants[type], ...extra } as BoardObject;
}
export function parseBoard(value: unknown): Board {
  if (value && typeof value === 'object' && 'version' in value && value.version === 1) return migrateV1(value);
  const result = boardSchema.safeParse(value);
  if (!result.success) throw new Error(`Proyecto no válido: ${result.error.issues[0]?.message}`);
  return result.data;
}
export function deserializeBoard(raw: string): Board {
  if (new TextEncoder().encode(raw).byteLength > MAX_FILE_BYTES) throw new Error('El proyecto supera 32 MiB.');
  return parseBoard(JSON.parse(raw));
}
export function serializeBoard(board: Board): string { return JSON.stringify(parseBoard(board), null, 2); }
function migrateV1(raw: unknown): Board {
  const old = z.object({ version: z.literal(1), objects: z.array(z.object({ type: z.enum(['text', 'note', 'rect', 'ellipse', 'arrow']), x: coordinate, y: coordinate, w: finite.min(1).max(100_000), h: finite.min(1).max(100_000), text: z.string().max(20_000), color })).max(MAX_OBJECTS) }).parse(raw);
  const board = createBoard('Importado de Bridge Lab v0.1.0');
  board.objects = old.objects.map((o, i) => {
    const type = o.type === 'note' ? 'sticky' : o.type === 'rect' || o.type === 'ellipse' ? 'shape' : o.type === 'arrow' ? 'line' : 'text';
    return makeObject(type, o, { width: o.w, height: o.h, fill: o.color, stroke: o.color, zIndex: i, ...(type === 'shape' ? { shape: o.type as 'rect' | 'ellipse' } : {}), ...(['text', 'sticky'].includes(type) ? { text: o.text, textColor: type === 'text' ? o.color : '#203a35' } : {}) });
  });
  return parseBoard(board);
}
export function demoBoard(): Board {
  const b = createBoard('El próximo gran paso');
  b.objects = [
    makeObject('text', { x: 90, y: 65 }, { width: 760, height: 68, text: 'Las buenas ideas empiezan aquí.', fontSize: 38, label: 'Título' }),
    makeObject('text', { x: 92, y: 135 }, { width: 740, height: 70, text: 'Un espacio para conectar lo que sabes con lo que imaginas.', fontSize: 19, textColor: '#5a6f68' }),
    makeObject('sticky', { x: 105, y: 270 }, { text: '01  EXPLORAR\n¿Qué queremos\nhacer posible?', rotation: -4, fill: '#f8df84' }),
    makeObject('sticky', { x: 415, y: 260 }, { text: '02  CONECTAR\nDibuja, escribe\ny prueba ideas.', rotation: 3, fill: '#cce1d8' }),
    makeObject('sticky', { x: 730, y: 275 }, { text: '03  COMPARTIR\nCopia una selección\ny explora formatos.', rotation: -2, fill: '#e8dafa' }),
    makeObject('line', { x: 340, y: 344 }, { width: 54, height: 1, arrow: 'end', stroke: '#617c71' }),
    makeObject('line', { x: 653, y: 344 }, { width: 54, height: 1, arrow: 'end', stroke: '#617c71' }),
    makeObject('text', { x: 105, y: 520 }, { width: 780, height: 70, text: 'Todo se guarda en tu navegador. Empieza con una nota nueva ↗', fontSize: 18, textColor: '#5a6f68' }),
  ];
  b.objects.forEach((o, i) => { o.zIndex = i; }); return b;
}
