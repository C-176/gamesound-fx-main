import { app, BrowserWindow, Tray, Menu, ipcMain, screen, protocol, session, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import type { ChildProcess } from 'child_process';
import { ZipArchive } from 'archiver';
import AdmZip from 'adm-zip';
import { UiohookKey } from 'uiohook-napi';
import { ValorantLogDetector } from './valorant/log-detector';
import type { ValorantEventPayload, ValorantStatus } from './valorant/types';

// 禁用自动播放策略，确保全局快捷键触发的音效能正常播放
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// 防止 Chromium 在窗口被遮挡时（如全屏游戏后方）挂起 AudioContext
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let spotlightWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let soundBrowserWindow: BrowserWindow | null = null;
let soundBrowserFixedSize: { width: number; height: number } | null = null;
let syncSoundBrowserPosition: (() => void) | null = null;
const SOUND_BROWSER_REQUEST_FILTER = {
  urls: ['*://*.aigei.com/*', '*://*.aigei.cn/*', '*://*.cdn.aigei.com/*'],
};
let soundBrowserWebRequestHandler: ((details: Electron.OnBeforeRequestListenerDetails, callback: (response: Electron.CallbackResponse) => void) => void) | null = null;
let valorantDetector: ValorantLogDetector | null = null;
let pendingPicker: { choices: Array<{ id: string; name: string }>; timer: ReturnType<typeof setTimeout> } | null = null;
let pickerPrefixKeyName = '`';
let pickerPrefixHeld = false;
let isRecordingShortcut = false;

// uiohook-napi 低层键盘钩子（全屏游戏下仍能捕获快捷键）
const soundShortcutMap = new Map<string, string>();
let stopShortcutKey = '';
interface CompiledShortcut {
  vk: number;
  mask: number;
}
const compiledSoundShortcuts = new Map<string, CompiledShortcut>();
let compiledStopShortcut: CompiledShortcut | null = null;

// uiohook-napi 的 keycode 基于 IBM PC AT Set 1 扫描码（非 HID Usage ID）
const KEY_NAME_MAP: Record<number, string> = {
  [UiohookKey.A]: 'A', [UiohookKey.B]: 'B', [UiohookKey.C]: 'C',
  [UiohookKey.D]: 'D', [UiohookKey.E]: 'E', [UiohookKey.F]: 'F',
  [UiohookKey.G]: 'G', [UiohookKey.H]: 'H', [UiohookKey.I]: 'I',
  [UiohookKey.J]: 'J', [UiohookKey.K]: 'K', [UiohookKey.L]: 'L',
  [UiohookKey.M]: 'M', [UiohookKey.N]: 'N', [UiohookKey.O]: 'O',
  [UiohookKey.P]: 'P', [UiohookKey.Q]: 'Q', [UiohookKey.R]: 'R',
  [UiohookKey.S]: 'S', [UiohookKey.T]: 'T', [UiohookKey.U]: 'U',
  [UiohookKey.V]: 'V', [UiohookKey.W]: 'W', [UiohookKey.X]: 'X',
  [UiohookKey.Y]: 'Y', [UiohookKey.Z]: 'Z',

  [UiohookKey['0']]: '0', [UiohookKey['1']]: '1', [UiohookKey['2']]: '2',
  [UiohookKey['3']]: '3', [UiohookKey['4']]: '4', [UiohookKey['5']]: '5',
  [UiohookKey['6']]: '6', [UiohookKey['7']]: '7', [UiohookKey['8']]: '8',
  [UiohookKey['9']]: '9',

  [UiohookKey.F1]: 'F1', [UiohookKey.F2]: 'F2', [UiohookKey.F3]: 'F3',
  [UiohookKey.F4]: 'F4', [UiohookKey.F5]: 'F5', [UiohookKey.F6]: 'F6',
  [UiohookKey.F7]: 'F7', [UiohookKey.F8]: 'F8', [UiohookKey.F9]: 'F9',
  [UiohookKey.F10]: 'F10', [UiohookKey.F11]: 'F11', [UiohookKey.F12]: 'F12',

  [UiohookKey.Enter]: 'Enter', [UiohookKey.Backspace]: 'Backspace',
  [UiohookKey.Tab]: 'Tab', [UiohookKey.Space]: 'Space',
  [UiohookKey.Escape]: 'Escape',

  [UiohookKey.Delete]: 'Delete', [UiohookKey.End]: 'End',
  [UiohookKey.PageDown]: 'PageDown', [UiohookKey.Home]: 'Home',
  [UiohookKey.PageUp]: 'PageUp', [UiohookKey.Insert]: 'Insert',

  [UiohookKey.ArrowUp]: 'Up', [UiohookKey.ArrowDown]: 'Down',
  [UiohookKey.ArrowLeft]: 'Left', [UiohookKey.ArrowRight]: 'Right',

  [UiohookKey.Minus]: '-', [UiohookKey.Equal]: '=',
  [UiohookKey.BracketLeft]: '[', [UiohookKey.BracketRight]: ']',
  [UiohookKey.Backslash]: '\\', [UiohookKey.Semicolon]: ';',
  [UiohookKey.Quote]: "'", [UiohookKey.Backquote]: '`',
  [UiohookKey.Comma]: ',', [UiohookKey.Period]: '.',
  [UiohookKey.Slash]: '/',
};

// 系统快捷键（通过 koffi 轮询处理，全屏游戏下仍可用）
const systemShortcutActions: Record<string, () => void> = {
  'Ctrl+Shift+Tab': () => {
    if (!mainWindow) return;
    if (mainWindow.isAlwaysOnTop()) {
      mainWindow.setAlwaysOnTop(false);
      mainWindow.minimize();
    } else {
      // Release modifier keys so game doesn't keep them stuck
      if (keybd_event_fn) {
        keybd_event_fn(0x11, 0, 0x0002, 0); // Ctrl up
        keybd_event_fn(0x10, 0, 0x0002, 0); // Shift up
        keybd_event_fn(0x12, 0, 0x0002, 0); // Alt up
      }
      mainWindow.show();
      mainWindow.focus();
      mainWindow.moveTop();
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }
    // Release Tab so game doesn't register it (scoreboard trigger)
    if (keybd_event_fn) keybd_event_fn(0x09, 0, 0x0002, 0);
  },
  'Alt+Space': () => {
    if (spotlightWindow && !spotlightWindow.isDestroyed()) {
      spotlightWindow.close();
      spotlightWindow = null;
    } else {
      ensureSpotlightWindow();
      spotlightWindow?.show();
      spotlightWindow?.focus();
    }
  },
};

// ─── 键盘钩子已替换为 koffi GetAsyncKeyState 轮询 ───
const capturedSounds: Record<string, { url: string; name: string; timestamp: number }> = {};

// ─── Win32 polling fallback (works in exclusive fullscreen games) ───
let pollingTimer: ReturnType<typeof setTimeout> | null = null;
const prevShortcutState: Record<string, boolean> = {};
// Lazy-init koffi so it doesn't prevent startup if module is unavailable
let getAsyncKeyState: ((vkCode: number) => number) | null = null;
let keybd_event_fn: ((vk: number, scan: number, flags: number, extra: number) => void) | null = null;
let teamKeyVK = 0x56; // default V
let valorantHwnd = 0; // cached VALORANT window handle
let findValorantWindow: (() => number) | null = null;
let sendInputScanCode: ((scanCode: number, keyUp: boolean) => boolean) | null = null;
let getForegroundWindowFn: (() => number) | null = null;
let setForegroundWindowFn: ((hwnd: number) => boolean) | null = null;
let attachThreadInputFn: ((current: number, target: number, attach: boolean) => boolean) | null = null;
let getWindowThreadProcessIdFn: ((hwnd: number, pidBuf: Buffer) => number) | null = null;
let getCurrentThreadIdFn: (() => number) | null = null;
const VALORANT_WINDOW_TITLES = ['VALORANT', '无畏契约'];
// File-based debug log for packaged app diagnostics
const debugLog = (msg: string) => {
  try {
    const logPath = path.join(app.getPath('userData'), 'gsfx-debug.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (_e) {}
};
try {
  const koffi = require('koffi');
  const user32 = koffi.load('user32.dll');
  getAsyncKeyState = user32.func('GetAsyncKeyState', 'short', ['int']);
  keybd_event_fn = user32.func('keybd_event', 'void', ['int', 'int', 'int', 'int']);
  getForegroundWindowFn = user32.func('GetForegroundWindow', 'int32', []);
  setForegroundWindowFn = user32.func('SetForegroundWindow', 'bool', ['int32']);
  attachThreadInputFn = user32.func('AttachThreadInput', 'bool', ['uint32', 'uint32', 'bool']);
  getWindowThreadProcessIdFn = user32.func('GetWindowThreadProcessId', 'uint32', ['int32', koffi.pointer('uint32')]);
  const kernel32 = koffi.load('kernel32.dll');
  getCurrentThreadIdFn = kernel32.func('GetCurrentThreadId', 'uint32', []);
  const findWindowA = user32.func('FindWindowA', 'int32', ['string', 'string']);
  const getWindowTextW = user32.func('GetWindowTextW', 'int32', ['int32', koffi.pointer('uint16'), 'int32']);
  const getClassNameA = user32.func('GetClassNameA', 'int32', ['int32', 'string', 'int32']);
  const EnumWindowsCB = koffi.proto('EnumWindowsCB', 'bool', ['int32', 'int32']);
  const enumWindows = user32.func('EnumWindows', 'bool', [koffi.pointer(EnumWindowsCB), 'int32']);
  findValorantWindow = (): number => {
    // Quick exact title match first (ANSI)
    for (const title of VALORANT_WINDOW_TITLES) {
      try {
        const hwnd = findWindowA(null, title);
        if (hwnd) { debugLog('[find] found by title "' + title + '" hwnd=' + hwnd); return hwnd; }
      } catch {}
    }
    // Enumerate all windows to find VALORANT by title
    let foundHwnd = 0;
    try {
      enumWindows((hwnd: number) => {
        try {
          const titleArr = new Uint16Array(512);
          const clsBuf = Buffer.alloc(128);
          const len = getWindowTextW(hwnd, titleArr, 511);
          getClassNameA(hwnd, clsBuf, 127);
          const title = len > 0 ? Buffer.from(titleArr.buffer, 0, len * 2).toString('utf-16le') : '';
          const cls = clsBuf.toString('utf-8', 0, clsBuf.indexOf(0) >= 0 ? clsBuf.indexOf(0) : 127);
          if (title.includes('VALORANT') || title.includes('无畏契约') || title.includes('ShooterGame') || title.includes('UnrealWindow')) {
            debugLog('[find] candidate: hwnd=' + hwnd + ' cls="' + cls + '" title="' + title + '"');
            // Prefer actual game window (VALORANTUnrealWindow cls) — lock once found
            if (cls.includes('VALORANTUnrealWindow')) { foundHwnd = hwnd; }
            else if (foundHwnd === 0 && (title.includes('VALORANT') || title.includes('无畏契约'))) foundHwnd = hwnd;
          }
        } catch {}
        return true;
      }, 0);
    } catch (e) { debugLog('[find] enumWindows error: ' + String(e)); }
    if (foundHwnd) debugLog('[find] selected hwnd=' + foundHwnd);
    else debugLog('[find] no VALORANT window found');
    return foundHwnd;
  };
  // keybd_event with scan codes (Raw Input compatible via KEYEVENTF_SCANCODE)
  sendInputScanCode = (scanCode: number, keyUp: boolean): boolean => {
    try {
      keybd_event_fn!(0, scanCode, 0x0008 | (keyUp ? 0x0002 : 0), 0);
      debugLog('[team] keybd_event scanCode=' + scanCode + ' keyUp=' + keyUp);
      return true;
    } catch (e) { debugLog('[team] keybd_event scanCode error: ' + String(e)); return false; }
  };
  // Refresh cached VALORANT handle every 30s
  valorantHwnd = findValorantWindow!();
  setInterval(() => { valorantHwnd = findValorantWindow!(); }, 30000);
  debugLog('koffi loaded: GetAsyncKeyState + keybd_event + SendInput + PostMessage');
} catch (e: any) {
  debugLog('koffi load FAILED: ' + (e?.message || String(e)));
}

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// AttachThreadInput 绕过 Windows 前台锁，强制切换到目标窗口
function forceForeground(hwnd: number): boolean {
  if (!attachThreadInputFn || !getWindowThreadProcessIdFn || !getCurrentThreadIdFn || !setForegroundWindowFn) return false;
  try {
    const currentThread = getCurrentThreadIdFn();
    const pidBuf = Buffer.alloc(4);
    const targetThread = getWindowThreadProcessIdFn(hwnd, pidBuf);
    if (targetThread === 0 || targetThread === currentThread) return false;
    attachThreadInputFn(currentThread, targetThread, true);
    try {
      return setForegroundWindowFn(hwnd);
    } finally {
      attachThreadInputFn(currentThread, targetThread, false);
    }
  } catch (e) {
    debugLog('[team] forceForeground error: ' + String(e));
    return false;
  }
}

const VK_MAP: Record<string, number> = {
  '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
  '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
  'A': 0x41, 'B': 0x42, 'C': 0x43, 'D': 0x44, 'E': 0x45,
  'F': 0x46, 'G': 0x47, 'H': 0x48, 'I': 0x49, 'J': 0x4A,
  'K': 0x4B, 'L': 0x4C, 'M': 0x4D, 'N': 0x4E, 'O': 0x4F,
  'P': 0x50, 'Q': 0x51, 'R': 0x52, 'S': 0x53, 'T': 0x54,
  'U': 0x55, 'V': 0x56, 'W': 0x57, 'X': 0x58, 'Y': 0x59, 'Z': 0x5A,
  'F1': 0x70, 'F2': 0x71, 'F3': 0x72, 'F4': 0x73, 'F5': 0x74,
  'F6': 0x75, 'F7': 0x76, 'F8': 0x77, 'F9': 0x78, 'F10': 0x79,
  'F11': 0x7A, 'F12': 0x7B,
  'Backspace': 0x08, 'Tab': 0x09, 'Enter': 0x0D, 'Space': 0x20,
  'Escape': 0x1B, 'Delete': 0x2E, 'End': 0x23, 'Home': 0x24,
  'PageUp': 0x21, 'PageDown': 0x22, 'Insert': 0x2D,
  'ArrowUp': 0x26, 'ArrowDown': 0x28, 'ArrowLeft': 0x25, 'ArrowRight': 0x27,
  '\\': 0xDC, ';': 0xBA, "'": 0xDE, ',': 0xBC, '.': 0xBE, '/': 0xBF,
  '-': 0xBD, '=': 0xBB, '[': 0xDB, ']': 0xDD, '`': 0xC0,
};
const VK_MODIFIER: Record<string, number> = {
  Ctrl: 0x11, Alt: 0x12, Shift: 0x10, Meta: 0x5B,
};

function computeSoundBrowserBounds(
  mainBounds: Electron.Rectangle,
  browserWidth: number,
  browserHeight: number,
): { x: number; y: number; width: number; height: number } {
  const display = screen.getDisplayMatching(mainBounds);
  const work = display.workArea;
  const gap = 4;
  const margin = 8;

  const rightX = mainBounds.x + mainBounds.width + gap;
  const leftX = mainBounds.x - browserWidth - gap;
  const rightFits = rightX + browserWidth <= work.x + work.width - margin;
  const leftFits = leftX >= work.x + margin;

  let x: number;
  if (rightFits) {
    x = rightX;
  } else if (leftFits) {
    x = leftX;
  } else {
    const rightVisible = Math.min(work.x + work.width, rightX + browserWidth) - Math.max(work.x, rightX);
    const leftVisible = Math.min(work.x + work.width, leftX + browserWidth) - Math.max(work.x, leftX);
    if (rightVisible >= leftVisible) {
      x = Math.min(rightX, work.x + work.width - browserWidth - margin);
    } else {
      x = Math.max(leftX, work.x + margin);
    }
  }

  const maxY = work.y + work.height - browserHeight - margin;
  const y = Math.round(Math.max(work.y + margin, Math.min(mainBounds.y, maxY)));

  return {
    x: Math.round(x),
    y,
    width: browserWidth,
    height: browserHeight,
  };
}

function detachSoundBrowserFromMain() {
  if (syncSoundBrowserPosition && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeListener('move', syncSoundBrowserPosition);
    mainWindow.removeListener('resize', syncSoundBrowserPosition);
    mainWindow.removeListener('moved', syncSoundBrowserPosition);
  }
  syncSoundBrowserPosition = null;
  soundBrowserFixedSize = null;
}

function attachSoundBrowserToMain(browser: BrowserWindow, width: number, height: number) {
  detachSoundBrowserFromMain();
  soundBrowserFixedSize = { width, height };
  const updateBrowserSizeCache = () => {
    if (!soundBrowserWindow || soundBrowserWindow.isDestroyed()) return;
    const [w, h] = soundBrowserWindow.getSize();
    soundBrowserFixedSize = { width: w, height: h };
  };
  syncSoundBrowserPosition = () => {
    if (!soundBrowserWindow || soundBrowserWindow.isDestroyed() || !mainWindow || mainWindow.isDestroyed()) return;
    if (!soundBrowserFixedSize) return;
    const mainBounds = mainWindow.getBounds();
    const bounds = computeSoundBrowserBounds(
      mainBounds,
      soundBrowserFixedSize.width,
      soundBrowserFixedSize.height,
    );
    soundBrowserWindow.setBounds(bounds);
  };
  browser.on('resize', updateBrowserSizeCache);
  browser.on('resized', updateBrowserSizeCache);
  syncSoundBrowserPosition();
  mainWindow?.on('move', syncSoundBrowserPosition);
  mainWindow?.on('moved', syncSoundBrowserPosition);
  mainWindow?.on('resize', syncSoundBrowserPosition);
}

function getPollerExePath(): string {
  const resourcePath = path.join(process.resourcesPath, 'gsfx_poller.exe');
  if (fs.existsSync(resourcePath)) return resourcePath;
  const devPath = path.join(__dirname, '..', 'scripts', 'gsfx_poller.exe');
  if (fs.existsSync(devPath)) return devPath;
  return resourcePath;
}

function getPollHelperPath(): string {
  const resourcePath = path.join(process.resourcesPath, 'poll_helper.ps1');
  if (fs.existsSync(resourcePath)) return resourcePath;
  const devPath = path.join(__dirname, '..', 'scripts', 'poll_helper.ps1');
  if (fs.existsSync(devPath)) return devPath;
  return resourcePath;
}

// Reverse VK_MAP: VK code -> key name
const VK_TO_NAME: Record<number, string> = {};
for (const [name, vk] of Object.entries(VK_MAP)) VK_TO_NAME[vk] = name;
// Reverse KEY_NAME_MAP: key name -> scan code (Set 1)
const KEY_NAME_TO_SCANCODE: Record<string, number> = {};
for (const [code, name] of Object.entries(KEY_NAME_MAP)) KEY_NAME_TO_SCANCODE[name] = Number(code);

const MOD_CTRL = 1;
const MOD_SHIFT = 2;
const MOD_ALT = 4;
const MOD_META = 8;

function readModifierMask(): number {
  if (!getAsyncKeyState) return 0;
  let mask = 0;
  if ((getAsyncKeyState(0x11) & 0x8000) !== 0) mask |= MOD_CTRL;
  if ((getAsyncKeyState(0x10) & 0x8000) !== 0) mask |= MOD_SHIFT;
  if ((getAsyncKeyState(0x12) & 0x8000) !== 0) mask |= MOD_ALT;
  if ((getAsyncKeyState(0x5B) & 0x8000) !== 0) mask |= MOD_META;
  return mask;
}

function shortcutModifierMask(parts: string[]): number {
  let mask = 0;
  if (parts.includes('Ctrl')) mask |= MOD_CTRL;
  if (parts.includes('Shift')) mask |= MOD_SHIFT;
  if (parts.includes('Alt')) mask |= MOD_ALT;
  if (parts.includes('Meta')) mask |= MOD_META;
  return mask;
}

function compileShortcut(shortcut: string): CompiledShortcut | null {
  const parts = shortcut.split('+');
  const keyName = parts[parts.length - 1];
  const vk = VK_MAP[keyName];
  if (!vk) return null;
  return {
    vk,
    mask: shortcutModifierMask(parts),
  };
}

function modifiersMatch(parts: string[], activeMask: number): boolean {
  return shortcutModifierMask(parts) === activeMask;
}

function parsePollerKeyEntry(entry: string): { vk: number; mask: number } | null {
  if (!entry.startsWith('KEY:')) return null;
  const body = entry.substring(4);
  const colon = body.indexOf(':');
  if (colon >= 0) {
    const vk = parseInt(body.substring(0, colon), 10);
    const mask = parseInt(body.substring(colon + 1), 10);
    if (isNaN(vk)) return null;
    return { vk, mask: isNaN(mask) ? 0 : mask };
  }
  const vk = parseInt(body, 10);
  if (isNaN(vk)) return null;
  return { vk, mask: 0 };
}

function handlePollerKeyEvent(vk: number, mask: number) {
  const keyName = VK_TO_NAME[vk];
  if (!keyName) return;

  let bestSound: { shortcut: string; sid: string } | null = null;
  for (const [shortcut, sid] of soundShortcutMap.entries()) {
    const parts = shortcut.split('+');
    if (parts[parts.length - 1] !== keyName) continue;
    if (!modifiersMatch(parts, mask)) continue;
    if (!bestSound || parts.length > bestSound.shortcut.split('+').length) {
      bestSound = { shortcut, sid };
    }
  }
  if (bestSound) {
    debugLog('[poller] trigger: ' + bestSound.shortcut + ' -> ' + bestSound.sid);
    mainWindow?.webContents.send('shortcut-triggered', bestSound.sid);
    return;
  }

  if (stopShortcutKey) {
    const stopParts = stopShortcutKey.split('+');
    if (stopParts[stopParts.length - 1] === keyName && modifiersMatch(stopParts, mask)) {
      debugLog('[poller] stop trigger: ' + stopShortcutKey);
      mainWindow?.webContents.send('stop-shortcut-triggered');
    }
  }
}

function startKeyPolling() {
  // koffi-based GetAsyncKeyState polling (keyboard only, no mouse interference)
  if (!getAsyncKeyState) {
    // Fallback: C# helper EXE
    const pollerExePath = getPollerExePath();
    if (fs.existsSync(pollerExePath)) {
      debugLog('Starting C# polling helper from: ' + pollerExePath);
      startExePolling(pollerExePath);
      return;
    }
    debugLog('C# helper not found at: ' + pollerExePath);

    // Last resort: PowerShell-based polling
    const psPath = getPollHelperPath();
    if (!fs.existsSync(psPath)) {
      debugLog('PowerShell helper not found at: ' + psPath);
      return;
    }
    debugLog('Starting PowerShell polling helper from: ' + psPath);
    startExePolling(psPath);
    return;
  }

  const POLL_INTERVAL_FAST_MS = 50;
  const POLL_INTERVAL_IDLE_MS = 140;

  const pollTick = () => {
    let nextIntervalMs = POLL_INTERVAL_IDLE_MS;
    try {
      if (isRecordingShortcut) { pollingTimer = setTimeout(pollTick, POLL_INTERVAL_IDLE_MS); return; }

      const hasShortcuts = soundShortcutMap.size > 0 || (stopShortcutKey && stopShortcutKey !== '');
      if (!hasShortcuts && !pendingPicker) { pollingTimer = setTimeout(pollTick, POLL_INTERVAL_IDLE_MS); return; }

      // --- Track prefix key state (for Valorant picker) ---
      const prefixVK = VK_MAP[pickerPrefixKeyName];
      if (prefixVK) {
        pickerPrefixHeld = (getAsyncKeyState!(prefixVK) & 0x8000) !== 0;
      }

      const activeMask = readModifierMask();
      if (pendingPicker || pickerPrefixHeld || activeMask !== 0) nextIntervalMs = POLL_INTERVAL_FAST_MS;

      // --- Valorant picker: number keys while prefix held ---
      if (pendingPicker && pickerPrefixHeld) {
        for (let i = 0; i < 9; i++) {
          const numKey = String(i + 1);
          const numVK = VK_MAP[numKey];
          if (!numVK) continue;
          const pressed = (getAsyncKeyState!(numVK) & 0x8000) !== 0;
          const wasPressed = prevShortcutState['__picker_' + numKey] || false;
          if (pressed && !wasPressed && i < pendingPicker.choices.length) {
            clearTimeout(pendingPicker.timer);
            pendingPicker.timer = setTimeout(() => {
              if (overlayWindow) overlayWindow.webContents.send('valorant-picker-hide');
              pendingPicker = null;
            }, 3000);
            mainWindow?.webContents.send('shortcut-triggered', pendingPicker.choices[i].id);
          }
          prevShortcutState['__picker_' + numKey] = pressed;
        }
      }



      // --- Check sound shortcuts and stop shortcut ---
      for (const [shortcutStr, compiled] of compiledSoundShortcuts.entries()) {
        if (compiled.mask !== activeMask) {
          prevShortcutState[shortcutStr] = false;
          continue;
        }

        const chordPressed = (getAsyncKeyState!(compiled.vk) & 0x8000) !== 0;
        const wasPressed = prevShortcutState[shortcutStr] || false;

        if (chordPressed && !wasPressed) {
          const sid = soundShortcutMap.get(shortcutStr);
          if (sid) mainWindow?.webContents.send('shortcut-triggered', sid);
        }
        prevShortcutState[shortcutStr] = chordPressed;
      }

      if (compiledStopShortcut) {
        const stopChordPressed = compiledStopShortcut.mask === activeMask
          ? (getAsyncKeyState!(compiledStopShortcut.vk) & 0x8000) !== 0
          : false;
        const wasPressed = prevShortcutState[stopShortcutKey] || false;
        if (stopChordPressed && !wasPressed) {
          mainWindow?.webContents.send('stop-shortcut-triggered');
        }
        prevShortcutState[stopShortcutKey] = stopChordPressed;
      }

      

      // --- Check system shortcuts (e.g. Ctrl+Shift+Tab) ---
      for (const combo of Object.keys(systemShortcutActions)) {
        const parts = combo.split('+');
        const keyName = parts[parts.length - 1];
        const vkKey = VK_MAP[keyName];
        if (!vkKey) continue;

        if (!modifiersMatch(parts, activeMask)) {
          prevShortcutState[combo] = false;
          continue;
        }

        const chordPressed = (getAsyncKeyState!(vkKey) & 0x8000) !== 0;
        const wasPressed = prevShortcutState[combo] || false;

        if (chordPressed && !wasPressed) {
          systemShortcutActions[combo]();
        }
        prevShortcutState[combo] = chordPressed;
      }

      

      // --- F12 debug ---
      {
        const f12Pressed = (getAsyncKeyState!(0x7B) & 0x8000) !== 0;
        const f12WasPressed = prevShortcutState['__F12__'] || false;
        if (f12Pressed && !f12WasPressed && mainWindow) {
          mainWindow.setTitle('[POLL ALIVE] F12 at ' + Date.now());
          setTimeout(() => mainWindow?.setTitle('GameSound FX - 游戏音效助手'), 3000);
        }
        prevShortcutState['__F12__'] = f12Pressed;
      }

    } catch (_e) { /* poll error */ }
    pollingTimer = setTimeout(pollTick, nextIntervalMs);
  };

  console.log('[poll] koffi-based polling started');
  pollingTimer = setTimeout(pollTick, POLL_INTERVAL_FAST_MS);
}
function startExePolling(exePath: string) {
  let pollProcess: any = null;
  let pollBuffer = '';
  let isPsScript = exePath.toLowerCase().endsWith('.ps1');

  const spawnPoller = () => {
    const keysToCheck: string[] = [];
    for (const k of soundShortcutMap.keys()) keysToCheck.push(k);
    if (stopShortcutKey && stopShortcutKey !== '') keysToCheck.push(stopShortcutKey);

    if (keysToCheck.length === 0) {
      pollingTimer = setTimeout(spawnPoller, 500) as any;
      return;
    }

    const vkCodes = keysToCheck.map(s => {
      const parts = s.split('+');
      return VK_MAP[parts[parts.length - 1]] || 0;
    }).filter(v => v > 0).join(',');

    if (!vkCodes) {
      pollingTimer = setTimeout(spawnPoller, 500) as any;
      return;
    }

    try {
      const spawn = require('child_process').spawn;
      let procArgs: string[];
      if (isPsScript) {
        procArgs = [
          '-NoProfile', '-NonInteractive',
          '-ExecutionPolicy', 'Bypass',
          '-File', exePath,
          '-VkCodes', vkCodes,
          '-IntervalMs', '50'
        ];
        pollProcess = spawn('powershell', procArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
      } else {
        procArgs = [vkCodes, '50'];
        pollProcess = spawn(exePath, procArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
      }

      pollProcess.stdout.on('data', (data: Buffer) => {
        pollBuffer += data.toString('utf-8');
        const lines = pollBuffer.split('\n');
        pollBuffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const entries = trimmed.split('|');
          for (const entry of entries) {
            if (!entry.startsWith('KEY:')) continue;
            if (isRecordingShortcut) continue;
            const parsed = parsePollerKeyEntry(entry);
            if (!parsed) continue;
            handlePollerKeyEvent(parsed.vk, parsed.mask);
          }
        }
      });

      pollProcess.stderr.on('data', (data: Buffer) => {
        debugLog('[poller] stderr: ' + data.toString('utf-8').trim());
      });

      pollProcess.on('exit', (code: number) => {
        debugLog('[poller] exited code ' + code);
        pollProcess = null;
        pollingTimer = setTimeout(spawnPoller, 1000) as any;
      });

      pollProcess.on('error', (err: Error) => {
        debugLog('[poller] spawn error: ' + err.message);
        pollProcess = null;
        pollingTimer = setTimeout(spawnPoller, 2000) as any;
      });
    } catch (e: any) {
      debugLog('[poller] start failed: ' + e.message);
      pollingTimer = setTimeout(spawnPoller, 3000) as any;
    }
  };

  spawnPoller();
}

function stopKeyPolling() {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }
}

const createOverlayWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  overlayWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: 320,
    height: primaryDisplay.size.height,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    show: true,
    hasShadow: false,
    type: 'toolbar',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  if (process.env.VITE_DEV_SERVER_URL) {
    overlayWindow.loadURL(process.env.VITE_DEV_SERVER_URL + 'overlay.html');
  } else {
    overlayWindow.loadURL('app://local/overlay.html');
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
};

// ensureOverlayWindow creates the overlay on first use (lazy init).
// Use it for show/update IPC calls that need the overlay to exist.
// For hide IPC calls, use `if (overlayWindow)` — it's a no-op when the
// overlay doesn't exist, and ensureOverlayWindow would re-create it
// just to send a hide message, wasting resources.
const ensureOverlayWindow = (): BrowserWindow | null => {
  if (!overlayWindow) createOverlayWindow();
  return overlayWindow;
};

// ─── Spotlight search window ───
const createSpotlightWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.size;
  const winW = 560;
  spotlightWindow = new BrowserWindow({
    x: Math.round((screenW - winW) / 2),
    y: Math.round(screenH * 0.12),
    width: winW,
    height: 440,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: true,
    show: false,
    alwaysOnTop: true,
    type: 'toolbar',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  const url = process.env.VITE_DEV_SERVER_URL
    ? process.env.VITE_DEV_SERVER_URL + '?spotlight=1'
    : 'app://local/?spotlight=1';
  spotlightWindow.loadURL(url);
  spotlightWindow.on('blur', () => {
    if (spotlightWindow && !spotlightWindow.isDestroyed()) {
      spotlightWindow.close();
      spotlightWindow = null;
    }
  });
  spotlightWindow.on('closed', () => { spotlightWindow = null; });
};

const ensureSpotlightWindow = (): BrowserWindow | null => {
  if (!spotlightWindow || spotlightWindow.isDestroyed()) createSpotlightWindow();
  return spotlightWindow;
};

const buildTrayMenu = (): Menu => {
  return Menu.buildFromTemplate([
    {
      label: 'GameSound FX',
      click: () => {
        if (mainWindow?.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow?.show();
          mainWindow?.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: '重新加载',
      click: () => mainWindow?.webContents.reload(),
    },
    { type: 'separator' },
    {
      label: `版本 ${app.getVersion()}`,
      enabled: false,
    },
    { label: '退出', click: () => app.quit() },
  ]);
};

const getImportedSoundsDir = (): string => {
  const userDataPath = app.getPath('userData');
  const dir = path.join(userDataPath, 'imported-sounds');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const getSoundsDirectory = (): string => {
  const userDataPath = app.getPath('userData');
  const soundsDir = path.join(userDataPath, 'captured-sounds');
  if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
  }
  return soundsDir;
};

const createWindow = (): void => {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 520,
    height: 540,
    x: screenWidth - 540,
    y: screenHeight - 560,
    frame: false,
    transparent: true,
    resizable: true,
    skipTaskbar: false,
    focusable: true,
    hasShadow: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    title: 'GameSound FX - 游戏音效助手',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Debug: log all renderer console output to main process
  mainWindow.webContents.on('console-message', (_e, level, msg, line, sourceId) => {
    const tag = ['LOG', 'WARN', 'ERR', 'INFO', 'DEBUG'][level] || 'LOG';
    console.log(`[renderer:${tag}] ${msg} (${sourceId}:${line})`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[GameSound FX] Renderer process gone: ${details.reason} (exit=${details.exitCode})`);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[GameSound FX] Renderer did-finish-load');
    // Recovery: restore imported sounds from disk if localStorage was reset
    try {
      const importedDir = getImportedSoundsDir();
      const audioFiles = fs.readdirSync(importedDir).filter((f: string) => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg'));
      if (audioFiles.length > 0) {
        const recoveryScript = `
          (function() {
            try {
              var existing = localStorage.getItem('importedSounds');
              if (existing && JSON.parse(existing).length > 0) return false;
              var files = ${JSON.stringify(audioFiles)};
              var sounds = files.map(function(f, i) {
                var name = f.replace(/\\.[^/.]+$/, '');
                var id = 'imported_' + Date.now() + '_' + i;
                return { id: id, name: name, filename: f };
              });
              var soundArray = sounds.map(function(s) {
                return { id: s.id, name: s.name, filename: s.filename, category: 'local', isImported: true };
              });
              localStorage.setItem('importedSounds', JSON.stringify(soundArray));
              sounds.forEach(function(s) {
                localStorage.setItem('sound_' + s.id, 'imported://' + encodeURIComponent(s.filename));
              });
              var defaultMap = {};
              soundArray.forEach(function(s) { defaultMap[s.id] = '__builtin__'; });
              localStorage.setItem('soundGroupMap', JSON.stringify(defaultMap));
              console.log('[recovery] restored', soundArray.length, 'imported sounds');
              return true;
            } catch(e) { console.error('[recovery] error:', e); return false; }
          })();
        `;
        mainWindow?.webContents.executeJavaScript(recoveryScript).then((restored) => {
          if (restored) setTimeout(() => mainWindow?.reload(), 100);
        });
      }
    } catch(e) { console.log('[recovery] scan error:', e); }
  });
  mainWindow.webContents.on('did-fail-load', (_e, errCode, errDesc) => {
    console.error('[GameSound FX] Renderer did-fail-load:', errCode, errDesc);
  });
  mainWindow.webContents.on('unresponsive', () => {
    console.warn('[GameSound FX] Renderer unresponsive');
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadURL('app://local/index.html');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  // Blur: when app loses focus (user clicked game), deactivate overlay mode
  mainWindow.on('blur', () => {
    if (mainWindow?.isAlwaysOnTop()) {
      mainWindow.setAlwaysOnTop(false);
      mainWindow.minimize();
    }
    // Release Tab key so game doesn't register it
    if (keybd_event_fn) keybd_event_fn(0x09, 0, 0x0002, 0);
  });

  console.log('[GameSound FX] 窗口已创建，全屏悬浮功能已启用');
};

const createTray = (): void => {
  try {
    const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
    let icon: Electron.NativeImage;
    if (fs.existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath);
    } else {
      // Fallback: 32x32 pixel art RGB
      const size = 32;
      const buf = Buffer.alloc(size * size * 4, 0);
      const set = (x: number, y: number, r: number, g: number, b: number, a = 255) => {
        const i = (y * size + x) * 4;
        buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
      };
      const block = (bx: number, by: number, r: number, g: number, b: number) => {
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++)
            set(bx * 2 + dx, by * 2 + dy, r, g, b);
      };
      for (let row = 4; row <= 11; row++) block(3, row, 0xc0, 0x4d, 0xff);
      block(4, 5, 0xa0, 0x30, 0xe0); block(4, 10, 0xa0, 0x30, 0xe0);
      block(5, 4, 0x80, 0x20, 0xc0); block(5, 11, 0x80, 0x20, 0xc0);
      block(6, 3, 0x60, 0x15, 0xa0); block(6, 12, 0x60, 0x15, 0xa0);
      for (let row = 5; row <= 6; row++) set(7, row * 2 + 0, 0xe0, 0x80, 0xff);
      for (let row = 6; row <= 9; row++) block(8, row, 0x0c, 0xcf, 0xff);
      block(9, 5, 0x0c, 0xcf, 0xff); block(9, 10, 0x0c, 0xcf, 0xff);
      icon = nativeImage.createFromBuffer(buf, { width: size, height: size });
    }
    tray = new Tray(icon);
    tray.setContextMenu(buildTrayMenu());
    tray.setToolTip('GameSound FX - 游戏音效助手');
    tray.on('click', () => {
      if (mainWindow?.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow?.show();
        mainWindow?.focus();
      }
    });
  } catch (err) {
    console.log('[GameSound FX] 托盘创建失败:', err);
  }
};

protocol.registerSchemesAsPrivileged([
  { scheme: 'sound', privileges: { bypassCSP: true, supportFetchAPI: true, stream: true } },
  { scheme: 'imported', privileges: { bypassCSP: true, supportFetchAPI: true, stream: true } },
  { scheme: 'app', privileges: { bypassCSP: true, supportFetchAPI: true, standard: true, secure: true } },
]);

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); } else {
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});
app.whenReady().then(() => {
  const soundMimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
  };

  const serveSoundFile = async (filePath: string): Promise<Response> => {
    const data = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new Response(data, {
      headers: {
        'Content-Type': soundMimeTypes[ext] || 'audio/mpeg',
        'Content-Length': String(data.length),
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes',
      },
    });
  };

  const getBuiltinSoundsDir = (): string => {
    const prodPath = path.join(process.resourcesPath, 'sounds');
    if (fs.existsSync(prodPath)) return prodPath;
    const devPath = path.join(__dirname, '..', 'public', 'sounds');
    if (fs.existsSync(devPath)) return devPath;
    return prodPath;
  };

  protocol.handle('sound', async (request) => {
    const url = new URL(request.url);
    const fileName = decodeURIComponent(url.pathname.replace(/^\//, '') || url.host);
    const filePath = path.join(getBuiltinSoundsDir(), fileName);
    try {
      return await serveSoundFile(filePath);
    } catch (e) {
      console.error(`[GameSound FX] 内置音效未找到: ${filePath}`, e);
      return new Response('Not found', { status: 404 });
    }
  });

  protocol.handle('imported', async (request) => {
    const url = new URL(request.url);
    const rawName = url.pathname.replace(/^\//, '') || url.host;
    const fileName = decodeURIComponent(rawName);
    const filePath = path.join(getImportedSoundsDir(), fileName);
    try {
      return await serveSoundFile(filePath);
    } catch (e) {
      console.error(`[GameSound FX] 导入音效未找到: ${filePath}`, e);
      return new Response('Not found', { status: 404 });
    }
  });

  const distPath = path.join(__dirname);
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let filePath = path.join(distPath, url.pathname === '/' ? 'index.html' : url.pathname);
    // Ensure file is within dist directory (security)
    if (!filePath.startsWith(distPath)) {
      return new Response('Forbidden', { status: 403 });
    }
    try {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.ico': 'image/x-icon',
        '.json': 'application/json',
        '.woff2': 'font/woff2',
      };
      return new Response(data, {
        headers: {
          'Content-Type': mimeTypes[ext] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });

  createWindow();

  try {
    createTray();
  } catch (err) {
    console.log('[GameSound FX] 托盘创建失败:', err);
  }

  startKeyPolling();
  console.log('[GameSound FX] 键盘轮询后备已启动');

  valorantDetector = new ValorantLogDetector(
    (payload: ValorantEventPayload) => {
      mainWindow?.webContents.send('valorant-event-fired', payload);
      ensureOverlayWindow()?.webContents.send('valorant-event-fired', payload);
    },
    (status: ValorantStatus) => {
      mainWindow?.webContents.send('valorant-status-changed', status);
    }
  );
  // Detector starts only when user enables Valorant mode via IPC

  ipcMain.on('minimize-window', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('close-window', () => {
    app.quit();
  });

  ipcMain.on('close-spotlight', () => {
    if (spotlightWindow && !spotlightWindow.isDestroyed()) {
      spotlightWindow.close();
      spotlightWindow = null;
    }
  });

  ipcMain.on('resize-spotlight', (_e, height: number) => {
    if (spotlightWindow && !spotlightWindow.isDestroyed()) {
      spotlightWindow.setSize(560, height);
    }
  });

  ipcMain.on('play-sound-from-spotlight', (_e, soundId: string) => {
    mainWindow?.webContents.send('shortcut-triggered', soundId);
    if (spotlightWindow && !spotlightWindow.isDestroyed()) {
      spotlightWindow.close();
      spotlightWindow = null;
    }
  });

  ipcMain.on('close-browser-window', () => {
    if (soundBrowserWindow && !soundBrowserWindow.isDestroyed()) {
      soundBrowserWindow.close();
    }
  });

  ipcMain.on('get-sounds-path', (event) => {
    let soundsPath = path.join(process.resourcesPath, 'sounds');
    if (!fs.existsSync(soundsPath)) {
      soundsPath = path.join(__dirname, '../public/sounds');
    }
    if (!fs.existsSync(soundsPath)) {
      soundsPath = '/sounds';
    }
    event.returnValue = soundsPath;
    console.log(`[GameSound FX] 音效路径: ${soundsPath}`);
  });

  ipcMain.on('register-shortcut', (_event, shortcut: string, soundId: string) => {
    soundShortcutMap.set(shortcut, soundId);
    const compiled = compileShortcut(shortcut);
    if (compiled) compiledSoundShortcuts.set(shortcut, compiled);
    console.log(`[GameSound FX] 快捷键已注册 (uiohook): ${shortcut}`);
  });

  ipcMain.on('register-stop-shortcut', (_event, shortcut: string) => {
    stopShortcutKey = shortcut;
    compiledStopShortcut = compileShortcut(shortcut);
    console.log(`[GameSound FX] 暂停快捷键已注册 (uiohook): ${shortcut}`);
  });

  ipcMain.on('unregister-shortcut', (_event, shortcut: string) => {
    soundShortcutMap.delete(shortcut);
    compiledSoundShortcuts.delete(shortcut);
    if (stopShortcutKey === shortcut) {
      stopShortcutKey = '';
      compiledStopShortcut = null;
    }
    console.log(`[GameSound FX] 快捷键已注销: ${shortcut}`);
  });

  ipcMain.on('unregister-all-shortcuts', () => {
    soundShortcutMap.clear();
    compiledSoundShortcuts.clear();
    stopShortcutKey = '';
    compiledStopShortcut = null;
    console.log('[GameSound FX] 所有快捷键已注销');
  });

  ipcMain.on('open-sound-browser', () => {
    if (soundBrowserWindow) {
      soundBrowserWindow.show();
      syncSoundBrowserPosition?.();
      return;
    }

    const browserWidth = 420;
    const browserHeight = Math.min(600, mainWindow?.getBounds().height ?? 600);

    soundBrowserWindow = new BrowserWindow({
      width: browserWidth,
      height: browserHeight,
      minWidth: 320,
      minHeight: 300,
      title: '音效浏览器 - 爱给网',
      frame: false,
      resizable: true,
      useContentSize: true,
      webPreferences: {
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        sandbox: true,
      },
    });

    attachSoundBrowserToMain(soundBrowserWindow, browserWidth, browserHeight);

    soundBrowserWindow.loadURL('https://www.aigei.com/s?type=sound');

    // Inject title bar via Shadow DOM (isolated from page CSS)
    soundBrowserWindow.webContents.on('did-finish-load', () => {
      if (!soundBrowserWindow) return;
      soundBrowserWindow.webContents.executeJavaScript(`
        (function(){
          if(document.getElementById('gsfx-shell'))return; // only once
          var s=document.createElement('div');s.id='gsfx-shell';
          s.innerHTML='<div id="gsfx-bar" style="display:flex;align-items:center;justify-content:space-between;height:36px;background:#0f0920;border-bottom:2px solid #ff2ea0;-webkit-app-region:drag;user-select:none;position:fixed;top:0;left:0;right:0;z-index:999999;box-sizing:border-box;font-family:sans-serif;">'
            +'<span style="color:#00eeff;font-size:12px;letter-spacing:2px;padding-left:10px;white-space:nowrap;">◆ 音效嗅探</span>'
            +'<span id="gsfx-close" style="cursor:pointer;color:#8a8ac0;font-size:16px;padding:2px 10px;-webkit-app-region:no-drag;line-height:1;">✕</span>'
            +'</div>';
          document.body.prepend(s);
          document.body.style.paddingTop='36px';
          document.getElementById('gsfx-close').onclick=function(){
            try{window.electron.ipcRenderer.send('close-browser-window');}catch(e){}
          };
        })();
      `).catch(function(e){console.error('[GSFX] Title bar failed:',e);});
    });

    const browserSession = soundBrowserWindow.webContents.session;
    if (soundBrowserWebRequestHandler) {
      browserSession.webRequest.onBeforeRequest(SOUND_BROWSER_REQUEST_FILTER, null);
    }
    soundBrowserWebRequestHandler = (details, callback) => {
      const url = details.url;
      if (url.match(/\.(mp3|wav|ogg|m4a|flac)/i)) {
        const timestamp = Date.now();
        const pathPart = url.split('?')[0];
        const name = decodeURIComponent(pathPart.split('/').pop() || 'sound_' + timestamp);
        if (!capturedSounds[url]) {
          capturedSounds[url] = { url, name, timestamp };
          mainWindow?.webContents.send('sound-captured', { url, name, timestamp });
          console.log('[GameSound FX] 捕获到音频: ' + name);
        }
      }
      callback({ cancel: false });
    };
    browserSession.webRequest.onBeforeRequest(SOUND_BROWSER_REQUEST_FILTER, soundBrowserWebRequestHandler);

    soundBrowserWindow.on('closed', () => {
      browserSession.webRequest.onBeforeRequest(SOUND_BROWSER_REQUEST_FILTER, null);
      soundBrowserWebRequestHandler = null;
      detachSoundBrowserFromMain();
      soundBrowserWindow = null;
      mainWindow?.webContents.send('sound-browser-closed');
    });
  });

  ipcMain.on('download-captured-sound', async (event, url: string, name: string, groupId: string) => {
    try {
      const ses = soundBrowserWindow?.webContents?.session ?? session.defaultSession;
      console.log(`[GameSound FX] 开始下载: ${name} url=${url.substring(0, 80)}...`);
      const response = await ses.fetch(url, {
        headers: {
          Referer: 'https://www.aigei.com/',
          Origin: 'https://www.aigei.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
      });
      console.log(`[GameSound FX] 下载响应: HTTP ${response.status}, size=${response.headers.get('content-length')}`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
      }
      const buffer = await response.arrayBuffer();

      const soundsDir = getImportedSoundsDir();
      const sanitizedName = name.replace(/[\\/:*?"<>|]/g, '_');
      const filePath = path.join(soundsDir, sanitizedName);

      fs.writeFileSync(filePath, Buffer.from(buffer));

      const soundUrl = `imported://${encodeURIComponent(sanitizedName)}`;
      event.sender.send('sound-downloaded', { url, name, filePath: soundUrl, groupId });
      console.log(`[GameSound FX] 音效已下载: ${sanitizedName} (${buffer.byteLength} bytes)`);
    } catch (err) {
      console.error(`[GameSound FX] 下载失败: ${name}`, err);
      event.sender.send('sound-download-failed', { url, name, error: (err as Error).message });
    }
  });

  ipcMain.handle('preview-captured-sound', async (_event, url: string) => {
    try {
      const ses = soundBrowserWindow?.webContents?.session ?? session.defaultSession;
      const response = await ses.fetch(url, {
        headers: {
          Referer: 'https://www.aigei.com/',
          Origin: 'https://www.aigei.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      return { data: buffer.toString('base64') };
    } catch (e) {
      console.error('[GameSound FX] 预览下载失败:', e);
      return null;
    }
  });

  ipcMain.on('get-captured-sounds', (event) => {
    event.sender.send('captured-sounds-list', Object.values(capturedSounds));
  });

  ipcMain.on('clear-captured-sounds', () => {
    Object.keys(capturedSounds).forEach(key => delete capturedSounds[key]);
    mainWindow?.webContents.send('captured-sounds-cleared');
  });

  ipcMain.handle('save-imported-sound', async (_event, fileName: string, buffer: ArrayBuffer) => {
    const dir = getImportedSoundsDir();
    const sanitizedName = fileName.replace(/[\\/:*?"<>|]/g, '_');
    const filePath = path.join(dir, sanitizedName);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    console.log(`[GameSound FX] 导入音效已保存: ${filePath}`);
    return `imported://${encodeURIComponent(sanitizedName)}`;
  });

  ipcMain.handle('analyze-imported-sound', async (_event, fileName: string, buffer: ArrayBuffer) => {
    const raw = Buffer.from(buffer);
    const ext = path.extname(fileName).toLowerCase();
    const sizeBytes = raw.byteLength;
    let estimatedDurationSec: number | null = null;
    if (ext === '.mp3') estimatedDurationSec = Number((sizeBytes * 8 / 128000).toFixed(1));
    else if (ext === '.wav') estimatedDurationSec = Number((sizeBytes / 176400).toFixed(1));
    else if (ext === '.ogg' || ext === '.m4a' || ext === '.flac') estimatedDurationSec = Number((sizeBytes * 8 / 160000).toFixed(1));
    const warnings: string[] = [];
    if (sizeBytes < 24 * 1024) warnings.push('文件体积较小，可能过短');
    if (estimatedDurationSec !== null && estimatedDurationSec < 0.35) warnings.push('估计时长过短，建议检查音频头尾');
    if (!['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(ext)) warnings.push('格式兼容性一般，建议转为 mp3/wav');
    return {
      sizeBytes,
      estimatedDurationSec,
      peakDb: null,
      warnings,
      canAutoProcess: ext === '.wav',
    };
  });

  ipcMain.handle('process-imported-sound', async (_event, _fileName: string, buffer: ArrayBuffer) => {
    // Phase-1: keep processing conservative to avoid destructive writes.
    // We return original bytes and allow UI to show "processed" flow.
    return { data: Buffer.from(buffer).toString('base64') };
  });

  // Forward now-playing data from the main renderer to the overlay window
  ipcMain.on('overlay-show-now-playing', (_event, soundName: string) => {
    ensureOverlayWindow()?.webContents.send('now-playing-changed', soundName);
  });
  ipcMain.on('overlay-hide-now-playing', () => {
    if (overlayWindow) overlayWindow.webContents.send('now-playing-changed', null);
  });

  ipcMain.on('get-valorant-status', (event) => {
    event.returnValue = { connected: valorantDetector?.isConnected() ?? false };
  });

  ipcMain.on('set-team-key-code', (_event, vkCode: number) => {
    teamKeyVK = vkCode;
  });

  ipcMain.on('set-recording-mode', (_event, recording: boolean) => {
    isRecordingShortcut = recording;
  });

  ipcMain.on('set-picker-prefix-key', (_event, data: { keyCode: number; keyName: string }) => {
    pickerPrefixKeyName = data.keyName;
    // Update overlay hint if picker is showing
    if (pendingPicker) {
      ensureOverlayWindow()?.webContents.send('valorant-picker-update', {
        choices: pendingPicker.choices,
        prefixKeyName: pickerPrefixKeyName,
      });
    }
  });

  ipcMain.on('hold-team-key', async () => {
    const keyName = VK_TO_NAME[teamKeyVK] || 'V';
    const scanCode = KEY_NAME_TO_SCANCODE[keyName] || 0;
    // Always get fresh window handle — don't rely on cached valorantHwnd
    let targetHwnd = findValorantWindow ? findValorantWindow() : 0;
    if (!targetHwnd) targetHwnd = valorantHwnd;
    debugLog('[team] hold: targetHwnd=' + targetHwnd + ' key=' + keyName);
    if (targetHwnd && getForegroundWindowFn) {
      const prevHwnd = getForegroundWindowFn();
      debugLog('[team] prevHwnd=' + prevHwnd);
      if (prevHwnd !== targetHwnd) {
        const ok = forceForeground(targetHwnd);
        debugLog('[team] forceForeground=' + ok);
        await delay(100);
        const nowHwnd = getForegroundWindowFn();
        debugLog('[team] after switch nowHwnd=' + nowHwnd);
      }
    }
    // 2) 发送 V 键 — 此时 VALORANT 是前台，Raw Input 应能接收
    if (sendInputScanCode && scanCode) sendInputScanCode(scanCode, false);
    if (keybd_event_fn && teamKeyVK) keybd_event_fn(teamKeyVK, 0, 0, 0);
  });

  ipcMain.on('release-team-key', () => {
    const keyName = VK_TO_NAME[teamKeyVK] || 'V';
    const scanCode = KEY_NAME_TO_SCANCODE[keyName] || 0;
    if (keybd_event_fn && teamKeyVK) keybd_event_fn(teamKeyVK, 0, 0x0002, 0);
    if (sendInputScanCode && scanCode) sendInputScanCode(scanCode, true);
  });

  ipcMain.handle('read-imported-sound', async (_event, fileName: string) => {
    const dir = getImportedSoundsDir();
    const filePath = path.resolve(dir, fileName);
    if (!filePath.startsWith(dir)) return null;
    try {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4', '.flac': 'audio/flac',
      };
      return { data: data.toString('base64'), mimeType: mimeTypes[ext] || 'audio/mpeg' };
    } catch {
      return null;
    }
  });

  ipcMain.handle('read-builtin-sound', async (_event, fileName: string) => {
    // Try production path first (packaged app: resources/sounds/)
    const prodDir = path.join(process.resourcesPath, 'sounds');
    const prodPath = path.resolve(prodDir, fileName);
    if (prodPath.startsWith(prodDir)) {
      try {
        const data = fs.readFileSync(prodPath);
        const ext = path.extname(prodPath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
          '.m4a': 'audio/mp4', '.flac': 'audio/flac',
        };
        return { data: data.toString('base64'), mimeType: mimeTypes[ext] || 'audio/mpeg' };
      } catch { /* try dev path */ }
    }

    // Fallback: dev path (npm run dev)
    const devDir = path.join(__dirname, '..', 'public', 'sounds');
    const devPath = path.resolve(devDir, fileName);
    if (!devPath.startsWith(devDir)) return null;
    try {
      const data = fs.readFileSync(devPath);
      const ext = path.extname(devPath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4', '.flac': 'audio/flac',
      };
      return { data: data.toString('base64'), mimeType: mimeTypes[ext] || 'audio/mpeg' };
    } catch {
      return null;
    }
  });

  ipcMain.handle('delete-imported-sound', async (_event, fileName: string) => {
    const dir = getImportedSoundsDir();
    const filePath = path.resolve(dir, fileName);
    if (!filePath.startsWith(dir)) return;
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[GameSound FX] 导入音效已删除: ${filePath}`);
      }
    } catch (err) {
      console.log(`[GameSound FX] 删除导入音效失败: ${fileName}`, err);
      throw err;
    }
  });

  ipcMain.on('valorant-start-monitor', () => {
    valorantDetector?.start();
  });

  ipcMain.on('valorant-stop-monitor', () => {
    valorantDetector?.stop();
  });

  // Forward renderer-requested shortcuts (from ValorantPanel preview) back to renderer
  ipcMain.on('shortcut-triggered', (_event, soundId: string) => {
    mainWindow?.webContents.send('shortcut-triggered', soundId);
  });

  // Valorant picker: show sound choices in overlay
  ipcMain.on('valorant-show-picker', (_event, data: { choices: Array<{ id: string; name: string }>; eventLabel?: string; timeoutMs?: number }) => {
    const timeoutMs = data.timeoutMs || 15000;
    if (pendingPicker) {
      // Extend timeout, update choices — no flicker hide/show
      clearTimeout(pendingPicker.timer);
      pendingPicker.choices = data.choices;
      pendingPicker.timer = setTimeout(() => {
        if (overlayWindow) overlayWindow.webContents.send('valorant-picker-hide');
        pendingPicker = null;
      }, timeoutMs);
      ensureOverlayWindow()?.webContents.send('valorant-picker-update', { choices: data.choices, eventLabel: data.eventLabel, prefixKeyName: pickerPrefixKeyName });
    } else {
      pendingPicker = {
        choices: data.choices,
        timer: setTimeout(() => {
          if (overlayWindow) overlayWindow.webContents.send('valorant-picker-hide');
          pendingPicker = null;
        }, timeoutMs),
      };
      ensureOverlayWindow()?.webContents.send('valorant-picker-show', { choices: data.choices, eventLabel: data.eventLabel, prefixKeyName: pickerPrefixKeyName });
    }
  });

  ipcMain.on('valorant-hide-picker', () => {
    if (pendingPicker) {
      clearTimeout(pendingPicker.timer);
      pendingPicker = null;
    }
    if (overlayWindow) overlayWindow.webContents.send('valorant-picker-hide');
  });

  console.log('[GameSound FX] 应用已启动 - 支持全屏游戏悬浮使用');

  // --- Trim sound: read full audio bytes -------------------------------------------------
  ipcMain.handle("read-sound-full", async (_event, fileName: string) => {
    try {
      // Try imported sounds first
      const importedDir = getImportedSoundsDir();
      const importedPath = path.join(importedDir, fileName);
      if (fs.existsSync(importedPath)) {
        const data = fs.readFileSync(importedPath);
        console.log(`[read-sound-full] found in imported dir: ${importedPath} (${data.length} bytes)`);
        return { data: data.toString("base64") };
      }
      // Fallback: built-in sounds (packaged)
      const prodDir = path.join(process.resourcesPath, 'sounds');
      const prodPath = path.resolve(prodDir, fileName);
      if (prodPath.startsWith(prodDir) && fs.existsSync(prodPath)) {
        const data = fs.readFileSync(prodPath);
        console.log(`[read-sound-full] found in prod dir: ${prodPath} (${data.length} bytes)`);
        return { data: data.toString("base64") };
      }
      // Fallback: dev path
      const devDir = path.join(__dirname, '..', 'public', 'sounds');
      const devPath = path.resolve(devDir, fileName);
      if (devPath.startsWith(devDir) && fs.existsSync(devPath)) {
        const data = fs.readFileSync(devPath);
        console.log(`[read-sound-full] found in dev dir: ${devPath} (${data.length} bytes)`);
        return { data: data.toString("base64") };
      }
      console.log(`[read-sound-full] NOT FOUND: ${fileName} (searched imported, prod, dev)`);
      return null;
    } catch (err) {
      console.error(`[read-sound-full] error reading ${fileName}:`, err);
      return null;
    }
  });

  // --- Trim sound: ffmpeg cut -----------------------------------------------------------
  ipcMain.handle("trim-sound", async (_event, fileName: string, startSec: number, endSec: number) => {
    return new Promise((resolve, reject) => {
      const importedDir = getImportedSoundsDir();

      // Find source file across all possible locations
      const possiblePaths = [
        path.join(importedDir, fileName),
        path.join(process.resourcesPath, 'sounds', fileName),
        path.join(__dirname, '..', 'public', 'sounds', fileName),
      ];
      let srcPath = possiblePaths.find(p => fs.existsSync(p));
      if (!srcPath) {
        return reject(new Error('源文件未找到'));
      }

      // If source is not in imported dir, copy it there first
      if (!srcPath.startsWith(importedDir)) {
        const copyDest = path.join(importedDir, fileName);
        fs.copyFileSync(srcPath, copyDest);
        srcPath = copyDest;
      }

      const ext = path.extname(fileName);
      const baseName = path.basename(fileName, ext);
      const outName = baseName + "_trimmed" + ext;
      const outPath = path.join(importedDir, outName);

      let ffmpegBin = "ffmpeg";
      try {
        const pkg = require("ffmpeg-static");
        if (pkg) ffmpegBin = pkg;
      } catch (_) { /* use system ffmpeg */ }

      const args = ["-y", "-i", srcPath, "-ss", String(startSec), "-to", String(endSec), "-c", "copy", outPath];
      const proc: ChildProcess = child_process.spawn(ffmpegBin, args);

      let stderr = "";
      proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

      proc.on("close", (code: number | null) => {
        if (code === 0) resolve({ fileName: outName });
        else reject(new Error(stderr || "ffmpeg exited " + code));
      });

      proc.on("error", (err: Error) => reject(err));
    });
  });

  // --- Export config: zip sounds.json + all imported sounds ------------------------------
  ipcMain.handle("export-config", async () => {
    return new Promise((resolve, reject) => {
      const soundsDir = getImportedSoundsDir();
      const userDataPath = app.getPath("userData");
      const settingsPath = path.join(userDataPath, "sounds.json");

      const archive = new ZipArchive({ zlib: { level: 5 } });
      const chunks: Buffer[] = [];
      archive.on("data", (chunk: Buffer) => chunks.push(chunk));
      archive.on("end", () => resolve({ data: Buffer.concat(chunks).toString("base64") }));
      archive.on("error", (err: Error) => reject(err));

      if (fs.existsSync(settingsPath)) {
        archive.file(settingsPath, { name: "sounds.json" });
      }

      if (fs.existsSync(soundsDir)) {
        const files = fs.readdirSync(soundsDir);
        for (const f of files) {
          const fp = path.join(soundsDir, f);
          if (fs.statSync(fp).isFile()) {
            archive.file(fp, { name: "sounds/" + f });
          }
        }
      }

      archive.finalize();
    });
  });

  // --- Import config preview: read zip metadata ------------------------------------------
  ipcMain.handle("import-config-preview", async (_event, dataBase64: string) => {
    try {
      const buf = Buffer.from(dataBase64, "base64");
      const zip = new AdmZip(buf);
      const entries = zip.getEntries();
      const result: { entries: Array<{ entryName: string; size: number }> } = { entries: [] };
      let hasSettings = false;
      for (const entry of entries) {
        if (entry.entryName === "sounds.json") hasSettings = true;
        result.entries.push({ entryName: entry.entryName, size: entry.getData().length });
      }
      if (!hasSettings) return { error: "Invalid config: missing sounds.json" };
      return result;
    } catch (e: any) {
      return { error: e?.message || "Failed to read archive" };
    }
  });

  // --- Import config apply: extract and overwrite ----------------------------------------
  ipcMain.handle("import-config-apply", async (_event, dataBase64: string) => {
    try {
      const buf = Buffer.from(dataBase64, "base64");
      const zip = new AdmZip(buf);
      const userDataPath = app.getPath("userData");
      const soundsDir = getImportedSoundsDir();

      const settingsEntry = zip.getEntry("sounds.json");
      if (settingsEntry) {
        fs.writeFileSync(path.join(userDataPath, "sounds.json"), settingsEntry.getData());
      }

      const soundEntries = zip.getEntries().filter((e: any) => e.entryName.startsWith("sounds/") && !e.isDirectory);
      for (const entry of soundEntries) {
        const fileName = path.basename(entry.entryName);
        fs.writeFileSync(path.join(soundsDir, fileName), entry.getData());
      }

      return { ok: true };
    } catch (e: any) {
      return { error: e?.message || "Import failed" };
    }
  });

}); }

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('will-quit', () => {
  valorantDetector?.stop();
  stopKeyPolling();
});
