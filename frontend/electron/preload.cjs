/**
 * Electron Preload Script
 * 
 * Runs in a privileged context before the renderer page loads.
 * Use contextBridge to safely expose APIs to the renderer.
 * 
 * Security: contextIsolation is ON — renderer cannot access Node.js directly.
 */
const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, limited API surface to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  isElectron: true,

  // App version (optional — useful for showing in About page)
  getVersion: () => ipcRenderer.invoke('get-version'),
});
