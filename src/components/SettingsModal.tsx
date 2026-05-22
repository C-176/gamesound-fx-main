import { useState, useEffect, useCallback } from 'react';
import type { Sound } from '../data/sounds';
import { Lightning, Skull, Cassette, UFO, Rocket, Satellite } from './ModernIcons';
import ConfirmModal from './ConfirmModal';
import SectionTitle from './ui/SectionTitle';
import { copy, themeColor } from '../ui/copy';

const PREFIX_KEYS = ['`', 'Tab', 'CapsLock', 'Space', '\\', 'Enter'];

interface MacroPreset {
  id: string;
  name: string;
  soundIds: string[];
  mode: 'random' | 'sequence' | 'burst';
  intervalMs: number;
  repeatCount: number;
}

interface ShortcutHealthIssue {
  id: string;
  level: 'warning' | 'info';
  type: 'single-key-risk' | 'stop-key-risk';
  shortcut: string;
  message: string;
  suggestion?: string;
}

interface ImportQualityReport {
  id: string;
  fileName: string;
  sizeBytes: number;
  estimatedDurationSec: number | null;
  peakDb: number | null;
  warnings: string[];
  canAutoProcess: boolean;
}

interface SettingsModalProps {
  onClose: () => void;
  shortcuts: Record<string, string>;
  onRemoveShortcut: (shortcut: string) => void;
  sounds: Sound[];
  onClearData: () => void;
  stopShortcut: string;
  onSetStopShortcut: (shortcut: string) => boolean;
  onClearStopShortcut: () => void;
  teamMode: boolean;
  onTeamModeChange: (enabled: boolean) => void;
  teamKey: string;
  onTeamKeyChange: (key: string) => void;
  valorantEnabled?: boolean;
  onValorantEnabledChange?: (enabled: boolean) => void;
  pickerPrefixKey?: string;
  onPickerPrefixKeyChange?: (key: string) => void;
  safeLockEnabled: boolean;
  onSafeLockChange: (enabled: boolean) => void;
  macroPresets: MacroPreset[];
  onUpsertMacro: (macro: MacroPreset) => void;
  onRemoveMacro: (macroId: string) => void;
  onRunMacro: (macroId: string) => void;
  activeMacroId: string | null;
  shortcutHealthIssues: ShortcutHealthIssue[];
  onAutoFixShortcutHealth: () => void;
  importQualityReports: ImportQualityReport[];
}

const TEAM_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Space'];

function SettingsModal({ onClose, shortcuts, onRemoveShortcut, sounds, onClearData, stopShortcut, onSetStopShortcut, onClearStopShortcut, teamMode, onTeamModeChange, teamKey, onTeamKeyChange, valorantEnabled, onValorantEnabledChange, pickerPrefixKey, onPickerPrefixKeyChange, safeLockEnabled, onSafeLockChange, macroPresets, onUpsertMacro, onRemoveMacro, onRunMacro, activeMacroId, shortcutHealthIssues, onAutoFixShortcutHealth, importQualityReports }: SettingsModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingKey, setRecordingKey] = useState<string[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [macroDraftName, setMacroDraftName] = useState('');

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
      const ok = onSetStopShortcut(keys.join('+'));
      if (ok) {
        setIsRecording(false);
        setRecordingKey([]);
      }
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-50" onClick={() => { if (!isRecording) onClose(); }}>
      <div className="surface-card border-accent/50 w-[430px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Fixed header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border-default shrink-0">
          <h2 className="text-base font-semibold text-accent">{copy.settings.title}</h2>
          <button onClick={() => { if (!isRecording) onClose(); }} className={`w-8 h-8 border bg-bg-tertiary flex items-center justify-center transition-none rounded-lg ${
            isRecording
              ? 'border-border-default text-text-secondary/50 cursor-not-allowed'
              : 'border-border-default text-text-secondary cursor-pointer hover:border-accent-red hover:text-accent-red'
          }`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          <div className="flex items-center gap-1.5 py-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-border-default text-text-secondary bg-bg-tertiary">基础控制</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-border-default text-text-secondary bg-bg-tertiary">游戏联动</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-border-default text-text-secondary bg-bg-tertiary">快捷键管理</span>
          </div>
          {/* Play/Pause shortcut */}
          <div>
            <SectionTitle icon={<Lightning size={12} color={themeColor.accent} />} variant="accent">{copy.settings.playPause}</SectionTitle>
            <div className="panel-inset">
              {isRecording ? (
                <div className="flex flex-col items-center py-3">
                  <span className="text-accent text-sm font-medium animate-[blink_0.8s_steps(1)_infinite]">{copy.common.pressKey}</span>
                  {recordingKey.length > 0 && <span className="mt-1 text-accent-gold text-sm font-medium">{recordingKey.join('+')}</span>}
                  <span className="mt-1.5 meta-label text-accent-red">录制中：点击遮罩不会关闭，请按 ESC 取消</span>
                </div>
              ) : stopShortcut ? (
                <div className="flex items-center justify-between p-2 bg-bg-secondary border border-border-default rounded-lg">
                  <div className="flex items-center gap-2">
                    <kbd className="kbd-chip">{stopShortcut}</kbd>
                    <span className="text-sm text-text-primary">{copy.settings.playPauseLabel}</span>
                  </div>
                  <button onClick={onClearStopShortcut} className="w-7 h-7 border border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-lg">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
                  </button>
                </div>
              ) : (
                <button onClick={() => { (window as any).electron?.ipcRenderer?.send('set-recording-mode', true); setIsRecording(true); }} className="w-full px-3 py-2 border border-border-default bg-transparent text-accent text-sm text-left cursor-pointer hover:border-accent transition-none flex items-center gap-2 rounded-lg">
                  <Lightning size={12} color={themeColor.cyan} /> {copy.settings.setPlayPause}
                </button>
              )}
            </div>
          </div>


          <div className="pt-1">
            <div className="meta-label uppercase tracking-[1.2px]">基础控制</div>
          </div>
          {/* Team Mode */}
          <div>
            <SectionTitle icon={<UFO size={12} color={themeColor.green} />}>{copy.settings.teamMode}</SectionTitle>
            <div className="panel-inset space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary">{copy.settings.pushToTalk}</span>
                <button
                  onClick={() => onTeamModeChange(!teamMode)}
                  className={`toggle-chip ${teamMode ? 'is-on' : ''}`}
                >
                  {teamMode ? copy.common.on : copy.common.off}
                </button>
              </div>
              {teamMode && (
                <div className="flex items-center gap-2">
                  <span className="meta-label">{copy.settings.teamKey}</span>
                  <select
                    value={teamKey}
                    onChange={e => onTeamKeyChange(e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-bg-secondary border border-border-default text-text-primary text-sm outline-none focus:border-accent rounded-lg cursor-pointer"
                  >
                    {TEAM_KEYS.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              )}
              <p className="meta-label">
                {teamMode ? copy.settings.teamOnHint : copy.settings.teamOffHint}
              </p>
            </div>
          </div>

          <div className="pt-1">
            <div className="meta-label uppercase tracking-[1.2px]">游戏联动</div>
          </div>
          {/* Valorant Monitor */}
          <div>
            <SectionTitle icon={<Satellite size={12} color={themeColor.accent} />} variant="accent">{copy.settings.valorant}</SectionTitle>
            <div className="panel-inset space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary">{copy.settings.logMonitor}</span>
                <button
                  onClick={() => onValorantEnabledChange?.(!valorantEnabled)}
                  className={`toggle-chip ${valorantEnabled ? 'is-on' : ''}`}
                >
                  {valorantEnabled ? copy.common.on : copy.common.off}
                </button>
              </div>
              <p className="meta-label">{copy.settings.valorantHint}</p>
            </div>
          </div>

          {/* Picker Prefix Key */}
          <div>
            <SectionTitle icon={<Rocket size={12} color={themeColor.pink} />}>{copy.settings.pickerPrefix}</SectionTitle>
            <div className="panel-inset space-y-2">
              <div className="flex items-center gap-2">
                <span className="meta-label">{copy.settings.prefix}</span>
                <select
                  value={pickerPrefixKey}
                  onChange={e => onPickerPrefixKeyChange?.(e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-bg-secondary border border-border-default text-text-primary text-sm outline-none focus:border-accent rounded-lg cursor-pointer"
                >
                  {PREFIX_KEYS.map(k => (
                    <option key={k} value={k}>{k === '`' ? '~ / `' : k}</option>
                  ))}
                </select>
              </div>
              <p className="meta-label">{copy.settings.pickerHint}</p>
            </div>
          </div>

          <div className="pt-1">
            <div className="meta-label uppercase tracking-[1.2px]">快捷键管理</div>
          </div>
          {/* Sound shortcuts */}
          <div>
            <SectionTitle icon={<Cassette size={12} color={themeColor.cyan} />}>{copy.settings.shortcuts}</SectionTitle>
            <div className="panel-inset max-h-[160px] overflow-y-auto">
              {Object.keys(shortcuts).length === 0 ? (
                <div className="flex flex-col items-center py-4 text-text-secondary">
                  <Cassette size={20} color={themeColor.muted} />
                  <span className="text-sm font-medium mt-2">{copy.settings.shortcutsEmpty}</span>
                  <span className="meta-label mt-1">{copy.settings.shortcutsHint}</span>
                </div>
              ) : (
                Object.entries(shortcuts).map(([shortcut, soundId]) => (
                  <div key={shortcut} className="flex items-center justify-between p-2 bg-bg-secondary border border-border-default rounded-lg mb-1.5 last:mb-0">
                    <div className="flex items-center gap-2">
                      <kbd className="kbd-chip">{shortcut}</kbd>
                      <span className="text-sm text-text-primary">{getSoundName(soundId)}</span>
                    </div>
                    <button onClick={() => onRemoveShortcut(shortcut)} className="w-7 h-7 border border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-lg">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Help */}
          <div>
            <SectionTitle icon={<Rocket size={12} color={themeColor.pink} />}>{copy.settings.help}</SectionTitle>
            <div className="panel-inset space-y-1">
              {copy.settings.helpLines.map((text, i) => (
                <div key={i} className="flex items-start gap-2 meta-label">
                  <span className="text-accent-cyan shrink-0">▸</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div>
            <SectionTitle icon={<Skull size={12} color={themeColor.red} />} variant="danger">{copy.settings.danger}</SectionTitle>
            <div className="panel-inset mb-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary">比赛防误触锁</span>
                <button
                  onClick={() => onSafeLockChange(!safeLockEnabled)}
                  className={`toggle-chip ${safeLockEnabled ? 'is-on' : ''}`}
                >
                  {safeLockEnabled ? '已开启' : '已关闭'}
                </button>
              </div>
              <p className="meta-label">开启后将拦截删除、改键、重置等高风险操作。</p>
            </div>
            <button
              onClick={() => setConfirmClear(true)}
              className="w-full px-3 py-2 border border-accent-red bg-accent-red/8 text-accent-red text-sm cursor-pointer hover:bg-accent-red/16 transition-none rounded-lg"
            >
              {copy.settings.resetAll}
            </button>
          </div>

          <div>
            <SectionTitle icon={<Rocket size={12} color={themeColor.cyan} />}>宏播放模式</SectionTitle>
            <div className="panel-inset space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={macroDraftName}
                  onChange={e => setMacroDraftName(e.target.value)}
                  placeholder="输入宏名称"
                  className="flex-1 px-2 py-1.5 bg-bg-secondary border border-border-default text-text-primary text-sm outline-none focus:border-accent rounded-lg"
                />
                <button
                  onClick={() => {
                    const name = macroDraftName.trim();
                    if (!name) return;
                    onUpsertMacro({
                      id: `macro_${Date.now()}`,
                      name,
                      soundIds: sounds.slice(0, 3).map(s => s.id),
                      mode: 'sequence',
                      intervalMs: 420,
                      repeatCount: 3,
                    });
                    setMacroDraftName('');
                  }}
                  className="px-2.5 py-1.5 border border-accent bg-accent/15 text-accent text-xs rounded-lg"
                >
                  新建宏
                </button>
              </div>
              {macroPresets.length === 0 ? (
                <p className="meta-label">暂无宏，默认会使用前 3 个音效创建示例宏。</p>
              ) : macroPresets.map(macro => (
                <div key={macro.id} className="flex items-center justify-between px-2 py-1.5 border border-border-default rounded-lg bg-bg-secondary">
                  <div>
                    <div className="text-sm text-text-primary">{macro.name}</div>
                    <div className="meta-label">{macro.mode} · {macro.intervalMs}ms · {macro.repeatCount}次</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onRunMacro(macro.id)} className={`px-2 py-1 text-xs rounded-lg border ${activeMacroId === macro.id ? 'border-accent-green text-accent-green bg-accent-green/10' : 'border-border-default text-text-primary'}`}>运行</button>
                    <button onClick={() => onRemoveMacro(macro.id)} className="px-2 py-1 text-xs rounded-lg border border-accent-red text-accent-red">删除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle icon={<Lightning size={12} color={themeColor.gold} />}>快捷键健康中心</SectionTitle>
            <div className="panel-inset space-y-2">
              {shortcutHealthIssues.length === 0 ? (
                <p className="meta-label">当前快捷键健康状态良好。</p>
              ) : (
                <>
                  {shortcutHealthIssues.map(issue => (
                    <div key={issue.id} className="px-2 py-1.5 border border-border-default rounded-lg bg-bg-secondary">
                      <div className="text-sm text-text-primary">{issue.message}</div>
                      {issue.suggestion && <div className="meta-label">建议：{issue.suggestion}</div>}
                    </div>
                  ))}
                  <button onClick={onAutoFixShortcutHealth} className="w-full px-2.5 py-1.5 border border-accent text-accent rounded-lg text-sm">
                    一键修复建议
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <SectionTitle icon={<Cassette size={12} color={themeColor.pink} />}>导入质量检测</SectionTitle>
            <div className="panel-inset space-y-2 max-h-[170px] overflow-y-auto">
              {importQualityReports.length === 0 ? (
                <p className="meta-label">暂无导入质检记录。</p>
              ) : importQualityReports.map(report => (
                <div key={report.id} className="px-2 py-1.5 border border-border-default rounded-lg bg-bg-secondary">
                  <div className="text-sm text-text-primary truncate" title={report.fileName}>{report.fileName}</div>
                  <div className="meta-label">体积 {Math.round(report.sizeBytes / 1024)}KB · 估计时长 {report.estimatedDurationSec ?? '-'}s</div>
                  {report.warnings.length > 0 && <div className="meta-label text-accent-gold">{report.warnings.join('；')}</div>}
                </div>
              ))}
            </div>
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
