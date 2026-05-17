import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Note: Intentionally NOT using StrictMode because it double-invokes useEffect,
// causing duplicate IPC listener registrations via Electron's contextBridge.
// Each StrictMode remount creates new listener proxies that can't be properly
// removed, resulting in multiple handler calls per event.

// Show loading screen for minimum 1.5s so the pixel character is visible
const loadingEl = document.getElementById('loading-screen');
if (loadingEl) {
  const startTime = Date.now();
  createRoot(document.getElementById('root')!).render(<App />);
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, 1500 - elapsed);
  setTimeout(() => {
    loadingEl.classList.add('fade-out');
    setTimeout(() => loadingEl?.remove(), 400);
  }, remaining);
} else {
  createRoot(document.getElementById('root')!).render(<App />);
}
