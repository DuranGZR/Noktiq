import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { rm, copyFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
assert.equal(dirname(output), root);
assert.equal(basename(output), 'dist');
await rm(output, { recursive: true, force: true });

await build({
  entryPoints: ['src/index.ts', 'src/react.ts', 'src/vue.ts', 'src/vite.ts', 'src/next.ts'],
  outdir: 'dist', bundle: true, splitting: true, chunkNames: 'shared-[name]', format: 'esm', platform: 'neutral',
  target: 'es2022', packages: 'external', sourcemap: true,
});
await build({ entryPoints: ['src/source.ts'], outdir: 'dist', outExtension: { '.js': '.cjs' }, bundle: true, format: 'cjs', platform: 'node', target: 'node20', packages: 'external' });
await copyFile('src/webpack-loader.cjs', 'dist/webpack-loader.cjs');
