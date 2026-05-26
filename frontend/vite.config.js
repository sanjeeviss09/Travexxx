import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Required for Electron: assets must use relative paths (file:// protocol)
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
