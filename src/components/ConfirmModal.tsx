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

function ConfirmModal({ open, title, message, confirmLabel = '确定', cancelLabel = '取消', danger = false, onConfirm, onCancel }: ConfirmModalProps) {
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999]" onClick={onCancel}>
      <div
        className="bg-bg-secondary border border-accent/55 rounded-xl p-4 min-w-[280px] max-w-[360px] shadow-retro"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-default">
          {danger && <Skull size={14} color="var(--accent-red)" />}
          <h3 className="text-base font-semibold text-accent">{title}</h3>
        </div>
        <p className="text-sm text-text-primary mb-4 leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 border border-border-default bg-bg-tertiary text-text-secondary text-sm cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-lg"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-3 py-1.5 border text-sm cursor-pointer transition-none rounded-lg
              ${danger
                ? 'border-accent-red bg-accent-red/15 text-accent-red hover:bg-accent-red/22'
                : 'border-accent bg-accent/15 text-accent hover:bg-accent/24'
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
