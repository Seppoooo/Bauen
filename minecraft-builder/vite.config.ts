import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' damit der Build auch aus einem Unterordner oder per Datei-Server läuft
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173, open: true }
});
