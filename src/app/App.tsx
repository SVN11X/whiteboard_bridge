import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '../editor/Canvas';
import { useEditor } from '../editor/store';
import { makeObject, parseBoard, type Board, type Point } from '../models/document';
import { IMPORT_ACCEPT, importedProject, readImportFile, serializeProject } from '../models/projectFile';
import { descendants, screenToWorld } from '../editor/geometry';
import { TOOLS, type Tool, type ToolOptions } from '../editor/tools';
import { copyObjects, readObjects, type CopyMode, type CopyResult } from '../clipboard/clipboard';
import { db, getSetting, listBoards, saveBoard, setSetting } from '../persistence/database';
import { svgFor, pngFor } from '../graphics/render';
import { download, downloadProject, imageObject } from '../utils/files';
import { Icon } from '../components/Icon';
import { Inspector } from '../components/Inspector';
import { CompatibilityLab } from '../components/CompatibilityLab';
import { ProjectManager } from '../components/ProjectManager';
import { Modal } from '../components/Modal';
import { FileFormats } from '../components/FileFormats';

export default function App() {
  const board = useEditor(s => s.board), past = useEditor(s => s.past), future = useEditor(s => s.future), busy = useEditor(s => s.busy), selectedCount = useEditor(s => s.selected.length);
  const [tool, setTool] = useState<Tool>('select'), [options, setOptions] = useState<ToolOptions>({ color: '#24574e', width: 3, opacity: 1 }), [mode, setMode] = useState<CopyMode>('custom'), [lastCopy, setLastCopy] = useState<CopyResult | null>(null);
  const [ready, setReady] = useState(false), [saving, setSaving] = useState('Recuperando…'), [storageError, setStorageError] = useState(''), [status, setStatus] = useState('Tu pizarra, a tu manera.'), [theme, setTheme] = useState('light'), [online, setOnline] = useState(navigator.onLine), [panel, setPanel] = useState(true), [modal, setModal] = useState<'lab' | 'projects' | 'help' | 'formats' | null>(null), [context, setContext] = useState<Point | null>(null), [storage, setStorage] = useState(''), [update, setUpdate] = useState<ServiceWorkerRegistration | null>(null), [conflict, setConflict] = useState(false);
  const importInput = useRef<HTMLInputElement>(null), imageInput = useRef<HTMLInputElement>(null), channel = useRef<BroadcastChannel | null>(null), ownTab = useRef(crypto.randomUUID()), savedAt = useRef('');
  const importLock = useRef(false), exportMenu = useRef<HTMLDetailsElement>(null);
  const [importing, setImporting] = useState(false), [importError, setImportError] = useState('');
  const notify = useCallback((text: string) => setStatus(text), []);
  const centerPoint = useCallback(() => { const el = document.querySelector('.canvas-pane'), rect = el?.getBoundingClientRect(); return screenToWorld({ x: (rect?.width ?? 1000) / 2 - 100, y: (rect?.height ?? 700) / 2 - 70 }, useEditor.getState().board.viewport); }, []);
  const addNote = () => { try { useEditor.getState().add([makeObject('sticky', centerPoint())]); setTool('select'); } catch (e) { notify(String(e)); } };
  const copy = useCallback(async () => { const s = useEditor.getState(), ids = descendants(s.board.objects, s.selected); try { const result = await copyObjects(s.board.objects.filter(o => ids.has(o.id)), mode); setLastCopy(result); notify(result.warnings.length ? result.warnings.join(' ') : `Copia lista: ${result.written.join(', ')}. Verifica el resultado en el destino.`); } catch (e) { notify(`No se pudo copiar: ${e instanceof Error ? e.message : String(e)}`); } }, [mode, notify]);
  const paste = useCallback(async (event?: ClipboardEvent) => { try { const objects = await readObjects(centerPoint(), event); useEditor.getState().add(objects); notify(`${objects.length} objetos pegados en Bridge.`); } catch (e) { notify(`Pegado: ${e instanceof Error ? e.message : String(e)}`); } }, [centerPoint, notify]);
  async function openBoard(next: Board) { await saveBoard(useEditor.getState().board); useEditor.getState().load(parseBoard(next)); setConflict(false); await setSetting('last-board', next.id); }
  async function importFile(file: File, at = centerPoint()) {
    if (importLock.current) { notify('Hay una importación en curso. Espera a que termine.'); return; }
    importLock.current = true; setImporting(true); setImportError(''); notify(`Importando ${file.name}…`);
    if (exportMenu.current) exportMenu.current.open = false;
    try {
      const result = await readImportFile(file);
      if (result.kind === 'project') {
        const imported = importedProject(result.board);
        await saveBoard(imported); await openBoard(imported);
        notify(`Proyecto importado con objetos editables: ${file.name}. Se abrió como nueva pizarra.`);
      } else {
        useEditor.getState().add([await imageObject(result.file, at)]);
        notify(`Imagen importada: ${file.name}. Se conserva como imagen, sin convertirla en figuras.`);
      }
      setTool('select');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setImportError(message); notify(`No se pudo importar: ${message}`);
    } finally { importLock.current = false; setImporting(false); }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [boards, lastId, preferred] = await Promise.all([listBoards(), getSetting('last-board', ''), getSetting('theme', 'light')]);
        if (!active) return; setTheme(preferred === 'dark' ? 'dark' : 'light'); const b = boards.find(b => b.id === lastId) ?? boards[0]; if (b) useEditor.getState().load(parseBoard(b));
      } catch (e) { if (active) setStorageError(`Almacenamiento no disponible: ${String(e)}. Exporta JSON antes de cerrar.`); }
      if (active) setReady(true);
    })();
    const online = () => setOnline(navigator.onLine); window.addEventListener('online', online); window.addEventListener('offline', online);
    if ('BroadcastChannel' in window) { const c = new BroadcastChannel('whiteboard-bridge'); channel.current = c; c.onmessage = event => { if (event.data?.tab !== ownTab.current && event.data?.boardId === useEditor.getState().board.id && event.data?.updatedAt !== savedAt.current) { setConflict(true); notify('Esta pizarra cambió en otra pestaña. Exporta tus cambios o recarga su versión guardada.'); } }; }
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).then(reg => { if (reg.waiting) setUpdate(reg); reg.addEventListener('updatefound', () => { const worker = reg.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) setUpdate(reg); }); }); }).catch(e => notify(`Modo sin conexión no disponible: ${String(e)}`));
    }
    return () => { active = false; window.removeEventListener('online', online); window.removeEventListener('offline', online); channel.current?.close(); };
  }, [notify]);
  useEffect(() => { document.documentElement.dataset.theme = theme; if (ready) setSetting('theme', theme).catch(e => notify(String(e))); }, [theme, ready, notify]);
  useEffect(() => {
    if (!ready || busy || conflict) return;
    setSaving('Guardando…');
    const timer = setTimeout(() => { saveBoard(board).then(async () => { savedAt.current = board.updatedAt; setSaving('Guardado local'); setStorageError(''); channel.current?.postMessage({ boardId: board.id, updatedAt: board.updatedAt, tab: ownTab.current }); await setSetting('last-board', board.id); const est = await navigator.storage?.estimate?.(); if (est?.usage !== undefined) setStorage(`${(est.usage / 1024 / 1024).toFixed(1)} MB locales`); }).catch(e => { setSaving('Sin guardar'); setStorageError(`No se pudo guardar: ${String(e)}. Exporta el proyecto JSON.`); }); }, 650);
    return () => clearTimeout(timer);
  }, [board, ready, busy, conflict]);
  useEffect(() => {
    const hidden = () => { if (document.visibilityState === 'hidden' && ready && !conflict) saveBoard(useEditor.getState().board).catch(() => {}); };
    document.addEventListener('visibilitychange', hidden); return () => document.removeEventListener('visibilitychange', hidden);
  }, [ready, conflict]);
  useEffect(() => {
    const editable = (target: EventTarget | null) => { const el = target as HTMLElement; return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName) || el?.isContentEditable || !!el?.closest('dialog'); };
    const key = (e: KeyboardEvent) => {
      if (editable(e.target) || modal) return;
      const s = useEditor.getState(), ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (ctrl && k === 'c') { if (s.selected.length) { e.preventDefault(); void copy(); } return; }
      if (ctrl && k === 'a') { e.preventDefault(); s.select(s.board.objects.filter(o => !o.groupId).map(o => o.id)); return; }
      if (ctrl && k === 'z') { e.preventDefault(); if (e.shiftKey) s.redo(); else s.undo(); return; }
      if (ctrl && k === 'y') { e.preventDefault(); s.redo(); return; }
      if (ctrl && k === 'd') { e.preventDefault(); s.duplicate(); return; }
      if (ctrl && k === 'g') { e.preventDefault(); if (e.shiftKey) s.ungroup(); else s.group(); return; }
      if (ctrl && k === 'o') { e.preventDefault(); importInput.current?.click(); return; }
      if (ctrl && k === 's') { e.preventDefault(); try { downloadProject(s.board); notify('Pizarra editable .wbridge exportada.'); } catch (error) { notify(String(error)); } return; }
      if (k === 'delete' || k === 'backspace') { e.preventDefault(); s.remove(); return; }
      if (k === 'escape') { s.select([]); setContext(null); setTool('select'); return; }
      if (e.key.startsWith('Arrow') && s.selected.length) { e.preventDefault(); const step = e.shiftKey ? 10 : 1, before = s.board; s.transform(before, e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0, e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0); s.commit(useEditor.getState().board.objects, before); return; }
      if (k === '?') { setModal('help'); return; }
      if (!ctrl && !e.altKey) { const found = TOOLS.find(t => t.key?.toLowerCase() === k); if (found) setTool(found.id); }
    };
    const onPaste = (e: ClipboardEvent) => { if (!editable(e.target) && !modal) { e.preventDefault(); void paste(e); } };
    document.addEventListener('keydown', key); document.addEventListener('paste', onPaste); return () => { document.removeEventListener('keydown', key); document.removeEventListener('paste', onPaste); };
  }, [copy, paste, modal, notify]);
  useEffect(() => { if (!context) return; const close = () => setContext(null); window.addEventListener('pointerdown', close); return () => window.removeEventListener('pointerdown', close); }, [context]);
  async function exportAs(format: string) {
    if (exportMenu.current) exportMenu.current.open = false;
    try {
      const current = useEditor.getState(), objects = current.board.objects;
      if (format === 'project' || format === 'selection') downloadProject(current.board, format === 'selection' ? current.selected : undefined);
      if (format === 'json') download('whiteboard-bridge-proyecto.json', serializeProject(current.board));
      if (format === 'svg') download('whiteboard-bridge.svg', svgFor(objects), 'image/svg+xml');
      if (format === 'png') download('whiteboard-bridge.png', await pngFor(objects));
      notify(format === 'project' || format === 'selection' ? 'Archivo .wbridge exportado con objetos editables.' : `Exportación ${format.toUpperCase()} lista.`);
    } catch (e) { notify(String(e)); }
  }
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href={import.meta.env.BASE_URL} aria-label="Whiteboard Bridge inicio"><span className="brand-symbol"><svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true"><path d="M4 19V7h6v12M16 19V7h6v12M4 12c6 4 12 4 18 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg></span><span>whiteboard<span className="brand-light">bridge</span><small>UN ESPACIO PARA CONECTAR IDEAS</small></span></a><span className="header-divider"/><button className="board-switch" onClick={() => setModal('projects')} title="Abrir tus pizarras"><Icon name="folder" size={17}/><span>{board.name}</span><Icon name="chevron" size={13}/></button><div className="header-actions"><span className="save-badge" title={storage}><span className={`dot ${storageError ? 'error' : ''}`}/>{online ? saving : 'Sin conexión'}</span><div className="history-buttons"><button className="icon-button" disabled={!past.length} onClick={() => useEditor.getState().undo()} title="Deshacer · Ctrl Z" aria-label="Deshacer"><Icon name="undo" size={18}/></button><button className="icon-button" disabled={!future.length} onClick={() => useEditor.getState().redo()} title="Rehacer · Ctrl Mayús Z" aria-label="Rehacer"><Icon name="redo" size={18}/></button></div><button className="secondary import-button" aria-label="Importar archivo" title="Importar .wbridge, JSON de Bridge o una imagen · Ctrl O" disabled={!ready || importing} aria-busy={importing} onClick={() => importInput.current?.click()}><Icon name="upload" size={16}/><span>{importing ? 'Importando…' : 'Importar'}</span></button><details ref={exportMenu} className="export-menu"><summary className="secondary"><Icon name="download" size={16}/><span>Exportar</span><Icon name="chevron" size={13}/></summary><div className="dropdown"><button onClick={() => exportAs('project')}>Pizarra editable · WBRIDGE</button><button disabled={!selectedCount} onClick={() => exportAs('selection')}>Selección editable · WBRIDGE</button><hr/><button onClick={() => exportAs('json')}>Proyecto editable · JSON</button><button onClick={() => exportAs('svg')}>Vector visual · SVG</button><button onClick={() => exportAs('png')}>Imagen visual · PNG</button><hr/><button onClick={() => importInput.current?.click()}>Importar archivo</button><button onClick={() => { if (exportMenu.current) exportMenu.current.open = false; setModal('formats'); }}>Formatos y ayuda</button><button onClick={() => setModal('projects')}>Respaldos y versiones</button></div></details><button className="primary lab-open" aria-label="Compatibility Lab" onClick={() => setModal('lab')}><Icon name="lab" size={17}/><span>Compatibility Lab</span></button><button className="icon-button" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Cambiar tema" aria-label="Cambiar tema"><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18}/></button><button className="icon-button panel-toggle" onClick={() => setPanel(p => !p)} title="Propiedades y capas" aria-label="Mostrar propiedades"><Icon name="layers" size={19}/></button></div></header>
    {importError && <div className="file-import-error" role="alert"><span>{importError}</span><button className="icon-button" aria-label="Cerrar error de importación" onClick={() => setImportError('')}><Icon name="close" size={16}/></button></div>}
    {(storageError || conflict || update) && <div className="app-banner">{storageError || (conflict ? 'Hay cambios de esta pizarra en otra pestaña. El guardado automático está pausado.' : 'Hay una nueva versión del editor disponible.')}<div className="button-row">{conflict && <><button onClick={() => exportAs('json')}>Exportar mis cambios</button><button onClick={async () => { const latest = await db.boards.get(board.id); if (latest) { useEditor.getState().load(parseBoard(latest)); setConflict(false); } }}>Cargar versión guardada</button></>}{update && <button onClick={async () => { await saveBoard(useEditor.getState().board); update.waiting?.postMessage('SKIP_WAITING'); navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true }); }}>Guardar y actualizar</button>}</div></div>}
    <main className={`workspace ${panel ? '' : 'panel-hidden'}`}>
      <nav className="tool-rail" aria-label="Herramientas de pizarra"><div className="tool-scroll">{TOOLS.map((t, i) => <div key={t.id}>{[2, 7, 9, 13].includes(i) && <hr/>}<button className={`tool-button ${tool === t.id ? 'active' : ''}`} aria-label={t.title} aria-pressed={tool === t.id} onClick={() => setTool(t.id)} title={`${t.title}${t.key ? ` · ${t.key}` : ''}`}><Icon name={t.id}/>{t.id === 'sticky' && <span className="tool-color"/>}</button></div>)}<hr/><button className="tool-button" aria-label="Importar imagen" title="Importar imagen o arrastra un archivo" onClick={() => imageInput.current?.click()}><Icon name="image"/></button></div><button className="tool-button" aria-label="Atajos y ayuda" onClick={() => setModal('help')} title="Atajos y ayuda · ?"><Icon name="help"/></button></nav>
      <section className="editor-area" aria-label="Área de trabajo"><Canvas tool={tool} setTool={setTool} options={options} notify={notify} onContext={setContext} onFileDrop={importFile}/><div className="drawing-options"><span className="eyebrow">{TOOLS.find(t => t.id === tool)?.title}</span><span className="option-divider"/><div className="swatches">{['#24574e', '#272c39', '#d35a4f', '#5679aa', '#9670b6', '#d1a23c'].map(color => <button className={options.color === color ? 'selected' : ''} key={color} style={{ background: color }} title={`Color ${color}`} aria-label={`Color ${color}`} onClick={() => setOptions(o => ({ ...o, color }))}/>)}</div><label className="custom-color" title="Otro color"><input type="color" aria-label="Color de herramienta" value={options.color} onChange={e => setOptions(o => ({ ...o, color: e.target.value }))}/></label><label className="stroke-choice"><span>Grosor</span><select aria-label="Grosor de herramienta" value={options.width} onChange={e => setOptions(o => ({ ...o, width: +e.target.value }))}>{[1, 2, 3, 6, 12, 24].map(w => <option key={w} value={w}>{w} px</option>)}</select></label><label className="stroke-choice opacity-option"><span>Opacidad</span><select aria-label="Opacidad de herramienta" value={options.opacity} onChange={e => setOptions(o => ({ ...o, opacity: +e.target.value }))}>{[1, 0.75, 0.5, 0.25].map(v => <option key={v} value={v}>{v * 100}%</option>)}</select></label></div></section>
      {panel && <Inspector mode={mode} setMode={setMode} copy={copy} lastCopy={lastCopy} openLab={() => setModal('lab')} addNote={addNote} close={() => setPanel(false)}/>}
    </main>
    <footer className="statusbar"><span role="status" aria-live="polite">{status}</span><span><Icon name="lock" size={12}/> Privado por diseño <span className="footer-separator">·</span> v0.3.0</span></footer>
    {context && <div className="context-menu" style={{ left: Math.min(context.x, window.innerWidth - 220), top: Math.min(context.y, window.innerHeight - 280) }} onPointerDown={e => e.stopPropagation()}>{[{ title: 'Copiar selección', icon: 'copy', action: copy }, { title: 'Pegar', icon: 'paste', action: () => paste() }, { title: 'Duplicar', icon: 'copy', action: () => useEditor.getState().duplicate() }, { title: 'Agrupar', icon: 'group', action: () => useEditor.getState().group() }, { title: 'Desagrupar', icon: 'ungroup', action: () => useEditor.getState().ungroup() }, { title: 'Al frente', icon: 'layers', action: () => useEditor.getState().layer('front') }, { title: 'Eliminar', icon: 'trash', action: () => useEditor.getState().remove() }].map(item => <button key={item.title} onClick={() => { item.action(); setContext(null); }}><Icon name={item.icon} size={16}/>{item.title}</button>)}</div>}
    <input ref={imageInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Archivo de imagen" onChange={async e => { const file = e.target.files?.[0]; if (file) try { useEditor.getState().add([await imageObject(file, centerPoint())]); } catch (err) { notify(String(err)); } e.target.value = ''; }}/>
    <input ref={importInput} hidden type="file" accept={IMPORT_ACCEPT} aria-label="Archivo de proyecto" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void importFile(file); }}/>
    {modal === 'formats' && <FileFormats close={() => setModal(null)} importFile={() => importInput.current?.click()}/>}
    {modal === 'lab' && <CompatibilityLab close={() => setModal(null)} lastCopy={lastCopy} notify={notify}/>}
    {modal === 'projects' && <ProjectManager current={board} close={() => setModal(null)} open={openBoard} notify={notify}/>}
    {modal === 'help' && <Modal title="Haz espacio para tus ideas" close={() => setModal(null)}><p>Elige una herramienta y haz clic o arrastra en el lienzo. Cada objeto se puede mover, editar, redimensionar y rotar.</p><div className="shortcuts">{[['V / H', 'Seleccionar / desplazar'], ['P / M / J', 'Lápiz / rotulador / resaltador'], ['N / T', 'Nota adhesiva / texto'], ['E / L', 'Borrador de objetos / lazo'], ['Mayús + clic', 'Selección múltiple'], ['Mayús + dibujar figura', 'Cuadrado o círculo'], ['Alt + clic', 'Seleccionar hijo de un grupo'], ['Doble clic', 'Editar texto en el lienzo'], ['Espacio + arrastrar', 'Desplazar el lienzo'], ['Ctrl + rueda / pellizco', 'Ampliar o reducir'], ['Flechas / Mayús + flechas', 'Mover 1 / 10 unidades'], ['Ctrl + C / V', 'Copiar / pegar'], ['Ctrl + D', 'Duplicar selección'], ['Ctrl + G / Ctrl + Mayús + G', 'Agrupar / desagrupar'], ['Ctrl + Z / Ctrl + Mayús + Z', 'Deshacer / rehacer'], ['Ctrl + O', 'Importar pizarra o imagen'], ['Ctrl + S', 'Exportar pizarra editable .wbridge'], ['Supr / Esc', 'Eliminar / quitar selección']].map(([keys, label]) => <div key={keys}><kbd>{keys}</kbd><span>{label}</span></div>)}</div><p>Usa el panel de propiedades como alternativa al arrastre. En macOS, sustituye Ctrl por ⌘. Las coordenadas son unidades del lienzo; Y crece hacia abajo.</p><p>El borrador elimina objetos completos. Los archivos .wbridge y JSON de Bridge conservan objetos editables. Las imágenes conservan su aspecto visual. El pegado nativo en Microsoft Whiteboard sigue sin verificar.</p><label className="field">Nombre de esta pizarra<input defaultValue={board.name} maxLength={120} onBlur={e => useEditor.getState().rename(e.target.value)}/></label><button className="secondary" onClick={async () => { const granted = await navigator.storage?.persist?.(); notify(granted ? 'El navegador concedió almacenamiento persistente.' : 'El navegador no concedió persistencia adicional. Descarga respaldos JSON.'); }}>Solicitar persistencia del almacenamiento</button></Modal>}
    {!ready && <div className="loading-cover" role="status"><span className="brand-symbol"><Icon name="sticky"/></span>Recuperando tus ideas…</div>}
  </div>;
}
