import { createBoard, deserializeBoard, MAX_FILE_BYTES, parseBoard, serializeBoard, uid, type Board } from './document';
import { descendants } from '../editor/geometry';

/** Portable Bridge document. UTF-8 JSON, same validated v2 schema as IndexedDB. */
export const PROJECT_EXTENSION = '.wbridge';
export const PROJECT_MIME = 'application/vnd.whiteboard-bridge+json';
export const IMPORT_ACCEPT = '.wbridge,.json,.png,.jpg,.jpeg,.webp,.gif,application/json,image/png,image/jpeg,image/webp,image/gif';
const IMAGE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
export type ImportResult = { kind: 'project'; board: Board } | { kind: 'image'; file: File };

export function projectFileName(name: string, selection = false): string {
  let stem = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  if (!stem || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)) stem = `pizarra${stem ? `-${stem}` : ''}`;
  return `${stem.toLowerCase()}${selection ? '-seleccion' : ''}${PROJECT_EXTENSION}`;
}

export function projectSelection(board: Board, selectedIds: string[]): Board {
  const ids = descendants(board.objects, selectedIds);
  const objects = board.objects.filter(o => ids.has(o.id)).map(o => ({
    ...o, groupId: o.groupId && ids.has(o.groupId) ? o.groupId : null,
    ...(o.type === 'line' ? { fromId: o.fromId && ids.has(o.fromId) ? o.fromId : null, toId: o.toId && ids.has(o.toId) ? o.toId : null } : {}),
  }));
  if (!objects.length) throw new Error('Selecciona al menos un objeto para exportar la selección.');
  return parseBoard({ ...createBoard(`${board.name.slice(0, 100)} (selección)`), viewport: { ...board.viewport }, objects });
}

export function serializeProject(board: Board): string {
  const contents = serializeBoard(board);
  if (new TextEncoder().encode(contents).byteLength > MAX_FILE_BYTES) throw new Error('El proyecto exportado supera 32 MiB. Exporta una selección o divide la pizarra.');
  return contents;
}

export function deserializeProject(raw: string): Board {
  const contents = raw.replace(/^\uFEFF/, '');
  if (new TextEncoder().encode(raw).byteLength > MAX_FILE_BYTES) throw new Error('El archivo supera 32 MiB.');
  let value: unknown;
  try { value = JSON.parse(contents); } catch { throw new Error('El archivo no contiene un proyecto JSON válido de Whiteboard Bridge.'); }
  if (value && typeof value === 'object' && 'schema' in value && value.schema === 'whiteboard-bridge-backup') throw new Error('Este archivo es un respaldo de varias pizarras. Ábrelo en Tus pizarras → Restaurar respaldo.');
  // Existing JSON v1/v2 files remain importable. Unknown versions are rejected by the document validator.
  return deserializeBoard(contents);
}

export function importedProject(source: Board): Board {
  const board = parseBoard(source), now = new Date().toISOString();
  return { ...board, id: uid(), name: `${board.name.slice(0, 105)} (importada)`, createdAt: now, updatedAt: now };
}

export async function readImportFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_FILE_BYTES) throw new Error('El archivo supera 32 MiB.');
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  if (extension === 'whiteboard') throw new Error('El formato .whiteboard de Microsoft todavía no tiene un importador validado. Importa .wbridge, un JSON de Bridge o una imagen.');
  if (extension === 'wbridge' || extension === 'json' || (!extension && file.type === 'application/json')) {
    return { kind: 'project', board: deserializeProject(await file.text()) };
  }
  const mime = IMAGE_TYPES[extension] ?? (!extension && Object.values(IMAGE_TYPES).includes(file.type) ? file.type : undefined);
  if (mime) {
    if (file.size > 5_000_000) throw new Error('Las imágenes importadas deben pesar como máximo 5 MB.');
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const starts = (signature: number[]) => signature.every((value, i) => bytes[i] === value);
    const signatureValid = mime === 'image/png' ? starts([137, 80, 78, 71, 13, 10, 26, 10]) : mime === 'image/jpeg' ? starts([255, 216, 255]) : mime === 'image/gif' ? starts([71, 73, 70, 56]) : starts([82, 73, 70, 70]) && [87, 69, 66, 80].every((value, i) => bytes[i + 8] === value);
    if (!signatureValid) throw new Error('La firma de la imagen no coincide con su extensión. Usa un archivo raster PNG/JPEG/WebP/GIF válido.');
    return { kind: 'image', file: new File([file], file.name, { type: mime, lastModified: file.lastModified }) };
  }
  throw new Error('Formato no admitido. Usa .wbridge o .json para objetos editables, o PNG/JPEG/WebP/GIF como imagen. SVG y PDF no se importan en esta versión.');
}
