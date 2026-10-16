import type { Board } from '../models/document';

export function CanvasBackground({ board }: { board: Board }) {
  const { color, grid } = board.background;
  const { x, y, zoom } = board.viewport;
  const light = [1, 3, 5].reduce((sum, i) => sum + parseInt(color.slice(i, i + 2), 16), 0) > 384;
  const ink = light ? '#868686' : '#f0f0f0';
  const step = grid === 'dot' ? 20 : grid === 'wide-rule' ? 64 : grid === 'narrow-rule' ? 16 : grid === 'graph' || grid === 'hybrid' ? 80 : 32;
  return <>
    <defs>
      <pattern id="canvas-grid" width={step} height={step} patternUnits="userSpaceOnUse" patternTransform={`translate(${x} ${y}) scale(${zoom})`}>
        {grid === 'dot' ? <circle cx="1" cy="1" r="1" fill={ink} opacity=".26"/> : grid === 'wide-rule' || grid === 'narrow-rule' ? <path d={`M0 0H${step}`} stroke={ink} opacity=".4" strokeWidth="1"/> : grid === 'diamond' ? <path d="M-16 0L16 32M16 0L48 32M-16 32L16 0M16 32L48 0" stroke={ink} opacity=".3" fill="none"/> : grid === 'triangle' ? <path d="M0 0H32M0 32L16 0L32 32M-16 0L0 32M32 32L48 0" stroke={ink} opacity=".3" fill="none"/> : <>
          {(grid === 'graph' || grid === 'hybrid') && <path d="M16 0V80M32 0V80M48 0V80M64 0V80M0 16H80M0 32H80M0 48H80M0 64H80" stroke={ink} opacity={grid === 'hybrid' ? '.25' : '.16'} fill="none" strokeWidth=".6"/>}
          <path d={`M${step} 0H0V${step}`} stroke={ink} opacity=".36" fill="none"/>
        </>}
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={color}/>
    {grid !== 'solid' && <rect width="100%" height="100%" fill="url(#canvas-grid)"/>}
  </>;
}
