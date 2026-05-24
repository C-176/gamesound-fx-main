import { useState, useEffect, useRef, useCallback } from 'react';
import type { Sound } from '../data/sounds';

interface SpotlightSearchProps {
  open: boolean;
  onClose: () => void;
  sounds: Sound[];
  onPlaySound: (sound: Sound) => void;
  shortcuts: Record<string, string>;
}

export default function SpotlightSearch({ open, onClose, sounds, onPlaySound, shortcuts }: SpotlightSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const expanded = query.trim().length > 0;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = !query.trim()
    ? sounds
    : sounds.filter(s => {
        const q = query.toLowerCase().replace(/\s+/g, '');
        const name = s.name.toLowerCase().replace(/\s+/g, '');
        return name.includes(q);
      });

  const visible = filtered.slice(0, 12);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (!expanded) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => i >= visible.length - 1 ? 0 : i + 1);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => i <= 0 ? visible.length - 1 : i - 1);
    }
    if (e.key === 'Enter' && visible[selectedIndex]) {
      onPlaySound(visible[selectedIndex]);
      onClose();
    }
  }, [visible, selectedIndex, onClose, onPlaySound, expanded]);

  const getShortcut = (soundId: string) => {
    return Object.entries(shortcuts).find(([, id]) => id === soundId)?.[0];
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-[520px] max-w-[90vw] surface-card border-accent/40 overflow-hidden shadow-retro"
        onClick={e => e.stopPropagation()}
        style={{ borderRadius: '16px' }}
      >
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b border-border-default">
          <svg className="shrink-0 mr-3 text-text-secondary" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="搜索音效..."
            className="flex-1 bg-transparent text-text-primary text-base outline-none placeholder:text-text-muted/60"
          />
          <kbd className="ml-2 text-[10px] px-1.5 py-0.5 rounded border border-border-default text-text-muted font-pixel">ESC</kbd>
        </div>

        {/* Results — only when expanded */}
        {expanded && (
          <>
            <div ref={listRef} className="max-h-[360px] overflow-y-auto py-1">
              {visible.length === 0 ? (
                <div className="px-4 py-8 text-center text-text-muted text-sm">
                  没有匹配的音效
                </div>
              ) : (
                visible.map((sound, i) => {
                  const shortcut = getShortcut(sound.id);
                  return (
                    <button
                      key={sound.id}
                      onClick={() => { onPlaySound(sound); onClose(); }}
                      className={`w-full px-4 py-2.5 flex items-center gap-3 text-left cursor-pointer transition-none ${
                        i === selectedIndex
                          ? 'bg-accent/15 text-accent'
                          : 'text-text-primary hover:bg-bg-soft/30'
                      }`}
                    >
                      <span className="flex-1 text-sm truncate">{sound.name}</span>
                      {shortcut && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                          {shortcut}
                        </span>
                      )}
                      <span className="shrink-0 text-[10px] text-text-muted">{sound.category}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-border-default flex items-center gap-3 text-[10px] text-text-muted">
              <span>↑↓ 导航</span>
              <span>↵ 播放</span>
              <span>ESC 关闭</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
