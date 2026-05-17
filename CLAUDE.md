# GameSound FX — Project Guide

## Overview
Electron + React 19 + TypeScript 5.8 soundboard app for gamers/streamers. Plays sound effects via hotkeys that work over fullscreen games. Vite 6 frontend, Tailwind CSS 3.4 styling, Howler.js audio.

## Commands
```bash
npm run dev                  # Vite dev server (for frontend dev only)
npm run build                # Vite production build (frontend → dist/)
npm run build:electron       # tsc compile src/main.ts + src/preload.ts → dist/
npm run generate-icons       # node scripts/generate-icons.js + .png
npm run electron:dev         # Start Electron with Vite dev server (dev mode)
npm run electron:build       # Full build: icons → vite → tsc → electron-builder
npm run start                # Clean dist/ → vite build → tsc → run Electron
npm run clean                # Delete dist/ directory
npx tsc --noEmit             # Type check entire project

# Production build + run (must run as admin for uiohook):
npm run start
# Or from PowerShell (triggers UAC):
# Then run this in an admin Command Prompt:
#     npx electron .
# Or from PowerShell (triggers UAC):
#     Start-Process -FilePath cmd.exe -ArgumentList "/k", "npx", "electron", "." -Verb RunAs -WorkingDirectory "..."

# Quick restart after main.ts changes:
taskkill /f /im electron.exe; npx tsc -p tsconfig.electron.json; npx electron .
```

**IMPORTANT:** localStorage data is per-origin. Dev mode (`http://localhost:5173`) and production mode (`app://local`) have separate storage. If you have existing data (imported sounds, shortcuts), use **production mode** (`npx electron .` with no `VITE_DEV_SERVER_URL`).

**CRITICAL: ALWAYS start in production mode.** Never start a Vite dev server unless specifically asked to develop frontend. When the user says "启动", always build (`npx vite build && npx tsc -p tsconfig.electron.json`) then run `npx electron .` — never `npm run dev` or `npm run electron:dev`.

## Project Structure
```
├── src/
│   ├── main.ts              # Electron main process (IPC handlers, window mgmt, keyboard hooks)
│   ├── preload.ts           # contextBridge — whitelisted IPC channels
│   ├── App.tsx              # React root — routing, state, Howl audio
│   ├── main.tsx             # Entry point (no StrictMode — see notes)
│   ├── index.css            # Tailwind base + CSS vars + animations + pixel font
│   ├── vite-env.d.ts
│   ├── data/sounds.ts       # Built-in sound definitions + types
│   └── components/
│       ├── TitleBar.tsx     # Window controls, compact mode toggle
│       ├── CompactBar.tsx   # Mini floating bar for compact mode
│       ├── SoundGrid.tsx    # Sound card grid with context menu
│       ├── StatusBar.tsx    # Volume, play/pause, audio device
│       ├── SettingsModal.tsx # Shortcuts, overlay, team mode
│       ├── CategoryTabs.tsx # Filter tabs (local/online/favorite)
│       ├── GroupFilterBar.tsx # Group filter chips
│       ├── GroupManager.tsx  # CRUD groups
│       ├── OnlineSoundBrowser.tsx # Web sound sniffer (aigei.com)
│       ├── ConfirmModal.tsx  # Reusable confirm dialog
│       └── PixelIcons.tsx   # SVG pixel art icons
├── scripts/
│   ├── generate-icons.js    # ICO generator (Saturn planet, pure Node.js)
│   ├── generate-icons-png.js # PNG generator (same Saturn design)
│   ├── gsfx_poller.cs       # C# keyboard poller helper (elevated)
│   ├── poll_helper.ps1      # PowerShell poller wrapper
│   └── check_manifest.cs    # EXE manifest checker
├── assets/                  # Generated: icon.ico, icon-*.png, tray-icon.png
├── dist/                    # Vite output
└── dist-electron/           # electron-builder output
```

## Tech Stack
| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript 5.8, Vite 6 |
| Styling | Tailwind CSS 3.4, custom CSS vars, `VonwaonBitmap` (凤凰点阵体) pixel font |
| Desktop | Electron 42, electron-builder 26.8 |
| Audio | Howler.js 2.2 (html5 mode, blob URL caching) |
| In-game KB | uiohook-napi 1.5 (low-level hook), koffi 2.16 (keybd_event + GetAsyncKeyState) |
| Bundler | Vite 6 (frontend), tsc (electron main), electron-builder (packaging) |

## Coding Conventions

### TypeScript
- `interface` over `type` for props and data shapes
- `strict: true` in tsconfig — no implicit any
- `noUnusedLocals: true`, `noUnusedParameters: true`
- `verbatimModuleSyntax: true` in frontend tsconfig — use `import type` for type-only imports
- Electron tsconfig uses CommonJS modules; frontend uses ESNext

### React Patterns
- **State mirror refs**: Every state value that callbacks need must have a parallel `useRef`:
  ```tsx
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const playingRef = useRef<string | null>(null);
  // sync in a useEffect:
  useEffect(() => { playingRef.current = playingSound; });
  ```
- **Stable callbacks via refs**: For React.memo children, wrap callbacks through refs:
  ```tsx
  const refs = useRef({ onToggleSound, ... });
  useEffect(() => { refs.current = { onToggleSound, ... }; });
  const stableToggle = useCallback((s) => refs.current.onToggleSound(s), []);
  ```
- **useCallback** on all event handlers (no anonymous arrow functions in JSX props)
- **No StrictMode** in main.tsx — causes duplicate IPC listener registrations via contextBridge
- **No comments** on code — only use comments for WHY (not WHAT)
- Default export for all components

### Electron IPC Pattern
- Renderer communicates exclusively through `contextBridge` exposed as `window.electron`:
  ```ts
  (window as any).electron?.ipcRenderer?.send('channel-name', ...args);
  (window as any).electron?.ipcRenderer?.on('channel-name', handler);
  ```
- All IPC channels are whitelisted in `preload.ts` in three arrays: `validChannels` (send), `sendSync` channels, `on` channels, `invoke` channels
- For invoke/handle (async response), use `ipcRenderer.invoke` + `ipcMain.handle`
- For fire-and-forget, use `ipcRenderer.send` + `ipcMain.on`

### Styling (Tailwind)
- **100% Tailwind CSS** — no hand-written CSS files for components. Only `index.css` has base styles and animations.
- Custom CSS variables are defined in `:root` in `index.css` and mapped in `tailwind.config.js`:
  - `bg-primary`/`bg-secondary`/`bg-tertiary`, `border-default`, `text-primary`/`text-secondary`
  - `accent` (purple: #c04dff), `accent-red`, `accent-green`, `accent-gold`, `accent-pink`, `accent-cyan`
- **`font-pixel` class** for all text instead of `font-bold` — uses `VonwaonBitmap` (凤凰点阵体, 12px/16px bitmap font), with fallback to PingFang SC / Microsoft YaHei for Chinese glyphs
- SVG icons use `shapeRendering="crispEdges"` for pixel-perfect rendering
- Buttons follow a consistent pattern:
  ```tsx
  className="border-2 border-border-default bg-bg-tertiary text-text-secondary
             flex items-center justify-center cursor-pointer
             hover:border-accent hover:text-accent transition-none rounded-lg"
  ```
- Active/hover transform offset: `active:translate-x-0.5 active:translate-y-0.5`
- All transitions use `transition-none` (instant, no animation delay for responsiveness)

### Audio (Howler.js)
- `html5: true` for all Howl instances (required for streaming blob URLs)
- Sound data cached as blob URLs in `blobUrlCache` to avoid re-fetching
- Howl instances stored in `soundRefs.current` — never recreated if existing
- `onend` handler cleans up `playingRef` + triggers team key release
- Audio output device switching via `audioNode.setSinkId()`
- Playback is paused via howl.pause(), not howl.stop()

### Pixel Icons (PixelIcons.tsx)
- SVG `<rect>`-based pixel art via `pixelate()` helper
- Grid of dots (`.` = transparent, `#` = fill color, `o` = currentColor)
- Wrapped in `<PixelIcon>` component for consistent sizing
- Exported as named function components with `size` + `color` props

### localStorage Persistence
State persisted to localStorage by useEffect whenever changed:
- `shortcuts`, `stopShortcut`, `volume`, `importedSounds`, `groups`, `soundGroupMap`
- `selectedDevice`, `teamMode`, `teamKey`
- Imported sound files stored as `sound_${id}` → URL string in localStorage

### Keyboard & In-Game Support
- **uiohook-napi**: Low-level keyboard hook (Set 1 scan codes) — works in exclusive fullscreen. Handles shortcut matching + system actions (Ctrl+Shift+` toggle, Ctrl+Shift+Tab compact, Ctrl+Shift+O overlay).
- **koffi**: FFI bindings for `GetAsyncKeyState` (polling fallback) and `keybd_event` (V key team mode simulation).
- **Shortcut format**: `Ctrl+Shift+A`, `Alt+Space`, etc. Plain key names for single-key shortcuts.
- VK_MAP in main.ts maps key names to Windows virtual key codes.

### Team Mode (V Key)
- When enabled and a sound plays, `keybd_event(VK, 0, 0, 0)` holds the key down
- When sound ends/stops, `keybd_event(VK, 0, 0x0002, 0)` releases
- VK code defaults to 0x56 (V), configurable in Settings via `set-team-key-code` IPC

### Window Modes
- **Normal**: 520×540, framed, rounded border, title bar + grid
- **Compact**: 340×44px mini bar, expandable to 300px for search results
- **Overlay**: alwaysOnTop at `screen-saver` level, configurable opacity, Alt key to click-through
- All three states are independent and toggleable via IPC

## Build & Distribution
- electron-builder with `--win --config.win.target=portable` for portable single EXE
- NSIS installer also available (allowToChangeInstallationDirectory: true)
- Extra resources: `public/sounds/` → `sounds/`, `poll_helper.ps1`, `gsfx_poller.exe`
- No code signing (`signAndEditExecutable: false`)
- EXE must be run as administrator for in-game keyboard hooks via uiohook-napi
- Don't use `requestedExecutionLevel` in electron-builder config — portable ignores it, right-click "Run as administrator" is the method

## Animation Classes
- `.playing-eq` + `.bar` — equalizer bars on active sound card
- `animate-[card-dance_0.8s_steps(2)_infinite]` — playing card bounce
- `animate-[border-glow_1.5s_steps(1)_infinite]` — border pulse
- `animate-[blink_1s_steps(1)_infinite]` — blinking indicator
- `.crt-startup` — CRT power-on animation on app load
