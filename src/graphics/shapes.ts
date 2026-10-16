import type { BoardObject, Point } from '../models/document';

// Shared by rendering and connector geometry so arrow tips follow the visible edge.
export function shapePolygon(o: Extract<BoardObject, { type: 'shape' }>): Point[] | null {
  const w = o.width, h = o.height;
  const vertices: number[][] | null = o.shape === 'triangle' ? [[w / 2, 0], [w, h], [0, h]]
    : o.shape === 'diamond' ? [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]
    : o.shape === 'pentagon' ? [[w / 2, 0], [w, h * .38], [w * .81, h], [w * .19, h], [0, h * .38]]
    : o.shape === 'parallelogram' ? [[w * .22, 0], [w, 0], [w * .78, h], [0, h]]
    : o.shape === 'arrow-shape' ? [[w * .6, 0], [w, h / 2], [w * .6, h], [w * .6, h * .7], [0, h * .7], [0, h * .3], [w * .6, h * .3]] : null;
  return vertices?.map(([x, y]) => ({ x, y })) ?? null;
}
