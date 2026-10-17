import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { Modal } from './Modal';

/** Files of the AI agent package, served from public/agente and cached offline by the service worker. */
export const AGENT_BASE = `${import.meta.env.BASE_URL}agente/`;
export const AGENT_INSTRUCTIONS_LIMIT = 8000;
export const AGENT_FILES = [
  { file: 'instrucciones.txt', title: 'Instrucciones', use: 'Van en el campo Instrucciones del agente.', copy: true },
  { file: 'conocimiento-pizarras-bridge.txt', title: 'Conocimiento', use: 'Se sube en Conocimiento. Tiene el formato, la medida del texto, el sistema visual, las preguntas, los errores y un script de validación.', copy: false },
  { file: 'configuracion.txt', title: 'Configuración', use: 'Nombre, descripción, capacidad que conviene activar e iniciadores de conversación.', copy: true },
  { file: 'ejemplo-pizarra.json', title: 'Ejemplo válido', use: 'Pizarra de referencia que Bridge importa y copia a Microsoft sin advertencias.', copy: false },
] as const;
const characters = (text: string) => [...text].length;

export function AgentGuide({ close, importFile, openExample }: { close: () => void; importFile: () => void; openExample: () => void }) {
  const [instructionsLength, setInstructionsLength] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${AGENT_BASE}instrucciones.txt`, { signal: controller.signal })
      .then(response => response.ok ? response.text() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then(text => setInstructionsLength(characters(text)))
      .catch(() => { if (!controller.signal.aborted) setInstructionsLength(null); });
    return () => controller.abort();
  }, []);
  async function copy(file: string, title: string) {
    try {
      const response = await fetch(AGENT_BASE + file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (!navigator.clipboard?.writeText) throw new Error('Portapapeles no disponible');
      await navigator.clipboard.writeText(text);
      setMessage(`Se copió «${title}» (${characters(text).toLocaleString('es-CL')} caracteres). Pégalo en el agente.`);
    } catch {
      setMessage(`No se pudo copiar «${title}». Descarga el archivo y copia su contenido.`);
    }
  }
  return <Modal title="Crear pizarras con un agente de IA" close={close} wide>
    <div className="lab-intro"><div className="lab-icon"><Icon name="agent" size={26}/></div><div><h3>Un agente que prepara el archivo por ti</h3><p>Un agente de Microsoft 365 Copilot convierte tus textos, datos o documentos en un archivo .json que Bridge importa. Antes de generarlo hace preguntas para entender qué necesitas. La pizarra usa solo notas, texto y figuras básicas, así se copia completa a Microsoft Whiteboard.</p></div></div>
    <div className="lab-grid agent-grid">
      <section className="lab-instructions" aria-labelledby="agent-steps"><h3 id="agent-steps">Cómo crear el agente</h3><ol>
        <li>En Microsoft 365 Copilot, crea un agente nuevo y abre la pestaña <strong>Configurar</strong>.</li>
        <li>Copia el nombre, la descripción y las instrucciones desde los archivos de esta página.</li>
        <li>Sube el archivo de conocimiento en <strong>Conocimiento</strong>. El creador de agentes no acepta .md, por eso va en .txt.</li>
        <li>Activa <strong>Crear documentos, gráficos y código</strong>. Así el agente valida la pizarra y entrega un .json para descargar.</li>
        <li>Agrega los iniciadores de conversación de la configuración.</li>
        <li>Conversa con el agente, responde sus preguntas y descarga el .json. Impórtalo aquí con <strong>Importar</strong>.</li>
      </ol><p className="agent-note">Si Bridge muestra «Proyecto no válido», el mensaje indica el objeto y el campo con el problema. Cópialo y pégalo en la conversación con el agente para que lo corrija.</p></section>
      <section aria-labelledby="agent-files"><h3 id="agent-files">Archivos del agente</h3>
        <div className="agent-files">{AGENT_FILES.map(item => <article key={item.file} className="agent-file">
          <div><strong>{item.title}</strong><code>{item.file}</code><p>{item.use}</p>
            {item.file === 'instrucciones.txt' && <p className="agent-limit">{instructionsLength === null ? `Límite del campo: ${AGENT_INSTRUCTIONS_LIMIT.toLocaleString('es-CL')} caracteres.` : `${instructionsLength.toLocaleString('es-CL')} de ${AGENT_INSTRUCTIONS_LIMIT.toLocaleString('es-CL')} caracteres permitidos.`}</p>}
          </div>
          <div className="agent-actions">
            {item.copy && <button className="secondary" onClick={() => void copy(item.file, item.title)} aria-label={`Copiar ${item.title}`}><Icon name="copy" size={16}/>Copiar</button>}
            <a className="secondary" href={AGENT_BASE + item.file} download={item.file} aria-label={`Descargar ${item.file}`}><Icon name="download" size={16}/>Descargar</a>
          </div>
        </article>)}</div>
        <p className="agent-status" role="status" aria-live="polite">{message}</p>
      </section>
    </div>
    <div className="modal-footer"><p>En un chat sin agentes, pega las instrucciones y adjunta el conocimiento en cada conversación.</p><div className="button-row"><button className="secondary" onClick={openExample}><Icon name="folder" size={16}/>Abrir el ejemplo en Bridge</button><button className="primary" onClick={() => { close(); importFile(); }}><Icon name="upload" size={16}/>Importar archivo del agente</button></div></div>
  </Modal>;
}
