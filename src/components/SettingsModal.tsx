import { useState, useEffect, useCallback } from 'react';
import type { Sound } from '../data/sounds';
import { Lightning, Skull, Cassette, UFO, Rocket, Satellite } from './PixelIcons';
import ConfirmModal from './ConfirmModal';

const PREFIX_KEYS = ['`', 'Tab', 'CapsLock', 'Space', '\\', 'Enter'];

interface SettingsModalProps {
  onClose: () => void;
  shortcuts: Record<string, string>;
  onRemoveShortcut: (shortcut: string) => void;
  sounds: Sound[];
  onClearData: () => void;
  stopShortcut: string;
  onSetStopShortcut: (shortcut: string) => void;
  onClearStopShortcut: () => void;
  teamMode: boolean;
  onTeamModeChange: (enabled: boolean) => void;
  teamKey: string;
  onTeamKeyChange: (key: string) => void;
  valorantEnabled?: boolean;
  onValorantEnabledChange?: (enabled: boolean) => void;
  pickerPrefixKey?: string;
  onPickerPrefixKeyChange?: (key: string) => void;
}

const TEAM_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Space'];

function SettingsModal({ onClose, shortcuts, onRemoveShortcut, sounds, onClearData, stopShortcut, onSetStopShortcut, onClearStopShortcut, teamMode, onTeamModeChange, teamKey, onTeamKeyChange, valorantEnabled, onValorantEnabledChange, pickerPrefixKey, onPickerPrefixKeyChange }: SettingsModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingKey, setRecordingKey] = useState<string[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  const getSoundName = (soundId: string) => {
    const sound = sounds.find(s => s.id === soundId);
    return sound?.name || '???';
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isRecording) return;
    if (e.repeat) return;

    const keys: string[] = [];
    if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
    if (e.shiftKey) keys.push('Shift');
    if (e.altKey) keys.push('Alt');

    let key = e.key;
    if (key === ' ') key = 'Space';
    else if (key === 'Escape') { setIsRecording(false); setRecordingKey([]); e.preventDefault(); return; }

    const validKeys = [
      'Enter', 'Space', 'Tab', 'Backspace', 'Delete',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Home', 'End', 'PageUp', 'PageDown',
      ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    ];

    if (key.length === 1 || validKeys.includes(key)) {
      if (!keys.includes(key)) keys.push(key);
    }

    setRecordingKey([...keys]);

    if (keys.length > 0 && !['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      onSetStopShortcut(keys.join('+'));
      setIsRecording(false);
      setRecordingKey([]);
    }

    e.preventDefault();
  }, [isRecording, onSetStopShortcut]);

  useEffect(() => {
    if (isRecording) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        (window as any).electron?.ipcRenderer?.send('set-recording-mode', false);
      };
    }
  }, [isRecording, handleKeyDown]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-secondary border-2 border-accent rounded-none w-[380px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Fixed header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b-2 border-border-default shrink-0">
          <h2 className="font-pixel text-base text-accent">SETTINGS</h2>
          <button onClick={onClose} className="w-7 h-7 border-2 border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none">
            <svg shapeRendering="crispEdges" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {/* Play/Pause shortcut */}
          <div>
            <h3 className="font-pixel text-base text-accent mb-2 flex items-center gap-1.5"><Lightning size={12} color="#c04dff" /> PLAY / PAUSE SHORTCUT</h3>
            <div className="bg-bg-tertiary border-2 border-border-default rounded-none p-2.5">
              {isRecording ? (
                <div className="flex flex-col items-center py-3">
                  <span className="text-accent font-pixel text-base animate-[blink_0.8s_steps(1)_infinite]">PRESS KEY...</span>
                  {recordingKey.length > 0 && <span className="mt-1 text-accent-gold font-pixel text-base">{recordingKey.join('+')}</span>}
                </div>
              ) : stopShortcut ? (
                <div className="flex items-center justify-between p-1.5 bg-bg-secondary border-2 border-border-default rounded-none">
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-accent text-black font-pixel text-sm border-2 border-accent">{stopShortcut}</kbd>
                    <span className="text-base text-text-primary font-pixel">PLAY / PAUSE</span>
                  </div>
                  <button onClick={onClearStopShortcut} className="w-7 h-7 border-2 border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none">
                    <svg shapeRendering="crispEdges" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M6 6l12 12M18 6l-12 12"/></svg>
                  </button>
                </div>
              ) : (
                <button onClick={() => { (window as any).electron?.ipcRenderer?.send('set-recording-mode', true); setIsRecording(true); }} className="w-full px-2.5 py-1.5 border-2 border-border-default bg-transparent text-accent font-pixel text-base text-left cursor-pointer hover:border-accent transition-none flex items-center gap-2 rounded-none">
                  <span className="font-pixel text-base"><Lightning size={12} color="#0cf" /></span> SET PLAY/PAUSE KEY
                </button>
              )}
            </div>
          </div>


          {/* Team Mode */}
          <div>
            <h3 className="font-pixel text-base text-accent mb-2 flex items-center gap-1.5"><UFO size={12} color="#0e5" /> TEAM MODE</h3>
            <div className="bg-bg-tertiary border-2 border-border-default rounded-none p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-pixel text-text-primary">PUSH-TO-TALK</span>
                <button
                  onClick={() => onTeamModeChange(!teamMode)}
                  className={`px-2 py-1 border-2 text-base font-pixel cursor-pointer transition-none rounded-none ${
                    teamMode
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border-default bg-bg-secondary text-text-secondary'
                  }`}
                >
                  {teamMode ? 'ON' : 'OFF'}
                </button>
              </div>
              {teamMode && (
                <div className="flex items-center gap-2">
                  <span className="text-base text-text-secondary font-pixel">KEY</span>
                  <select
                    value={teamKey}
                    onChange={e => onTeamKeyChange(e.target.value)}
                    className="flex-1 px-2 py-1 bg-bg-secondary border-2 border-border-default text-text-primary text-base font-pixel outline-none focus:border-accent rounded-none cursor-pointer"
                  >
                    {TEAM_KEYS.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="text-base text-text-secondary font-pixel">
                {teamMode ? 'HOLDS KEY WHILE SOUND PLAYS' : 'AUTO-HOLD KEY IN GAMES'}
              </div>
            </div>
          </div>

          {/* Valorant Monitor */}
          <div>
            <h3 className="font-pixel text-base text-accent mb-2 flex items-center gap-1.5"><Satellite size={12} color="#c04dff" /> VALORANT MONITOR</h3>
            <div className="bg-bg-tertiary border-2 border-border-default rounded-none p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-pixel text-text-primary">LOG MONITOR</span>
                <button
                  onClick={() => onValorantEnabledChange?.(!valorantEnabled)}
                  className={`px-2 py-1 border-2 text-base font-pixel cursor-pointer transition-none rounded-none ${
                    valorantEnabled
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border-default bg-bg-secondary text-text-secondary'
                  }`}
                >
                  {valorantEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="text-base text-text-secondary font-pixel">
                MONITORS ShooterGame.log FOR ROUND & SPIKE EVENTS
              </div>
            </div>
          </div>

          {/* Picker Prefix Key */}
          <div>
            <h3 className="font-pixel text-base text-accent mb-2 flex items-center gap-1.5"><Rocket size={12} color="#ff5ca0" /> PICKER PREFIX KEY</h3>
            <div className="bg-bg-tertiary border-2 border-border-default rounded-none p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base text-text-secondary font-pixel">PREFIX</span>
                <select
                  value={pickerPrefixKey}
                  onChange={e => onPickerPrefixKeyChange?.(e.target.value)}
                  className="flex-1 px-2 py-1 bg-bg-secondary border-2 border-border-default text-text-primary text-base font-pixel outline-none focus:border-accent rounded-none cursor-pointer"
                >
                  {PREFIX_KEYS.map(k => (
                    <option key={k} value={k}>{k === '`' ? '~ / `' : k}</option>
                  ))}
                </select>
              </div>
              <div className="text-base text-text-secondary font-pixel">
                HOLD PREFIX + 1/2/3 TO SELECT VALORANT EVENT SOUNDS
              </div>
            </div>
          </div>

          {/* Sound shortcuts */}
          <div>
            <h3 className="font-pixel text-base text-accent mb-2 flex items-center gap-1.5"><Cassette size={12} color="#0cf" /> SOUND SHORTCUTS</h3>
            <div className="bg-bg-tertiary border-2 border-border-default rounded-none p-2.5 max-h-[160px] overflow-y-auto">
              {Object.keys(shortcuts).length === 0 ? (
                <div className="flex flex-col items-center py-4 text-text-secondary">
                  <span className="font-pixel text-xl mb-1 text-border-default">⌨</span>
                  <span className="text-base">NO SHORTCUTS SET</span>
                  <span className="text-base mt-1">CLICK ··· ON A SOUND TO ADD</span>
                </div>
              ) : (
                Object.entries(shortcuts).map(([shortcut, soundId]) => (
                  <div key={shortcut} className="flex items-center justify-between p-1.5 bg-bg-secondary border-2 border-border-default rounded-none mb-1.5 last:mb-0">
                    <div className="flex items-center gap-2">
                      <kbd className="px-1.5 py-0.5 bg-accent text-black font-pixel text-sm border-2 border-accent">{shortcut}</kbd>
                      <span className="text-base text-text-primary font-pixel">{getSoundName(soundId)}</span>
                    </div>
                    <button onClick={() => onRemoveShortcut(shortcut)} className="w-7 h-7 border-2 border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none">
                      <svg shapeRendering="crispEdges" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M6 6l12 12M18 6l-12 12"/></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-pixel text-base text-accent mb-2 flex items-center gap-1.5"><Rocket size={12} color="#ff5ca0" /> HELP</h3>
            <div className="bg-bg-tertiary border-2 border-border-default rounded-none p-2.5 space-y-1">
              {[
                ['Click sound to play, click again to stop'],
                ['Click ★ to favorite'],
                ['Click ··· to set keybind'],
                ['Ctrl+Shift+` to toggle window'],
                ['Ctrl+Shift+Tab for game overlay mode'],
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-2 text-base text-text-secondary">
                  <span className="text-accent font-pixel text-sm mt-0.5">{'>'}</span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div>
            <h3 className="font-pixel text-base text-accent-red mb-2 flex items-center gap-1"><Skull size={12} color="#f44" /> DANGER ZONE</h3>
            <button
              onClick={() => setConfirmClear(true)}
              className="w-full px-3 py-2 border-2 border-accent-red bg-accent-red/5 text-accent-red text-base font-pixel cursor-pointer hover:bg-accent-red hover:text-white transition-none rounded-none"
            >
              RESET ALL DATA
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmClear}
        title="RESET ALL DATA"
        message="THIS WILL DELETE ALL SOUNDS AND SETTINGS. ARE YOU SURE?"
        danger
        confirmLabel="RESET"
        onConfirm={() => { onClearData(); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}

export default SettingsModal;
