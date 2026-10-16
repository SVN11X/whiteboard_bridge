import { MAX_FILE_BYTES, makeObject, type Board, type Point, type BoardObject } from '../models/document';
import { PROJECT_MIME, projectFileName, projectSelection, serializeProject } from '../models/projectFile';
export function download(name: string, contents: Blob | string, mime = 'application/json') {
  const blob = typeof contents === 'string' ? new Blob([contents], { type: mime }) : contents;
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export function downloadProject(board: Board, selectedIds?: string[]) {
  const project = selectedIds ? projectSelection(board, selectedIds) : board;
  download(projectFileName(board.name, !!selectedIds), serializeProject(project), PROJECT_MIME);
}
export async function readFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error('El archivo supera 32 MiB.'); return file.text();
}
export async function imageObject(file: File, point: Point): Promise<BoardObject> {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5_000_000) throw new Error('Usa PNG, JPEG, WebP o GIF de hasta 5 MB. No se admite SVG importado.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    if (img.naturalWidth * img.naturalHeight > 16_000_000 || !img.naturalWidth) throw new Error('Imagen demasiado grande (máximo 16 megapíxeles).');
    // Re-encode raster input to strip embedded metadata and animated payloads.
    const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas no disponible.'); ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/png'); if (dataUrl.length > 8_000_000) throw new Error('Imagen decodificada demasiado grande.');
    const width = Math.min(600, img.naturalWidth), height = width * img.naturalHeight / img.naturalWidth;
    return makeObject('image', point, { width, height, dataUrl, alt: file.name.slice(0, 500) });
  } finally { URL.revokeObjectURL(url); }
}
