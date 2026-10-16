export type Tool = 'select' | 'hand' | 'pen' | 'marker' | 'highlighter' | 'eraser' | 'lasso' | 'text' | 'sticky' | 'rect' | 'ellipse' | 'triangle' | 'diamond' | 'line' | 'arrow' | 'both' | 'connector';
export type ToolOptions = { color: string; width: number; opacity: number };
export const TOOLS: { id: Tool; title: string; key?: string }[] = [
  { id: 'select', title: 'Seleccionar', key: 'V' }, { id: 'hand', title: 'Desplazar', key: 'H' },
  { id: 'pen', title: 'Lápiz', key: 'P' }, { id: 'marker', title: 'Rotulador', key: 'M' }, { id: 'highlighter', title: 'Resaltador', key: 'J' }, { id: 'eraser', title: 'Borrador de objetos', key: 'E' }, { id: 'lasso', title: 'Lazo', key: 'L' },
  { id: 'text', title: 'Texto', key: 'T' }, { id: 'sticky', title: 'Nota adhesiva', key: 'N' },
  { id: 'rect', title: 'Rectángulo', key: 'R' }, { id: 'ellipse', title: 'Elipse', key: 'O' }, { id: 'triangle', title: 'Triángulo' }, { id: 'diamond', title: 'Rombo' },
  { id: 'line', title: 'Línea' }, { id: 'arrow', title: 'Flecha', key: 'A' }, { id: 'both', title: 'Flecha doble' }, { id: 'connector', title: 'Conector entre dos objetos' },
];
