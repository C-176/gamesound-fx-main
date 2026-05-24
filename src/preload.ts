import { ipcRenderer, contextBridge } from 'electron';

const soundsPath = ipcRenderer.sendSync('get-sounds-path');

contextBridge.exposeInMainWorld('electron', {
  soundsPath: soundsPath,
  soundBaseUrl: 'sound://',
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => {
      const validChannels = [
        'get-sounds-path',
        'minimize-window',
        'close-window',
        'register-shortcut',
        'unregister-shortcut',
        'unregister-all-shortcuts',
        'register-stop-shortcut',
        'open-sound-browser',
        'download-captured-sound',
        'get-captured-sounds',
        'clear-captured-sounds',
        'set-team-key-code',
        'hold-team-key',
        'release-team-key',
        'close-browser-window',
        'shortcut-triggered',
        'valorant-start-monitor',
        'valorant-stop-monitor',
        'overlay-show-now-playing',
        'overlay-hide-now-playing',
        'valorant-show-picker',
        'valorant-hide-picker',
        'set-picker-prefix-key',
        'set-recording-mode',
        'close-spotlight',
        'toggle-spotlight-search',
        'resize-spotlight',
        'play-sound-from-spotlight',
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args);
      }
    },
    sendSync: (channel: string, ...args: unknown[]) => {
      const validChannels = [
        'get-sounds-path',
        'get-valorant-status',
      ];
      if (validChannels.includes(channel)) {
        return ipcRenderer.sendSync(channel, ...args);
      }
      return undefined;
    },
    invoke: (channel: string, ...args: unknown[]) => {
      const validChannels = [
        'save-imported-sound',
        'delete-imported-sound',
        'read-imported-sound',
        'read-builtin-sound',
        'preview-captured-sound',
        'play-sound-by-id',
        'analyze-imported-sound',
        'process-imported-sound',
        'read-sound-full',
        'trim-sound',
        'export-config',
        'import-config-preview',
        'import-config-apply',
      ];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      return Promise.reject(new Error(`Invalid invoke channel: ${channel}`));
    },
    on: (channel: string, listener: (...args: unknown[]) => void) => {
      const validChannels = [
        'shortcut-triggered',
        'stop-shortcut-triggered',
        'sound-captured',
        'sound-downloaded',
        'sound-download-failed',
        'captured-sounds-list',
        'captured-sounds-cleared',
        'now-playing-changed',
        'sound-browser-closed',
        'valorant-status-changed',
        'valorant-event-fired',
        'valorant-match-info',
        'valorant-agent-selected',
        'valorant-picker-show',
        'valorant-picker-update',
        'valorant-picker-hide',
        'toggle-spotlight-search',
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, listener);
      }
    },
    removeListener: (channel: string, listener: (...args: unknown[]) => void) => {
      const validChannels = [
        'shortcut-triggered',
        'overlay-show-now-playing',
        'overlay-hide-now-playing',
        'valorant-show-picker',
        'valorant-hide-picker',
        'set-picker-prefix-key',
        'set-recording-mode',
        'valorant-start-monitor',
        'valorant-stop-monitor',
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, listener);
      }
    },
  },
});
