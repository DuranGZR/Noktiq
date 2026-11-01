import { defineConfig } from '@playwright/test';
export default defineConfig({
  // Browser contexts share the OS clipboard; run clipboard assertions sequentially.
  testDir: './tests/browser', fullyParallel: false, workers: 1, retries: 0,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: '.local-validation/browser-results.json' }]],
  use: { viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } },
    { name: 'firefox', testMatch: ['**/lab.spec.ts', '**/compatibility.spec.ts', '**/targeting.spec.ts', '**/sources.spec.ts', '**/polish.spec.ts', '**/regressions.spec.ts'], use: { browserName: 'firefox' } },
    { name: 'webkit', testMatch: ['**/lab.spec.ts', '**/compatibility.spec.ts', '**/targeting.spec.ts', '**/sources.spec.ts', '**/polish.spec.ts', '**/regressions.spec.ts'], use: { browserName: 'webkit' } },
  ],
  webServer: [
    { command: 'npm run dev:react', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
    { command: 'npm run dev:vue', url: 'http://127.0.0.1:5174', reuseExistingServer: !process.env.CI },
    { command: 'npx vite preview examples/react --host 127.0.0.1 --port 5175 --strictPort', url: 'http://127.0.0.1:5175', reuseExistingServer: !process.env.CI },
    { command: 'npx vite preview examples/vue --host 127.0.0.1 --port 5176 --strictPort', url: 'http://127.0.0.1:5176', reuseExistingServer: !process.env.CI },
  ],
});
