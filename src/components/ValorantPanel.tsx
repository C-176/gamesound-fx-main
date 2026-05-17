import { useState, useEffect, useCallback } from 'react';
import { Satellite, PlayTriangle, StopSquare, CloseX, Checkmark } from './PixelIcons';
import { VALORANT_EVENTS, VALORANT_EVENT_LABELS, type ValorantEvent, type ValorantStatus } from '../valorant/types';
import { sounds as builtinSounds } from '../data/sounds';
import SectionTitle from './ui/SectionTitle';
import { copy, themeColor } from '../ui/copy';

interface ValorantPanelProps {
  onClose?: () => void;
}

function migrateBindings(raw: Record<string, any>): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [event, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      result[event] = value.filter(Boolean);
    } else if (typeof value === 'string' && value) {
      result[event] = [value];
    } else {
      result[event] = [];
    }
  }
  return result;
}

function ValorantPanel({ onClose }: ValorantPanelProps) {
  const [bindings, setBindings] = useState<Record<string, string[]>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('valorantBindings') || '{}');
      return migrateBindings(raw);
    }
    catch { return {}; }
  });
  const [status, setStatus] = useState<ValorantStatus>({ connected: false });
  const [showPicker, setShowPicker] = useState<ValorantEvent | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const allSounds: { id: string; name: string }[] = (() => {
    try {
      const imported = JSON.parse(localStorage.getItem('importedSounds') || '[]');
      return [...imported, ...builtinSounds];
    } catch {
      return builtinSounds;
    }
  })();

  const saveBindings = useCallback((newBindings: Record<string, string[]>) => {
    setBindings(newBindings);
    localStorage.setItem('valorantBindings', JSON.stringify(newBindings));
  }, []);

  const toggleSound = useCallback((event: ValorantEvent, soundId: string) => {
    const current = bindings[event] || [];
    if (current.includes(soundId)) {
      const next = { ...bindings, [event]: current.filter(id => id !== soundId) };
      saveBindings(next);
    } else {
      const next = { ...bindings, [event]: [...current, soundId] };
      saveBindings(next);
    }
  }, [bindings, saveBindings]);

  const removeSound = useCallback((event: ValorantEvent, soundId: string) => {
    const current = bindings[event] || [];
    const next = { ...bindings, [event]: current.filter(id => id !== soundId) };
    saveBindings(next);
  }, [bindings, saveBindings]);

  const clearBinding = useCallback((event: ValorantEvent) => {
    const next = { ...bindings };
    delete next[event];
    saveBindings(next);
  }, [bindings, saveBindings]);

  const playPreview = useCallback((soundId: string) => {
    const electron = (window as any).electron;
    if (electron?.ipcRenderer) {
      electron.ipcRenderer.send('shortcut-triggered', soundId);
    }
  }, []);

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.ipcRenderer) return;

    const currentStatus = electron.ipcRenderer.sendSync('get-valorant-status');
    if (currentStatus) {
      setStatus(currentStatus);
    }

    const handleStatus = (_: any, s: ValorantStatus) => {
      setStatus(s);
    };

    electron.ipcRenderer.on('valorant-status-changed', handleStatus);

    return () => {
      electron.ipcRenderer.removeListener('valorant-status-changed', handleStatus);
    };
  }, []);

  const filteredSounds = allSounds.filter(s =>
    s.name.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const getSoundName = (soundId: string): string => {
    const sound = allSounds.find(s => s.id === soundId);
    return sound?.name || soundId;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-pixel text-accent flex items-center gap-1.5">
          <Satellite size={12} color={themeColor.accent} /> {copy.valorant.title}
        </span>
        {onClose && (
          <div className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1 px-2 py-0.5 border-2 font-pixel text-xs ${
              status.connected
                ? 'border-accent-green text-accent-green'
                : 'border-accent-red text-accent-red'
            }`}>
              <span className={`w-2 h-2 ${status.connected ? 'bg-accent-green' : 'bg-accent-red'}`} />
              {status.connected ? copy.valorant.connected : copy.valorant.disconnected}
            </div>
            <button onClick={onClose} className="w-7 h-7 border-2 border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none">
              <CloseX size={12} color="var(--text-secondary)" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 border-2 border-border-default rounded-none overflow-hidden flex flex-col">
        <div className="px-3 py-2 bg-bg-secondary border-b-2 border-border-default">
          <span className="text-base text-text-primary font-pixel">{copy.valorant.bindings}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {VALORANT_EVENTS.map((event) => {
            const boundSounds = bindings[event] || [];
            return (
              <div key={event} className="px-3 py-2.5 bg-bg-tertiary border-2 border-border-default mb-2 rounded-none">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-base text-text-primary font-pixel">{VALORANT_EVENT_LABELS[event]}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => setShowPicker(showPicker === event ? null : event)}
                      className={`btn-retro-icon px-2 py-1 border-2 text-base font-pixel cursor-pointer transition-none rounded-none ${
                        showPicker === event
                          ? 'border-accent-gold bg-accent-gold text-black'
                          : 'border-accent bg-accent text-black hover:bg-accent-gold hover:border-accent-gold'
                      }`}>
                      + {copy.valorant.addSound}
                    </button>
                    {boundSounds.length > 0 && (
                      <button onClick={() => clearBinding(event)}
                        className="px-2 py-1 border-2 border-accent-red bg-transparent text-accent-red text-base font-pixel cursor-pointer hover:bg-accent-red hover:text-white transition-none rounded-none">
                        {copy.common.clear}
                      </button>
                    )}
                  </div>
                </div>
                {boundSounds.length === 0 ? (
                  <div className="text-base font-pixel text-text-secondary">{copy.common.none}</div>
                ) : (
                  boundSounds.map((soundId, idx) => (
                    <div key={soundId} className="flex items-center justify-between py-1 px-2 border-2 border-border-default mt-1 rounded-none bg-bg-secondary">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-accent font-pixel w-4">{idx + 1}.</span>
                        <span className="text-base text-text-primary font-pixel">{getSoundName(soundId)}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => playPreview(soundId)}
                          className="w-6 h-6 border-2 border-accent bg-accent/10 text-accent flex items-center justify-center cursor-pointer hover:bg-accent hover:text-black transition-none rounded-none"
                          title={copy.valorant.preview}>
                          <PlayTriangle size={10} color="currentColor" />
                        </button>
                        <button onClick={() => removeSound(event, soundId)}
                          className="w-6 h-6 border-2 border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none"
                          title={copy.valorant.remove}>
                          <CloseX size={10} color="currentColor" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showPicker && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]" onClick={() => setShowPicker(null)}>
          <div className="bg-bg-secondary border-2 border-accent rounded-none p-5 min-w-[350px] max-w-[450px] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-pixel text-base text-accent mb-4">{copy.valorant.pickerTitle(VALORANT_EVENT_LABELS[showPicker])}</h3>
            <input
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder={copy.valorant.searchPlaceholder}
              className="w-full px-2.5 py-2 bg-bg-tertiary border-2 border-border-default text-text-primary text-base font-pixel outline-none focus:border-accent transition-none mb-4 rounded-none"
              autoFocus
            />
            <div className="max-h-[300px] overflow-y-auto">
              {filteredSounds.length === 0 ? (
                <div className="text-center py-4 text-text-secondary font-pixel">{copy.valorant.notFound}</div>
              ) : filteredSounds.map((sound) => {
                const isSelected = (bindings[showPicker] || []).includes(sound.id);
                return (
                <div key={sound.id}
                  onClick={() => toggleSound(showPicker, sound.id)}
                  className={`flex items-center justify-between px-3 py-2 border-2 mb-1 cursor-pointer transition-none rounded-none ${
                    isSelected
                      ? 'border-accent-green bg-accent-green/10'
                      : 'border-border-default bg-bg-tertiary hover:border-accent hover:bg-accent/5'
                  }`}>
                  <span className="text-base text-text-primary font-pixel">{sound.name}</span>
                  <div className="flex items-center gap-1">
                    {isSelected && <Checkmark size={10} color="var(--accent-green)" />}
                    <span className={`text-xs font-pixel ${isSelected ? 'text-accent-green' : 'text-accent'}`}>
                      {isSelected ? copy.valorant.bound : copy.valorant.bind}
                    </span>
                  </div>
                </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowPicker(null)}
                className="flex-1 px-3 py-1.5 border-2 border-accent bg-transparent text-accent text-base font-pixel cursor-pointer hover:bg-accent hover:text-black transition-none rounded-none">
                {copy.common.ok}
              </button>
              <button onClick={() => setShowPicker(null)}
                className="px-3 py-1.5 border-2 border-border-default bg-transparent text-text-secondary text-base font-pixel cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none">
                {copy.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ValorantPanel;
