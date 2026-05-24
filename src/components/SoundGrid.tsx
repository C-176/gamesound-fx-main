import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import type { Sound, Group } from '../data/sounds';
import { Alien, Rocket, Saturn, Checkmark } from './ModernIcons';
import ConfirmModal from './ConfirmModal';
import { copy } from '../ui/copy';

interface SoundGridProps {
  sounds: Sound[];
  playingSound: string | null;
  onToggleSound: (sound: Sound) => void;
  shortcuts: Record<string, string>;
  onAddShortcut: (soundId: string, shortcut: string) => boolean;
  onRemoveShortcut: (shortcut: string) => void;
  onDeleteSound: (soundId: string) => void;
  groups: Group[];
  soundGroupMap: Record<string, string>;
  onAddSoundToGroup: (soundId: string, groupId: string) => void;
  onRemoveSoundFromGroup: (soundId: string, groupId: string) => void;
  getGroupById: (groupId: string) => Group | undefined;
  emptyHint?: string;
  pinnedSounds: string[];
  onTogglePin: (soundId: string) => void;
  safeLockEnabled?: boolean;
  onTrimRequest?: (fileName: string) => void;
}

interface SoundCardProps {
  sound: Sound;
  isPlaying: boolean;
  shortcut: string | undefined;
  isMenuOpen: boolean;
  isRecThis: boolean;
  recordingKeys: string[];
  groupColor: string | null;
  menuPos: { top: number; left: number };
  onToggleSound: (sound: Sound) => void;
  onRemoveShortcut: (shortcut: string) => void;
  onRecordStart: (soundId: string) => void;
  onMenuClick: (e: React.MouseEvent, soundId: string) => void;
  onAddToGroup: (soundId: string, groupId: string) => void;
  onRemoveFromGroup: (soundId: string, groupId: string) => void;
  onDeleteSound: (soundId: string) => void;
  onDeleteRequest?: (soundId: string) => void;
  onMenuClose: () => void;
  groups: Group[];
  soundGroupMap: Record<string, string>;
  getGroupById: (groupId: string) => Group | undefined;
  isPinned: boolean;
  onTogglePin: (soundId: string) => void;
  safeLockEnabled?: boolean;
  onTrimRequest?: (fileName: string) => void;
}

const SoundCard = memo(function SoundCard({
  sound, isPlaying, shortcut, isMenuOpen, isRecThis, recordingKeys, groupColor, menuPos,
  onToggleSound, onRemoveShortcut, onRecordStart,
  onMenuClick, onAddToGroup, onRemoveFromGroup, onDeleteSound, onDeleteRequest, onMenuClose,
  groups, soundGroupMap, getGroupById, isPinned, onTogglePin, safeLockEnabled, onTrimRequest,
}: SoundCardProps) {
  return (
    <div className="relative">
      <button
        onClick={() => onToggleSound(sound)}
        className={`w-full min-h-[44px] pl-3 pr-2 py-2 text-sm text-left cursor-pointer border flex items-center gap-1.5 rounded-xl transition-colors
          ${isPlaying
            ? 'border-accent bg-accent-dim text-accent-pink shadow-retro-sm animate-[glowPulse_1.8s_ease-in-out_infinite,card-dance_1.2s_ease-in-out_infinite]'
            : 'border-border-default bg-bg-tertiary text-text-primary hover:border-accent hover:text-accent hover:bg-bg-soft/35'
          }`}
          style={isPlaying ? { willChange: 'transform' } : undefined}
      >
        {groupColor && (
          <span className="w-2 h-2 shrink-0 rounded-full border border-bg-primary" style={{ backgroundColor: groupColor }} />
        )}
        <span className={`overflow-hidden text-ellipsis whitespace-nowrap flex-1 ${isPlaying ? 'text-accent-pink' : ''}`} title={sound.name}>{sound.name}</span>
        {isRecThis ? (
          <span className="shrink-0 text-xs px-1.5 py-0.5 bg-accent-pink text-white rounded-md animate-[blink_0.8s_steps(1)_infinite]">
            {recordingKeys.length > 0 ? recordingKeys.join('+') : '...'}
          </span>
        ) : shortcut ? (
          <span
            onClick={(e) => { e.stopPropagation(); onRemoveShortcut(shortcut); }}
            className="shrink-0 text-xs px-1.5 py-0.5 bg-accent/15 text-accent rounded-md cursor-pointer hover:bg-accent-red/20 hover:text-accent-red"
            title={`${shortcut} · 点击移除`}
          >
            {shortcut}
          </span>
        ) : (
          <span
            onClick={(e) => { e.stopPropagation(); onRecordStart(sound.id); }}
            className="shrink-0 text-xs px-1.5 py-0.5 border border-border-default text-text-secondary rounded-md cursor-pointer hover:border-accent hover:text-accent hover:bg-bg-soft/35"
            title={copy.sound.rec}
          >
            {copy.sound.rec}
          </span>
        )}
        {isPlaying && (
          <span className="shrink-0 flex items-end gap-0.5 h-3.5">
            <span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" />
          </span>
        )}
        <span
          data-menu-btn="true"
          onClick={(e) => { e.stopPropagation(); onMenuClick(e, sound.id); }}
          className={`shrink-0 w-5 h-5 border rounded-md flex items-center justify-center cursor-pointer
            ${isMenuOpen
              ? 'border-accent bg-accent/15 text-accent'
              : 'border-border-default text-text-secondary hover:border-accent hover:text-accent'
            }`}
          title={copy.sound.menu}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </span>
      </button>
      {isMenuOpen && createPortal(
        <div className="context-menu surface-card border-accent p-1.5 min-w-[180px]" style={{ position: 'fixed', top: menuPos.top + 'px', left: menuPos.left + 'px', zIndex: 9999 }}>
          {/* Sound name header */}
          <div className="px-2.5 py-1.5 text-sm font-medium text-accent truncate border-b border-border-default mb-1" title={sound.name}>
            {sound.name}
          </div>
          {/* Group actions */}
          <div className="mb-1">
            {groups.length > 0 && (
              <>
                <button
                  onClick={() => { onTogglePin(sound.id); onMenuClose(); }}
                  className="w-full px-2.5 py-1.5 border border-transparent bg-transparent text-text-primary text-sm rounded-lg text-left cursor-pointer hover:border-border-default transition-none"
                >
                  {isPinned ? '取消置顶' : '置顶音效'}
                </button>
                <div className="h-px bg-border-default my-1" />
                {groups.map(g => {
                  const isCurrentGroup = soundGroupMap[sound.id] === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        if (isCurrentGroup) return;
                        if (soundGroupMap[sound.id]) onRemoveFromGroup(sound.id, soundGroupMap[sound.id]);
                        onAddToGroup(sound.id, g.id);
                        onMenuClose();
                      }}
                      className={`w-full px-2.5 py-1.5 border border-transparent bg-transparent text-sm rounded-lg text-left cursor-pointer flex items-center gap-2 hover:border-border-default transition-none
                        ${isCurrentGroup ? 'text-text-secondary' : 'text-text-primary'}`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isCurrentGroup ? 'opacity-40' : ''}`} style={{ backgroundColor: g.color }} />
                      <span className="flex-1 truncate">{g.name}</span>
                      {isCurrentGroup && <Checkmark size={10} color="var(--text-secondary)" />}
                    </button>
                  );
                })}
                <div className="h-px bg-border-default my-1" />
                {soundGroupMap[sound.id] && (
                  <button
                    onClick={() => { if (!safeLockEnabled) { onRemoveFromGroup(sound.id, soundGroupMap[sound.id]); onMenuClose(); } }}
                    className={`w-full px-2.5 py-1.5 border border-transparent text-sm rounded-lg text-left transition-none ${
                      safeLockEnabled ? 'bg-transparent text-text-secondary cursor-not-allowed' : 'bg-transparent text-accent-red cursor-pointer hover:border-accent-red hover:bg-accent-red/10'
                    }`}
                  >
                    <span className="text-sm mr-1">✕</span> {copy.sound.removeGroup}
                  </button>
                )}
              </>
            )}
            {onTrimRequest && sound.filename && (
              <button
                onClick={() => { onTrimRequest(sound.filename); onMenuClose(); }}
                className="w-full px-2.5 py-1.5 border border-transparent bg-transparent text-text-primary text-sm rounded-lg text-left cursor-pointer hover:border-border-default transition-none"
              >
                ✂ 裁剪音效
              </button>
            )}
            <button
              onClick={() => { if (!safeLockEnabled) onDeleteRequest?.(sound.id); }}
              className={`w-full px-2.5 py-1.5 border border-transparent text-sm rounded-lg text-left transition-none ${
                safeLockEnabled ? 'bg-transparent text-text-secondary cursor-not-allowed' : 'bg-transparent text-accent-red cursor-pointer hover:border-accent-red hover:bg-accent-red/10'
              }`}
            >
              <span className="text-sm mr-1">✕</span> {safeLockEnabled ? '已锁定删除' : copy.sound.deleteSound}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

function SoundGrid({ sounds, playingSound, onToggleSound, shortcuts, onAddShortcut, onRemoveShortcut, onDeleteSound, groups, soundGroupMap, onAddSoundToGroup, onRemoveSoundFromGroup, getGroupById, emptyHint, pinnedSounds, onTogglePin, safeLockEnabled, onTrimRequest }: SoundGridProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingKey, setRecordingKey] = useState<string[]>([]);
  const [recordingSoundId, setRecordingSoundId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Stable ref-backed callbacks so React.memo on SoundCard actually works
  const refs = useRef({ onToggleSound, onRemoveShortcut, onDeleteSound, onAddSoundToGroup, onRemoveSoundFromGroup, shortcuts, onAddShortcut });
  useEffect(() => { refs.current = { onToggleSound, onRemoveShortcut, onDeleteSound, onAddSoundToGroup, onRemoveSoundFromGroup, shortcuts, onAddShortcut }; });
  const stableToggleSound = useCallback((s: Sound) => refs.current.onToggleSound(s), []);
  const stableRemoveShortcut = useCallback((k: string) => refs.current.onRemoveShortcut(k), []);
  const stableDeleteSound = useCallback((id: string) => refs.current.onDeleteSound(id), []);
  const stableAddToGroup = useCallback((id: string, gid: string) => refs.current.onAddSoundToGroup(id, gid), []);
  const stableRemoveFromGroup = useCallback((id: string, gid: string) => refs.current.onRemoveSoundFromGroup(id, gid), []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu-btn]') && !target.closest('.context-menu')) {
        setActiveMenu(null);
        if (!isRecording) cancelRecording();
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isRecording]);

  const cancelRecording = () => { (window as any).electron?.ipcRenderer?.send('set-recording-mode', false); setIsRecording(false); setRecordingKey([]); setRecordingSoundId(null); };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isRecording || !recordingSoundId) return;
      if (e.repeat) return;
      const keys: string[] = [];
      if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      let key = e.key;
      if (key === ' ') key = 'Space';
      else if (key === 'Escape') { cancelRecording(); e.preventDefault(); return; }
      // Uppercase letter keys so they match VK_MAP in main.ts
      if (key.length === 1 && key >= 'a' && key <= 'z') key = key.toUpperCase();
      const validKeys = ['Enter', 'Space', 'Tab', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`), ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'];
      if (key.length === 1 || validKeys.includes(key)) { if (!keys.includes(key)) keys.push(key); }
      setRecordingKey([...keys]);
      if (keys.length > 0 && !['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        const shortcut = keys.join('+');
        const ok = onAddShortcut(recordingSoundId, shortcut);
        if (ok) cancelRecording();
      }
      e.preventDefault();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, recordingSoundId, onAddShortcut]);


  const handleMenuClick = (e: React.MouseEvent, soundId: string) => {
    e.stopPropagation();
    if (activeMenu === soundId) { setActiveMenu(null); return; }
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const menuW = 170, menuH = 200;
    let top = rect.bottom + 4;
    let left = rect.right - menuW;
    if (top + menuH > window.innerHeight) top = rect.top - menuH - 4;
    if (left < 4) left = 4;
    if (left + menuW > window.innerWidth - 4) left = window.innerWidth - menuW - 4;
    if (top < 4) top = 4;
    setMenuPos({ top, left });
    setActiveMenu(soundId);
  };

  const getSoundShortcut = (soundId: string) => {
    return Object.entries(shortcuts).find(([, id]) => id === soundId)?.[0];
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-3" ref={gridRef} tabIndex={0}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-2.5">
          {sounds.map(sound => {
            const gid = soundGroupMap[sound.id];
            return (
              <SoundCard
                key={sound.id}
                sound={sound}
                isPlaying={playingSound === sound.id}
                shortcut={getSoundShortcut(sound.id)}
                isMenuOpen={activeMenu === sound.id}
                isRecThis={isRecording && recordingSoundId === sound.id}
                recordingKeys={recordingKey}
                groupColor={gid ? getGroupById(gid)?.color ?? null : null}
                menuPos={menuPos}
                onToggleSound={stableToggleSound}
                onRemoveShortcut={stableRemoveShortcut}
                onRecordStart={(sid) => { (window as any).electron?.ipcRenderer?.send('set-recording-mode', true); setRecordingSoundId(sid); setIsRecording(true); setRecordingKey([]); }}
                onMenuClick={handleMenuClick}
                onAddToGroup={stableAddToGroup}
                onRemoveFromGroup={stableRemoveFromGroup}
                onDeleteSound={stableDeleteSound}
                onDeleteRequest={(id) => { setActiveMenu(null); setConfirmDeleteId(id); }}
                onMenuClose={() => setActiveMenu(null)}
                groups={groups}
                soundGroupMap={soundGroupMap}
                getGroupById={getGroupById}
                isPinned={pinnedSounds.includes(sound.id)}
                onTogglePin={onTogglePin}
                safeLockEnabled={safeLockEnabled}
                onTrimRequest={onTrimRequest}
              />
            );
          })}
        </div>
        {sounds.length === 0 && (
          <div className="empty-state-panel flex flex-col items-center justify-center mx-1 my-2 py-8 px-4 text-text-secondary">
            <div className="mb-3 flex items-center gap-3">
              <Alien size={32} color="#5a5a90" />
              <Rocket size={32} color="#6a6aa0" />
              <Saturn size={32} color="#7a7ab0" />
            </div>
            <span className="text-sm font-medium text-text-primary">{emptyHint || copy.sound.emptyTitle}</span>
            <span className="mt-1.5 meta-label">{copy.sound.emptyHint}</span>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmDeleteId !== null}
        title={copy.sound.deleteTitle}
        message={copy.sound.deleteMessage}
        danger
        confirmLabel={copy.sound.deleteConfirm}
        onConfirm={() => {
          if (confirmDeleteId) onDeleteSound(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}

export default SoundGrid;
