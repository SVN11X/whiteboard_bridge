import type { BoardObject } from '../models/document';
import { boundsOf } from '../editor/geometry';
export const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function wrapText(text: string, width: number, fontSize: number): string[] {
  const max = Math.max(1, Math.floor(width / (fontSize * 0.56))), lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph) { lines.push(''); continue; }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (line && line.length + word.length + 1 > max) { lines.push(line); line = ''; }
      if (word.length > max) { if (line) { lines.push(line); line = ''; } for (let i = 0; i < word.length; i += max) { const chunk = word.slice(i, i + max); if (chunk.length === max) lines.push(chunk); else line = chunk; } }
      else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
  }
  return lines;
}
function textMarkup(o: Extract<BoardObject, { type: 'text' | 'sticky' | 'shape' }>): string {
  const padding = o.type === 'text' ? 2 : 18, lines = wrapText(o.text, o.width - 2 * padding, o.fontSize);
  const visible = lines.slice(0, Math.max(1, Math.floor((o.height - padding) / (o.fontSize * 1.25))));
  const x = o.align === 'left' ? padding : o.align === 'center' ? o.width / 2 : o.width - padding;
  return `<text fill="${o.textColor}" font-family="system-ui, Segoe UI, sans-serif" font-size="${o.fontSize}" font-weight="${o.type === 'text' && o.fontSize >= 30 ? 650 : 450}" text-anchor="${o.align === 'left' ? 'start' : o.align === 'right' ? 'end' : 'middle'}">${visible.map((line, i) => `<tspan x="${x}" y="${padding + o.fontSize + i * o.fontSize * 1.25}">${esc(line)}</tspan>`).join('')}</text>`;
}
export function primitiveMarkup(o: BoardObject): string {
  const w = o.width, h = o.height;
  const style = `fill="${o.fill}" stroke="${o.stroke}" stroke-width="${o.strokeWidth}" stroke-linejoin="round"`;
  if (o.type === 'group') return '';
  if (o.type === 'image') return `<image href="${esc(o.dataUrl)}" width="${w}" height="${h}" preserveAspectRatio="none"><title>${esc(o.alt)}</title></image>`;
  if (o.type === 'ink') {
    const p = o.points;
    if (p.length === 1) return `<circle cx="${p[0].x * w}" cy="${p[0].y * h}" r="${o.strokeWidth / 2}" fill="${o.stroke}"/>`;
    // Coalesce neighboring segments with similar pressure to reduce SVG nodes.
    const segments: string[] = []; let path = '', lastWidth = -1;
    for (let i = 1; i < p.length; i++) {
      const width = o.tool === 'pen' ? Math.max(0.4, Math.round(o.strokeWidth * (0.3 + p[i].pressure * 1.4) * 2) / 2) : o.strokeWidth;
      if (width !== lastWidth) { if (path) segments.push(`<path d="${path}" stroke-width="${lastWidth}"/>`); path = `M${p[i - 1].x * w} ${p[i - 1].y * h}`; lastWidth = width; }
      path += `L${p[i].x * w} ${p[i].y * h}`;
    }
    if (path) segments.push(`<path d="${path}" stroke-width="${lastWidth}"/>`);
    return `<g fill="none" stroke="${o.stroke}" stroke-linecap="round" stroke-linejoin="round">${segments.join('')}</g>`;
  }
  if (o.type === 'line') {
    const left = { x: 0, y: o.reversed ? h : 0 }, right = { x: w, y: o.reversed ? 0 : h };
    const a = o.startAtEnd ? right : left, b = o.startAtEnd ? left : right;
    const head = (tip: typeof a, other: typeof a) => { const angle = Math.atan2(tip.y - other.y, tip.x - other.x), len = Math.max(12, o.strokeWidth * 4); return `<path d="M${tip.x - len * Math.cos(angle - 0.5)} ${tip.y - len * Math.sin(angle - 0.5)} L${tip.x} ${tip.y} L${tip.x - len * Math.cos(angle + 0.5)} ${tip.y - len * Math.sin(angle + 0.5)}"/>`; };
    return `<g fill="none" stroke="${o.stroke}" stroke-width="${o.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M${a.x} ${a.y} L${b.x} ${b.y}"/>${o.arrow !== 'none' ? head(b, a) : ''}${o.arrow === 'both' ? head(a, b) : ''}</g>`;
  }
  if (o.type === 'text') return textMarkup(o);
  if (o.type === 'sticky') return `<rect width="${w}" height="${h}" rx="3" fill="${o.fill}"/><path d="M${w - 24} ${h} L${w} ${h - 24} L${w - 24} ${h - 24}Z" fill="#000000" opacity="0.08"/>${textMarkup(o)}`;
  const geometry = o.shape === 'ellipse' ? `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" ${style}/>` : o.shape === 'triangle' ? `<polygon points="${w / 2},0 ${w},${h} 0,${h}" ${style}/>` : o.shape === 'diamond' ? `<polygon points="${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}" ${style}/>` : `<rect width="${w}" height="${h}" rx="10" ${style}/>`;
  return geometry + textMarkup(o);
}
export function objectMarkup(o: BoardObject): string {
  return `<g transform="translate(${o.x} ${o.y}) rotate(${o.rotation} ${o.width / 2} ${o.height / 2})" opacity="${o.opacity}">${primitiveMarkup(o)}</g>`;
}
export function svgFor(objects: BoardObject[], white = false): string {
  const b = boundsOf(objects.filter(o => o.type !== 'group')); if (!b) throw new Error('La pizarra está vacía.');
  const pad = Math.max(24, ...objects.map(o => o.strokeWidth * 2)), x = b.x - pad, y = b.y - pad, width = Math.ceil(b.width + pad * 2), height = Math.ceil(b.height + pad * 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}"><title>Whiteboard Bridge — exportación visual</title>${white ? `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#ffffff"/>` : ''}${[...objects].sort((a, b) => a.zIndex - b.zIndex).map(objectMarkup).join('')}</svg>`;
}
export async function pngFor(objects: BoardObject[]): Promise<Blob> {
  const b = boundsOf(objects.filter(o => o.type !== 'group')); if (!b) throw new Error('Selecciona al menos un objeto.');
  const pad = Math.max(24, ...objects.map(o => o.strokeWidth * 2));
  const width = Math.ceil(b.width + pad * 2), height = Math.ceil(b.height + pad * 2);
  if (width > 8192 || height > 8192 || width * height > 16_000_000) throw new Error('PNG supera 16 megapíxeles u 8192 px. Reduce la selección o exporta SVG.');
  const url = URL.createObjectURL(new Blob([svgFor(objects, true)], { type: 'image/svg+xml' }));
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas 2D no disponible.');
    ctx.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo generar PNG.')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}
