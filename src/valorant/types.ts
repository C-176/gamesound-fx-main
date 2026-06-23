// src/valorant/types.ts

export type ValorantEvent =
  | 'match_start'
  | 'agent_select'
  | 'match_end_red'
  | 'match_end_blue'
  | 'round_start'
  | 'round_end'
  | 'spike_planted';

export const VALORANT_EVENTS: ValorantEvent[] = [
  'match_start',
  'agent_select',
  'match_end_red',
  'match_end_blue',
  'round_start',
  'round_end',
  'spike_planted',
];

export const VALORANT_EVENT_LABELS: Record<ValorantEvent, string> = {
  match_start: '对局开始',
  agent_select: '特工选择',
  match_end_red: '对局结束（红方胜）',
  match_end_blue: '对局结束（蓝方胜）',
  round_start: '回合开始',
  round_end: '回合结束',
  spike_planted: '爆能器安装',
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
