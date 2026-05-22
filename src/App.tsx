import { useState, useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';
import { sounds, type Sound, type Group } from './data/sounds';
import TitleBar from './components/TitleBar';
import SoundGrid from './components/SoundGrid';
import StatusBar from './components/StatusBar';
import SettingsModal from './components/SettingsModal';
import OnlineSoundBrowser from './components/OnlineSoundBrowser';
import GroupManager from './components/GroupManager';
import GroupFilterBar from './components/GroupFilterBar';
import ValorantPanel from './components/ValorantPanel';
import { Cassette, Globe } from './components/ModernIcons';
import { copy, themeColor } from './ui/copy';


const PREFIX_KEY_MAP: Record<string, number> = {
  '`': 41,     // UiohookKey.Backquote
  'Tab': 15,   // UiohookKey.Tab
  'CapsLock': 58, // UiohookKey.CapsLock
  'Space': 57,  // UiohookKey.Space
  '\\': 43,    // UiohookKey.Backslash
  'Enter': 28, // UiohookKey.Enter
};
const PREFIX_KEYS = Object.keys(PREFIX_KEY_MAP);

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

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [lastPlayedSound, setLastPlayedSound] = useState<Sound | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [shortcuts, setShortcuts] = useState<Record<string, string>>({});
  const [stopShortcut, setStopShortcut] = useState<string>('');
  const soundRefs = useRef<Record<string, Howl | null>>({});
  const pausedSoundRef = useRef<string | null>(null);
  const playFnRef = useRef<(sound: Sound, loop?: boolean) => void>(() => {});
  const stopAllFnRef = useRef<() => void>(() => {});
  const playLastFnRef = useRef<() => void>(() => {});
  const togglePauseFnRef = useRef<() => void>(() => {});
  const playingRef = useRef<string | null>(null);
  const pausedRef = useRef<string | null>(null);
  const allSoundsRef = useRef<Sound[]>([]);
  const blobUrlCache = useRef<Record<string, { url: string; format?: string[] }>>({});
  const blobCacheOrder = useRef<string[]>([]);
  const BLOB_CACHE_MAX = 32;

  const formatFromPath = (filePath: string): string[] | undefined => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (!ext) return undefined;
    if (ext === 'mp3' || ext === 'mpeg') return ['mp3'];
    return [ext];
  };

  const setBlobCacheEntry = useCallback((id: string, entry: { url: string; format?: string[] }) => {
    const order = blobCacheOrder.current;
    const existingIdx = order.indexOf(id);
    if (existingIdx >= 0) order.splice(existingIdx, 1);
    order.push(id);
    blobUrlCache.current[id] = entry;
    while (order.length > BLOB_CACHE_MAX) {
      const evictId = order.shift()!;
      const evicted = blobUrlCache.current[evictId];
      if (evicted?.url.startsWith('blob:')) URL.revokeObjectURL(evicted.url);
      delete blobUrlCache.current[evictId];
      const evictHowl = soundRefs.current[evictId];
      if (evictHowl) {
        evictHowl.unload();
        soundRefs.current[evictId] = null;
      }
    }
  }, []);

  const removeBlobCacheEntry = useCallback((id: string) => {
    const cached = blobUrlCache.current[id];
    if (cached?.url.startsWith('blob:')) URL.revokeObjectURL(cached.url);
    delete blobUrlCache.current[id];
    const idx = blobCacheOrder.current.indexOf(id);
    if (idx >= 0) blobCacheOrder.current.splice(idx, 1);
  }, []);
  const [currentVolume, setCurrentVolume] = useState(0.8);
  const [selectedDevice, setSelectedDevice] = useState<string>(() => {
    const saved = localStorage.getItem('selectedDevice');
    // Treat null or empty string as "no saved device"
    return saved || '';
  });
  const [importedSounds, setImportedSounds] = useState<Sound[]>([]);
  const [hasImported, setHasImported] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [soundGroupMap, setSoundGroupMap] = useState<Record<string, string>>({});
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeGroupFilter, setActiveGroupFilter] = useState<string | null>(() => {
    const saved = localStorage.getItem('lastGroupFilter');
    return saved || null;
  });
  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef(0.8);
  const [rightPanel, setRightPanel] = useState<'none' | 'valorant' | 'sniffer'>('none');
  const [valorantEnabled, setValorantEnabled] = useState(() => {
    return localStorage.getItem('valorantEnabled') === 'true';
  });
  const listenersRegisteredRef = useRef(false);
  const lastShortcutTimeRef = useRef(0);
  const lastPlayShortcutTimeRef = useRef(0);
  const [teamMode, setTeamMode] = useState(false);
  const [teamKey, setTeamKey] = useState('V');
  const teamModeRef = useRef(false);
  const [pickerPrefixKey, setPickerPrefixKey] = useState(() => {
    return localStorage.getItem('pickerPrefixKey') || '`';
  });
  const [valorantConnected, setValorantConnected] = useState(false);
  const [uxNotice, setUxNotice] = useState<{ type: 'error' | 'success'; text: string; hint?: string } | null>(null);
  const [safeLockEnabled, setSafeLockEnabled] = useState(() => localStorage.getItem('safeLockEnabled') === 'true');
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('favorites_v2') || '[]'));
  const [pinnedSounds, setPinnedSounds] = useState<string[]>(() => JSON.parse(localStorage.getItem('pinnedSounds') || '[]'));
  const [recentPlayed, setRecentPlayed] = useState<string[]>(() => JSON.parse(localStorage.getItem('recentPlayed') || '[]'));
  const [sortMode, setSortMode] = useState<'default' | 'favorites' | 'recent'>(
    () => (localStorage.getItem('sortMode') as 'default' | 'favorites' | 'recent') || 'default'
  );
  const [macroPresets, setMacroPresets] = useState<MacroPreset[]>(() => JSON.parse(localStorage.getItem('macroPresets') || '[]'));
  const [importQualityReports, setImportQualityReports] = useState<Record<string, ImportQualityReport>>({});
  const macroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeMacroId, setActiveMacroId] = useState<string | null>(null);

  const showUxNotice = useCallback((type: 'error' | 'success', text: string, hint?: string) => {
    setUxNotice({ type, text, hint });
  }, []);

  useEffect(() => {
    if (!uxNotice) return;
    const timer = setTimeout(() => setUxNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [uxNotice]);

  useEffect(() => {
    localStorage.setItem('safeLockEnabled', String(safeLockEnabled));
  }, [safeLockEnabled]);

  useEffect(() => {
    localStorage.setItem('favorites_v2', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('pinnedSounds', JSON.stringify(pinnedSounds));
  }, [pinnedSounds]);

  useEffect(() => {
    localStorage.setItem('recentPlayed', JSON.stringify(recentPlayed.slice(0, 30)));
  }, [recentPlayed]);

  useEffect(() => {
    localStorage.setItem('sortMode', sortMode);
  }, [sortMode]);

  useEffect(() => {
    localStorage.setItem('macroPresets', JSON.stringify(macroPresets));
  }, [macroPresets]);

  const normalizeKeyword = useCallback((value: string) => value.toLowerCase().replace(/\s+/g, ''), []);

  const isSubsequence = useCallback((needle: string, haystack: string) => {
    if (!needle) return true;
    let i = 0;
    let j = 0;
    while (i < needle.length && j < haystack.length) {
      if (needle[i] === haystack[j]) i++;
      j++;
    }
    return i === needle.length;
  }, []);

  const guardMutation = useCallback((actionLabel: string) => {
    if (!safeLockEnabled) return true;
    showUxNotice('error', `当前处于防误触锁定：已阻止${actionLabel}`, '可在设置中临时关闭锁定后再执行该操作');
    return false;
  }, [safeLockEnabled, showUxNotice]);

  useEffect(() => {
    const savedShortcuts = localStorage.getItem('shortcuts');
    if (savedShortcuts) {
      setShortcuts(JSON.parse(savedShortcuts));
    }

    const savedStopShortcut = localStorage.getItem('stopShortcut');
    if (savedStopShortcut) {
      setStopShortcut(savedStopShortcut);
    }

    const savedVolume = localStorage.getItem('volume');
    if (savedVolume) {
      const vol = parseFloat(savedVolume);
      setCurrentVolume(vol);
    }

    const savedImported = localStorage.getItem('importedSounds');
    if (savedImported) {
      setImportedSounds(JSON.parse(savedImported));
    }

    const savedTeamMode = localStorage.getItem('teamMode');
    if (savedTeamMode) setTeamMode(savedTeamMode === 'true');

    const savedTeamKey = localStorage.getItem('teamKey');
    if (savedTeamKey) setTeamKey(savedTeamKey);

    const savedGroups = localStorage.getItem('groups');
    if (savedGroups) {
      const parsed: Group[] = JSON.parse(savedGroups);
      // 迁移旧数据：移除 __imported__ 组，将其音效归入 DEFAULT
      const filtered = parsed.filter(g => g.id !== '__imported__');
      if (filtered.length === 0) {
        setGroups([{ id: '__builtin__', name: 'DEFAULT', color: '#58a6ff', soundIds: [] }]);
      } else {
        setGroups(filtered);
      }
    } else {
      setGroups([{ id: '__builtin__', name: 'DEFAULT', color: '#58a6ff', soundIds: [] }]);
    }

    const savedSoundGroupMap = localStorage.getItem('soundGroupMap');
    const allInitSounds = savedImported
      ? [...sounds, ...JSON.parse(savedImported)]
      : sounds;
    if (savedSoundGroupMap) {
      const parsedMap = JSON.parse(savedSoundGroupMap);
      // 迁移：将所有未分组的音效放入 DEFAULT 分组
      const needsMigration = allInitSounds.some(s => !parsedMap[s.id]);
      if (needsMigration) {
        const updatedMap = { ...parsedMap };
        allInitSounds.forEach(s => {
          if (!updatedMap[s.id]) {
            updatedMap[s.id] = '__builtin__';
          }
        });
        // 移除旧的 __imported__ 映射
        for (const [sid, gid] of Object.entries(updatedMap)) {
          if (gid === '__imported__') updatedMap[sid] = '__builtin__';
        }
        setSoundGroupMap(updatedMap);
        localStorage.setItem('soundGroupMap', JSON.stringify(updatedMap));
      } else {
        setSoundGroupMap(parsedMap);
      }
    } else {
      // 首次启动：所有音效归 DEFAULT
      const defaultMap: Record<string, string> = {};
      allInitSounds.forEach(s => { defaultMap[s.id] = '__builtin__'; });
      setSoundGroupMap(defaultMap);
      localStorage.setItem('soundGroupMap', JSON.stringify(defaultMap));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  useEffect(() => {
    localStorage.setItem('stopShortcut', stopShortcut);
  }, [stopShortcut]);

  useEffect(() => {
    if (activeGroupFilter) {
      localStorage.setItem('lastGroupFilter', activeGroupFilter);
    } else {
      localStorage.removeItem('lastGroupFilter');
    }
  }, [activeGroupFilter]);

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.ipcRenderer) return;
    
    electron.ipcRenderer.send('unregister-all-shortcuts');
    
    Object.entries(shortcuts).forEach(([shortcut, soundId]) => {
      electron.ipcRenderer.send('register-shortcut', shortcut, soundId);
    });

    if (stopShortcut) {
      electron.ipcRenderer.send('register-stop-shortcut', stopShortcut);
    }
  }, [shortcuts, stopShortcut]);

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.ipcRenderer) return;

    // Guard: prevent duplicate registrations from HMR/StrictMode
    if (listenersRegisteredRef.current) return;
    listenersRegisteredRef.current = true;

    const handleShortcut = async (_event: any, soundId: string) => {
      console.log('[app] handleShortcut:', soundId, 'playingRef:', playingRef.current, 'pausedRef:', pausedRef.current);

      // Debounce duplicate events from uiohook + polling (within ~15-30ms)
      const now = Date.now();
      if (now - lastPlayShortcutTimeRef.current < 50) {
        return;
      }
      lastPlayShortcutTimeRef.current = now;

      const sound = allSoundsRef.current.find(s => s.id === soundId);

      // Shortcut always plays from beginning — stop & replay or start fresh
      if (sound) {
        console.log('[app] shortcut: play sound');
        stopAllFnRef.current();
        try {
          const anyHowler = (window as any).Howler;
          if (anyHowler?.ctx?.state === 'suspended') {
            await anyHowler.ctx.resume();
          }
        } catch (_e) { /* ignore */ }
        playFnRef.current(sound);
      }
    };

    const handleStopShortcut = () => {
      console.log('[app] handleStopShortcut');

      // Debounce: ignore events within 200ms of the last one (uiohook may fire duplicates)
      const now = Date.now();
      if (now - lastShortcutTimeRef.current < 50) {
        console.log('[app] handleStopShortcut: debounced');
        return;
      }
      lastShortcutTimeRef.current = now;

      // Check 1: use playingRef (React state mirror) to find active sound
      const activeId = playingRef.current;
      if (activeId && soundRefs.current[activeId]) {
        soundRefs.current[activeId]?.pause();
        pausedSoundRef.current = activeId;
        playingRef.current = null;
        pausedRef.current = activeId;
        setPlayingSound(null);
        console.log('[app] handleStopShortcut: paused', activeId);
        return;
      }

      // Check 2: any Howl paused? -> resume it
      const pausedId = pausedSoundRef.current;
      if (pausedId && soundRefs.current[pausedId]) {
        soundRefs.current[pausedId]?.play();
        setPlayingSound(pausedId);
        pausedSoundRef.current = null;
        playingRef.current = pausedId;
        pausedRef.current = null;
        console.log('[app] handleStopShortcut: resumed', pausedId);
        return;
      }

      // Check 3: fallback — scan HTML5 Audio nodes directly in case refs are stale
      const activeByNode = Object.entries(soundRefs.current).find(([, howl]) => {
        if (!howl) return false;
        const node: HTMLAudioElement | undefined = howl._sounds[0]?._node || (howl as any)._node;
        return node && !node.paused && !node.ended;
      });
      if (activeByNode) {
        const [id, howl] = activeByNode;
        howl?.pause();
        pausedSoundRef.current = id;
        playingRef.current = null;
        pausedRef.current = id;
        setPlayingSound(null);
        console.log('[app] handleStopShortcut: paused via node check', id);
        return;
      }

      // Check 4: play last if available
      if (playLastFnRef.current) {
        playLastFnRef.current();
        console.log('[app] handleStopShortcut: playLast');
      }
    };

    const handleValorantStatus = (_event: any, status: { connected: boolean }) => {
      setValorantConnected(status.connected);
    };

    let batchedEvents: ReturnType<typeof setTimeout> | null = null;
    let batchedChoices: Array<{ id: string; name: string }> = [];
    let batchedLabel = '';

    const handleValorantEvent = (_event: any, payload: { event: string }) => {
      const raw = localStorage.getItem('valorantBindings');
      console.log('[App] valorant-event-fired:', payload.event, 'raw bindings:', raw);
      if (!raw) return;

      // Migrate old format (single string) to array format
      let bindings: Record<string, string[]>;
      try {
        const parsed = JSON.parse(raw);
        bindings = {};
        for (const [ev, val] of Object.entries(parsed)) {
          if (Array.isArray(val)) {
            bindings[ev] = (val as string[]).filter(Boolean);
          } else if (typeof val === 'string' && val) {
            bindings[ev] = [val];
          } else {
            bindings[ev] = [];
          }
        }
      } catch { return; }

      const eventBindings = bindings[payload.event];
      console.log('[App] bindings for event:', payload.event, eventBindings);
      if (!eventBindings || eventBindings.length === 0) return;

      let imported: Array<{ id: string; name: string }> = [];
      try { imported = JSON.parse(localStorage.getItem('importedSounds') || '[]'); } catch {}
      const allSnds = [...imported, ...sounds];

      const choices = eventBindings
        .map((id: string) => {
          const s = allSnds.find(s => s.id === id);
          return s ? { id: s.id, name: s.name } : null;
        })
        .filter((s): s is { id: string; name: string } => s !== null);

      if (choices.length === 0) return;

      // Batch: merge rapid events (e.g. round_end_win + round_end_lose)
      const eventLabels: Record<string, string> = {
        round_start: 'ROUND START',
        round_end: 'ROUND END',
        spike_planted: 'SPIKE PLANTED',
        spike_defused: 'SPIKE DEFUSED',
        spike_exploded: 'SPIKE EXPLODED',
      };
      const label = eventLabels[payload.event] || payload.event;

      // Add new choices (avoid duplicates)
      for (const c of choices) {
        if (!batchedChoices.some(ex => ex.id === c.id)) {
          batchedChoices.push(c);
        }
      }
      batchedLabel = batchedLabel ? batchedLabel + ' / ' + label : label;

      if (batchedEvents) clearTimeout(batchedEvents);
      batchedEvents = setTimeout(() => {
        electron.ipcRenderer.send('valorant-show-picker', {
          choices: batchedChoices,
          eventLabel: batchedLabel,
        });
        batchedChoices = [];
        batchedLabel = '';
        batchedEvents = null;
      }, 200);
    };

    electron.ipcRenderer.on('shortcut-triggered', handleShortcut);
    electron.ipcRenderer.on('stop-shortcut-triggered', handleStopShortcut);
    electron.ipcRenderer.on('valorant-status-changed', handleValorantStatus);
    electron.ipcRenderer.on('valorant-event-fired', handleValorantEvent);

    return () => {
      listenersRegisteredRef.current = false;
      electron.ipcRenderer.removeListener('shortcut-triggered', handleShortcut);
      electron.ipcRenderer.removeListener('stop-shortcut-triggered', handleStopShortcut);
      electron.ipcRenderer.removeListener('valorant-status-changed', handleValorantStatus);
      electron.ipcRenderer.removeListener('valorant-event-fired', handleValorantEvent);
    };
  }, []);

  useEffect(() => {
    playFnRef.current = playSound;
    stopAllFnRef.current = stopAllSounds;
    playLastFnRef.current = playLastSound;
    togglePauseFnRef.current = togglePausePlay;
    playingRef.current = playingSound;
    pausedRef.current = pausedSoundRef.current;
    allSoundsRef.current = allSounds;
  });

  useEffect(() => {
    localStorage.setItem('volume', currentVolume.toString());
  }, [currentVolume]);

  useEffect(() => {
    if (selectedDevice) {
      localStorage.setItem('selectedDevice', selectedDevice);
    }
  }, [selectedDevice]);


  useEffect(() => {
    localStorage.setItem('groups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('teamMode', String(teamMode));
    teamModeRef.current = teamMode;
  }, [teamMode]);

  useEffect(() => {
    localStorage.setItem('teamKey', teamKey);
    const vkMap: Record<string, number> = {
      '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
      '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
      'A': 0x41, 'B': 0x42, 'C': 0x43, 'D': 0x44, 'E': 0x45,
      'F': 0x46, 'G': 0x47, 'H': 0x48, 'I': 0x49, 'J': 0x4A,
      'K': 0x4B, 'L': 0x4C, 'M': 0x4D, 'N': 0x4E, 'O': 0x4F,
      'P': 0x50, 'Q': 0x51, 'R': 0x52, 'S': 0x53, 'T': 0x54,
      'U': 0x55, 'V': 0x56, 'W': 0x57, 'X': 0x58, 'Y': 0x59, 'Z': 0x5A,
    };
    const electron = (window as any).electron;
    if (electron?.ipcRenderer) {
      electron.ipcRenderer.send('set-team-key-code', vkMap[teamKey] || 0x56);
    }
  }, [teamKey]);

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.ipcRenderer) return;
    if (valorantEnabled) {
      electron.ipcRenderer.send('valorant-start-monitor');
    } else {
      electron.ipcRenderer.send('valorant-stop-monitor');
    }
  }, [valorantEnabled]);

  useEffect(() => {
    localStorage.setItem('valorantEnabled', String(valorantEnabled));
  }, [valorantEnabled]);

  useEffect(() => {
    localStorage.setItem('pickerPrefixKey', pickerPrefixKey);
    const electron = (window as any).electron;
    if (electron?.ipcRenderer) {
      electron.ipcRenderer.send('set-picker-prefix-key', {
        keyCode: PREFIX_KEY_MAP[pickerPrefixKey] || 41,
        keyName: pickerPrefixKey,
      });
    }
  }, [pickerPrefixKey]);

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.ipcRenderer) return;
    if (playingSound) {
      const sound = allSoundsRef.current.find(s => s.id === playingSound);
      electron.ipcRenderer.send('overlay-show-now-playing', sound?.name || playingSound);
    } else {
      electron.ipcRenderer.send('overlay-hide-now-playing');
    }
  }, [playingSound]);

  useEffect(() => {
    localStorage.setItem('soundGroupMap', JSON.stringify(soundGroupMap));
  }, [soundGroupMap]);

  useEffect(() => {
    Object.values(soundRefs.current).forEach(howl => {
      if (howl) {
        howl.volume(currentVolume);
      }
    });
  }, [currentVolume]);

  useEffect(() => {
    if (!selectedDevice) return;
    Object.values(soundRefs.current).forEach(howl => {
      if (howl) {
        const node = howl._sounds[0]?._node || (howl as any)._node;
        if (node && typeof node.setSinkId === 'function') {
          node.setSinkId(selectedDevice).catch(e => {
            console.warn('切换音频输出设备失败:', e);
          });
        }
      }
    });
  }, [selectedDevice]);

  const sendTeamKey = useCallback((action: 'hold' | 'release') => {
    if (!teamModeRef.current) return;
    const electron = (window as any).electron;
    if (electron?.ipcRenderer) {
      electron.ipcRenderer.send(action === 'hold' ? 'hold-team-key' : 'release-team-key');
    }
  }, []);

  const allSounds = [...sounds, ...importedSounds];

  const normalizedQuery = normalizeKeyword(searchQuery);
  const filteredSoundsBase = allSounds.filter(sound => {
    if (activeGroupFilter) {
      if (soundGroupMap[sound.id] !== activeGroupFilter) return false;
    }
    if (!normalizedQuery) return true;
    const normalizedName = normalizeKeyword(sound.name);
    const matchesSearch =
      normalizedName.includes(normalizedQuery) ||
      isSubsequence(normalizedQuery, normalizedName);
    return matchesSearch;
  });

  const filteredSounds = [...filteredSoundsBase].sort((a, b) => {
    const pinA = pinnedSounds.includes(a.id) ? 1 : 0;
    const pinB = pinnedSounds.includes(b.id) ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA;

    if (sortMode === 'favorites') {
      const favA = favorites.includes(a.id) ? 1 : 0;
      const favB = favorites.includes(b.id) ? 1 : 0;
      if (favA !== favB) return favB - favA;
    }

    if (sortMode === 'recent') {
      const idxA = recentPlayed.indexOf(a.id);
      const idxB = recentPlayed.indexOf(b.id);
      const scoreA = idxA === -1 ? Number.MAX_SAFE_INTEGER : idxA;
      const scoreB = idxB === -1 ? Number.MAX_SAFE_INTEGER : idxB;
      if (scoreA !== scoreB) return scoreA - scoreB;
    }
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  });

  const playSound = useCallback(async (sound: Sound, loop = false) => {
    pausedSoundRef.current = null;
    // Reuse existing Howl instance for instant playback
    const existing = soundRefs.current[sound.id];
    if (existing) {
      existing.stop();
      existing.play();
      setPlayingSound(sound.id);
      playingRef.current = sound.id;
      setLastPlayedSound(sound);
      setRecentPlayed(prev => [sound.id, ...prev.filter(id => id !== sound.id)].slice(0, 30));
      sendTeamKey('hold');
      return;
    }

    let soundPath = '';
    let soundFormat: string[] | undefined;

    if ((sound as any).isImported) {
      const cached = blobUrlCache.current[sound.id];
      if (cached) {
        soundPath = cached.url;
        soundFormat = cached.format;
      } else {
        const storedUrl = localStorage.getItem(`sound_${sound.id}`);
        if (storedUrl) {
          if (storedUrl.startsWith('imported://') || storedUrl.startsWith('imported-sound://')) {
            soundPath = storedUrl;
            soundFormat = formatFromPath(storedUrl);
          } else if (storedUrl.startsWith('blob:')) {
            soundPath = storedUrl;
            soundFormat = formatFromPath(storedUrl);
            setBlobCacheEntry(sound.id, { url: soundPath, format: soundFormat });
          } else if (storedUrl.startsWith('file://')) {
            soundPath = storedUrl;
            soundFormat = formatFromPath(storedUrl);
          }
        }
      }
    }

    if (!soundPath) {
      const isElectron = window.electron !== undefined;
      const soundsBasePath = isElectron
        ? (window as any).electron.soundBaseUrl || 'sound://'
        : '/sounds/';
      soundPath = `${soundsBasePath}${sound.filename}`;
      soundFormat = formatFromPath(sound.filename);
    }

    const howl = new Howl({
      src: [soundPath],
      format: soundFormat,
      volume: currentVolume,
      loop: loop,
      onplay: () => {
        if (selectedDevice) {
          try {
            const audioNode = howl._sounds[0]?._node || (howl as any)._node;
            if (audioNode && typeof audioNode.setSinkId === 'function') {
              audioNode.setSinkId(selectedDevice).catch(e => {
                console.warn('设置音频输出设备失败:', e);
              });
            }
          } catch (e) {
            console.warn('设置音频输出设备出错:', e);
          }
        }
      },
      onend: () => {
        playingRef.current = null;
        setPlayingSound(null);
        sendTeamKey('release');
      },
      onloaderror: (_id: number, error: unknown) => {
        const errCode = typeof error === 'number' ? error : 0;
        const errMap: Record<number, string> = {
          1: 'MEDIA_ERR_ABORTED', 2: 'MEDIA_ERR_NETWORK',
          3: 'MEDIA_ERR_DECODE', 4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
        };
        console.error(`音效加载失败: ${sound.filename} [${errMap[errCode] || errCode}] url=${soundPath.substring(0, 100)}`);
      },
      html5: true,
    });

    soundRefs.current[sound.id] = howl;
    howl.play();
    sendTeamKey('hold');
    setPlayingSound(sound.id);
    playingRef.current = sound.id;
    setLastPlayedSound(sound);
    setRecentPlayed(prev => [sound.id, ...prev.filter(id => id !== sound.id)].slice(0, 30));
  }, [currentVolume, selectedDevice, setBlobCacheEntry]);

  const stopSound = useCallback((soundId: string) => {
    if (soundRefs.current[soundId]) {
      soundRefs.current[soundId]?.stop();
    }
    if (playingSound === soundId) {
      setPlayingSound(null);
    }
    if (pausedSoundRef.current === soundId) {
      pausedSoundRef.current = null;
    }
    sendTeamKey('release');
  }, [playingSound, sendTeamKey]);

  const toggleSound = useCallback((sound: Sound) => {
    if (playingSound === sound.id) {
      stopSound(sound.id);
    } else {
      stopSound(playingSound || '');
      playSound(sound, false);
    }
  }, [playingSound, playSound, stopSound]);

  const stopAllSounds = useCallback(() => {
    Object.keys(soundRefs.current).forEach(soundId => {
      if (soundRefs.current[soundId]) {
        soundRefs.current[soundId]?.stop();
      }
    });
    setPlayingSound(null);
    pausedSoundRef.current = null;
    sendTeamKey('release');
  }, [sendTeamKey]);

  const playLastSound = useCallback(() => {
    if (lastPlayedSound) {
      playSound(lastPlayedSound);
    }
  }, [lastPlayedSound, playSound]);

  const togglePausePlay = useCallback(() => {
    // Use playingRef (React state mirror) instead of howl.playing() which is unreliable in html5 mode
    const activeId = playingRef.current;
    if (activeId && soundRefs.current[activeId]) {
      soundRefs.current[activeId]?.pause();
      pausedSoundRef.current = activeId;
      playingRef.current = null;
      pausedRef.current = activeId;
      setPlayingSound(null);
      return;
    }
    // Resume from pause
    const pausedId = pausedSoundRef.current;
    if (pausedId) {
      const howl = soundRefs.current[pausedId];
      if (howl) {
        howl.play();
        setPlayingSound(pausedId);
        pausedSoundRef.current = null;
        playingRef.current = pausedId;
        pausedRef.current = null;
        return;
      }
    }
    // Fallback: scan HTML5 Audio nodes directly
    const activeByNode = Object.entries(soundRefs.current).find(([, howl]) => {
      if (!howl) return false;
      const node: HTMLAudioElement | undefined = howl._sounds[0]?._node || (howl as any)._node;
      return node && !node.paused && !node.ended;
    });
    if (activeByNode) {
      const [id, howl] = activeByNode;
      howl?.pause();
      pausedSoundRef.current = id;
      playingRef.current = null;
      pausedRef.current = id;
      setPlayingSound(null);
      return;
    }

    // Nothing at all — play last if we have it
    if (lastPlayedSound) {
      playSound(lastPlayedSound);
    }
  }, [lastPlayedSound]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setCurrentVolume(newVolume);
  }, []);

  const addShortcut = useCallback((soundId: string, shortcut: string): boolean => {
    if (!shortcut) return false;
    if (!guardMutation('修改快捷键')) return false;
    if (stopShortcut === shortcut) {
      showUxNotice('error', `快捷键 ${shortcut} 已用于停止播放`, '建议：先清除停止快捷键，或改用其他组合键');
      return false;
    }
    const existingOwner = shortcuts[shortcut];
    if (existingOwner && existingOwner !== soundId) {
      const ownerName = allSoundsRef.current.find(s => s.id === existingOwner)?.name || '其他音效';
      showUxNotice('error', `快捷键 ${shortcut} 已被「${ownerName}」占用`, '建议：移除原快捷键或使用 Ctrl/Shift 组合避免冲突');
      return false;
    }
    setShortcuts(prev => {
      const next = { ...prev };
      const existing = Object.entries(next).find(([, sid]) => sid === soundId)?.[0];
      if (existing && existing !== shortcut) delete next[existing];
      next[shortcut] = soundId;
      return next;
    });
    showUxNotice('success', `已设置快捷键：${shortcut}`, '可在设置面板中随时修改');
    return true;
  }, [shortcuts, stopShortcut, showUxNotice, guardMutation]);

  const removeShortcut = useCallback((shortcut: string) => {
    if (!guardMutation('删除快捷键')) return;
    setShortcuts(prev => {
      const newShortcuts = { ...prev };
      delete newShortcuts[shortcut];
      return newShortcuts;
    });
  }, [guardMutation]);

  const setStopShortcutHandler = useCallback((shortcut: string): boolean => {
    if (!shortcut) return false;
    if (!guardMutation('修改停止快捷键')) return false;
    const occupiedBy = shortcuts[shortcut];
    if (occupiedBy) {
      const ownerName = allSoundsRef.current.find(s => s.id === occupiedBy)?.name || '某个音效';
      showUxNotice('error', `停止快捷键与「${ownerName}」冲突：${shortcut}`, '建议：停止快捷键尽量使用不常用键位，如 Ctrl+Shift+P');
      return false;
    }
    setStopShortcut(shortcut);
    showUxNotice('success', `已设置停止快捷键：${shortcut}`, '播放中可随时按下该组合键立即停止');
    return true;
  }, [shortcuts, showUxNotice, guardMutation]);

  const clearStopShortcut = useCallback(() => {
    if (!guardMutation('清除停止快捷键')) return;
    setStopShortcut('');
  }, [guardMutation]);

  const clearAllData = useCallback(() => {
    if (!guardMutation('重置全部数据')) return;
    setShortcuts({});
    setStopShortcut('');
    setImportedSounds([]);
    setCurrentVolume(0.8);
    setSelectedDevice('');
    setTeamMode(false);
    setTeamKey('V');
    setActiveGroupFilter(null);
    const defaultMap: Record<string, string> = {};
    sounds.forEach(s => { defaultMap[s.id] = '__builtin__'; });
    setSoundGroupMap(defaultMap);
    setGroups([
      { id: '__builtin__', name: 'DEFAULT', color: '#58a6ff', soundIds: [] },
    ]);
    localStorage.removeItem('favorites');
    localStorage.removeItem('shortcuts');
    localStorage.removeItem('stopShortcut');
    localStorage.removeItem('importedSounds');
    localStorage.removeItem('volume');
    localStorage.removeItem('selectedDevice');
    localStorage.removeItem('safeLockEnabled');
    localStorage.removeItem('favorites_v2');
    localStorage.removeItem('pinnedSounds');
    localStorage.removeItem('recentPlayed');
    localStorage.removeItem('sortMode');
    localStorage.removeItem('macroPresets');
    localStorage.removeItem('teamMode');
    localStorage.removeItem('teamKey');
    localStorage.removeItem('compactGroupFilter');
    localStorage.setItem('soundGroupMap', JSON.stringify(defaultMap));
    localStorage.setItem('groups', JSON.stringify([
      { id: '__builtin__', name: 'DEFAULT', color: '#58a6ff', soundIds: [] },
    ]));
    // Clean up imported sound blob URLs from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sound_')) {
        localStorage.removeItem(key);
      }
    }
  }, [guardMutation]);

  const handleImportSounds = useCallback(async () => {
    if (!guardMutation('导入音效')) return;
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*,.mp3,.wav,.ogg';
      input.multiple = true;

      input.onchange = async (e: any) => {
        const files = Array.from(e.target.files) as File[];
        const electron = (window as any).electron;
        const newImported: Sound[] = [];
        const targetGroup = activeGroupFilter || '__builtin__';

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const id = `imported_${Date.now()}_${i}`;
          const name = file.name.replace(/\.[^/.]+$/, '');

          let storedPath: string;

          if (electron?.ipcRenderer?.invoke) {
            const buffer = await file.arrayBuffer();
            const quality = await electron.ipcRenderer.invoke('analyze-imported-sound', file.name, buffer);
            storedPath = await electron.ipcRenderer.invoke('save-imported-sound', file.name, buffer);
            setImportQualityReports(prev => ({
              ...prev,
              [id]: {
                id,
                fileName: file.name,
                sizeBytes: quality?.sizeBytes ?? file.size,
                estimatedDurationSec: quality?.estimatedDurationSec ?? null,
                peakDb: quality?.peakDb ?? null,
                warnings: quality?.warnings ?? [],
                canAutoProcess: !!quality?.canAutoProcess,
              },
            }));
          } else {
            storedPath = URL.createObjectURL(file);
            setImportQualityReports(prev => ({
              ...prev,
              [id]: {
                id,
                fileName: file.name,
                sizeBytes: file.size,
                estimatedDurationSec: null,
                peakDb: null,
                warnings: file.size < 24 * 1024 ? ['文件体积较小，可能过短或静音段较多'] : [],
                canAutoProcess: false,
              },
            }));
          }

          localStorage.setItem(`sound_${id}`, storedPath);

          newImported.push({
            id,
            name,
            filename: file.name,
            category: 'local',
            isImported: true,
          });
        }

        setImportedSounds(prev => {
          const allImported = [...prev, ...newImported];
          localStorage.setItem('importedSounds', JSON.stringify(allImported));
          return allImported;
        });

        setSoundGroupMap(prev => {
          const next = { ...prev };
          newImported.forEach(s => { next[s.id] = targetGroup; });
          return next;
        });
        setGroups(prev => prev.map(g =>
          g.id === targetGroup
            ? { ...g, soundIds: [...g.soundIds, ...newImported.map(s => s.id)] }
            : g
        ));

        setHasImported(true);
      };

      input.click();
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败，请重试');
    }
  }, [activeGroupFilter, guardMutation]);

  const handleDeleteSound = useCallback((soundId: string) => {
    if (!guardMutation('删除音效')) return;
    const howl = soundRefs.current[soundId];
    if (howl) {
      howl.unload();
      delete soundRefs.current[soundId];
    }
    removeBlobCacheEntry(soundId);

    const storedPath = localStorage.getItem(`sound_${soundId}`);
    if (storedPath) {
      const electron = (window as any).electron;
      if (electron?.ipcRenderer?.invoke) {
        const fileName = storedPath.startsWith('imported://')
          ? decodeURIComponent(storedPath.replace('imported://', ''))
          : storedPath.replace(/^file:\/\/\//, '').replace(/\//g, '\\');
        electron.ipcRenderer.invoke('delete-imported-sound', fileName);
      } else {
        URL.revokeObjectURL(storedPath);
      }
    }

    setImportedSounds(prev => {
      const filtered = prev.filter(s => s.id !== soundId);
      localStorage.setItem('importedSounds', JSON.stringify(filtered));
      return filtered;
    });
    localStorage.removeItem(`sound_${soundId}`);
    setImportQualityReports(prev => {
      const next = { ...prev };
      delete next[soundId];
      return next;
    });

    setGroups(prev =>
      prev.map(group => ({
        ...group,
        soundIds: group.soundIds.filter(id => id !== soundId),
      }))
    );
    setSoundGroupMap(prev => {
      const next = { ...prev };
      delete next[soundId];
      return next;
    });

    const existingShortcut = Object.entries(shortcuts).find(([, id]) => id === soundId);
    if (existingShortcut) {
      removeShortcut(existingShortcut[0]);
    }
  }, [shortcuts, removeShortcut, removeBlobCacheEntry, guardMutation]);

  const handleImportFromPath = useCallback((filePath: string, name: string, groupId?: string) => {
    if (!guardMutation('导入音效')) return;
    const fileUrl = filePath.startsWith('imported://') || filePath.startsWith('sound://')
      ? filePath
      : filePath.startsWith('file://')
        ? filePath
        : `file:///${filePath.replace(/\\/g, '/')}`;

    const targetGroup = groupId || '__builtin__';
    let newId = '';

    setImportedSounds(prev => {
      const duplicate = prev.some(s => {
        const storedUrl = localStorage.getItem(`sound_${s.id}`);
        return storedUrl === fileUrl;
      });
      if (duplicate) {

        return prev;
      }

      newId = `imported_${Date.now()}`;
      const filename = name;
      const soundName = name.replace(/\.[^/.]+$/, '');

      const newSound: Sound = {
        id: newId,
        name: soundName,
        filename,
        category: 'local',
        isImported: true
      };

      localStorage.setItem(`sound_${newId}`, fileUrl);
      const allImported = [...prev, newSound];
      localStorage.setItem('importedSounds', JSON.stringify(allImported));
      return allImported;
    });

    if (newId) {
      setSoundGroupMap(prev => ({ ...prev, [newId]: targetGroup }));
      setGroups(prev => prev.map(g =>
        g.id === targetGroup ? { ...g, soundIds: [...g.soundIds, newId] } : g
      ));
    }

    setHasImported(true);

  }, [guardMutation]);

  const addGroup = useCallback((name: string, color: string) => {
    if (!guardMutation('创建分组')) return;
    const newGroup: Group = {
      id: `group_${Date.now()}`,
      name,
      color,
      soundIds: []
    };
    setGroups(prev => [...prev, newGroup]);
  }, [guardMutation]);

  const deleteGroup = useCallback((groupId: string) => {
    if (!guardMutation('删除分组')) return;
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setSoundGroupMap(prev => {
      const next: Record<string, string> = {};
      for (const [soundId, gId] of Object.entries(prev)) {
        if (gId !== groupId) next[soundId] = gId;
      }
      return next;
    });
    setImportedSounds(prev =>
      prev.map(sound =>
        sound.groupId === groupId ? { ...sound, groupId: undefined } : sound
      )
    );
    if (selectedGroupId === groupId) {
      setSelectedGroupId(null);
    }
  }, [selectedGroupId, guardMutation]);

  const updateGroupName = useCallback((groupId: string, newName: string) => {
    if (!guardMutation('重命名分组')) return;
    setGroups(prev => 
      prev.map(group => 
        group.id === groupId ? { ...group, name: newName } : group
      )
    );
  }, [guardMutation]);

  const addSoundToGroup = useCallback((soundId: string, groupId: string) => {
    if (!guardMutation('调整音效分组')) return;
    setGroups(prev =>
      prev.map(group =>
        group.id === groupId && !group.soundIds.includes(soundId)
          ? { ...group, soundIds: [...group.soundIds, soundId] }
          : group
      )
    );

    setSoundGroupMap(prev => ({ ...prev, [soundId]: groupId }));

    setImportedSounds(prev =>
      prev.map(sound =>
        sound.id === soundId ? { ...sound, groupId } : sound
      )
    );
  }, [guardMutation]);

  const removeSoundFromGroup = useCallback((soundId: string, groupId: string) => {
    if (!guardMutation('调整音效分组')) return;
    setGroups(prev =>
      prev.map(group =>
        group.id === groupId
          ? { ...group, soundIds: group.soundIds.filter(id => id !== soundId) }
          : group
      )
    );

    setSoundGroupMap(prev => {
      const next = { ...prev };
      delete next[soundId];
      return next;
    });

    setImportedSounds(prev =>
      prev.map(sound =>
        sound.id === soundId && sound.groupId === groupId
          ? { ...sound, groupId: undefined }
          : sound
      )
    );
  }, [guardMutation]);

  const getGroupById = useCallback((groupId: string) => {
    return groups.find(g => g.id === groupId);
  }, [groups]);

  const handleMuteToggle = useCallback(() => {
    if (isMuted) {
      setCurrentVolume(prevVolumeRef.current);
      setIsMuted(false);
    } else {
      prevVolumeRef.current = currentVolume;
      setCurrentVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, currentVolume]);

  const toggleFavorite = useCallback((soundId: string) => {
    if (!guardMutation('更新收藏')) return;
    setFavorites(prev => prev.includes(soundId) ? prev.filter(id => id !== soundId) : [...prev, soundId]);
  }, [guardMutation]);

  const togglePinSound = useCallback((soundId: string) => {
    if (!guardMutation('更新置顶')) return;
    setPinnedSounds(prev => prev.includes(soundId) ? prev.filter(id => id !== soundId) : [...prev, soundId]);
  }, [guardMutation]);

  const stopMacroPlayback = useCallback(() => {
    if (macroTimerRef.current) {
      clearTimeout(macroTimerRef.current);
      macroTimerRef.current = null;
    }
    setActiveMacroId(null);
  }, []);

  const executeMacro = useCallback((macroId: string) => {
    const macro = macroPresets.find(m => m.id === macroId);
    if (!macro || macro.soundIds.length === 0) return;
    stopMacroPlayback();
    setActiveMacroId(macro.id);
    let sequenceIndex = 0;
    let burstCount = 0;
    const step = () => {
      const macroLatest = macroPresets.find(m => m.id === macroId);
      if (!macroLatest || macroLatest.soundIds.length === 0) {
        stopMacroPlayback();
        return;
      }
      let sid = macroLatest.soundIds[0];
      if (macroLatest.mode === 'random') {
        sid = macroLatest.soundIds[Math.floor(Math.random() * macroLatest.soundIds.length)];
      } else if (macroLatest.mode === 'sequence') {
        sid = macroLatest.soundIds[sequenceIndex % macroLatest.soundIds.length];
        sequenceIndex += 1;
      } else {
        sid = macroLatest.soundIds[burstCount % macroLatest.soundIds.length];
        burstCount += 1;
        if (burstCount >= Math.max(1, macroLatest.repeatCount)) {
          stopMacroPlayback();
        }
      }
      const target = allSoundsRef.current.find(s => s.id === sid);
      if (target) {
        stopAllFnRef.current();
        playFnRef.current(target);
      }
      if (macroLatest.mode !== 'burst' || burstCount < Math.max(1, macroLatest.repeatCount)) {
        macroTimerRef.current = setTimeout(step, Math.max(60, macroLatest.intervalMs));
      }
    };
    step();
  }, [macroPresets, stopMacroPlayback]);

  useEffect(() => () => stopMacroPlayback(), [stopMacroPlayback]);

  const upsertMacro = useCallback((macro: MacroPreset) => {
    if (!guardMutation('更新宏播放')) return;
    setMacroPresets(prev => {
      const idx = prev.findIndex(m => m.id === macro.id);
      if (idx === -1) return [...prev, macro];
      const next = [...prev];
      next[idx] = macro;
      return next;
    });
  }, [guardMutation]);

  const removeMacro = useCallback((macroId: string) => {
    if (!guardMutation('删除宏播放')) return;
    if (activeMacroId === macroId) stopMacroPlayback();
    setMacroPresets(prev => prev.filter(m => m.id !== macroId));
  }, [guardMutation, activeMacroId, stopMacroPlayback]);

  const shortcutHealthIssues: ShortcutHealthIssue[] = (() => {
    const issues: ShortcutHealthIssue[] = [];
    const singleKeyRisk = Object.keys(shortcuts).filter(k => !k.includes('+'));
    singleKeyRisk.forEach((key) => {
      issues.push({
        id: `single-${key}`,
        level: 'warning',
        type: 'single-key-risk',
        shortcut: key,
        message: `单键快捷键「${key}」误触风险较高`,
        suggestion: `Ctrl+Shift+${key}`,
      });
    });
    if (stopShortcut && !stopShortcut.includes('+')) {
      issues.push({
        id: `stop-${stopShortcut}`,
        level: 'warning',
        type: 'stop-key-risk',
        shortcut: stopShortcut,
        message: `停止快捷键「${stopShortcut}」建议改为组合键`,
        suggestion: `Ctrl+Shift+${stopShortcut}`,
      });
    }
    return issues;
  })();

  const autoFixShortcutHealth = useCallback(() => {
    if (!guardMutation('自动修复快捷键')) return;
    const next = { ...shortcuts };
    Object.entries(shortcuts).forEach(([shortcut, sid]) => {
      if (!shortcut.includes('+')) {
        const suggestion = `Ctrl+Shift+${shortcut.toUpperCase()}`;
        if (!next[suggestion] && suggestion !== stopShortcut) {
          delete next[shortcut];
          next[suggestion] = sid;
        }
      }
    });
    setShortcuts(next);
    if (stopShortcut && !stopShortcut.includes('+')) {
      const nextStop = `Ctrl+Shift+${stopShortcut.toUpperCase()}`;
      if (!next[nextStop]) setStopShortcut(nextStop);
    }
    showUxNotice('success', '已应用快捷键健康修复', '已将高风险单键尽量替换为组合键');
  }, [guardMutation, shortcuts, stopShortcut, showUxNotice]);

  return (
    <div className="app-shell relative w-full h-full border border-accent/60 flex flex-col overflow-hidden">
      <TitleBar
        onSettingsClick={() => setShowSettings(true)}
        onValorantToggle={() => setRightPanel(prev => (prev === 'valorant' ? 'none' : 'valorant'))}
        showValorant={rightPanel === 'valorant'}
        valorantConnected={valorantConnected}
        teamMode={teamMode}
        onTeamToggle={() => setTeamMode(prev => !prev)}
      />
      {uxNotice && (
        <div className={`feedback-toast mx-3 mt-2 px-3 py-2 text-sm ${
          uxNotice.type === 'error'
            ? 'border-accent-red bg-accent-red/10 text-accent-red'
            : 'border-accent-green bg-accent-green/10 text-accent-green'
        }`}>
          <div className="font-medium">{uxNotice.text}</div>
          {uxNotice.hint && <div className="mt-1 text-[11px] text-text-secondary">{uxNotice.hint}</div>}
        </div>
      )}


      <GroupFilterBar
        groups={groups}
        activeGroupFilter={activeGroupFilter}
        onSelectGroupFilter={setActiveGroupFilter}
        onGroupManagerClick={() => setShowGroupManager(true)}
        getGroupById={getGroupById}
      />

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="px-3 py-2.5 border-b border-border-default bg-bg-secondary/50">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="10" cy="10" r="6" />
                    <path d="M15 15l5 5" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder={copy.toolbar.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input pl-7 rounded-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-text-secondary hover:text-accent cursor-pointer"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
                  </button>
                )}
              </div>
              <button
                onClick={handleImportSounds}
                className="shrink-0 px-3 py-2 border border-accent/40 bg-accent/10 text-accent text-sm rounded-lg cursor-pointer hover:bg-accent/20 transition-none inline-flex items-center gap-1.5"
                title="导入本地音效文件"
              >
                <Cassette size={12} color={themeColor.accent} />
                {copy.toolbar.import}
              </button>
              <button
                onClick={() => setRightPanel(prev => (prev === 'sniffer' ? 'none' : 'sniffer'))}
                className={`shrink-0 px-3 py-2 border text-sm rounded-lg cursor-pointer transition-none inline-flex items-center gap-1.5 ${
                  rightPanel === 'sniffer'
                    ? 'border-accent-gold bg-accent-gold/20 text-accent-gold'
                    : 'border-border-default bg-bg-tertiary text-text-primary hover:border-accent-gold'
                }`}
                title="打开爱给网并捕获音频"
              >
                <Globe size={12} color={themeColor.gold} />
                {copy.toolbar.sniffer}
              </button>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as 'default' | 'favorites' | 'recent')}
                className="shrink-0 px-2 py-2 border border-border-default bg-bg-tertiary text-text-primary text-sm rounded-lg"
                title="排序方式"
              >
                <option value="default">默认排序</option>
                <option value="favorites">收藏优先</option>
                <option value="recent">最近优先</option>
              </select>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 min-h-[14px]">
              <span className="meta-label">
                {activeGroupFilter
                  ? `${copy.toolbar.groupPrefix} · ${getGroupById(activeGroupFilter)?.name ?? '—'}`
                  : copy.toolbar.allSounds}
              </span>
              <span className="meta-label text-accent-cyan tabular-nums">
                {copy.toolbar.count(filteredSounds.length, allSounds.length)}
              </span>
            </div>
          </div>

          <SoundGrid
            sounds={filteredSounds}
            playingSound={playingSound}
            onToggleSound={toggleSound}
            shortcuts={shortcuts}
            onAddShortcut={addShortcut}
            onRemoveShortcut={removeShortcut}
            onDeleteSound={handleDeleteSound}
            groups={groups}
            soundGroupMap={soundGroupMap}
            onAddSoundToGroup={addSoundToGroup}
            onRemoveSoundFromGroup={removeSoundFromGroup}
            getGroupById={getGroupById}
            favorites={favorites}
            pinnedSounds={pinnedSounds}
            onToggleFavorite={toggleFavorite}
            onTogglePin={togglePinSound}
            safeLockEnabled={safeLockEnabled}
          />
        </div>

        {rightPanel !== 'none' && (
          <aside className="w-auto min-w-[280px] max-w-[50%] border-l-2 border-border-default bg-bg-secondary/70 flex">
            {rightPanel === 'valorant' ? (
              <ValorantPanel onClose={() => setRightPanel('none')} />
            ) : (
              <OnlineSoundBrowser
                onImport={handleImportFromPath}
                onClose={() => setRightPanel('none')}
                targetGroupId={activeGroupFilter || undefined}
                targetGroupName={activeGroupFilter ? getGroupById(activeGroupFilter)?.name : undefined}
              />
            )}
          </aside>
        )}
      </div>

      <StatusBar
        volume={currentVolume}
        onVolumeChange={handleVolumeChange}
        isPlaying={playingSound !== null}
        onPause={() => togglePauseFnRef.current()}
        onPlayLast={() => togglePauseFnRef.current()}
        hasLastSound={!!lastPlayedSound}
        selectedDevice={selectedDevice}
        onDeviceChange={setSelectedDevice}
        currentSoundName={playingSound ? (allSounds.find(s => s.id === playingSound)?.name || null) : (lastPlayedSound?.name || null)}
        isMuted={isMuted}
        onMuteToggle={handleMuteToggle}
      />

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          shortcuts={shortcuts}
          onRemoveShortcut={removeShortcut}
          sounds={allSounds}
          onClearData={clearAllData}
          stopShortcut={stopShortcut}
          onSetStopShortcut={setStopShortcutHandler}
          onClearStopShortcut={clearStopShortcut}
          teamMode={teamMode}
          onTeamModeChange={setTeamMode}
          teamKey={teamKey}
          onTeamKeyChange={setTeamKey}
          valorantEnabled={valorantEnabled}
          onValorantEnabledChange={setValorantEnabled}
          pickerPrefixKey={pickerPrefixKey}
          onPickerPrefixKeyChange={setPickerPrefixKey}
          safeLockEnabled={safeLockEnabled}
          onSafeLockChange={setSafeLockEnabled}
          macroPresets={macroPresets}
          onUpsertMacro={upsertMacro}
          onRemoveMacro={removeMacro}
          onRunMacro={executeMacro}
          activeMacroId={activeMacroId}
          shortcutHealthIssues={shortcutHealthIssues}
          onAutoFixShortcutHealth={autoFixShortcutHealth}
          importQualityReports={Object.values(importQualityReports)}
        />
      )}

      {showGroupManager && (
        <GroupManager
          onClose={() => setShowGroupManager(false)}
          groups={groups}
          onAddGroup={addGroup}
          onDeleteGroup={deleteGroup}
          onUpdateGroupName={updateGroupName}
          sounds={importedSounds}
        />
      )}

    </div>
  );
}

export default App;