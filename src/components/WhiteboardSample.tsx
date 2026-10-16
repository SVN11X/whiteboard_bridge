import { useState } from 'react';
import { whiteboardPayload } from '../clipboard/whiteboard';
import { MAX_FILE_BYTES } from '../models/document';
import { download } from '../utils/files';
import { Icon } from './Icon';

type Sample = { schema: 'whiteboard-clipboard-sample'; version: 1; capturedAt: string; userAgent: string; html: string; payload: unknown };
export function WhiteboardSample() {
  const [sample, setSample] = useState<Sample | null>(null), [error, setError] = useState(''), [reading, setReading] = useState(false);
  function capture(html: string) {
    setSample(null);
    try {
      const payload = whiteboardPayload(html);
      if (payload === null) throw new Error('Esta copia no incluye el contenedor de objetos de Whiteboard. Copia una nota desde el Whiteboard original; una captura de pantalla o PNG no contiene esos datos.');
      setSample({ schema: 'whiteboard-clipboard-sample', version: 1, capturedAt: new Date().toISOString(), userAgent: navigator.userAgent, html, payload }); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  async function read() {
    setReading(true); setSample(null); setError('');
    try {
      if (!navigator.clipboard?.read) throw new Error('Usa Ctrl+V en el recuadro; este navegador no permite la lectura por botón.');
      const entries = await navigator.clipboard.read();
      for (const entry of entries) if (entry.types.includes('text/html')) { const blob = await entry.getType('text/html'); if (blob.size > MAX_FILE_BYTES) throw new Error('La muestra supera 32 MiB.'); capture(await blob.text()); return; }
      throw new Error('No hay HTML en el portapapeles. Copia el objeto completo de Whiteboard y usa Ctrl+V en el recuadro.');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setReading(false); }
  }
  const record = sample?.payload && typeof sample.payload === 'object' ? sample.payload as Record<string, unknown> : null;
  return <div className="whiteboard-sample"><h3>Capturar una muestra real de Whiteboard</h3><p>Esto permite comprobar la estructura que usa tu versión de Microsoft y ajustar la transferencia. Utiliza una nota de prueba sin información privada. La captura se queda en esta pestaña hasta que la descargues.</p><ol><li>En Microsoft Whiteboard crea una nota con el texto <strong>Prueba de edición</strong>.</li><li>Selecciona el objeto completo, sin estar escribiendo dentro del texto, y pulsa <kbd>Ctrl C</kbd>.</li><li>Haz clic en el recuadro y pulsa <kbd>Ctrl V</kbd>. Repite con una figura si necesitas comprobar ese tipo.</li></ol><textarea className="native-paste-target" aria-label="Pegar muestra de Whiteboard" placeholder="Haz clic aquí y pega el objeto de Whiteboard." value="" onChange={() => {}} onPaste={event => { event.preventDefault(); event.stopPropagation(); capture(event.clipboardData.getData('text/html') || event.clipboardData.getData('text/plain')); }}/ ><div className="button-row"><button className="secondary" disabled={reading} onClick={read}><Icon name="paste" size={17}/>{reading ? 'Leyendo…' : 'Leer muestra del portapapeles'}</button>{sample && <button className="secondary" onClick={() => { setSample(null); setError(''); }}>Descartar muestra</button>}</div>{error && <p className="error-box" role="alert">{error}</p>}{sample && <div className="native-capture-result"><p><strong>Muestra capturada.</strong> {new TextEncoder().encode(sample.html).byteLength.toLocaleString('es-CL')} bytes de HTML. {record && Array.isArray(record.boardItems) ? `${record.boardItems.length} objetos en boardItems.` : 'Estructura diferente a la versión del adaptador; sirve para investigarla.'}</p><p>Campos principales: {record ? Object.keys(record).slice(0, 20).join(', ') : 'valor simple'}. Capturar estos datos no certifica el pegado en Microsoft.</p><button className="primary" onClick={() => download('whiteboard-clipboard-sample.json', JSON.stringify(sample, null, 2))}><Icon name="download" size={17}/>Descargar muestra JSON</button></div>}</div>;
}
