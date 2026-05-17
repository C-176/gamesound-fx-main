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

      // Detect round start (total rounds increased)
      if (this.prevRound >= 0 && totalRounds > this.prevRound) {
        this.fireEvent('round_start', match);
      }

      // Detect spike planted
      const spikeState = match.spikeState || match.plantState;
      const isSpikePlanted = spikeState === 'planted' || spikeState === 'defusing';

      if (isSpikePlanted && !this.wasSpikePlanted) {
        this.fireEvent('spike_planted', match);
      }

      if (!isSpikePlanted && this.wasSpikePlanted) {
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
