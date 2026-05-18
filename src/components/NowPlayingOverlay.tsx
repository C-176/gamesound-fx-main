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
      className={`fixed left-3 bottom-3 z-[9999] pointer-events-none transition-opacity duration-300 ease-out tracking-[1px] flex items-center gap-2 ${
        playingSound ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-end gap-px h-4">
        <div className="eq-bar w-[2px] bg-accent-pink" />
        <div className="eq-bar w-[2px] bg-accent-pink" />
        <div className="eq-bar w-[2px] bg-accent-pink" />
        <div className="eq-bar w-[2px] bg-accent-pink" />
      </div>
      <span className="text-sm text-accent-pink whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
        {currentName}
      </span>
    </div>
  );
}

export default NowPlayingOverlay;
