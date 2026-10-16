import { z } from 'zod';
import { boundsOf } from '../editor/geometry';
import { makeObject, objectSchema, MAX_FILE_BYTES, MAX_OBJECTS, type BoardObject, type Point } from '../models/document';

// Interoperability facts from the public Whiteboard client, not a Microsoft SDK.
// See docs/WHITEBOARD_CLIPBOARD.md for the observed version and verification limits.
export const WHITEBOARD_SHAPES = { rect: 4, ellipse: 34, triangle: 2, diamond: 5, pentagon: 9, parallelogram: 6, capsule: 138 } as const;
export const WHITEBOARD_NOTE_COLORS = ['#ffe6a1', '#fccd7a', '#fbc19e', '#f18992', '#ed99c9', '#cbe799', '#9be0ba', '#99d9ef', '#9fb0fa', '#c9a3dd', '#ebebeb', '#b6b6b6'];
const channel = z.number().finite().min(0).max(255);
const rgbaSchema = z.object({ r: channel, g: channel, b: channel, a: z.number().min(0).max(1) });
const cssColor = z.string().regex(/^(?:#[a-f\d]{6}|rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\))$/i);
const nativeColor = z.union([rgbaSchema, cssColor]);
const pointSchema = z.object({ x: z.number().finite().min(-10_000_000).max(10_000_000), y: z.number().finite().min(-10_000_000).max(10_000_000) });
const typography = { text: z.string().max(20_000).default(''), fontSize: z.number().min(8).max(300).optional(), fontFamily: z.string().max(200).optional(), fontWeight: z.string().max(30).optional(), textColor: nativeColor.optional(), textAlignment: z.enum(['left', 'center', 'right']).optional() };
const contentSchema = z.discriminatedUnion('contentType', [
  z.object({ contentType: z.literal('note'), ...typography, backgroundColor: cssColor }),
  z.object({ contentType: z.literal('plaintext'), ...typography }),
  z.object({ contentType: z.literal('shape'), ...typography, type: z.number().int(), fillColor: nativeColor.optional(), lineColor: nativeColor.optional(), lineThickness: z.number().min(0).max(100).optional() }),
]);
const itemSchema = z.object({ position: pointSchema, originPoint: pointSchema.optional(), scale: z.number().min(.01).max(100).default(1), rotation: z.number().finite().min(-3600).max(3600).default(0), size: z.object({ width: z.number().min(1).max(100_000), height: z.number().min(1).max(100_000) }), content: contentSchema });
const payloadSchema = z.object({ boardItems: z.array(itemSchema).min(1).max(MAX_OBJECTS), anchorPosition: pointSchema.optional(), correlationId: z.string().max(200).optional() });
type NativeColor = z.infer<typeof nativeColor>;

function rgb(hex: string) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); }
function rgba(hex: string, opacity = 1) { const [r, g, b] = rgb(hex); return { r, g, b, a: opacity }; }
function hex(value: NativeColor | undefined, fallback: string): string {
  if (!value) return fallback;
  if (typeof value === 'string' && value.startsWith('#')) return value.toLowerCase();
  const values = typeof value === 'string' ? value.match(/\d+/g)!.map(Number) : [value.r, value.g, value.b];
  return '#' + values.slice(0, 3).map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
}
function nearestNoteColor(color: string) {
  const source = rgb(color);
  return [...WHITEBOARD_NOTE_COLORS].sort((a, b) => {
    const distance = (candidate: string) => rgb(candidate).reduce((sum, n, i) => sum + (n - source[i]) ** 2, 0);
    return distance(a) - distance(b);
  })[0];
}

export function encodeWhiteboard(items: BoardObject[]): { html: string; warnings: string[]; objects: number } {
  const objects = items.filter(item => item.type !== 'group');
  if (!objects.length) throw new Error('Selecciona una nota, texto o figura.');
  const unsupported = objects.filter(item => !['text', 'sticky', 'shape'].includes(item.type) || item.type === 'shape' && !(item.shape in WHITEBOARD_SHAPES));
  if (unsupported.length) throw new Error('La copia a Microsoft Whiteboard admite notas, texto y figuras básicas. La selección incluye objetos aún no admitidos (tinta, imágenes, líneas o flecha sólida). No se ha sustituido por una imagen. Selecciona solo los objetos compatibles o elige Imagen PNG.');
  const warnings: string[] = [];
  if (items.some(item => item.type === 'group')) warnings.push('Los grupos se envían como objetos separados.');
  let adjustedColor = false;
  const boardItems = objects.map(item => {
    if (!('text' in item)) throw new Error('Objeto no admitido.');
    const text = { text: item.text, fontSize: item.fontSize, fontFamily: 'Segoe UI', fontWeight: 'normal', fontStyle: 'normal', textDecoration: [], textColor: rgba(item.textColor), textAlignment: item.align };
    let content;
    if (item.type === 'sticky') {
      const color = nearestNoteColor(item.fill); adjustedColor ||= color !== item.fill.toLowerCase();
      const [r, g, b] = rgb(color);
      content = { contentType: 'note', ...text, backgroundColor: `rgb(${r}, ${g}, ${b})` };
    } else if (item.type === 'shape') {
      content = { contentType: 'shape', ...text, type: WHITEBOARD_SHAPES[item.shape as keyof typeof WHITEBOARD_SHAPES], fillColor: rgba(item.fill, item.opacity), lineColor: rgba(item.stroke, item.opacity), lineThickness: item.strokeWidth, lineStyle: 0 };
    } else content = { contentType: 'plaintext', ...text };
    return { position: item.type === 'shape' ? { x: item.x + item.width / 2, y: item.y + item.height / 2 } : { x: item.x, y: item.y }, originPoint: { x: item.x, y: item.y }, scale: 1, rotation: item.rotation, size: { width: item.width, height: item.height }, content };
  });
  if (adjustedColor) warnings.push('Los colores de notas se aproximan a la paleta de Microsoft.');
  const bounds = boundsOf(objects)!;
  const payload = JSON.stringify({ boardItems, anchorPosition: { x: bounds.x, y: bounds.y }, correlationId: crypto.randomUUID() });
  if (new TextEncoder().encode(payload).byteLength > MAX_FILE_BYTES) throw new Error('Portapapeles demasiado grande.');
  const html = `<whiteboard-tag whiteboardcontent="${encodeURIComponent(payload)}"></whiteboard-tag>`;
  if (new TextEncoder().encode(html).byteLength > MAX_FILE_BYTES) throw new Error('El HTML codificado del portapapeles supera 32 MiB. Reduce la selección.');
  return { html, warnings, objects: boardItems.length };
}

export function whiteboardPayload(html: string): unknown | null {
  if (new TextEncoder().encode(html).byteLength > MAX_FILE_BYTES) throw new Error('El HTML del portapapeles supera 32 MiB.');
  // Read only the data attribute. Never mount clipboard HTML or fetch its images/iframes.
  const match = html.match(/<whiteboard-tag\b[^>]*?\bwhiteboardcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  if (!match) return null;
  try { return JSON.parse(decodeURIComponent(match[1] ?? match[2])); }
  catch { throw new Error('El contenido de Whiteboard está incompleto o no es JSON válido.'); }
}

export function decodeWhiteboard(html: string, target: Point): BoardObject[] | null {
  const raw = whiteboardPayload(html); if (raw === null) return null;
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Se detectó contenido de Microsoft Whiteboard, pero su estructura o alguno de sus objetos aún no es compatible. Captura una muestra desde Diagnóstico de portapapeles; no se ha aplanado a imagen.');
  const inverse = new Map<number, keyof typeof WHITEBOARD_SHAPES>(Object.entries(WHITEBOARD_SHAPES).map(([name, code]) => [code, name as keyof typeof WHITEBOARD_SHAPES]));
  const objects = parsed.data.boardItems.map((item, i) => {
    const { content, size, scale } = item;
    const width = size.width * scale, height = size.height * scale;
    if (width > 100_000 || height > 100_000) throw new Error('Dimensiones de Whiteboard fuera de los límites del lienzo.');
    const point = item.originPoint ?? (content.contentType === 'shape' ? { x: item.position.x - width / 2, y: item.position.y - height / 2 } : item.position);
    const text = { width, height, rotation: item.rotation, text: content.text, fontSize: content.fontSize ?? 24, textColor: hex(content.textColor, '#242424'), align: content.textAlignment ?? 'left' as const, zIndex: i };
    if (content.contentType === 'note') return makeObject('sticky', point, { ...text, fill: hex(content.backgroundColor, '#ffe6a1') });
    if (content.contentType === 'plaintext') return makeObject('text', point, text);
    const shape = inverse.get(content.type); if (!shape) throw new Error(`Figura de Whiteboard aún no admitida: ${content.type}.`);
    return makeObject('shape', point, { ...text, shape, fill: hex(content.fillColor, '#ffffff'), stroke: hex(content.lineColor, '#242424'), strokeWidth: content.lineThickness ?? 1.5, opacity: content.fillColor && typeof content.fillColor !== 'string' ? content.fillColor.a : 1 });
  });
  const bounds = boundsOf(objects)!;
  return objects.map(item => objectSchema.parse({ ...item, x: item.x + target.x - bounds.x, y: item.y + target.y - bounds.y }));
}

export const WhiteboardNativeAdapter = Object.freeze({ id: 'microsoft-whiteboard-native', available: true, status: 'user-confirmed', verification: { method: 'user-report', date: '2026-10-16', automatedMicrosoftTest: false }, mime: 'text/html', container: 'whiteboard-tag[whiteboardcontent]', supported: ['note', 'plaintext', 'shape'], evidenceRequired: ['Pegado en Whiteboard real', 'Texto y color editables', 'Objetos separados', 'Repetición en dos sesiones'] });
