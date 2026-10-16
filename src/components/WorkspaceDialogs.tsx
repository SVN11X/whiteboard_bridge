import { useState } from 'react';
import { makeObject, type BoardObject, type Point } from '../models/document';
import { MODES, type CopyMode, type CopyResult } from '../clipboard/clipboard';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { NOTE_COLORS } from './WorkspaceChrome';

export function CopyDialog({ mode, setMode, copy, count, result, close, lab }: { mode: CopyMode; setMode: (mode: CopyMode) => void; copy: () => void; count: number; result: CopyResult | null; close: () => void; lab: () => void }) {
  return <Modal title="Copiar objetos" close={close}><p>{count ? `${count} objetos seleccionados.` : 'Selecciona primero los objetos que quieres copiar.'}</p><label className="field">Destino y formato<select aria-label="Formato de copia" value={mode} onChange={e => setMode(e.target.value as CopyMode)}>{MODES.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><p className="copy-fidelity">{MODES.find(item => item.id === mode)?.fidelity}</p><button className="primary full" disabled={!count} onClick={copy}><Icon name="copy" size={19}/>Copiar selección</button>{result && <p className="copy-result">Última copia: {result.written.join(', ')}{result.warnings.length > 0 && <><br/>{result.warnings.join(' ')}</>}</p>}<div className="copy-help"><p><strong>Entre pizarras de Bridge:</strong> conserva objetos, grupos y estilos. <strong>Imagen:</strong> mantiene el aspecto y se pega como una sola imagen.</p><p>Para Microsoft, comprueba que puedes editar el texto y el color de cada objeto en Whiteboard después de pegar. No basta con ver la imagen.</p><button className="text-button" onClick={lab}>Capturar o revisar el formato de Whiteboard <Icon name="lab" size={17}/></button></div></Modal>;
}

export function ShareDialog({ close, exportAs, copy, selected }: { close: () => void; exportAs: (format: string) => void; copy: () => void; selected: number }) {
  return <Modal title="Compartir una copia" close={close}><p>Elige cómo quieres enviar esta pizarra.</p><div className="share-options"><button onClick={() => exportAs('project')}><Icon name="download" size={27}/><span><strong>Pizarra editable</strong><small>Archivo .wbridge para abrir y seguir editando en Bridge.</small></span><Icon name="chevron"/></button><button onClick={() => exportAs('png')}><Icon name="image" size={27}/><span><strong>Imagen de la pizarra</strong><small>PNG para enviar o insertar en otros documentos.</small></span><Icon name="chevron"/></button><button disabled={!selected} onClick={copy}><Icon name="copy" size={27}/><span><strong>Copiar selección</strong><small>Elige el formato y el destino de los objetos seleccionados.</small></span><Icon name="chevron"/></button></div></Modal>;
}

export function TemplatesDialog({ close, add, point }: { close: () => void; add: (objects: BoardObject[]) => void; point: Point }) {
  function insert(kind: 'ideas' | 'kanban' | 'map') {
    const objects: BoardObject[] = [], x = point.x - 320, y = point.y - 210;
    const title = { ideas: 'Lluvia de ideas', kanban: 'Plan de trabajo', map: 'Conectar ideas' }[kind];
    objects.push(makeObject('text', { x, y }, { text: title, width: 850, height: 55, fontSize: 30, textColor: '#242424', label: title }));
    if (kind === 'kanban') {
      ['Por hacer', 'En proceso', 'Terminado'].forEach((text, column) => {
        objects.push(makeObject('text', { x: x + column * 280, y: y + 80 }, { text, width: 250, height: 45, fontSize: 24, textColor: '#242424' }));
        objects.push(makeObject('sticky', { x: x + column * 280, y: y + 150 }, { width: 240, height: 180, text: '', fill: NOTE_COLORS[column] }));
      });
    } else if (kind === 'map') {
      const central = makeObject('shape', { x: x + 280, y: y + 185 }, { text: 'Idea principal', shape: 'ellipse', width: 200, height: 110, fill: '#b5ddf5', textColor: '#242424', stroke: '#242424' });
      const notes = [{ x, y: y + 85 }, { x: x + 560, y: y + 85 }, { x, y: y + 320 }, { x: x + 560, y: y + 320 }].map((p, i) => makeObject('sticky', p, { text: '', height: 150, fill: NOTE_COLORS[i] }));
      objects.push(central, ...notes, ...notes.map(note => makeObject('line', { x: 0, y: 0 }, { fromId: central.id, toId: note.id, arrow: 'end', stroke: '#606060' })));
    } else {
      for (let i = 0; i < 6; i++) objects.push(makeObject('sticky', { x: x + i % 3 * 280, y: y + 90 + Math.floor(i / 3) * 220 }, { text: '', fill: NOTE_COLORS[i], width: 240, height: 185 }));
    }
    add(objects); close();
  }
  return <Modal title="Plantillas" close={close}><p>La plantilla se añade a tu pizarra. Cada nota y figura se puede editar.</p><div className="template-grid">{([{ kind: 'ideas', name: 'Lluvia de ideas', description: 'Seis notas para empezar.' }, { kind: 'kanban', name: 'Plan de trabajo', description: 'Por hacer, en proceso y terminado.' }, { kind: 'map', name: 'Mapa de ideas', description: 'Una idea central y cuatro conexiones.' }] as const).map(item => <button key={item.kind} onClick={() => insert(item.kind)}><span className={`template-preview template-${item.kind}`}><i/><i/><i/><i/></span><strong>{item.name}</strong><small>{item.description}</small></button>)}</div></Modal>;
}

export function LinkDialog({ close, add, point }: { close: () => void; add: (objects: BoardObject[]) => void; point: Point }) {
  const [url, setUrl] = useState(''), [error, setError] = useState('');
  function insert() {
    try { const value = new URL(url.trim()); if (!['https:', 'http:'].includes(value.protocol)) throw new Error(); add([makeObject('text', point, { text: value.href, label: 'Enlace', fontSize: 20, width: 400, height: 100, textColor: '#164db6' })]); close(); }
    catch { setError('Escribe una dirección http o https válida.'); }
  }
  return <Modal title="Insertar enlace" close={close}><p>Puedes añadir el enlace a una página o a un video. Al seleccionarlo aparecerá la opción Abrir enlace.</p><form onSubmit={e => { e.preventDefault(); insert(); }}><label className="field">Dirección<input autoFocus aria-label="Dirección del enlace" type="url" required placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)}/></label>{error && <p className="error-box" role="alert">{error}</p>}<button type="submit" className="primary">Insertar enlace</button></form></Modal>;
}
