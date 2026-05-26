/**
 * API Base URL Utility
 *
 * Resolves the correct API base URL for:
 *   - Web (dev: Vite proxy / prod: same-origin /api)
 *   - Electron (file:// protocol → must use absolute URL)
 *   - Capacitor / Android (capacitor://localhost → must use absolute URL)
 *
 * Set VITE_API_URL in your .env file to the deployed backend URL.
 * Example: VITE_API_URL=https://your-app.onrender.com
 */

const isElectron = typeof window !== 'undefined' && window?.electronAPI?.isElectron === true;

// Capacitor sets window.Capacitor
const isCapacitor =
  typeof window !== 'undefined' &&
  typeof window.Capacitor !== 'undefined' &&
  window.Capacitor.isNativePlatform();

// Detect Vite dev server (port 5173)
const isViteDev =
  typeof window !== 'undefined' &&
  window.location.hostname === 'localhost' &&
  window.location.port === '5173';

function resolveApiBase() {
  // Vite dev server: use direct localhost backend
  if (isViteDev) {
    return 'http://localhost:5000/api';
  }

  // Env variable always wins (set in .env or .env.production)
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }

  // Electron or Capacitor: must use an absolute URL
  if (isElectron || isCapacitor) {
    // Fallback to localhost for local testing
    return 'http://localhost:5000/api';
  }

  // Production web: use relative /api (same-origin via Express static serving)
  return '/api';
}

export const API = resolveApiBase();

export default API;
