import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const isSpotlight = new URLSearchParams(window.location.search).get('spotlight') === '1';

if (isSpotlight) {
  const loadingEl = document.getElementById('loading-screen');
  if (loadingEl) loadingEl.remove();
  document.body.style.background = 'transparent';
  document.body.style.backgroundImage = 'none';
  const rootEl = document.getElementById('root');
  if (rootEl) rootEl.style.setProperty('--vignette', 'none');
  createRoot(document.getElementById('root')!).render(<App />);
} else {
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
