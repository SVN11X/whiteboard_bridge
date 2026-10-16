import DOMPurify from 'dompurify';
import { createBoard, parseBoard, MAX_FILE_BYTES, type BoardObject } from '../../models/document';
import { pngFor } from '../../graphics/render';
import { esc } from '../../graphics/render';
import { cloneObjects } from '../../editor/store';
import { boundsOf } from '../../editor/geometry';

export const CUSTOM_MIME = 'application/x-whiteboard-bridge+json';
export const WEB_CUSTOM_MIME = `web ${CUSTOM_MIME}`;
export const PlainTextAdapter = {
  mime: 'text/plain',
  encode: (items: BoardObject[]) => items.filter(o => o.type !== 'group').map(o => 'text' in o ? o.text : o.type === 'image' ? `[Imagen: ${o.alt}]` : `[${o.type} — objeto editable en Bridge]`).join('\n'),
};
export const HtmlAdapter = {
  mime: 'text/html',
  encode(items: BoardObject[]): string {
    const html = `<div>${items.filter(o => o.type !== 'group').map(o => 'text' in o ? `<div style="background-color:${o.type === 'text' ? '#ffffff' : o.fill};color:${o.textColor};font-size:${o.fontSize}px;padding:16px;white-space:pre-wrap">${esc(o.text).replace(/\n/g, '<br>')}</div>` : `<p>${esc(o.type === 'image' ? o.alt : `[${o.type}]`)}</p>`).join('')}</div>`;
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['div', 'p', 'br'], ALLOWED_ATTR: ['style'] });
  },
};
export const PngAdapter = { mime: 'image/png', encode: pngFor };
export const WebCustomAdapter = {
  mime: WEB_CUSTOM_MIME,
  encode(items: BoardObject[]): string {
    const ids = new Set(items.map(o => o.id));
    const board = createBoard('Selección del portapapeles');
    board.objects = items.map(o => ({ ...o, groupId: o.groupId && ids.has(o.groupId) ? o.groupId : null,
      ...(o.type === 'line' ? { fromId: o.fromId && ids.has(o.fromId) ? o.fromId : null, toId: o.toId && ids.has(o.toId) ? o.toId : null } : {}) }));
    return JSON.stringify(parseBoard(board));
  },
  decode(raw: string, target = { x: 100, y: 100 }): BoardObject[] {
    if (new TextEncoder().encode(raw).byteLength > MAX_FILE_BYTES) throw new Error('Portapapeles demasiado grande.');
    const board = parseBoard(JSON.parse(raw)), bounds = boundsOf(board.objects);
    return cloneObjects(board.objects, target.x - (bounds?.x ?? 0), target.y - (bounds?.y ?? 0));
  },
};
export { WhiteboardNativeAdapter } from '../whiteboard';
