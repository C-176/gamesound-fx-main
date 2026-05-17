// src/valorant/types.ts

export type ValorantEvent =
  | 'match_start'
  | 'round_start'
  | 'round_end'
  | 'spike_planted'
  | 'spike_defused'
  | 'spike_exploded'
  | 'match_end_red'
  | 'match_end_blue'
  | 'agent_select';

export const VALORANT_EVENTS: ValorantEvent[] = [
  'match_start',
  'round_start',
  'round_end',
  'spike_planted',
  'spike_defused',
  'spike_exploded',
  'match_end_red',
  'match_end_blue',
  'agent_select',
];

export const VALORANT_EVENT_LABELS: Record<ValorantEvent, string> = {
  match_start: 'MATCH START',
  round_start: 'ROUND START',
  round_end: 'ROUND END',
  spike_planted: 'SPIKE PLANTED',
  spike_defused: 'SPIKE DEFUSED',
  spike_exploded: 'SPIKE EXPLODED',
  match_end_red: 'MATCH END (RED WIN)',
  match_end_blue: 'MATCH END (BLUE WIN)',
  agent_select: 'AGENT SELECT',
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
