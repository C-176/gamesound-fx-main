import { useEffect, useRef } from 'react';
import { Skull } from './PixelIcons';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ open, title, message, confirmLabel = 'OK', cancelLabel = 'CANCEL', danger = false, onConfirm, onCancel }: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => confirmRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      else if (e.key === 'Enter') onConfirm();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[99999]" onClick={onCancel}>
      <div
        className="bg-bg-secondary border-2 border-accent rounded-none p-4 min-w-[260px] max-w-[320px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-border-default">
          {danger && <Skull size={14} color="#f44" />}
          <h3 className="font-pixel text-lg text-accent">{title}</h3>
        </div>
        <p className="text-lg font-pixel text-text-primary mb-4 leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 border-2 border-border-default bg-bg-tertiary text-text-secondary text-lg font-pixel cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-3 py-1.5 border-2 text-lg font-pixel cursor-pointer transition-none rounded-none
              ${danger
                ? 'border-accent-red bg-accent-red text-white hover:bg-accent-red/80'
                : 'border-accent bg-accent text-black hover:bg-accent-gold hover:border-accent-gold'
              }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
