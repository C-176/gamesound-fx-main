# Valorant Game Data Integration — Design Spec

## Overview

Integrate real-time Valorant game state detection into GameSound FX, enabling automatic sound playback based on in-game events and agent-specific soundboard switching.

## Scope

Two core features:

1. **Auto-triggered sounds** — Play user-bound sounds automatically when specific game events occur
2. **Agent-based soundboard switching** — Auto-switch active soundboard based on selected agent

## Architecture

### Module Structure

```
src/
├── main.ts                       # New IPC handlers for valorant events
├── preload.ts                    # New IPC channels (valorant-events, valorant-status)
├── valorant/
│   ├── api.ts                    # Valorant Local API wrapper (lockfile, auth, endpoints)
│   ├── detector.ts               # Polling engine + state diff → event detection
│   └── types.ts                  # Game state, event, binding type definitions
└── components/
    └── ValorantPanel.tsx          # Event binding UI panel
```

### Data Flow

```
Valorant Client (localhost API)
        │
        ▼
  api.ts — lockfile auth, HTTP requests (NODE_TLS_REJECT_UNAUTHORIZED=0)
        │
        ▼
  detector.ts — polls /chat/v4/presences + /core-game/v1/matches every 1s
        │  maintains previous state, diffs to detect events
        │  auto-starts when API responds, auto-stops on connection loss
        ▼
  IPC: valorant-event-fired { event: 'round_start' | 'round_end_win' | 'round_end_lose' | 'spike_planted' | 'spike_defused' | 'spike_exploded' | 'agent_selected', agent?: string }
        │
        ▼
  ValorantPanel.tsx — looks up event→sound mapping in localStorage
        │  plays matched sound via existing Howler audio system
        ▼
  Speaker 🔊
```

### Process Detection (Valorant API Heartbeat)

- No external process polling (`tasklist`/`EnumProcesses`)
- Poll `https://127.0.0.1:{port}/chat/v4/presences` every 5s
  - 401 = game not running → idle state
  - 200 + valid response = game running → active state
  - Active → switch to 1s interval for match data polling
  - Idle → stop match polling, keep 5s heartbeat

### Valorant Local API Integration

- Lockfile path: `%LOCALAPPDATA%\Riot Games\Riot Client\Config\lockfile`
- Format: `riot:{pid}:{port}:{password}:{protocol}`
- Auth header: Basic base64(`riot:{password}`)
- HTTPS with self-signed cert → `NODE_TLS_REJECT_UNAUTHORIZED=0`
- Key endpoints:
  - `/chat/v4/presences` — player state (menu, agent select, in-game, result screen)
  - `/core-game/v1/matches` — match data when in-game
  - `/glz/v1/current-game` — agent selection info

### Event Detection

| Event | Detection Method |
|-------|-----------------|
| `agent_selected` | Presence state → "AGENT_SELECT" then back to "IN_PROGRESS" with agent ID |
| `round_start` | Match state transitions to "ACTIVE" or round number increments |
| `round_end_win` | Match data shows this team's score incrementing |
| `round_end_lose` | Match data shows enemy score incrementing |
| `spike_planted` | Match state includes plant status (requires polling diff) |
| `spike_defused` | Plant status changes from planted to cleared |
| `spike_exploded` | Round ends with spike status = exploded |

### Manual Shortcut Triggers

- Users can bind keyboard shortcuts (existing shortcut system) to custom actions
- New action type: "Trigger Valorant Sound" with event selector
- Stored in localStorage alongside existing shortcuts

## UI Design

### Tab Entry

New `[VALORANT]` tab in the existing CategoryTabs component, alongside LOCAL / ONLINE / FAVORITE.

### ValorantPanel Component

Two sections:

**Status Bar**
- Connection indicator (● CONNECTED / ○ OFFLINE)
- Current match info when connected: mode · map · round

**Event Binding Rows**
Each event is a row with:
- Event name (e.g. "ROUND START", "SPIKE PLANTED")
- Currently bound sound name (or "(none)")
- ▶ Preview button
- CHANGE button → opens sound picker overlay

**Sound Picker Overlay**
- Modal showing all imported + builtin sounds grouped by group
- Search bar
- Group filter chips
- Click to select → binds to event

### Manual Shortcuts Section
- Additional event types available for manual shortcut binding (e.g. "PLAY SPRAY")
- Uses existing shortcut recording UI from SettingsModal

## Data Persistence

- Event→sound binding map stored in localStorage: `valorantBindings: Record<ValorantEvent, string>`
- Agent→soundboard map stored in localStorage: `valorantAgentBoards: Record<string, string>` (maps agent ID to group ID)
- Status (connected/not) is ephemeral — not persisted

## IPC Channels

### Main Process → Renderer

- `valorant-status-changed` — connection status updates
- `valorant-event-fired` — game event detected
- `valorant-match-info` — match metadata (map, mode, score, agent)
- `valorant-agent-selected` — specific agent selection event

### Renderer → Main Process

- `valorant-start-monitor` — force start monitoring
- `valorant-stop-monitor` — force stop monitoring

## Error Handling

- Lockfile not found → show OFFLINE status, retry every 5s
- API auth failure → retry with fresh lockfile read
- API timeout → skip poll cycle, retry next interval
- Connection lost mid-match → try reconnect, show "RECONNECTING..." status
- All errors are silent (no error modals) — status indicator shows state

## Scope Boundaries (Not Included)

- No Vulcan/VCT overlay integration
- No match history or stats tracking
- No voice chat integration
- No screen/OCR detection
- No automatic sound profile downloads

## Implementation Order

1. `valorant/types.ts` — Type definitions
2. `valorant/api.ts` — Lockfile reading + API wrapper
3. `valorant/detector.ts` — Polling + event detection engine
4. `main.ts` — IPC handlers + lifecycle integration
5. `preload.ts` — IPC channel whitelist additions
6. `ValorantPanel.tsx` — UI component
7. `App.tsx` — Tab routing + state integration
8. Shortcut integration (manual trigger actions)
