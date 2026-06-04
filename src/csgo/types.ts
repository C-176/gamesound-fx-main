export type CS2Event =
  | 'match_start'
  | 'freezetime_started'
  | 'round_start'
  | 'round_end'
  | 'round_end_ct_win'
  | 'round_end_t_win'
  | 'spike_planted'
  | 'spike_defused'
  | 'spike_exploded'
  | 'match_end'
  | 'player_killed'
  | 'player_died';

export const CS2_EVENTS: CS2Event[] = [
  'match_start',
  'freezetime_started',
  'round_start',
  'round_end',
  'round_end_ct_win',
  'round_end_t_win',
  'spike_planted',
  'spike_defused',
  'spike_exploded',
  'match_end',
  'player_killed',
  'player_died',
];

export const CS2_EVENT_LABELS: Record<CS2Event, string> = {
  match_start: '对局开始',
  freezetime_started: '冻结时间（买枪阶段）',
  round_start: '回合开始',
  round_end: '回合结束',
  round_end_ct_win: 'CT 胜利',
  round_end_t_win: 'T 胜利',
  spike_planted: 'C4 安装',
  spike_defused: 'C4 拆除',
  spike_exploded: 'C4 爆炸',
  match_end: '对局结束',
  player_killed: '击杀敌人',
  player_died: '阵亡',
};

export interface CS2MatchInfo {
  map?: string;
  round: number;
  ctScore: number;
  tScore: number;
  phase: string;
}

export interface CS2Status {
  connected: boolean;
  match?: CS2MatchInfo;
}

export interface CS2EventPayload {
  event: CS2Event;
  match?: CS2MatchInfo;
}
