import * as http from 'http';
import type { CS2Event, CS2EventPayload, CS2Status } from './types';

type EventCallback = (payload: CS2EventPayload) => void;
type StatusCallback = (status: CS2Status) => void;

interface CS2GameState {
  provider?: { name?: string; appid?: number; version?: number; steamid?: string };
  map?: { name?: string; phase?: string; round?: number; team_ct?: { score?: number }; team_t?: { score?: number } };
  round?: { phase?: string; bomb?: string; win_team?: string };
  player?: {
    state?: { health?: number; armor?: number; helmet?: boolean; defusekit?: boolean };
    match_stats?: { kills?: number; deaths?: number; assists?: number };
  };
  previously?: {
    player?: {
      state?: { health?: number };
      match_stats?: { kills?: number };
    };
  };
}

export class CS2GSIListener {
  private server: http.Server | null = null;
  private onEvent: EventCallback;
  private onStatus: StatusCallback;
  private port: number;

  private connected = false;
  private updateCount = 0;
  private stableAfterUpdates = 3; // wait for N updates before processing events
  private previousPhase: string | null = null;
  private previousRoundPhase: string | null = null;
  private previousBomb: string | null = null;
  private previousHealth: number = 100;
  private previousKills: number = 0;
  private matchRound = 0;
  private ctScore = 0;
  private tScore = 0;
  private currentMap: string | null = null;
  private matchStarted = false;
  private hasFiredFreeze = false;
  private seenNonLive = false; // true after observing any non-live map phase

  constructor(onEvent: EventCallback, onStatus: StatusCallback, port = 3001) {
    this.onEvent = onEvent;
    this.onStatus = onStatus;
    this.port = port;
  }

  isConnected(): boolean {
    return this.connected;
  }

  start() {
    if (this.server) return;
    this.server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const state: CS2GameState = JSON.parse(body);
            this.processState(state);
          } catch (_e) { /* invalid JSON — ignore */ }
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('OK');
        });
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    this.server.listen(this.port, '127.0.0.1', () => {
      console.log(`[CS2 GSI] Listening on port ${this.port}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    if (this.connected) {
      this.connected = false;
      this.resetState();
      this.onStatus({ connected: false });
    }
  }

  getPort(): number {
    return this.port;
  }

  private resetState() {
    this.updateCount = 0;
    this.previousPhase = null;
    this.previousRoundPhase = null;
    this.previousBomb = null;
    this.previousHealth = 100;
    this.previousKills = 0;
    this.matchRound = 0;
    this.ctScore = 0;
    this.tScore = 0;
    this.currentMap = null;
    this.matchStarted = false;
    this.hasFiredFreeze = false;
    this.seenNonLive = false;
  }

  private processState(state: CS2GameState) {
    // Count updates to let initial stale state settle
    this.updateCount++;

    // Set connected on ANY valid GSI data
    if (state.provider?.name && !this.connected) {
      this.connected = true;
      this.onStatus({ connected: true });
    }

    if (!this.connected) return;
    if (!state.map && !state.round) return;

    const map = state.map;
    const round = state.round;

    if (map?.team_ct?.score !== undefined) this.ctScore = map.team_ct.score;
    if (map?.team_t?.score !== undefined) this.tScore = map.team_t.score;
    if (map?.name) this.currentMap = map.name;
    if (map?.round !== undefined) this.matchRound = map.round;

    // Track whether we've ever seen a non-"live" phase (prevents stale "live" at menu from triggering match_start)
    if (map?.phase && map.phase !== 'live') {
      this.seenNonLive = true;
    }

    // Match start: map phase transitions to "live" — only after seeing a non-live phase first
    if (map?.phase && map.phase !== this.previousPhase) {
      if (map.phase === 'live' && this.seenNonLive && !this.matchStarted) {
        this.matchStarted = true;
        this.fire('match_start');
      }
      if (map.phase === 'gameover') {
        this.matchStarted = false;
        this.fire('match_end');
      }
      this.previousPhase = map.phase;
    }

    // Guard: only process round/bomb/player events during an actively tracked match
    if (!this.matchStarted) return;

    // Round phase transitions
    if (round?.phase && round.phase !== this.previousRoundPhase) {
      // Freeze time: transition from "over" or from nil/initial to "freezetime"
      if (round.phase === 'freezetime' && !this.hasFiredFreeze) {
        this.fire('freezetime_started');
        this.hasFiredFreeze = true;
      }
      // Round start: freezetime → live
      if (round.phase === 'live') {
        if (this.previousRoundPhase === 'freezetime') {
          this.fire('round_start');
        }
        this.hasFiredFreeze = false; // reset for next round
      }
      // Round end: any → over
      if (round.phase === 'over') {
        this.fire('round_end');
        // Also fire team-specific event if win_team is known
        if (round.win_team === 'CT') {
          this.fire('round_end_ct_win');
        } else if (round.win_team === 'T') {
          this.fire('round_end_t_win');
        }
      }
      this.previousRoundPhase = round.phase;
    }

    // Bomb state changes
    if (round?.bomb && round.bomb !== this.previousBomb) {
      if (round.bomb === 'planted') this.fire('spike_planted');
      else if (round.bomb === 'exploded') this.fire('spike_exploded');
      else if (round.bomb === 'defused') this.fire('spike_defused');
      this.previousBomb = round.bomb;
    }

    // Player kill/death detection
    this.detectPlayerEvents(state);
  }

  private detectPlayerEvents(state: CS2GameState) {
    const player = state.player;
    const previous = state.previously;
    if (!player) return;

    // Kill detection: kills counter increased
    if (player.match_stats?.kills !== undefined && previous?.player?.match_stats?.kills !== undefined) {
      if (player.match_stats.kills > previous.player.match_stats.kills) {
        this.fire('player_killed');
      }
    } else if (player.match_stats?.kills !== undefined) {
      // First time seeing kills — track baseline
      this.previousKills = player.match_stats.kills;
    }

    // Death detection: health drops to 0
    if (player.state?.health !== undefined && previous?.player?.state?.health !== undefined) {
      if (previous.player.state.health > 0 && player.state.health <= 0) {
        this.fire('player_died');
      }
    }

    // Track values for next comparison
    if (player.match_stats?.kills !== undefined) this.previousKills = player.match_stats.kills;
    if (player.state?.health !== undefined) this.previousHealth = player.state.health;
  }

  private fire(event: CS2Event) {
    this.onEvent({
      event,
      match: {
        round: this.matchRound,
        ctScore: this.ctScore,
        tScore: this.tScore,
        map: this.currentMap || undefined,
        phase: this.previousPhase || 'unknown',
      },
    });
  }
}
