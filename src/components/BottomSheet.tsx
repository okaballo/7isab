import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Slide-up sheet. Closes on backdrop tap or Escape. Keeps content above the home indicator. */
export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div ref={ref} tabIndex={-1} className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grabber" aria-hidden />
        <h2 className="sheet-title">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Confirmation built on the sheet. */
export function ConfirmSheet({ open, title, message, confirmLabel, danger, onConfirm, onClose }: {
  open: boolean; title: string; message: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <p className="muted" style={{ fontSize: 14, lineHeight: 1.45 }}>{message}</p>
      <div className="sheet-actions">
        <button type="button" className="btn raised pressable block" onClick={onClose}>Cancel</button>
        <button type="button" className={`btn block ${danger ? 'raised pressable danger' : 'primary'}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </div>
    </BottomSheet>
  );
}
