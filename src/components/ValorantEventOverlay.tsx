import { useState, useEffect, useCallback, useRef } from 'react';
import { Satellite } from './PixelIcons';
import { VALORANT_EVENT_LABELS, type ValorantEvent, type ValorantEventPayload } from '../valorant/types';
import { sounds as builtinSounds } from '../data/sounds';

interface Toast {
  id: number;
  event: ValorantEvent;
  label: string;
  soundIds: string[];
  soundNames: string;
  time: number;
}

let toastId = 0;

function ValorantEventOverlay() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const allSoundsRef = useRef<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const imported = (() => {
      try { return JSON.parse(localStorage.getItem('importedSounds') || '[]'); }
      catch { return []; }
    })();
    allSoundsRef.current = [...imported, ...builtinSounds];
  }, []);

  const getBindings = useCallback((): Record<string, string[]> => {
    try { return JSON.parse(localStorage.getItem('valorantBindings') || '{}'); }
    catch { return {}; }
  }, []);

  const getSoundName = useCallback((soundId: string): string => {
    const sound = allSoundsRef.current.find(s => s.id === soundId);
    return sound?.name || soundId;
  }, []);

  const playSound = useCallback((soundId: string) => {
    const electron = (window as any).electron;
    if (electron?.ipcRenderer) {
      electron.ipcRenderer.send('shortcut-triggered', soundId);
    }
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.ipcRenderer) return;

    const handleEvent = (_: any, payload: ValorantEventPayload) => {
      const event = payload.event;
      const bindings = getBindings();
      const soundIds = bindings[event] || [];

      const id = ++toastId;
      const toast: Toast = {
        id,
        event,
        label: VALORANT_EVENT_LABELS[event] || event,
        soundIds,
        soundNames: soundIds.map(sid => getSoundName(sid)).join(', ') || '(none)',
        time: Date.now(),
      };

      // Play all bound sounds
      soundIds.forEach(sid => playSound(sid));

      setToasts(prev => [...prev.slice(-4), toast]);

      // Auto-remove after 5s
      setTimeout(() => removeToast(id), 5000);
    };

    electron.ipcRenderer.on('valorant-event-fired', handleEvent);
    return () => {
      electron.ipcRenderer.removeListener('valorant-event-fired', handleEvent);
    };
  }, [getBindings, getSoundName, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-3 left-3 z-[9999] flex flex-col gap-2 items-start pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto border border-accent-pink/70 bg-bg-secondary/92 rounded-xl p-3 min-w-[240px] max-w-[340px] animate-[slide-up_0.2s_ease-out]"
          style={{ boxShadow: '0 8px 20px rgba(34, 211, 238, 0.22)' }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Satellite size={10} color="#ff4dc7" />
            <span className="text-xs font-semibold text-accent-pink">{toast.label}</span>
          </div>
          {toast.soundIds.length > 0 ? (
            <div className="flex flex-col gap-1">
              {toast.soundIds.map((sid, i) => (
                <button key={sid}
                  onClick={() => playSound(sid)}
                  className="w-full flex items-center justify-between px-2 py-1.5 border border-accent-pink/70 bg-accent-pink/10 cursor-pointer hover:bg-accent-pink/18 transition-none rounded-lg"
                >
                  <span className="text-sm text-text-primary">▶ {getSoundName(sid)}</span>
                  <span className="text-xs text-accent-pink">{i + 1}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2 py-1.5 border border-border-default bg-bg-tertiary rounded-lg">
              <span className="text-sm text-text-secondary">(no sound bound)</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ValorantEventOverlay;
