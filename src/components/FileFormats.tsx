import { Icon } from './Icon';
import { Modal } from './Modal';

export function FileFormats({ close, importFile, agent }: { close: () => void; importFile: () => void; agent: () => void }) {
  return <Modal title="Importar y exportar" close={close} wide>
    <div className="file-format-intro"><div className="lab-icon"><Icon name="folder" size={26}/></div><div><h3>Tu pizarra, en un archivo .wbridge</h3><p>Es el formato editable de Whiteboard Bridge. Guarda los objetos por separado, sus estilos, grupos, trazos e imágenes en un único archivo local.</p></div></div>
    <p className="file-table-scroll-hint">Desliza la tabla horizontalmente para ver todos los formatos y sus propiedades.</p>
    <div className="table-scroll" tabIndex={0} aria-label="Tabla de formatos con desplazamiento horizontal"><table className="file-format-table"><thead><tr><th>Formato</th><th>Importar</th><th>Exportar</th><th>Qué conserva</th></tr></thead><tbody>
      <tr><td>.wbridge · recomendado</td><td>Sí, como nueva pizarra</td><td>Pizarra o selección</td><td>Objetos editables, texto, grupos, conectores, imágenes y vista</td></tr>
      <tr><td>.json de Bridge</td><td>Sí, versiones anteriores</td><td>Sí</td><td>El mismo documento estructurado; mantiene compatibilidad con los archivos anteriores</td></tr>
      <tr><td>.json de un agente de IA</td><td>Sí, como nueva pizarra</td><td>No aplica</td><td>Notas, texto y figuras básicas que se copian completas a Microsoft Whiteboard. Ver Crear con un agente de IA</td></tr>
      <tr><td>PNG / JPEG / WebP / GIF</td><td>Sí, como imagen</td><td>PNG</td><td>Aspecto visual; una imagen importada no se convierte en notas ni figuras. GIF se normaliza a un fotograma</td></tr>
      <tr><td>SVG</td><td>No</td><td>Sí, vector visual</td><td>Representación vectorial para otras herramientas; no recupera el documento editable en Bridge</td></tr>
      <tr><td>.whiteboard de Microsoft</td><td>Sin lector validado</td><td>No</td><td>Se requiere un contrato de formato compatible y comprobado</td></tr>
    </tbody></table></div>
    <div className="file-format-hints"><p><strong>Para continuar editando:</strong> Exportar → Pizarra editable · WBRIDGE. Luego pulsa Importar, incluso en otro navegador o equipo.</p><p><strong>Al importar un proyecto:</strong> se crea una pizarra nueva. La anterior se guarda y sus objetos no se reemplazan. También puedes arrastrar un archivo al lienzo.</p><p><strong>Límites:</strong> 32 MiB por proyecto; imágenes de hasta 5 MB y 16 megapíxeles. Los respaldos de varias pizarras se restauran desde Tus pizarras.</p><p><strong>Si un archivo no es válido:</strong> el mensaje indica el objeto y el campo con el problema, y la pizarra abierta no cambia.</p></div>
    <div className="modal-footer"><div className="button-row"><a className="secondary" href={`${import.meta.env.BASE_URL}examples/primer-proyecto.wbridge`} download="primer-proyecto.wbridge"><Icon name="download" size={16}/> Descargar ejemplo .wbridge</a><button className="secondary" onClick={agent}><Icon name="agent" size={16}/> Crear con un agente de IA</button></div><button className="primary" onClick={() => { close(); importFile(); }}><Icon name="upload" size={16}/> Importar archivo</button></div>
  </Modal>;
}
