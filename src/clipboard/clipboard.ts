import { makeObject, type BoardObject, type Point } from '../models/document';
import { PlainTextAdapter, HtmlAdapter, PngAdapter, WebCustomAdapter, WEB_CUSTOM_MIME, CUSTOM_MIME } from './adapters';
import { imageObject } from '../utils/files';
export type CopyMode = 'plain' | 'html' | 'png' | 'custom' | 'mixed';
export type CopyResult = { requested: CopyMode; written: string[]; warnings: string[]; timestamp: string };
export type FormatInfo = { type: string; bytes?: number; error?: string; item: number };
export const MODES: { id: CopyMode; title: string; fidelity: string }[] = [
  { id: 'custom', title: 'Editable en Bridge', fidelity: 'Formato propio · Microsoft sin verificar' },
  { id: 'html', title: 'HTML + texto', fidelity: 'Parcial · según el destino' },
  { id: 'plain', title: 'Texto plano', fidelity: 'Parcial · pierde figuras y estilos' },
  { id: 'png', title: 'Imagen PNG', fidelity: 'Visual · objetos aplanados' },
  { id: 'mixed', title: 'Combinado', fidelity: 'Experimental · el destino elige' },
];
export function capabilities() {
  return { secureContext: window.isSecureContext, read: !!navigator.clipboard?.read, write: !!navigator.clipboard?.write, custom: typeof ClipboardItem !== 'undefined' && !!ClipboardItem.supports?.(WEB_CUSTOM_MIME) };
}
export async function copyObjects(items: BoardObject[], mode: CopyMode): Promise<CopyResult> {
  if (!items.length) throw new Error('Selecciona al menos un objeto.');
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('El portapapeles requiere HTTPS y un navegador compatible. Puedes exportar el proyecto.');
  const warnings: string[] = [];
  const data: Record<string, Blob | Promise<Blob>> = {};
  if (mode !== 'png') data['text/plain'] = new Blob([PlainTextAdapter.encode(items)], { type: 'text/plain' });
  if (['html', 'custom', 'mixed'].includes(mode)) data['text/html'] = new Blob([HtmlAdapter.encode(items)], { type: 'text/html' });
  if (['custom', 'mixed'].includes(mode)) {
    if (capabilities().custom) data[WEB_CUSTOM_MIME] = new Blob([WebCustomAdapter.encode(items)], { type: CUSTOM_MIME });
    else warnings.push('Este navegador no admite el formato editable de Bridge. Se copiará HTML + texto.');
  }
  if (mode === 'png' || mode === 'mixed') {
    // Construct promises inside user activation, before async work; reject PNG separately in mixed mode.
    const promise = PngAdapter.encode(items);
    void promise.catch(() => {}); // The standard fallback may discard this representation before it resolves.
    if (mode === 'mixed') data['image/png'] = promise.catch(error => { throw new Error(`PNG: ${String(error)}`); });
    else data['image/png'] = promise;
  }
  try { await navigator.clipboard.write([new ClipboardItem(data)]); }
  catch (error) {
    if (mode !== 'mixed' && mode !== 'custom') throw error;
    // Retry a useful standard representation; report the actual formats, never claim original fidelity.
    delete data[WEB_CUSTOM_MIME]; delete data['image/png'];
    warnings.push(`Formato experimental rechazado; se reintentó con HTML + texto (${error instanceof Error ? error.message : String(error)}).`);
    await navigator.clipboard.write([new ClipboardItem(data)]);
  }
  return { requested: mode, written: Object.keys(data), warnings, timestamp: new Date().toISOString() };
}
export async function inspectClipboard(): Promise<FormatInfo[]> {
  if (!navigator.clipboard?.read) throw new Error('Lectura no disponible. Usa HTTPS, permite el acceso y vuelve a pulsar Inspeccionar.');
  const entries = await navigator.clipboard.read(), out: FormatInfo[] = [];
  for (const [index, item] of entries.entries()) for (const type of item.types) {
    try { const data = await item.getType(type); out.push({ item: index, type, bytes: data.size }); }
    catch (e) { out.push({ item: index, type, error: e instanceof Error ? e.message : String(e) }); }
  }
  return out;
}
export async function readObjects(point: Point, event?: ClipboardEvent): Promise<BoardObject[]> {
  const dt = event?.clipboardData;
  const eventText = dt?.getData('text/plain');
  const eventImage = dt?.files && Array.from(dt.files).find(f => f.type.startsWith('image/'));
  if (dt?.types.includes(CUSTOM_MIME)) return WebCustomAdapter.decode(dt.getData(CUSTOM_MIME), point);
  // A real Ctrl+V or a click is required. No timers or background clipboard reads.
  if (navigator.clipboard?.read) {
    try {
      const entries = await navigator.clipboard.read();
      for (const entry of entries) if (entry.types.includes(WEB_CUSTOM_MIME)) { const b = await entry.getType(WEB_CUSTOM_MIME); if (b.size > 32 * 1024 * 1024) throw new Error('Portapapeles demasiado grande.'); return WebCustomAdapter.decode(await b.text(), point); }
      if (!dt) {
        for (const entry of entries) {
          if (entry.types.includes('image/png')) return [await imageObject(new File([await entry.getType('image/png')], 'Portapapeles.png', { type: 'image/png' }), point)];
          if (entry.types.includes('text/plain')) { const blob = await entry.getType('text/plain'); if (blob.size > 100_000) throw new Error('Texto demasiado grande.'); return [makeObject('text', point, { text: (await blob.text()).slice(0, 20_000) })]; }
        }
      }
    } catch (e) { if (!dt) throw e; }
  }
  if (eventImage) return [await imageObject(eventImage, point)];
  if (eventText) return [makeObject('text', point, { text: eventText.slice(0, 20_000) })];
  throw new Error('No hay un formato admitido. Para objetos editables usa JSON o el modo Editable en Bridge.');
}
