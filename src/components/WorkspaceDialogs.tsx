import { useMemo, useState } from 'react';
import { makeObject, type BoardObject, type Point } from '../models/document';
import { MODES, type CopyMode, type CopyResult } from '../clipboard/clipboard';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { createTemplate, TEMPLATES, TEMPLATE_CATEGORIES } from '../templates/catalog';
import { svgFor } from '../graphics/render';

export function CopyDialog({ mode, setMode, copy, count, result, close, lab }: { mode: CopyMode; setMode: (mode: CopyMode) => void; copy: () => void; count: number; result: CopyResult | null; close: () => void; lab: () => void }) {
  return <Modal title="Copiar objetos" close={close}><p>{count ? `${count} objetos seleccionados.` : 'Selecciona primero los objetos que quieres copiar.'}</p><label className="field">Destino y formato<select aria-label="Formato de copia" value={mode} onChange={e => setMode(e.target.value as CopyMode)}>{MODES.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><p className="copy-fidelity">{MODES.find(item => item.id === mode)?.fidelity}</p><button className="primary full" disabled={!count} onClick={copy}><Icon name="copy" size={19}/>Copiar selección</button>{result && <p className="copy-result">Última copia: {result.written.join(', ')}{result.warnings.length > 0 && <><br/>{result.warnings.join(' ')}</>}</p>}<div className="copy-help"><p><strong>Entre pizarras de Bridge:</strong> conserva objetos, grupos y estilos. <strong>Imagen:</strong> mantiene el aspecto y se pega como una sola imagen.</p><p>Para Microsoft, comprueba que puedes editar el texto y el color de cada objeto en Whiteboard después de pegar. No basta con ver la imagen.</p><button className="text-button" onClick={lab}>Capturar o revisar el formato de Whiteboard <Icon name="lab" size={17}/></button></div></Modal>;
}

export function ShareDialog({ close, exportAs, copy, selected }: { close: () => void; exportAs: (format: string) => void; copy: () => void; selected: number }) {
  return <Modal title="Compartir una copia" close={close}><p>Elige cómo quieres enviar esta pizarra.</p><div className="share-options"><button onClick={() => exportAs('project')}><Icon name="download" size={27}/><span><strong>Pizarra editable</strong><small>Archivo .wbridge para abrir y seguir editando en Bridge.</small></span><Icon name="chevron"/></button><button onClick={() => exportAs('png')}><Icon name="image" size={27}/><span><strong>Imagen de la pizarra</strong><small>PNG para enviar o insertar en otros documentos.</small></span><Icon name="chevron"/></button><button disabled={!selected} onClick={copy}><Icon name="copy" size={27}/><span><strong>Copiar selección</strong><small>Elige el formato y el destino de los objetos seleccionados.</small></span><Icon name="chevron"/></button></div></Modal>;
}

export function TemplatesDialog({ close, add, point }: { close: () => void; add: (objects: BoardObject[]) => void; point: Point }) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState('Todas');
  const previews = useMemo(() => new Map(TEMPLATES.map(item => [item.id, svgFor(createTemplate(item.id))])), []);
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = TEMPLATES.filter(item => (category === 'Todas' || item.category === category) && normalize(`${item.name} ${item.description} ${item.category}`).includes(normalize(query)));
  return <Modal title="Plantillas" close={close} wide><p>Elige una plantilla. Sus notas, textos, figuras y conexiones se pueden editar.</p><div className="template-filters"><label className="field">Buscar plantilla<input type="search" aria-label="Buscar plantilla" placeholder="Ideas, reunión, flujo…" value={query} onChange={e => setQuery(e.target.value)}/></label><label className="field">Categoría<select aria-label="Categoría de plantillas" value={category} onChange={e => setCategory(e.target.value)}>{['Todas', ...TEMPLATE_CATEGORIES].map(value => <option key={value}>{value}</option>)}</select></label></div><div className="template-grid">{filtered.map(item => <button key={item.id} data-template={item.id} onClick={() => { add(createTemplate(item.id, point)); close(); }}><span className="template-preview" aria-hidden="true" dangerouslySetInnerHTML={{ __html: previews.get(item.id)! }}/><strong>{item.name}</strong><small>{item.description}</small></button>)}</div>{!filtered.length && <p role="status">No se encontraron plantillas. Prueba otro nombre o categoría.</p>}</Modal>;
}

export function LinkDialog({ close, add, point }: { close: () => void; add: (objects: BoardObject[]) => void; point: Point }) {
  const [url, setUrl] = useState(''), [error, setError] = useState('');
  function insert() {
    try { const value = new URL(url.trim()); if (!['https:', 'http:'].includes(value.protocol)) throw new Error(); add([makeObject('text', point, { text: value.href, label: 'Enlace', fontSize: 20, width: 400, height: 100, textColor: '#164db6' })]); close(); }
    catch { setError('Escribe una dirección http o https válida.'); }
  }
  return <Modal title="Insertar enlace" close={close}><p>Puedes añadir el enlace a una página o a un video. Al seleccionarlo aparecerá la opción Abrir enlace.</p><form onSubmit={e => { e.preventDefault(); insert(); }}><label className="field">Dirección<input autoFocus aria-label="Dirección del enlace" type="url" required placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)}/></label>{error && <p className="error-box" role="alert">{error}</p>}<button type="submit" className="primary">Insertar enlace</button></form></Modal>;
}
