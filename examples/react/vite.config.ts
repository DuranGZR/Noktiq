import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { noktiq } from '../../dist/vite.js';
export default defineConfig({ cacheDir: '../../node_modules/.vite-react', optimizeDeps: { exclude: ['noktiq/react'] }, plugins: [noktiq(), react()] });
