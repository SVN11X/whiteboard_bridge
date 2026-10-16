import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
export function Modal({ title, close, children, wide = false }: { title: string; close: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current; d?.showModal();
    const frame = requestAnimationFrame(() => { if (d) { d.querySelector<HTMLButtonElement>('[data-dialog-close]')?.focus({ preventScroll: true }); d.scrollTop = 0; } });
    return () => { cancelAnimationFrame(frame); d?.close(); };
  }, []);
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }} aria-label={title}>
    <div className="modal-head"><div><span className="eyebrow">WHITEBOARD BRIDGE</span><h2>{title}</h2></div><button data-dialog-close className="icon-button" onClick={close} aria-label="Cerrar"><Icon name="close"/></button></div>{children}
  </dialog>;
}
