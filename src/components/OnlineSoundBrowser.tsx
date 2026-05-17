import { useState, useEffect, useCallback, useRef } from 'react';
import { Globe, Satellite, Cassette, PlayTriangle, StopSquare } from './PixelIcons';
import { copy, themeColor } from '../ui/copy';

interface CapturedSound {
  url: string;
  name: string;
  timestamp: number;
  downloaded?: boolean;
}

interface OnlineSoundBrowserProps {
  onImport: (filePath: string, name: string, groupId?: string) => void;
  onClose?: () => void;
  targetGroupId?: string;
  targetGroupName?: string;
}

function OnlineSoundBrowser({ onImport, onClose, targetGroupId, targetGroupName }: OnlineSoundBrowserProps) {
  const [capturedSounds, setCapturedSounds] = useState<CapturedSound[]>([]);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [soundToRename, setSoundToRename] = useState<CapturedSound | null>(null);
  const [newSoundName, setNewSoundName] = useState('');
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const previewBlobUrlRef = useRef<string | null>(null);

  const revokePreviewBlob = useCallback(() => {
    if (previewBlobUrlRef.current) {
      URL.revokeObjectURL(previewBlobUrlRef.current);
      previewBlobUrlRef.current = null;
    }
  }, []);

  const toggleBrowser = useCallback(() => {
    const electron = (window as any).electron;
    if (!electron?.ipcRenderer) return;
    if (isBrowserOpen) {
      electron.ipcRenderer.send('close-browser-window');
    } else {
      electron.ipcRenderer.send('open-sound-browser');
      setIsBrowserOpen(true);
    }
  }, [isBrowserOpen]);

  // Auto-open browser on mount
  useEffect(() => {
    toggleBrowser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const playSoundPreview = useCallback(async (sound: CapturedSound) => {
    if (playingSound === sound.url) {
      if (audioRefs.current[sound.url]) {
        audioRefs.current[sound.url].pause();
        audioRefs.current[sound.url].currentTime = 0;
      }
      revokePreviewBlob();
      setPlayingSound(null);
      return;
    }

    Object.keys(audioRefs.current).forEach(url => {
      if (audioRefs.current[url]) {
        audioRefs.current[url].pause();
        audioRefs.current[url].currentTime = 0;
      }
    });
    revokePreviewBlob();

    const electron = (window as any).electron;
    if (!electron?.ipcRenderer) return;

    const result = await electron.ipcRenderer.invoke('preview-captured-sound', sound.url);
    if (!result?.data) return;

    const binary = atob(result.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    const blobUrl = URL.createObjectURL(blob);
    previewBlobUrlRef.current = blobUrl;

    const audio = new Audio(blobUrl);
    audio.volume = 0.5;
    audio.onended = () => { setPlayingSound(null); revokePreviewBlob(); };
    audio.onerror = () => { setPlayingSound(null); revokePreviewBlob(); };

    audioRefs.current[sound.url] = audio;
    audio.play();
    setPlayingSound(sound.url);
  }, [playingSound, revokePreviewBlob]);

  const downloadSound = useCallback((sound: CapturedSound) => {
    setSoundToRename(sound);
    let baseName = sound.name.replace('_爱给网_aigei_com', '');
    baseName = baseName.replace(/\.[^/.]+$/, '');
    setNewSoundName(baseName);
    setShowRenameDialog(true);
  }, []);

  const confirmDownload = useCallback(() => {
    if (!soundToRename || !newSoundName) return;
    const electron = (window as any).electron;
    if (!electron?.ipcRenderer) return;

    let finalName = newSoundName.trim();
    const extMatch = soundToRename.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i);
    if (extMatch && !finalName.toLowerCase().endsWith(extMatch[0].toLowerCase())) finalName += extMatch[0];
    else if (!extMatch) {
      const urlExt = soundToRename.url.split('?')[0].match(/\.(mp3|wav|ogg|m4a|flac)$/i);
      finalName += urlExt ? urlExt[0] : '.mp3';
    }

    setDownloading(soundToRename.url);
    setShowRenameDialog(false);
    electron.ipcRenderer.send('download-captured-sound', soundToRename.url, finalName, targetGroupId || '');
  }, [soundToRename, newSoundName]);

  const cancelDownload = useCallback(() => {
    setShowRenameDialog(false);
    setSoundToRename(null);
    setNewSoundName('');
  }, []);

  const downloadAll = useCallback(() => {
    const electron = (window as any).electron;
    if (!electron?.ipcRenderer) return;
    capturedSounds.forEach(sound => {
      if (!sound.downloaded) {
        let defaultName = sound.name.replace('_爱给网_aigei_com', '');
        defaultName = defaultName.replace(/\.[^/.]+$/, '');
        let finalName = defaultName;
        const extMatch = sound.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i);
        if (extMatch) finalName += extMatch[0];
        else {
          const urlExt = sound.url.split('?')[0].match(/\.(mp3|wav|ogg|m4a|flac)$/i);
          finalName += urlExt ? urlExt[0] : '.mp3';
        }
        electron.ipcRenderer.send('download-captured-sound', sound.url, finalName, targetGroupId || '');
      }
    });
    setCapturedSounds(prev => prev.map(s => ({ ...s, downloaded: true })));
  }, [capturedSounds, targetGroupId]);

  const clearAll = useCallback(() => {
    const electron = (window as any).electron;
    if (electron?.ipcRenderer) {
      electron.ipcRenderer.send('clear-captured-sounds');
      setCapturedSounds([]);
    }
  }, []);

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.ipcRenderer) return;

    const handleSoundCaptured = (_: any, sound: CapturedSound) => {
      setCapturedSounds(prev => prev.find(s => s.url === sound.url) ? prev : [sound, ...prev]);
    };
    const handleSoundDownloaded = (_: any, data: { url: string; name: string; filePath: string; groupId?: string }) => {
      setCapturedSounds(prev => prev.filter(s => s.url !== data.url));
      setDownloading(null);
      onImport(data.filePath, data.name, data.groupId || targetGroupId);
    };
    const handleDownloadFailed = () => setDownloading(null);
    const handleCapturedSoundsList = (_: any, sounds: CapturedSound[]) => setCapturedSounds(sounds);
    const handleCapturedSoundsCleared = () => setCapturedSounds([]);
    const handleBrowserClosed = () => setIsBrowserOpen(false);

    electron.ipcRenderer.on('sound-captured', handleSoundCaptured);
    electron.ipcRenderer.on('sound-downloaded', handleSoundDownloaded);
    electron.ipcRenderer.on('sound-download-failed', handleDownloadFailed);
    electron.ipcRenderer.on('captured-sounds-list', handleCapturedSoundsList);
    electron.ipcRenderer.on('captured-sounds-cleared', handleCapturedSoundsCleared);
    electron.ipcRenderer.on('sound-browser-closed', handleBrowserClosed);
    electron.ipcRenderer.send('get-captured-sounds');

    return () => {
      revokePreviewBlob();
      electron.ipcRenderer.removeListener('sound-captured', handleSoundCaptured);
      electron.ipcRenderer.removeListener('sound-downloaded', handleSoundDownloaded);
      electron.ipcRenderer.removeListener('sound-download-failed', handleDownloadFailed);
      electron.ipcRenderer.removeListener('captured-sounds-list', handleCapturedSoundsList);
      electron.ipcRenderer.removeListener('captured-sounds-cleared', handleCapturedSoundsCleared);
      electron.ipcRenderer.removeListener('sound-browser-closed', handleBrowserClosed);
    };
  }, [onImport, revokePreviewBlob]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onClose && (
            <span className="text-base font-pixel text-accent-gold px-1.5 py-0.5 bg-bg-tertiary border border-accent-gold/40 rounded-none">
              {copy.sniffer.target(targetGroupName)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleBrowser}
            className={`shrink-0 px-2.5 py-1.5 border-2 text-base font-pixel cursor-pointer transition-none rounded-none
              ${isBrowserOpen
                ? 'border-accent-red bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-white'
                : 'border-accent bg-accent text-black hover:bg-accent-gold hover:border-accent-gold'
              }`}
          >
            {isBrowserOpen ? copy.sniffer.closeBrowser : copy.sniffer.openBrowser}
          </button>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 border-2 border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none">
              <svg shapeRendering="crispEdges" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M6 6l12 12M18 6l-12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 border-2 border-border-default rounded-none overflow-hidden flex flex-col">
        <div className="px-3 py-2 bg-bg-secondary border-b-2 border-border-default flex items-center justify-between">
          <span className="text-base text-text-primary font-pixel flex items-center gap-1.5">
            <Satellite size={12} color={themeColor.cyan} /> {copy.sniffer.captured(capturedSounds.length)}
          </span>
          {capturedSounds.length > 0 && (
            <div className="flex gap-1.5">
              <button onClick={clearAll} className="px-2 py-1 border-2 border-accent-red bg-transparent text-accent-red text-base font-pixel cursor-pointer hover:bg-accent-red hover:text-white transition-none rounded-none">
                {copy.common.clear}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {capturedSounds.length === 0 ? (
            <div className="py-8 px-4 text-center text-text-secondary">
              <div className="mb-2 opacity-40"><Globe size={32} color="#8a8ac0" /></div>
              <div className="text-base font-pixel">{copy.sniffer.emptyTitle}</div>
              <div className="mt-1 meta-label font-pixel">{copy.sniffer.emptyHint}</div>
            </div>
          ) : (
            <div className="p-2">
              {capturedSounds.map((sound) => (
                <div key={sound.url} className={`flex items-center px-3 py-2.5 bg-bg-tertiary border-2 mb-2 gap-3 rounded-none ${playingSound === sound.url ? 'border-accent-green' : 'border-border-default'}`}>
                  <button
                    onClick={() => playSoundPreview(sound)}
                    className={`w-7 h-7 border-2 flex items-center justify-center text-base cursor-pointer transition-none rounded-none
                      ${playingSound === sound.url
                        ? 'border-accent-green bg-accent-green/10 text-accent-green'
                        : 'border-accent bg-accent/10 text-accent hover:bg-accent hover:text-black'
                      }`}
                  >
                    {playingSound === sound.url ? <StopSquare size={10} color="currentColor" /> : <PlayTriangle size={10} color="currentColor" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-base text-text-primary font-pixel overflow-hidden text-ellipsis whitespace-nowrap">{sound.name}</div>
                    <div className="text-base text-text-secondary font-pixel">{formatTime(sound.timestamp)}</div>
                  </div>
                  <button
                    onClick={() => downloadSound(sound)}
                    disabled={sound.downloaded || downloading === sound.url}
                    className={`px-2.5 py-1 border-2 text-base font-pixel cursor-pointer transition-none rounded-none
                      ${sound.downloaded
                        ? 'border-accent-green bg-accent-green/5 text-accent-green cursor-default'
                        : downloading === sound.url
                          ? 'border-accent bg-accent/20 text-accent'
                          : 'border-accent bg-accent text-black hover:bg-accent-gold hover:border-accent-gold'
                      }`}
                  >
                    {downloading === sound.url ? '…' : sound.downloaded ? copy.sniffer.saved : copy.sniffer.get}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showRenameDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]" onClick={cancelDownload}>
          <div className="bg-bg-secondary border-2 border-accent rounded-none p-5 min-w-[300px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-pixel text-base text-accent mb-4 flex items-center gap-1.5"><Cassette size={12} color={themeColor.accent} /> {copy.sniffer.saveTitle}</h3>
            <input
              type="text"
              value={newSoundName}
              onChange={(e) => setNewSoundName(e.target.value)}
              placeholder={copy.sniffer.namePlaceholder}
              className="w-full px-2.5 py-2 bg-bg-tertiary border-2 border-border-default text-text-primary text-base font-pixel outline-none focus:border-accent transition-none mb-4 rounded-none"
              onKeyDown={(e) => { if (e.key === 'Enter') confirmDownload(); if (e.key === 'Escape') cancelDownload(); }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={cancelDownload} className="px-3 py-1.5 border-2 border-border-default bg-transparent text-text-secondary text-base font-pixel cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none">
                {copy.common.cancel}
              </button>
              <button onClick={confirmDownload} className="px-3 py-1.5 border-2 border-accent bg-accent text-black text-base font-pixel cursor-pointer hover:bg-accent-gold hover:border-accent-gold transition-none rounded-none">
                {copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OnlineSoundBrowser;
