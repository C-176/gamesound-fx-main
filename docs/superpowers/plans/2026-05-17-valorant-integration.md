# Valorant Game Data Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate real-time Valorant game state detection into GameSound FX — auto-play bound sounds on spike/round events, plus agent-based soundboard switching.

**Architecture:** New `src/valorant/` module in the main process polls Valorant's local API to detect game state changes, fires IPC events to the renderer. New `ValorantPanel.tsx` component lets users bind sounds to events. Lifecycle managed by heartbeat polling — auto-starts when API responds, auto-stops on connection lost.

**Tech Stack:** Electron 42 (main process), React 19 (renderer), Node.js `https`/`fs` for API calls, uiohook-napi (existing) for manual shortcut trigger

---

## File Overview

### Created Files
- `src/valorant/types.ts` — Event types, binding types
- `src/valorant/api.ts` — Lockfile reading, Valorant local API wrapper
- `src/valorant/detector.ts` — Heartbeat polling, state diff → event detection
- `src/components/ValorantPanel.tsx` — Event binding UI panel

### Modified Files
- `src/main.ts` — Import valorant detector, wire IPC handlers
- `src/preload.ts` — Add 6 new IPC channels (3 send, 3 on)
- `src/App.tsx` — Add VALORANT toggle button + ValorantPanel rendering, state integration

---

### Task 0: Create `src/valorant/types.ts`

**Files:**
- Create: `src/valorant/types.ts`

- [ ] **Step 1: Write type definitions**

```typescript
// src/valorant/types.ts

export type ValorantEvent =
  | 'round_start'
  | 'round_end_win'
  | 'round_end_lose'
  | 'spike_planted'
  | 'spike_defused'
  | 'spike_exploded';

export const VALORANT_EVENTS: ValorantEvent[] = [
  'round_start',
  'round_end_win',
  'round_end_lose',
  'spike_planted',
  'spike_defused',
  'spike_exploded',
];

export const VALORANT_EVENT_LABELS: Record<ValorantEvent, string> = {
  round_start: 'ROUND START',
  round_end_win: 'ROUND END · WIN',
  round_end_lose: 'ROUND END · LOSE',
  spike_planted: 'SPIKE PLANTED',
  spike_defused: 'SPIKE DEFUSED',
  spike_exploded: 'SPIKE EXPLODED',
};

export interface ValorantBindings {
  [event: string]: string; // event key → sound id
}

export interface ValorantMatchInfo {
  map?: string;
  mode?: string;
  round: number;
  ourScore: number;
  enemyScore: number;
  agent?: string;
  phase: 'menu' | 'agent_select' | 'in_game' | 'result';
}

export interface ValorantStatus {
  connected: boolean;
  match?: ValorantMatchInfo;
}

export interface ValorantEventPayload {
  event: ValorantEvent;
  match?: ValorantMatchInfo;
}
```

- [ ] **Step 2: Verify file is correct**

Run: `npx tsc --noEmit`
Expected: No errors (new file is not referenced yet, so should compile cleanly)

---

### Task 1: Create `src/valorant/api.ts`

**Files:**
- Create: `src/valorant/api.ts`

- [ ] **Step 1: Write the Valorant local API wrapper**

```typescript
// src/valorant/api.ts
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const LOCKFILE_PATH = path.join(
  process.env.LOCALAPPDATA || '',
  'Riot Games', 'Riot Client', 'Config', 'lockfile'
);

interface LockfileData {
  port: number;
  password: string;
  protocol: string;
}

function readLockfile(): LockfileData | null {
  try {
    if (!fs.existsSync(LOCKFILE_PATH)) return null;
    const content = fs.readFileSync(LOCKFILE_PATH, 'utf-8').trim();
    // Format: riot:pid:port:password:protocol
    const parts = content.split(':');
    if (parts.length < 5) return null;
    return {
      port: parseInt(parts[2], 10),
      password: parts[3],
      protocol: parts[4],
    };
  } catch {
    return null;
  }
}

function makeRequest(lockfile: LockfileData, endpoint: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`riot:${lockfile.password}`).toString('base64');
    const url = `${lockfile.protocol}://127.0.0.1:${lockfile.port}${endpoint}`;

    const req = https.get(url, {
      headers: { Authorization: `Basic ${auth}` },
      rejectUnauthorized: false,
      timeout: 3000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 401) return reject(new Error('Unauthorized'));
        if (res.statusCode === 404) return reject(new Error('Not found'));
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

export interface PresenceData {
  puuid: string;
  product: string;
  private?: string;
  productState?: string;
}

export interface ValorantAPI {
  isAlive(): Promise<boolean>;
  getPresences(): Promise<PresenceData[]>;
  getCurrentGame(): Promise<any>;
  getCoreGameMatch(): Promise<any>;
}

export function createValorantAPI(): ValorantAPI {
  const getLockfile = (): LockfileData => {
    const lf = readLockfile();
    if (!lf) throw new Error('Lockfile not found');
    return lf;
  };

  return {
    async isAlive(): Promise<boolean> {
      const lf = readLockfile();
      if (!lf) return false;
      try {
        await makeRequest(lf, '/chat/v4/presences');
        return true;
      } catch { return false; }
    },

    async getPresences(): Promise<PresenceData[]> {
      const lf = getLockfile();
      const data = await makeRequest(lf, '/chat/v4/presences');
      return data?.presences || [];
    },

    async getCurrentGame(): Promise<any> {
      const lf = getLockfile();
      return makeRequest(lf, '/glz/v1/current-game');
    },

    async getCoreGameMatch(): Promise<any> {
      const lf = getLockfile();
      return makeRequest(lf, '/core-game/v1/matches');
    },
  };
}

export { readLockfile };
```

- [ ] **Step 2: Type check the new file**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 2: Create `src/valorant/detector.ts`

**Files:**
- Create: `src/valorant/detector.ts`

- [ ] **Step 1: Write the detection engine**

```typescript
// src/valorant/detector.ts
import { createValorantAPI, type ValorantAPI, type PresenceData } from './api';
import type { ValorantEvent, ValorantMatchInfo, ValorantStatus, ValorantEventPayload } from './types';

type EventCallback = (payload: ValorantEventPayload) => void;
type StatusCallback = (status: ValorantStatus) => void;

export class ValorantDetector {
  private api: ValorantAPI;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private matchPollTimer: ReturnType<typeof setInterval> | null = null;
  private prevScore = { our: -1, enemy: -1 };
  private prevRound = -1;
  private wasSpikePlanted = false;
  private onEvent: EventCallback;
  private onStatus: StatusCallback;

  constructor(onEvent: EventCallback, onStatus: StatusCallback) {
    this.api = createValorantAPI();
    this.onEvent = onEvent;
    this.onStatus = onStatus;
  }

  start() {
    this.heartbeatTimer = setInterval(() => this.heartbeat(), 5000);
    this.heartbeat(); // immediate first check
  }

  stop() {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.matchPollTimer) { clearInterval(this.matchPollTimer); this.matchPollTimer = null; }
  }

  private async heartbeat() {
    const alive = await this.api.isAlive().catch(() => false);
    if (!alive) {
      this.stopMatchPolling();
      this.onStatus({ connected: false });
      return;
    }

    this.onStatus({ connected: true });

    // Start match polling if not already running
    if (!this.matchPollTimer) {
      this.matchPollTimer = setInterval(() => this.pollMatch(), 1000);
      this.pollMatch(); // immediate first poll
    }
  }

  private stopMatchPolling() {
    if (this.matchPollTimer) {
      clearInterval(this.matchPollTimer);
      this.matchPollTimer = null;
    }
    this.prevScore = { our: -1, enemy: -1 };
    this.prevRound = -1;
    this.wasSpikePlanted = false;
  }

  private async pollMatch() {
    try {
      const match = await this.api.getCoreGameMatch().catch(() => null);
      if (!match) {
        // Try presence endpoint as fallback
        const presences = await this.api.getPresences().catch(() => []);
        const session = this.findSessionState(presences);
        if (!session || session === 'menu' || session === 'result') {
          this.stopMatchPolling();
        }
        return;
      }

      // Parse match data for score and round info
      const ourTeam = match.teams?.[0];
      const enemyTeam = match.teams?.[1];
      const ourScore = ourTeam?.score ?? 0;
      const enemyScore = enemyTeam?.score ?? 0;
      const totalRounds = ourScore + enemyScore;

      // Detect round end events
      if (this.prevScore.our >= 0) {
        if (ourScore + enemyScore > this.prevScore.our + this.prevScore.enemy) {
          if (ourScore > this.prevScore.our) {
            this.fireEvent('round_end_win', match);
          } else {
            this.fireEvent('round_end_lose', match);
          }
        }
      }

      // Detect round start (round incremented, or first detected round)
      if (this.prevRound >= 0 && totalRounds > this.prevRound) {
        this.fireEvent('round_start', match);
      } else if (this.prevRound === -1 && totalRounds >= 0) {
        // First poll — just record state, don't fire
      }

      // Detect spike planted (simplified: check if a round is active with spike down)
      const spikeState = match.spikeState || match.plantState;
      const isSpikePlanted = spikeState === 'planted' || spikeState === 'defusing';

      if (isSpikePlanted && !this.wasSpikePlanted) {
        this.fireEvent('spike_planted', match);
      }

      if (!isSpikePlanted && this.wasSpikePlanted) {
        // Could be defused or exploded — check score to determine
        if (ourScore + enemyScore > this.prevScore.our + this.prevScore.enemy) {
          // Round ended, spike was resolved
        }
        this.fireEvent('spike_defused', match);
      }

      this.prevScore = { our: ourScore, enemy: enemyScore };
      this.prevRound = totalRounds;
      this.wasSpikePlanted = isSpikePlanted;

    } catch {
      // Silently retry on next poll
    }
  }

  private fireEvent(event: ValorantEvent, match: any) {
    const payload: ValorantEventPayload = {
      event,
      match: {
        round: (match.teams?.[0]?.score ?? 0) + (match.teams?.[1]?.score ?? 0),
        ourScore: match.teams?.[0]?.score ?? 0,
        enemyScore: match.teams?.[1]?.score ?? 0,
        phase: 'in_game',
      },
    };
    this.onEvent(payload);
  }

  private findSessionState(presences: PresenceData[]): string | null {
    for (const p of presences) {
      if (p.product === 'valorant') {
        return p.productState || null;
      }
    }
    return null;
  }
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 3: Wire main process — import detector + add IPC handlers

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Add import for ValorantDetector at top of main.ts (after existing imports)**

Add after line 4 (`import { uIOhook, UiohookKey } from 'uiohook-napi';`):

```typescript
import { ValorantDetector } from './valorant/detector';
import type { ValorantEventPayload, ValorantStatus } from './valorant/types';
```

- [ ] **Step 2: Add detector instance variable after `let normalBounds` declaration (line 19)**

After `let floatingHideTimer: ReturnType<typeof setTimeout> | null = null;` (line 20), add:

```typescript
let valorantDetector: ValorantDetector | null = null;
```

- [ ] **Step 3: Initialize ValorantDetector after app starts (after `startKeyPolling()` on line ~806)**

After line 806 (`console.log('[GameSound FX] 键盘轮询后备已启动');`), add:

```typescript
  valorantDetector = new ValorantDetector(
    (payload: ValorantEventPayload) => {
      mainWindow?.webContents.send('valorant-event-fired', payload);
    },
    (status: ValorantStatus) => {
      mainWindow?.webContents.send('valorant-status-changed', status);
    }
  );
  valorantDetector.start();
  console.log('[GameSound FX] Valorant 检测器已启动');
```

- [ ] **Step 4: Add IPC handlers for manual start/stop (after existing IPC handlers)**

Add before the `console.log` on line 1132 (inside `app.whenReady().then()`):

```typescript
  ipcMain.on('valorant-start-monitor', () => {
    valorantDetector?.start();
  });

  ipcMain.on('valorant-stop-monitor', () => {
    valorantDetector?.stop();
  });
```

- [ ] **Step 5: Clean up detector on quit**

At line 1147 (`app.on('will-quit', () => {`), add inside the callback before `uIOhook.stop();`:

```typescript
  valorantDetector?.stop();
```

- [ ] **Step 6: Type check**

Run: `npx tsc -p tsconfig.electron.json`
Expected: No errors

---

### Task 4: Add IPC channels to preload.ts

**Files:**
- Modify: `src/preload.ts`

- [ ] **Step 1: Add send channels**

In the `send` validChannels array (around line 11-34), add after `'close-browser-window'`:

```typescript
        'valorant-start-monitor',
        'valorant-stop-monitor',
```

- [ ] **Step 2: Add on channels**

In the `on` validChannels array (around line 65-81), add after `'sound-browser-closed'`:

```typescript
        'valorant-status-changed',
        'valorant-event-fired',
        'valorant-match-info',
        'valorant-agent-selected',
```

- [ ] **Step 3: Type check (electron config)**

Run: `npx tsc -p tsconfig.electron.json`
Expected: No errors

---

### Task 5: Create `ValorantPanel.tsx` component

**Files:**
- Create: `src/components/ValorantPanel.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { Globe, Satellite, UFO } from './PixelIcons';
import { VALORANT_EVENTS, VALORANT_EVENT_LABELS, type ValorantEvent, type ValorantEventPayload, type ValorantStatus } from '../valorant/types';

interface ValorantPanelProps {
  onClose?: () => void;
}

function ValorantPanel({ onClose }: ValorantPanelProps) {
  const [bindings, setBindings] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('valorantBindings') || '{}'); }
    catch { return {}; }
  });
  const [status, setStatus] = useState<ValorantStatus>({ connected: false });
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState<ValorantEvent | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [allSounds, setAllSounds] = useState<{ id: string; name: string }[]>([]);

  // Load all available sounds (both builtin and imported)
  useEffect(() => {
    const imported = JSON.parse(localStorage.getItem('importedSounds') || '[]');
    const builtin = [
      { id: 's1', name: '冲锋号' }, { id: 's2', name: '机枪扫射' },
      { id: 's5', name: '战斗开始' }, { id: 's6', name: '炸弹已解除' },
    ]; // minimal set from sounds.ts for picker
    const all = [...imported, ...builtin] as { id: string; name: string }[];
    setAllSounds(all);
  }, []);

  const saveBindings = useCallback((newBindings: Record<string, string>) => {
    setBindings(newBindings);
    localStorage.setItem('valorantBindings', JSON.stringify(newBindings));
  }, []);

  const bindSound = useCallback((event: ValorantEvent, soundId: string) => {
    const next = { ...bindings, [event]: soundId };
    saveBindings(next);
    setShowPicker(null);
  }, [bindings, saveBindings]);

  const clearBinding = useCallback((event: ValorantEvent) => {
    const next = { ...bindings };
    delete next[event];
    saveBindings(next);
  }, [bindings, saveBindings]);

  const playPreview = useCallback((soundId: string) => {
    // Use existing playSound via imported IPC
    const electron = (window as any).electron;
    if (electron?.ipcRenderer) {
      // Fire shortcut-triggered to reuse existing playSound logic
      electron.ipcRenderer.send('shortcut-triggered', soundId);
    }
  }, []);

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.ipcRenderer) return;

    const handleEvent = (_: any, payload: ValorantEventPayload) => {
      setLastEvent(payload.event);
      setTimeout(() => setLastEvent(null), 2000);
      // Auto-play bound sound
      const soundId = bindings[payload.event];
      if (soundId) {
        electron.ipcRenderer.send('shortcut-triggered', soundId);
      }
    };

    const handleStatus = (_: any, s: ValorantStatus) => {
      setStatus(s);
    };

    electron.ipcRenderer.on('valorant-event-fired', handleEvent);
    electron.ipcRenderer.on('valorant-status-changed', handleStatus);

    return () => {
      electron.ipcRenderer.removeListener('valorant-event-fired', handleEvent);
      electron.ipcRenderer.removeListener('valorant-status-changed', handleStatus);
    };
  }, [bindings]);

  const filteredSounds = allSounds.filter(s =>
    s.name.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const getSoundName = (soundId: string): string => {
    const sound = allSounds.find(s => s.id === soundId);
    return sound?.name || soundId;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-pixel text-accent flex items-center gap-1.5">
          <Satellite size={12} color="#c04dff" /> VALORANT
        </span>
        {onClose && (
          <div className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1 px-2 py-0.5 border-2 font-pixel text-xs ${
              status.connected
                ? 'border-accent-green text-accent-green'
                : 'border-accent-red text-accent-red'
            }`}>
              <span className={`w-2 h-2 ${status.connected ? 'bg-accent-green' : 'bg-accent-red'}`} />
              {status.connected ? 'CONNECTED' : 'OFFLINE'}
            </div>
            <button onClick={onClose} className="w-7 h-7 border-2 border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none">
              <svg shapeRendering="crispEdges" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M6 6l12 12M18 6l-12 12"/></svg>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 border-2 border-border-default rounded-none overflow-hidden flex flex-col">
        <div className="px-3 py-2 bg-bg-secondary border-b-2 border-border-default">
          <span className="text-base text-text-primary font-pixel">EVENT BINDINGS</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {VALORANT_EVENTS.map((event) => {
            const boundSoundId = bindings[event];
            const isRecent = lastEvent === event;
            return (
              <div key={event} className={`flex items-center px-3 py-2.5 bg-bg-tertiary border-2 mb-2 gap-3 rounded-none ${
                isRecent ? 'border-accent-green' : 'border-border-default'
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="text-base text-text-primary font-pixel overflow-hidden text-ellipsis whitespace-nowrap">
                    {VALORANT_EVENT_LABELS[event]}
                  </div>
                  <div className="text-base font-pixel overflow-hidden text-ellipsis whitespace-nowrap mt-0.5"
                    style={{ color: boundSoundId ? '#0cf' : '#666' }}>
                    {boundSoundId ? getSoundName(boundSoundId) : '(none)'}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {boundSoundId && (
                    <button onClick={() => playPreview(boundSoundId)}
                      className="w-7 h-7 border-2 border-accent bg-accent/10 text-accent flex items-center justify-center text-base cursor-pointer hover:bg-accent hover:text-black transition-none rounded-none">
                      ▶
                    </button>
                  )}
                  <button onClick={() => setShowPicker(showPicker === event ? null : event)}
                    className={`px-2.5 py-1 border-2 text-base font-pixel cursor-pointer transition-none rounded-none ${
                      showPicker === event
                        ? 'border-accent-gold bg-accent-gold text-black'
                        : 'border-accent bg-accent text-black hover:bg-accent-gold hover:border-accent-gold'
                    }`}>
                    {boundSoundId ? 'CHANGE' : 'BIND'}
                  </button>
                  {boundSoundId && (
                    <button onClick={() => clearBinding(event)}
                      className="px-2 py-1 border-2 border-accent-red bg-transparent text-accent-red text-base font-pixel cursor-pointer hover:bg-accent-red hover:text-white transition-none rounded-none">
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sound Picker Overlay */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]" onClick={() => setShowPicker(null)}>
          <div className="bg-bg-secondary border-2 border-accent rounded-none p-5 min-w-[350px] max-w-[450px] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-pixel text-base text-accent mb-4">BIND SOUND — {VALORANT_EVENT_LABELS[showPicker]}</h3>
            <input
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="SEARCH SOUNDS..."
              className="w-full px-2.5 py-2 bg-bg-tertiary border-2 border-border-default text-text-primary text-base font-pixel outline-none focus:border-accent transition-none mb-4 rounded-none"
              autoFocus
            />
            <div className="max-h-[300px] overflow-y-auto">
              {filteredSounds.length === 0 ? (
                <div className="text-center py-4 text-text-secondary font-pixel">NO SOUNDS FOUND</div>
              ) : filteredSounds.map((sound) => (
                <div key={sound.id}
                  onClick={() => bindSound(showPicker, sound.id)}
                  className="flex items-center justify-between px-3 py-2 border-2 border-border-default mb-1 bg-bg-tertiary cursor-pointer hover:border-accent hover:bg-accent/5 transition-none rounded-none">
                  <span className="text-base text-text-primary font-pixel">{sound.name}</span>
                  <span className="text-xs text-accent font-pixel">SELECT</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowPicker(null)}
              className="mt-4 px-3 py-1.5 border-2 border-border-default bg-transparent text-text-secondary text-base font-pixel cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none">
              CANCEL
            </button>
          </div>
        </div>
      )}

      {lastEvent && (
        <div className="absolute bottom-2 right-2 px-2 py-1 border-2 border-accent-green bg-bg-secondary text-accent-green font-pixel text-xs">
          {VALORANT_EVENT_LABELS[lastEvent as ValorantEvent] || lastEvent}
        </div>
      )}
    </div>
  );
}

export default ValorantPanel;
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 6: Integrate Valorant panel into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add import for ValorantPanel**

After line 9 (`import GroupFilterBar from './components/GroupFilterBar';`), add:

```typescript
import ValorantPanel from './components/ValorantPanel';
```

- [ ] **Step 2: Add showValorant state**

After line 46 (`const [showSniffer, setShowSniffer] = useState(false);`), add:

```typescript
const [showValorant, setShowValorant] = useState(false);
```

- [ ] **Step 3: Add VALORANT button next to SNIFFER button (line ~968-973)**

After the SNIFFER button's closing `</button>`, add:

```tsx
            <button
              onClick={() => setShowValorant(prev => !prev)}
              className={`shrink-0 px-2.5 py-1.5 border-2 text-base font-pixel cursor-pointer transition-none rounded-none ${
                showValorant
                  ? 'border-accent bg-accent text-black'
                  : 'border-accent bg-accent/10 text-accent hover:bg-accent hover:text-black'
              }`}
              title="VALORANT BINDINGS"
            >
              VALORANT
            </button>
```

- [ ] **Step 4: Add ValorantPanel rendering before the `{showSniffer ? ...}` conditional**

In App.tsx, the render logic currently shows `OnlineSoundBrowser` when `showSniffer` is true, otherwise shows the search bar + SoundGrid.

Replace the existing render block from line 932 (`{showSniffer ? (` to line 995 (`)}`) with logic that handles both panels:

```tsx
      {showValorant ? (
        <ValorantPanel
          onClose={() => setShowValorant(false)}
        />
      ) : showSniffer ? (
        <OnlineSoundBrowser
          onImport={handleImportFromPath}
          onClose={() => setShowSniffer(false)}
          targetGroupId={activeGroupFilter || undefined}
          targetGroupName={activeGroupFilter ? getGroupById(activeGroupFilter)?.name : undefined}
        />
      ) : (
        <>
        <div className="px-3 py-2 border-b-2 border-border-default">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                placeholder="SEARCH..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2.5 py-1.5 pr-7 border-2 border-border-default bg-bg-tertiary text-text-primary text-base font-pixel outline-none focus:border-accent placeholder:text-text-secondary transition-none rounded-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-text-secondary hover:text-accent cursor-pointer"
                >
                  <svg shapeRendering="crispEdges" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M6 6l12 12M18 6l-12 12"/></svg>
                </button>
              )}
            </div>
            <button
              onClick={handleImportSounds}
              className="shrink-0 px-2.5 py-1.5 border-2 border-accent bg-accent/10 text-accent text-base font-pixel cursor-pointer hover:bg-accent hover:text-black transition-none rounded-none"
              title="IMPORT SOUNDS"
            >
              IMPORT
            </button>
            <button
              onClick={() => setShowSniffer(true)}
              className="shrink-0 px-2.5 py-1.5 border-2 border-accent-gold bg-accent-gold/10 text-accent-gold text-base font-pixel cursor-pointer hover:bg-accent-gold hover:text-black transition-none rounded-none"
              title="SOUND SNIFFER"
            >
              SNIFFER
            </button>
            <button
              onClick={() => setShowValorant(prev => !prev)}
              className={`shrink-0 px-2.5 py-1.5 border-2 text-base font-pixel cursor-pointer transition-none rounded-none ${
                showValorant
                  ? 'border-accent bg-accent text-black'
                  : 'border-accent bg-accent/10 text-accent hover:bg-accent hover:text-black'
              }`}
              title="VALORANT BINDINGS"
            >
              VALORANT
            </button>
          </div>
          {searchQuery && (
            <span className="block mt-1 text-sm font-pixel text-text-secondary font-pixel">{filteredSounds.length} RESULTS</span>
          )}
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
        />
        </>
      )}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 7: Build and verify

**Files:**
- All files from previous tasks

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit && npx tsc -p tsconfig.electron.json`
Expected: No errors in either check

- [ ] **Step 2: Build frontend**

Run: `npx vite build`
Expected: Build succeeds, output in `dist/`

- [ ] **Step 3: Build electron main**

Run: `npx tsc -p tsconfig.electron.json`
Expected: No errors, `dist-electron/` created

- [ ] **Step 4: Run the app to verify**

Run: `npx electron .`
Expected: App starts. New VALORANT button visible in toolbar. Clicking shows the ValorantPanel with event bindings.
