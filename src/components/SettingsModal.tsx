import { useState, useEffect, useCallback } from 'react';
import type { Sound } from '../data/sounds';
import { Lightning, Skull, Cassette, UFO, Rocket, Satellite } from './PixelIcons';
import ConfirmModal from './ConfirmModal';
import SectionTitle from './ui/SectionTitle';
import { copy, themeColor } from '../ui/copy';

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
          <h2 className="font-pixel text-lg text-accent">{copy.settings.title}</h2>
          <button onClick={onClose} className="w-7 h-7 border-2 border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none">
            <svg shapeRendering="crispEdges" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {/* Play/Pause shortcut */}
          <div>
            <SectionTitle icon={<Lightning size={12} color={themeColor.accent} />} variant="accent">{copy.settings.playPause}</SectionTitle>
            <div className="panel-inset rounded-none">
              {isRecording ? (
                <div className="flex flex-col items-center py-3">
                  <span className="text-accent font-pixel text-base animate-[blink_0.8s_steps(1)_infinite]">{copy.common.pressKey}</span>
                  {recordingKey.length > 0 && <span className="mt-1 text-accent-gold font-pixel text-base">{recordingKey.join('+')}</span>}
                </div>
              ) : stopShortcut ? (
                <div className="flex items-center justify-between p-1.5 bg-bg-secondary border-2 border-border-default rounded-none">
                  <div className="flex items-center gap-2">
                    <kbd className="kbd-chip font-pixel">{stopShortcut}</kbd>
                    <span className="text-base text-text-primary font-pixel">{copy.settings.playPauseLabel}</span>
                  </div>
                  <button onClick={onClearStopShortcut} className="w-7 h-7 border-2 border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none">
                    <svg shapeRendering="crispEdges" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M6 6l12 12M18 6l-12 12"/></svg>
                  </button>
                </div>
              ) : (
                <button onClick={() => { (window as any).electron?.ipcRenderer?.send('set-recording-mode', true); setIsRecording(true); }} className="w-full px-2.5 py-1.5 border-2 border-border-default bg-transparent text-accent font-pixel text-base text-left cursor-pointer hover:border-accent transition-none flex items-center gap-2 rounded-none">
                  <Lightning size={12} color={themeColor.cyan} /> {copy.settings.setPlayPause}
                </button>
              )}
            </div>
          </div>


          {/* Team Mode */}
          <div>
            <SectionTitle icon={<UFO size={12} color={themeColor.green} />}>{copy.settings.teamMode}</SectionTitle>
            <div className="panel-inset rounded-none space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-pixel text-text-primary">{copy.settings.pushToTalk}</span>
                <button
                  onClick={() => onTeamModeChange(!teamMode)}
                  className={`toggle-chip font-pixel rounded-none ${teamMode ? 'is-on' : ''}`}
                >
                  {teamMode ? copy.common.on : copy.common.off}
                </button>
              </div>
              {teamMode && (
                <div className="flex items-center gap-2">
                  <span className="meta-label font-pixel">{copy.settings.teamKey}</span>
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
              <p className="meta-label font-pixel">
                {teamMode ? copy.settings.teamOnHint : copy.settings.teamOffHint}
              </p>
            </div>
          </div>

          {/* Valorant Monitor */}
          <div>
            <SectionTitle icon={<Satellite size={12} color={themeColor.accent} />} variant="accent">{copy.settings.valorant}</SectionTitle>
            <div className="panel-inset rounded-none space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-pixel text-text-primary">{copy.settings.logMonitor}</span>
                <button
                  onClick={() => onValorantEnabledChange?.(!valorantEnabled)}
                  className={`toggle-chip font-pixel rounded-none ${valorantEnabled ? 'is-on' : ''}`}
                >
                  {valorantEnabled ? copy.common.on : copy.common.off}
                </button>
              </div>
              <p className="meta-label font-pixel">{copy.settings.valorantHint}</p>
            </div>
          </div>

          {/* Picker Prefix Key */}
          <div>
            <SectionTitle icon={<Rocket size={12} color={themeColor.pink} />}>{copy.settings.pickerPrefix}</SectionTitle>
            <div className="panel-inset rounded-none space-y-2">
              <div className="flex items-center gap-2">
                <span className="meta-label font-pixel">{copy.settings.prefix}</span>
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
              <p className="meta-label font-pixel">{copy.settings.pickerHint}</p>
            </div>
          </div>

          {/* Sound shortcuts */}
          <div>
            <SectionTitle icon={<Cassette size={12} color={themeColor.cyan} />}>{copy.settings.shortcuts}</SectionTitle>
            <div className="panel-inset rounded-none max-h-[160px] overflow-y-auto">
              {Object.keys(shortcuts).length === 0 ? (
                <div className="flex flex-col items-center py-4 text-text-secondary">
                  <Cassette size={20} color={themeColor.muted} />
                  <span className="text-base font-pixel mt-2">{copy.settings.shortcutsEmpty}</span>
                  <span className="meta-label font-pixel mt-1">{copy.settings.shortcutsHint}</span>
                </div>
              ) : (
                Object.entries(shortcuts).map(([shortcut, soundId]) => (
                  <div key={shortcut} className="flex items-center justify-between p-1.5 bg-bg-secondary border-2 border-border-default rounded-none mb-1.5 last:mb-0">
                    <div className="flex items-center gap-2">
                      <kbd className="kbd-chip font-pixel">{shortcut}</kbd>
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
            <SectionTitle icon={<Rocket size={12} color={themeColor.pink} />}>{copy.settings.help}</SectionTitle>
            <div className="panel-inset rounded-none space-y-1">
              {copy.settings.helpLines.map((text, i) => (
                <div key={i} className="flex items-start gap-2 meta-label font-pixel">
                  <span className="text-accent-cyan shrink-0">▸</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div>
            <SectionTitle icon={<Skull size={12} color={themeColor.red} />} variant="danger">{copy.settings.danger}</SectionTitle>
            <button
              onClick={() => setConfirmClear(true)}
              className="w-full px-3 py-2 border-2 border-accent-red bg-accent-red/5 text-accent-red text-base font-pixel cursor-pointer hover:bg-accent-red hover:text-white transition-none rounded-none"
            >
              {copy.settings.resetAll}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmClear}
        title={copy.settings.resetTitle}
        message={copy.settings.resetMessage}
        danger
        confirmLabel={copy.settings.resetConfirm}
        onConfirm={() => { onClearData(); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}

export default SettingsModal;
