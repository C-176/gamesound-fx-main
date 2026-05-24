import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const isSpotlight = new URLSearchParams(window.location.search).get('spotlight') === '1';

if (isSpotlight) {
  // Spotlight overlay: transparent window, no loading screen, no body background
  const loadingEl = document.getElementById('loading-screen');
  if (loadingEl) loadingEl.remove();
  document.body.style.background = 'transparent';
  document.body.style.backgroundImage = 'none';
  // Remove vignette overlay from #root::before
  const rootEl = document.getElementById('root');
  if (rootEl) rootEl.style.setProperty('--vignette', 'none');
  createRoot(document.getElementById('root')!).render(<App />);
} else {
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
}
