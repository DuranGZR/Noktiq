import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/ecosystem',outputDir:'.local-validation/ecosystem-test-results',testMatch:'*.spec.ts',workers:1,retries:0,timeout:45000,
  reporter:[['list'],['json',{outputFile:'.local-validation/ecosystem-results.json'}]],
  use:{viewport:{width:1440,height:1000},screenshot:'only-on-failure',trace:'retain-on-failure'},
  projects:[{name:'chrome',use:{browserName:'chromium',channel:'chrome'}},{name:'firefox',use:{browserName:'firefox'}},{name:'webkit',use:{browserName:'webkit'}}],
  webServer:[{command:'node scripts/dev-ecosystem.mjs react',url:'http://127.0.0.1:5321',reuseExistingServer:false},{command:'node scripts/dev-ecosystem.mjs vue',url:'http://127.0.0.1:5322',reuseExistingServer:false}],
});
