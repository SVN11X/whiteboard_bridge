import { createRoot } from 'react-dom/client';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import App from './app/App';
import { useEditor } from './editor/store';
import { download } from './utils/files';
import './styles/app.css';
import './styles/workspace.css';
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Do not transmit document contents or stack traces. */ }
  render() { return this.state.error ? <main className="fatal-error"><h1>No se pudo mostrar la pizarra</h1><p>Descarga el documento actual y recarga el editor para recuperar el último guardado.</p><button onClick={() => download('whiteboard-bridge-recuperacion.json', JSON.stringify(useEditor.getState().board))}>Descargar recuperación JSON</button><button onClick={() => location.reload()}>Recargar</button></main> : this.props.children; }
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App/></ErrorBoundary>);
