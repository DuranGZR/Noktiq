import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import webpack from 'webpack';

const require = createRequire(import.meta.url);
const children = [];
let browser;
const delay = ms => new Promise(done => setTimeout(done, ms));
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };
function run(args, extra = {}) {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: { ...env, ...extra } });
  children.push(child); return child;
}
async function ready(port, child) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(`Server ${port} exited`);
    try { if ((await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1500) })).ok) return; } catch {}
    await delay(500);
  }
  throw new Error(`Server ${port} did not become ready`);
}
async function request(page, target, expected) {
  await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click();
  await page.locator(target).click();
  if (expected.startsWith('examples/next/')) {
    let opened;
    await page.route('**/__nextjs_launch-editor?*', route => { opened = new URL(route.request().url()); return route.fulfill({ status: 204 }); });
    await page.getByRole('button', { name: /^Open source file:/ }).click();
    await page.waitForFunction(() => document.querySelector('noktiq-toolbar')?.shadowRoot?.querySelector('.status')?.textContent?.includes('Editor request sent'));
    const [, file, line, column] = /^(.*):(\d+):(\d+)$/.exec(expected);
    assert.ok(opened.searchParams.get('file').replaceAll('\\', '/').endsWith('/' + file));
    assert.equal(opened.searchParams.get('line1'), line); assert.equal(opened.searchParams.get('column1'), column);
  }
  await page.getByRole('textbox', { name: 'What should change?' }).fill('Verify original source');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('noktiq-toolbar')?.shadowRoot?.querySelector('.toast')?.textContent?.includes('copied'));
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), new RegExp(`Source: ${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
}
try {
  browser = await chromium.launch({ channel: 'chrome' });
  for (const mode of ['development', 'production']) {
    const output = resolve('.local-validation/webpack', mode);
    const compiler = webpack({ mode, context: process.cwd(), entry: resolve('tests/fixtures/webpack.tsx'), target: 'web', devtool: false,
      output: { path: output, filename: 'bundle.js' },
      module: { rules: [
        { test: /\.tsx$/, enforce: 'pre', exclude: /node_modules/, use: require.resolve('../dist/webpack-loader.cjs') },
        { test: /\.tsx$/, use: resolve('tests/fixtures/esbuild-loader.cjs') },
      ] },
    });
    await new Promise((done, reject) => compiler.run((error, stats) => compiler.close(() => error || stats?.hasErrors() ? reject(error || new Error(stats.toString('errors-only'))) : done())));
    const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] }); const page = await context.newPage();
    await page.route('http://127.0.0.1:5190/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }));
    await page.goto('http://127.0.0.1:5190/'); await page.addScriptTag({ path: resolve(output, 'bundle.js') });
    await page.locator('#webpack-target').waitFor();
    if (mode === 'development') {
      const expected = 'tests/fixtures/webpack.tsx:4:3';
      assert.equal(await page.locator('#webpack-target').getAttribute('data-noktiq-source'), expected);
      await request(page, '#webpack-target', expected);
    } else { assert.equal(await page.locator('[data-noktiq-source]').count(), 0); assert.equal(await page.locator('noktiq-toolbar').count(), 0); }
    await context.close(); console.log(`PASS Webpack ${mode}: original locations / production guard`);
  }
  const source = await readFile('examples/next/app/page.tsx', 'utf8'); const offset = source.indexOf('<button');
  const expected = `examples/next/app/page.tsx:${source.slice(0, offset).split('\n').length}:${offset - source.lastIndexOf('\n', offset)}`;
  for (const [engine, port] of [['turbopack', 5181], ['webpack', 5182]]) {
    let available = false; try { available = (await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1500) })).ok; } catch {}
    const child = available ? undefined : run(['scripts/dev-next.mjs', engine]); await ready(port, child);
    const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] }); const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}`);
    assert.equal(await page.locator('#next-target').getAttribute('data-noktiq-source'), expected);
    await request(page, '#next-target', expected); await context.close(); console.log(`PASS Next.js ${engine}: captured and exported ${expected}`);
  }
  const productionEnv = { NOKTIQ_NEXT_BUNDLER: 'production' };
  const build = run(['node_modules/next/dist/bin/next', 'build', 'examples/next', '--turbopack'], productionEnv);
  await new Promise((done, reject) => { build.on('error', reject); build.on('exit', code => code === 0 ? done() : reject(new Error(`Next production build exited ${code}`))); });
  const production = run(['node_modules/next/dist/bin/next', 'start', 'examples/next', '--hostname', '127.0.0.1', '--port', '5183'], productionEnv); await ready(5183, production);
  const page = await browser.newPage(); await page.goto('http://127.0.0.1:5183'); await page.locator('#next-target').waitFor();
  assert.equal(await page.locator('[data-noktiq-source]').count(), 0); assert.equal(await page.locator('noktiq-toolbar').count(), 0);
  console.log('PASS Next.js production: no source attributes or toolbar');
} finally {
  await browser?.close(); for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
}
