# 无畏契约 (VALORANT) 事件检测原理

## 概述

通过监听 WeGame 版无畏契约的日志文件 `ShooterGame.log` 来实现游戏中实时事件检测。

日志路径:
```
{WeGame安装目录}/rail_apps/{无畏契约}/live/ShooterGame/Saved/Logs/ShooterGame.log
```

轮询间隔: 2秒

---

## 检测到的事件

| 事件 | 触发条件 | 日志关键词 |
|------|---------|-----------|
| `round_start` | 新回合开始 | `Gameplay started at local time` |
| `round_end` | 回合结束 | `AShooterGameState::OnRoundEnded` |
| `spike_planted` | 爆能器安放 | `BombInteractionBuff_C` |
| `match_end_red` | 比赛结束(红方胜) | `Match Ended: ... Winning Team: ... 'Red'` |
| `match_end_blue` | 比赛结束(蓝方胜) | `Match Ended: ... Winning Team: ... 'Blue'` |

---

## 游戏状态机

监听 `Current state {StateName} entering` 和 `Loopstate changed from X to Y` 维护游戏状态:

```
MainMenu  ──→  Pregame  ──→  InGame  ──→  TransitionToMainMenu  ──→  MainMenu
                    ↑                                              │
                    └──────────────────────────────────────────────┘
```

### 状态转移

| 新状态 | 日志关键词 |
|--------|-----------|
| menu | `Current state MainMenu entering` |
| pregame | `Current state Pregame entering` 或 `Loopstate changed from MENUS to PREGAME` |
| ingame | `Current state InGame entering` 或 `Loopstate changed from PREGAME to INGAME` |
| menu (比赛结束) | `Current state TransitionToMainMenu entering` (仅当当前状态为 ingame) |

### 状态影响
- 只有 `ingame` 状态下才会触发 round/spike 事件
- 进入 `ingame` 时重置 `currentRound = -1`（准备第一回合计数）
- 离开 ingame 时重置所有回合状态

---

## round_start 详细逻辑

```
日志中出现 "Gameplay started at local time"
  │
  ├── currentRound < 0 (第一局)
  │     → currentRound = 0
  │     → 触发 round_start
  │
  └── currentRound >= 0 (后续局)
        → currentRound++
        → 触发 round_start
```

### 防重复机制
- `roundStartFiredForCurrent` 标志: 同一回合内只触发一次 `round_start`
- `round_end` 触发时复位该标志，允许下一回合触发
- 游戏状态重置时(ingame/menu 切换)也复位该标志

### 注
- 第一回合的 local time 通常是 45.xx 或 60.xx（从比赛开始计时）
- 后续回合 local time 归零，显示为 0.xx

---

## round_end 详细逻辑

```
日志中出现 "AShooterGameState::OnRoundEnded"
  → 设置 roundJustEnded = true
  → 复位 roundStartFiredForCurrent = false
  → 触发 round_end
```

### roundJustEnded 的作用
- 防止 `spike_planted` 在回合结束瞬间误触发
- `spike_planted` 检测条件: `line.includes('BombInteractionBuff_C') && !roundJustEnded`

---

## spike_planted 详细逻辑

```
日志中出现 "BombInteractionBuff_C" 且 roundJustEnded = false
  → 触发 spike_planted
```

- 限制 `!roundJustEnded` 以避免在回合转换时把上一回合的残留日志误判为安包

---

## match_end 详细逻辑

```
日志中出现 "Match Ended:" 且包含 "Winning Team:"
  → 判断 Winner 是 'Red' 还是 'Blue'
  → 触发 match_end_red 或 match_end_blue
```

---

## 连接检测

- 日志文件 2 分钟内被修改过 → 认为游戏已连接
- 日志文件超过 2 分钟未修改 → 认为游戏断开，重置状态
- 首次连接时从头扫描日志（`initialScan = true`），只记录状态转移，不触发事件
- 断开重连同理，重新扫描建立状态

---

## 局限性 / 可改进点

1. **日志内容解析有限** — 仅用 `includes()` 字符串匹配，未解析具体数据
2. **无回合分数** — `ourScore`/`enemyScore` 硬编码为 0（日志中其实有分数数据可提取）
3. **无武器/经济信息** — 可解析更多日志行获取
4. **spike 事件不完整** — 只检测了安放（planted），未检测拆除（defuse）和爆炸（explode）
5. **轮询方式** — 2 秒间隔轮询，存在最多 2 秒延迟。可用 `fs.watch` 替代
6. **WeGame 路径硬编码** — 只搜索 3 个预定义路径。可通过注册表或环境变量动态查找
7. **仅支持 WeGame 版** — 国际版 VALORANT 日志路径不同，日志格式可能也有差异
