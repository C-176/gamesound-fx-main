import { useState, useEffect, useRef } from 'react';
import { PixelSpeaker, PixelMuted, MusicNote } from './PixelIcons';

interface StatusBarProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  isPlaying: boolean;
  onPause: () => void;
  onPlayLast: () => void;
  hasLastSound: boolean;
  selectedDevice: string;
  onDeviceChange: (deviceId: string) => void;
  currentSoundName: string | null;
  isMuted: boolean;
  onMuteToggle: () => void;
}

interface AudioDevice {
  id: string;
  label: string;
}

function StatusBar({ volume, onVolumeChange, isPlaying, onPause, onPlayLast, hasLastSound, selectedDevice, onDeviceChange, currentSoundName, isMuted, onMuteToggle }: StatusBarProps) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const initialDevice = useRef(selectedDevice);

  useEffect(() => {
    const getDevices = async () => {
      try {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
        } catch { /* 权限拒绝也继续 */ }

        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = mediaDevices
          .filter(device => device.kind === 'audiooutput' && device.deviceId)
          .map((device, index) => ({
            id: device.deviceId,
            label: device.label || `OUTPUT ${index + 1}`
          }));

        if (audioDevices.length > 0) {
          setDevices(audioDevices);
          // Only auto-select the first device when NO device was ever saved
          // initialDevice.current is set on mount from props, won't change even after async delay
          if (!initialDevice.current) {
            onDeviceChange(audioDevices[0].id);
          }
        }
      } catch (error) {
        console.error('获取音频输出设备失败:', error);
      }
    };

    getDevices();
  }, []);

  const getSelectedDeviceLabel = () => {
    const device = devices.find(d => d.id === selectedDevice);
    return device?.label || 'SELECT DEVICE';
  };

  return (
    <div className="px-2.5 py-1.5 bg-bg-secondary border-t-2 border-border-default flex items-center gap-2">
      <button
        onClick={() => isPlaying ? onPause() : onPlayLast()}
        disabled={!hasLastSound && !isPlaying}
        className={`shrink-0 w-7 h-7 border-2 flex items-center justify-center cursor-pointer transition-all duration-100 rounded-none
          ${isPlaying
            ? 'border-accent-green bg-accent-green/10 text-accent-green'
            : hasLastSound
              ? 'border-accent bg-accent/10 text-accent hover:bg-accent hover:text-black'
              : 'border-border-default bg-bg-tertiary text-text-secondary cursor-not-allowed'
          }`}
      >
        {isPlaying ? (
          <svg shapeRendering="crispEdges" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="3" width="6" height="18"/><rect x="14" y="3" width="6" height="18"/></svg>
        ) : (
          <svg shapeRendering="crispEdges" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,2 20,12 6,22"/></svg>
        )}
      </button>

      {/* Now playing name */}
      {currentSoundName && (
        <div className="flex items-center gap-1 max-w-[140px] min-w-0 shrink-0" title={currentSoundName}>
          <span className="shrink-0"><MusicNote size={10} color="#ff5ca0" /></span>
          <span className="text-base font-pixel text-accent-pink truncate">{currentSoundName}</span>
          {isPlaying && (
            <span className="shrink-0 flex items-end gap-0.5" style={{ height: 12 }}>
              <span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" />
            </span>
          )}
        </div>
      )}

      {/* Mute toggle */}
      <button
        onClick={onMuteToggle}
        className={`shrink-0 w-6 h-6 flex items-center justify-center border-2 rounded-none cursor-pointer transition-none
          ${isMuted
            ? 'border-accent-red bg-accent-red/10 text-accent-red'
            : 'border-border-default bg-bg-tertiary text-text-secondary hover:border-accent hover:text-accent'}`}
        title={isMuted ? 'UNMUTE' : 'MUTE'}
      >
        {isMuted ? <PixelMuted size={12} /> : <PixelSpeaker size={12} />}
      </button>

      <div className="flex items-center gap-1 shrink-0">
        <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={e => {
          onVolumeChange(parseFloat(e.target.value));
          if (isMuted) onMuteToggle();
        }} className="volume-slider w-[80px]" />
        <span className="text-lg font-pixel text-text-secondary w-[30px] text-right">
          {isMuted ? 'OFF' : Math.round(volume * 100) + '%'}
        </span>
      </div>

      <div className="relative flex-1 min-w-0">
        <button
          onClick={() => setShowDeviceMenu(!showDeviceMenu)}
          className="flex items-center gap-1 px-2 py-1 border-2 border-border-default bg-bg-tertiary text-base text-text-primary cursor-pointer hover:border-accent transition-all duration-100 w-full rounded-none"
        >
          <span className="truncate">{getSelectedDeviceLabel()}</span>
          <span className="text-accent font-pixel text-xs shrink-0">{showDeviceMenu ? '▲' : '▼'}</span>
        </button>
        {showDeviceMenu && (
          <div className="absolute bottom-full right-0 mb-1 w-[200px] bg-bg-secondary border-2 border-accent rounded-none p-1 z-[100]">
            {devices.map(device => (
              <button
                key={device.id}
                onClick={() => { onDeviceChange(device.id); setShowDeviceMenu(false); }}
                className={`w-full px-2 py-1 text-base text-left cursor-pointer border-2 transition-all duration-100 truncate rounded-none
                  ${selectedDevice === device.id ? 'border-accent bg-accent/10 text-accent' : 'border-transparent text-text-primary hover:border-border-default'}`}
              >
                {device.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatusBar;
