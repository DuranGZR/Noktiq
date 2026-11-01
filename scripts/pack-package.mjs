import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
export async function packPackage({ dryRun = false } = {}) {
  const npm = process.env.npm_execpath;
  assert.ok(npm, 'Run through npm run pack:release or an npm validation script');
  const run = args => JSON.parse(execFileSync(process.execPath, [npm, ...args], { cwd: root, encoding: 'utf8' }))[0];
  const selected = run(['pack', '--ignore-scripts', '--dry-run', '--json']);
  const stage = join(root, '.local-validation', 'npm-package');
  assert.equal(dirname(stage), join(root, '.local-validation'));
  await rm(stage, { recursive: true, force: true });
  await mkdir(stage, { recursive: true });
  const paths = selected.files.map(file => file.path).filter(file => !/^docs\/(?:media|publishing|npm-readme)\.md$/.test(file));
  for (const file of paths) {
    await mkdir(dirname(join(stage, file)), { recursive: true });
    await copyFile(join(root, file), join(stage, file));
  }
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  delete manifest.scripts;
  delete manifest.devDependencies;
  await writeFile(join(stage, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  const install = manifest.private ? 'Development preview: this package is not published yet. Build an archive with `npm run pack:release` in the source checkout, then install the generated `.tgz` with `npm install -D /absolute/path/to/' + manifest.name + '-' + manifest.version + '.tgz`.' : '```sh\nnpm install -D ' + manifest.name + '\n```';
  await writeFile(join(stage, 'README.md'), (await readFile(join(root, 'docs/npm-readme.md.template'), 'utf8')).replace('{{INSTALL_STATUS}}', install));
  for (const file of paths.filter(file => file.endsWith('.md'))) {
    const text = await readFile(join(stage, file), 'utf8');
    const prepared = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, target) => {
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) return match;
      const resolved = resolve(dirname(join(stage, file)), target.split('#')[0]);
      const relative = resolved.slice(stage.length + 1).replaceAll('\\', '/');
      if (paths.includes(relative)) return match;
      assert.ok(/^(reports|scripts|examples)\//.test(relative), `${file}: unexpected missing package link ${target}`);
      return `${label} (available in the source checkout)`;
    });
    await writeFile(join(stage, file), prepared);
  }
  const packed = run(['pack', stage, '--ignore-scripts', ...(dryRun ? ['--dry-run'] : []), '--json']);
  return { ...packed, directory: stage, archive: join(root, packed.filename) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await packPackage();
  console.log(`Prepared ${result.filename}: ${result.files.length} files, ${result.size} bytes. No npm publication performed.`);
}
