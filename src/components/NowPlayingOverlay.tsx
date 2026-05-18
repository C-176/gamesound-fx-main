import { useState, useEffect, useRef, useCallback } from 'react';
import type { Sound } from '../data/sounds';

interface NowPlayingOverlayProps {
  playingSound: string | null;
  allSounds: Sound[];
}

function NowPlayingOverlay({ playingSound, allSounds }: NowPlayingOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [currentName, setCurrentName] = useState('');
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSoundName = useCallback((id: string) => {
    const sound = allSounds.find(s => s.id === id);
    return sound?.name || id;
  }, [allSounds]);

  useEffect(() => {
    if (playingSound) {
      setCurrentName(getSoundName(playingSound));
      setVisible(true);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    } else {
      // Delay hide so there's a smooth fade-out feel
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        hideTimerRef.current = null;
      }, 500);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [playingSound, getSoundName]);

  if (!visible) return null;

  return (
    <div
      className="fixed left-0 top-1/2 -translate-y-1/2 z-[9999] pointer-events-none"
      style={{
        transition: 'opacity 0.3s ease-out',
        opacity: playingSound ? 1 : 0,
      }}
    >
      <div className="border border-l-0 border-accent-pink/70 bg-bg-secondary/92 pl-3 pr-4 py-3 rounded-r-xl"
        style={{ boxShadow: '0 8px 20px rgba(34, 211, 238, 0.22)' }}>
        <div className="flex items-center gap-3">
          {/* EQ bars */}
          <div className="flex items-end gap-px h-6">
            <div className="eq-bar w-[3px] bg-accent-pink" style={{ height: '100%', animation: 'bounce-bar 0.6s ease-in-out infinite' }} />
            <div className="eq-bar w-[3px] bg-accent-pink" style={{ height: '100%', animation: 'bounce-bar2 0.5s ease-in-out infinite' }} />
            <div className="eq-bar w-[3px] bg-accent-pink" style={{ height: '100%', animation: 'bounce-bar3 0.7s ease-in-out infinite' }} />
            <div className="eq-bar w-[3px] bg-accent-pink" style={{ height: '100%', animation: 'bounce-bar4 0.55s ease-in-out infinite' }} />
          </div>
          <span className="text-sm font-medium text-accent-pink whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]">
            {currentName}
          </span>
        </div>
      </div>
    </div>
  );
}

export default NowPlayingOverlay;
