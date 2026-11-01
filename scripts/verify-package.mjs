import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { packPackage } from './pack-package.mjs';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'Run this script through npm run verify:package');
const runNpm = (args, cwd) => execFileSync(process.execPath, [npmCli, ...args], { cwd, encoding: 'utf8' });
const packed = await packPackage();
assert.ok(packed.files.some(file => file.path === 'LICENSE'), 'The package must include its license');
assert.ok(!packed.files.some(file => /^(tests|examples|scripts|\.local-validation)\//.test(file.path) || /\.(gif|mp4|png)$/.test(file.path)), 'Development fixtures and large media must stay out of the package');
const validationRoot = join(root, '.local-validation');
await mkdir(validationRoot, { recursive: true });
await copyFile(join(root, 'examples/shared.css'), join(validationRoot, 'shared.css'));

for (const framework of ['react', 'vue']) {
  const directory = join(validationRoot, framework);
  await mkdir(directory, { recursive: true });
  const runtime = framework === 'react' ? ['react', 'react-dom'] : ['vue'];
  const dependencies = Object.fromEntries(runtime.map(name => [name, manifest.devDependencies[name]]));
  dependencies.noktiq = `file:../../${packed.filename}`;
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: `noktiq-validation-${framework}`, private: true, type: 'module', dependencies, devDependencies: { vite: manifest.devDependencies.vite, [`@vitejs/plugin-${framework}`]: manifest.devDependencies[`@vitejs/plugin-${framework}`] } }, null, 2));
  for (const name of framework === 'react' ? ['index.html', 'main.tsx'] : ['index.html', 'main.ts', 'App.vue']) {
    await copyFile(join(root, 'examples', framework, name), join(directory, name));
  }
  await writeFile(join(directory, 'vite.config.js'), `import { defineConfig } from 'vite';\nimport framework from '@vitejs/plugin-${framework}';\nimport { noktiq } from 'noktiq/vite';\nexport default defineConfig({ plugins: [noktiq(), framework()] });\n`);
  process.stdout.write(runNpm(['install', '--no-audit', '--no-fund', join(root, packed.filename)], directory));
  const installed = JSON.parse(await readFile(join(directory, 'node_modules/noktiq/package.json'), 'utf8'));
  assert.equal(installed.version, manifest.version);
  assert.equal(installed.license, manifest.license);
  assert.equal(await readFile(join(directory, 'node_modules/noktiq/LICENSE'), 'utf8'), await readFile(join(root, 'LICENSE'), 'utf8'), 'Installed license must match the repository license');
  for (const name of await readdir(join(root, 'dist'))) {
    assert.equal(await readFile(join(directory, 'node_modules/noktiq/dist', name), 'utf8'), await readFile(join(root, 'dist', name), 'utf8'), 'The installed package must match the current build');
  }
  for (const file of packed.files.filter(file => file.path.endsWith('.md'))) {
    const location = join(directory, 'node_modules/noktiq', file.path);
    const text = await readFile(location, 'utf8');
    for (const match of text.matchAll(/\]\(([^)]+)\)|(?:src|href)="([^"]+)"/g)) {
      const target = match[1] || match[2];
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
      assert.ok(await stat(resolve(location, '..', target.split('#')[0])).catch(() => null), `Broken installed link: ${file.path} -> ${target}`);
    }
  }
  const otherRuntime = framework === 'react' ? 'vue' : 'react';
  assert.equal(existsSync(join(directory, 'node_modules', otherRuntime, 'package.json')), false, `${framework} consumer must not install ${otherRuntime}`);
  assert.equal(existsSync(join(directory, 'node_modules/next/package.json')), false, 'Vite consumers must not install optional Next.js');
  const probe = `import assert from 'node:assert/strict'; const {Noktiq} = await import('noktiq/${framework}'); assert.ok(Noktiq); const {noktiq} = await import('noktiq/vite'); assert.equal(noktiq().apply, 'serve');`;
  execFileSync(process.execPath, ['--input-type=module', '-e', probe], { cwd: directory, stdio: 'inherit' });
  execFileSync(process.execPath, [join(directory, 'node_modules/vite/bin/vite.js'), 'build'], { cwd: directory, stdio: 'inherit' });
  console.log(`PASS: ${framework} installs the tarball and builds without ${otherRuntime}.`);
}
console.log(`Package verified: ${packed.filename}`);
