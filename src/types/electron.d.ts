/// <reference types="vite/client" />

declare const Howler: {
  ctx?: {
    state?: string;
    resume?: () => void;
  };
};

interface ElectronIPC {
  send: (channel: string, ...args: unknown[]) => void;
  sendSync: (channel: string, ...args: unknown[]) => unknown;
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  once: (channel: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (channel: string, callback: (...args: unknown[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

interface ElectronAPI {
  soundsPath: string;
  soundBaseUrl: string;
  ipcRenderer: ElectronIPC;
  /** AudioContext singleton (shared across Howler) */
  HowlerCtx?: AudioContext;
}

interface Window {
  electron: ElectronAPI;
  Howler?: typeof Howler;
}
