import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { noktiq } from '../../dist/vite.js';
export default defineConfig({ cacheDir: '../../node_modules/.vite-vue', optimizeDeps: { exclude: ['noktiq/vue'] }, plugins: [noktiq(), vue()] });
