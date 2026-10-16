import type { CSSProperties } from 'react';
const paths: Record<string, string> = {
  select: 'M5 3l14 10-7 1-3 7z', hand: 'M8 11V5a2 2 0 014 0v6m0-5a2 2 0 014 0v6m0-3a2 2 0 014 0v7c0 4-3 6-7 6-3 0-5-2-6-4l-3-5a2 2 0 013-2l1 1',
  pen: 'M15 4l5 5M4 20l5-1L21 7a2 2 0 00-5-5L4 15z', marker: 'M14 3l7 7-9 9-7-7zM5 12l-2 7 2 2 7-2', highlighter: 'M14 3l7 7-9 9-7-7zM5 12l-2 7 2 2 7-2M2 22h18',
  eraser: 'M9 20L3 14a2 2 0 010-3l8-8a2 2 0 013 0l7 7a2 2 0 010 3l-7 7H9zm-3-9l9 9M14 20h8',
  lasso: 'M7 17c-5-2-6-8-1-11 4-3 13-3 15 3 2 5-4 9-10 8-4-1-5-4-2-4 4 0 1 9-3 9',
  text: 'M4 5h16M12 5v15M8 20h8', sticky: 'M4 3h16v12l-6 6H4zM14 21v-6h6', rect: 'M3 4h18v16H3z', ellipse: 'M21 12a9 7 0 11-18 0 9 7 0 1118 0',
  triangle: 'M12 3l10 18H2z', diamond: 'M12 2l10 10-10 10L2 12z', line: 'M4 20L20 4', arrow: 'M3 19L20 4M8 4h12v12', both: 'M3 20L20 3M9 3h11v11M3 10v10h11', connector: 'M4 4h5v5H4zM15 15h5v5h-5zM9 6h8v9', image: 'M3 3h18v18H3zM3 17l6-6 5 5 3-3 4 4M15 7h1',
  undo: 'M9 5L4 10l5 5M4 10h10a6 6 0 010 12', redo: 'M15 5l5 5-5 5M20 10H10a6 6 0 000 12', copy: 'M8 8h13v13H8zM16 8V3H3v13h5', paste: 'M8 4H4v17h16V4h-4M8 2h8v5H8z',
  plus: 'M12 4v16M4 12h16', minus: 'M4 12h16', fit: 'M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M8 8h8v8H8z', zoom: 'M10 3a7 7 0 110 14 7 7 0 010-14M16 16l6 6',
  layers: 'M12 3L2 8l10 5 10-5zM2 13l10 5 10-5M2 18l10 5 10-5', lab: 'M9 3h6M10 3v6l-6 10a2 2 0 002 3h12a2 2 0 002-3L14 9V3M7 15h10',
  download: 'M12 3v12M7 10l5 5 5-5M3 17v4h18v-4', upload: 'M12 17V3M7 8l5-5 5 5M3 17v4h18v-4', folder: 'M3 5h7l3 3h8v13H3z', close: 'M5 5l14 14M19 5L5 19', chevron: 'M6 9l6 6 6-6',
  sun: 'M12 8a4 4 0 110 8 4 4 0 010-8M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2', moon: 'M21 14a9 9 0 01-11-11A9 9 0 1021 14',
  trash: 'M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7M14 10v7', lock: 'M6 10h12v11H6zM8 10V6a4 4 0 018 0v4', unlock: 'M6 10h12v11H6zM8 10V6a4 4 0 018 0',
  group: 'M3 3h6v6H3zM15 15h6v6h-6zM15 3h6v6h-6zM3 15h6v6H3zM6 9v6M9 6h6M18 9v6M9 18h6', ungroup: 'M3 3h6v6H3zM15 15h6v6h-6zM15 3h6v6h-6zM3 15h6v6H3z',
  help: 'M9 8a3 3 0 116 0c0 2-3 2-3 5M12 17h.01M12 2a10 10 0 110 20 10 10 0 010-20', check: 'M4 12l5 5L20 6', external: 'M14 3h7v7M21 3L10 14M10 3H3v18h18v-7',
  menu: 'M4 6h16M4 12h16M4 18h16', more: 'M5 12h.01M12 12h.01M19 12h.01', rotate: 'M20 7V2l-4 4a8 8 0 102 12M20 7h-6', arrowDown: 'M12 3v18M5 14l7 7 7-7', arrowUp: 'M12 21V3M5 10l7-7 7 7',
};
export function Icon({ name, size = 20, style }: { name: string; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name] ?? paths.more}/></svg>;
}
