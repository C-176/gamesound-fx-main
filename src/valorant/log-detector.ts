import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import type { ValorantEvent, ValorantStatus, ValorantEventPayload } from './types';

type EventCallback = (payload: ValorantEventPayload) => void;
type StatusCallback = (status: ValorantStatus) => void;

const WE_GAME_ROOTS = [
  'D:/Software/Wegame/WeGameApps/rail_apps',
  'D:/WeGameApps/rail_apps',
  'C:/Program Files/WeGame/rail_apps',
];

const DISCONNECT_AFTER_MS = 30000;

const MAP_NAME_MAP: Record<string, string> = {
  Triad: 'Haven',
  Port: 'Lotus',
  Breeze: 'Breeze',
  Ascent: 'Ascent',
  Bind: 'Bind',
  Icebox: 'Icebox',
  Fracture: 'Fracture',
  Pearl: 'Pearl',
  Sunset: 'Sunset',
  Abyss: 'Abyss',
  Lotus: 'Lotus',
};

const AGENT_CODE_MAP: Record<string, string> = {
  Grenadier: 'KAY/O',
  Thorne: 'Sage',
  Vampire: 'Reyna',
  Sprinter: 'Neon',
  Breach: 'Breach',
  Deadeye: 'Chamber',
  Killjoy: 'Killjoy',
  BountyHunter: 'Fade',
  Terra: 'Iso',
  Sequoia: 'Harbor',
  Iris: 'Skye',
};

export class ValorantLogDetector {
  private onEvent: EventCallback;
  private onStatus: StatusCallback;
  private watchTimer: ReturnType<typeof setInterval> | null = null;
  private fsWatcher: fs.FSWatcher | null = null;
  private logDir: string | null = null;
  private logFilePath: string | null = null;
  private filePosition = 0;
  private gameConnected = false;
  private gameState: 'menu' | 'pregame' | 'ingame' | 'unknown' = 'unknown';
  private currentRound = -1;
  private roundJustEnded = false;
  private roundStartFiredForCurrent = false;
  private initialScan = false;
  private currentMap: string | null = null;
  private currentAgent: string | null = null;
  private matchStartedForCurrentGame = false;
  private lastDiscoverAttempt = 0;
  private discoverBackoffMs = 5000;
  private discoverFailCount = 0;

  constructor(onEvent: EventCallback, onStatus: StatusCallback) {
    this.onEvent = onEvent;
    this.onStatus = onStatus;
  }

  isConnected(): boolean {
    return this.gameConnected;
  }

  async start() {
    await this.discoverLogFile();
    this.tick();
    // Polling fallback (1s) �?catches changes fs.watch might miss
    this.watchTimer = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.watchTimer) {
      clearInterval(this.watchTimer);
      this.watchTimer = null;
    }
    this.closeWatcher();
    this.closeConnection();
  }

  private closeWatcher() {
    if (this.fsWatcher) {
      try { this.fsWatcher.close(); } catch {}
      this.fsWatcher = null;
    }
  }

  private setupWatcher() {
    this.closeWatcher();
    if (!this.logDir) return;

    try {
      // Watch the directory for changes to the log file
      this.fsWatcher = fs.watch(this.logDir, (eventType, filename) => {
        if (eventType === 'change' && filename && filename.includes('ShooterGame')) {
          this.readNewLines();
        }
      });
    } catch (e) {
      console.log('[ValorantLogDetector] fs.watch not available, using polling only');
    }
  }

  private closeConnection() {
    const wasConnected = this.gameConnected;
    this.gameConnected = false;
    this.gameState = 'unknown';
    this.currentRound = -1;
    this.roundJustEnded = false;
    this.roundStartFiredForCurrent = false;
    this.matchStartedForCurrentGame = false;
    this.currentMap = null;
    this.currentAgent = null;
    this.filePosition = 0;
    if (wasConnected) this.onStatus({ connected: false });
  }

  private async tick() {
    if (!this.logFilePath) {
      const now = Date.now();
      if (now - this.lastDiscoverAttempt < this.discoverBackoffMs) return;
      this.lastDiscoverAttempt = now;
      await this.discoverLogFile();
      if (!this.logFilePath) {
        this.discoverFailCount++;
        this.discoverBackoffMs = Math.min(60000, 5000 * Math.pow(2, Math.min(this.discoverFailCount, 4)));
        return;
      }
      this.discoverFailCount = 0;
      this.discoverBackoffMs = 5000;
    }

    try {
      const stats = fs.statSync(this.logFilePath!);
      const now = Date.now();
      const elapsed = now - stats.mtimeMs;
      const recentlyModified = elapsed < DISCONNECT_AFTER_MS;

      if (recentlyModified && !this.gameConnected) {
        this.gameConnected = true;
        this.initialScan = true;
        this.filePosition = 0;
        this.onStatus({ connected: true });
        console.log('[ValorantLogDetector] Game CONNECTED');
        this.readNewLines();
        this.initialScan = false;
        this.readNewLines();
        this.setupWatcher();
      } else if (!recentlyModified && this.gameConnected) {
        console.log('[ValorantLogDetector] Game DISCONNECTED (log stale)');
        this.closeWatcher();
        this.closeConnection();
        return;
      }

      if (this.gameConnected) {
        this.readNewLines();
      }
    } catch (e) {
      console.log('[ValorantLogDetector] tick error:', e);
      if (this.gameConnected) this.closeConnection();
    }
  }

  private async queryRegistry(key: string, value: string): Promise<string | null> {
    return new Promise((resolve) => {
      execFile('reg', ['query', key, '/v', value], { encoding: 'utf8', timeout: 2000 }, (err, stdout) => {
        if (err) { resolve(null); return; }
        const m = stdout.match(new RegExp(value + '\\s+REG_\\w+\\s+(.+)', 'i'));
        resolve(m ? m[1].trim() : null);
      });
    });
  }

  private async discoverLogFile() {
    // Try registry first
    const regPath = await this.queryRegistry('HKLM\\SOFTWARE\\WOW6432Node\\Tencent\\WeGame', 'InstallPath')
      || await this.queryRegistry('HKCU\\SOFTWARE\\Tencent\\WeGame', 'InstallPath');
    if (regPath) {
      const candidate = path.join(regPath, 'rail_apps');
      const log = this.findLogInDir(candidate);
      if (log) return;
    }

    // Fallback: hardcoded paths
    for (const root of WE_GAME_ROOTS) {
      const log = this.findLogInDir(root);
      if (log) return;
    }

    console.log('[ValorantLogDetector] No log file found in any path');
  }

  private findLogInDir(dir: string): boolean {
    try {
      if (!fs.existsSync(dir)) return false;
      for (const entry of fs.readdirSync(dir)) {
        if (!entry.includes('无畏契约') && !entry.includes('VALORANT')) continue;
        const p = path.join(dir, entry, 'live', 'ShooterGame', 'Saved', 'Logs', 'ShooterGame.log');
        if (fs.existsSync(p)) {
          this.logFilePath = p;
          this.logDir = path.dirname(p);
          this.discoverFailCount = 0;
          this.discoverBackoffMs = 5000;
          console.log('[ValorantLogDetector] Found log:', p);
          return true;
        }
      }
    } catch {}
    return false;
  }

  private parseScores(line: string): { ourScore: number; enemyScore: number } | null {
    // Format: "Team Alpha: X, Team Bravo: Y" (English)
    const m1 = line.match(/Team Alpha:\s*(\d+),\s*Team Bravo:\s*(\d+)/i);
    if (m1) return { ourScore: parseInt(m1[1]), enemyScore: parseInt(m1[2]) };
    // Format: "Team Bravo: X, Team Alpha: Y" (swapped)
    const m2 = line.match(/Team Bravo:\s*(\d+),\s*Team Alpha:\s*(\d+)/i);
    if (m2) return { ourScore: parseInt(m2[2]), enemyScore: parseInt(m2[1]) };
    return null;
  }

  private readNewLines() {
    try {
      const stats = fs.statSync(this.logFilePath!);
      if (stats.size < this.filePosition) {
        this.filePosition = 0;
      }
      if (stats.size <= this.filePosition) return;

      const fd = fs.openSync(this.logFilePath!, 'r');
      const buf = Buffer.alloc(stats.size - this.filePosition);
      fs.readSync(fd, buf, 0, buf.length, this.filePosition);
      fs.closeSync(fd);
      this.filePosition = stats.size;

      const content = buf.toString('utf-8');
      for (const raw of content.split('\n')) {
        const line = raw.trim();
        if (!line) continue;

        // Game state transitions
        if (line.includes('Current state MainMenu entering')) {
          this.gameState = 'menu';
          this.currentRound = -1;
          this.roundJustEnded = false;
          this.roundStartFiredForCurrent = false;
          this.currentAgent = null;
          this.currentMap = null;
          this.matchStartedForCurrentGame = false;
          continue;
        }
        if (line.includes('Current state Pregame entering') || line.includes('Loopstate changed from MENUS to PREGAME')) {
          this.gameState = 'pregame';
          this.currentRound = -1;
          this.roundStartFiredForCurrent = false;
          this.currentAgent = null; // reset so new agent_select fires
          this.currentMap = null;
          this.matchStartedForCurrentGame = false;
          continue;
        }
        if (line.includes('Current state InGame entering') || line.includes('Loopstate changed from PREGAME to INGAME')) {
          this.gameState = 'ingame';
          this.currentRound = -1;
          this.roundJustEnded = false;
          this.roundStartFiredForCurrent = false;
          console.log('[ValorantLogDetector] InGame detected');
          continue;
        }

        // Match start �?MapLoadModel with Match Setup and Map Ready (not MainMenu)
        if (line.includes('LogMapLoadModel') && line.includes('Match Setup: TRUE') && line.includes('Map Ready: TRUE') && !line.includes('MainMenuV2') && !this.initialScan && !this.matchStartedForCurrentGame) {
          const mapMatch = line.match(/\[Map Name:\s*(\w+)/);
          if (mapMatch) {
            this.currentMap = MAP_NAME_MAP[mapMatch[1]] || mapMatch[1];
            this.matchStartedForCurrentGame = true;
            console.log('[ValorantLogDetector] Match started, map:', this.currentMap);
            this.fire('match_start');
          }
          continue;
        }

        // Agent select �?player character received
        if (line.includes('Current character: Default__') && !this.initialScan) {
          const agentMatch = line.match(/Default__(\w+)_PC_C/);
          if (agentMatch && agentMatch[1] !== this.currentAgent) {
            this.currentAgent = agentMatch[1];
            const agentName = AGENT_CODE_MAP[this.currentAgent] || this.currentAgent;
            console.log('[ValorantLogDetector] Agent selected:', agentName);
            this.fire('agent_select');
          }
          continue;
        }

        // Match end
        if (line.includes("Match Ended:") && line.includes("Winning Team:")) {
          const isRed = line.includes("'Red'");
          console.log('[ValorantLogDetector] Match ended, winner:', isRed ? 'Red' : 'Blue');
          this.fire(isRed ? 'match_end_red' : 'match_end_blue');
          continue;
        }

        // Debug: log lines that might be match end in other formats
        if ((line.includes('Match') || line.includes('match') || line.includes('Winning') || line.includes('胜利') || line.includes('结束') || line.includes('比赛')) && !this.initialScan) {
          console.log('[ValorantLogDetector] Potential match line:', line);
        }

        if (line.includes('Current state TransitionToMainMenu entering') && this.gameState === 'ingame') {
          this.gameState = 'menu';
          this.currentRound = -1;
          this.roundJustEnded = false;
          this.roundStartFiredForCurrent = false;
          this.currentAgent = null;
          this.currentMap = null;
          this.matchStartedForCurrentGame = false;
          console.log('[ValorantLogDetector] Back to menu after match');
          continue;
        }

        // Round end
        if (line.includes('AShooterGameState::OnRoundEnded')) {
          this.roundJustEnded = true;
          this.roundStartFiredForCurrent = false;
          if (!this.initialScan) {
            const scores = this.parseScores(line);
            console.log('[ValorantLogDetector] Round end detected, round:', this.currentRound, 'scores:', scores);
            this.fire('round_end', scores || undefined);
          }
          continue;
        }

        if (this.gameState !== 'ingame' || this.initialScan) continue;

        // Round start
        if (line.includes('Gameplay started at local time')) {
          if (this.currentRound >= 0) {
            this.currentRound++;
          } else {
            this.currentRound = 0;
          }
          this.roundJustEnded = false;
          if (this.roundStartFiredForCurrent) {
            console.log('[ValorantLogDetector] Round start skipped (already fired), round:', this.currentRound);
            continue;
          }
          this.roundStartFiredForCurrent = true;
          console.log('[ValorantLogDetector] Round start:', this.currentRound);
          this.fire('round_start');
          continue;
        }

        // Spike planted
        if (line.includes('BombInteractionBuff_C') && !this.roundJustEnded) {
          console.log('[ValorantLogDetector] Spike planted');
          this.fire('spike_planted');
          continue;
        }
      }
    } catch {}
  }

  private fire(event: ValorantEvent, scores?: { ourScore: number; enemyScore: number }) {
    this.onEvent({
      event,
      match: {
        round: Math.max(0, this.currentRound),
        ourScore: scores?.ourScore ?? 0,
        enemyScore: scores?.enemyScore ?? 0,
        map: this.currentMap || undefined,
        agent: this.currentAgent ? (AGENT_CODE_MAP[this.currentAgent] || this.currentAgent) : undefined,
        phase: this.gameState === 'ingame' ? 'in_game' : (this.gameState === 'pregame' ? 'agent_select' : 'menu'),
      },
    });
  }
}
