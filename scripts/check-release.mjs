import assert from 'node:assert/strict';
import { packPackage } from './pack-package.mjs';
import { readFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, basename } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const npm = process.env.npm_execpath;
assert.ok(npm, 'Run npm run check:release');
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024, ...options });
  assert.equal(result.status, 0, result.error?.message || result.stderr);
  return result.stdout;
}
const temporary = await mkdtemp(join(tmpdir(), 'noktiq-release-'));
let files;
try {
  run('git', ['init', '--bare', '--quiet', temporary]);
  const git = ['--git-dir=' + temporary, '--work-tree=' + root, '-c', 'core.bare=false', '-c', 'core.excludesFile='];
  const split = text => text.split('\0').filter(Boolean);
  const excluded = ['.env', '.env.production', 'examples/react/.env.local', '.npmrc', '.claude/settings.local.json', 'examples/react/.claude/settings.local.json', '.codex/config.toml', 'cert.pem', 'signing.key', 'identity.p12', 'identity.pfx', 'id_rsa', 'id_ed25519', 'node_modules/a.js', 'dist/index.js', 'examples/react/dist/index.html', 'test-results/output.json', '.local-validation/raw.webm', 'noktiq-0.1.0.tgz', 'debug.log', 'examples/vue/.nuxt/types.d.ts', 'examples/vue/.output/server/index.mjs', 'examples/react/.vite/deps/cache.js', '.turbo/cache/output.json', '.vercel/project.json', '.netlify/state.json'];
  const ignored = new Set(split(run('git', [...git, 'check-ignore', '--no-index', '-z', '--stdin'], { input: excluded.join('\0') + '\0' })));
  for (const file of excluded) assert.ok(ignored.has(file), 'Missing ignore rule: ' + file);
  const included = ['.env.example', 'examples/react/.env.example', 'src/index.ts', 'README.md', 'LICENSE', 'package-lock.json', 'docs/assets/noktiq-demo.gif'];
  const probe = spawnSync('git', [...git, 'check-ignore', '--no-index', '-z', '--stdin'], { cwd: root, encoding: 'utf8', windowsHide: true, input: included.join('\0') + '\0' });
  assert.ok([0, 1].includes(probe.status), probe.stderr);
  assert.equal(probe.stdout, '', 'A publication file is unexpectedly ignored');
  files = split(run('git', [...git, 'ls-files', '--others', '--exclude-standard', '-z']));
  const tracked = spawnSync('git', ['ls-files', '--cached', '-z'], { cwd: root, encoding: 'utf8', windowsHide: true });
  if (tracked.status === 0) files = [...new Set([...files, ...split(tracked.stdout)])];
} finally {
  assert.equal(dirname(temporary), resolve(tmpdir()));
  assert.ok(basename(temporary).startsWith('noktiq-release-'));
  await rm(temporary, { recursive: true, force: true });
}

const required = ['LICENSE', 'README.md', 'CONTRIBUTING.md', 'SECURITY.md', '.github/ISSUE_TEMPLATE/bug_report.md', '.github/ISSUE_TEMPLATE/feature_request.md', '.github/pull_request_template.md', 'docs/publishing.md'];
for (const file of required) assert.ok(files.includes(file), 'Missing publication file: ' + file);
const patterns = {
  npm: /\bnpm_[A-Za-z0-9]{36,}\b/g,
  github: /\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,})\b/g,
  ai: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}\b/g,
  aws: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  google: /\bAIza[A-Za-z0-9_-]{30,}\b/g,
  privateKey: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/g,
  credentialUrl: /https?:\/\/[^\s\/:@]+:[^\s\/@]+@/g,
  homePath: /\b[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"'<>]+|\/(?:Users|home)\/[^/\s"'<>]+/g,
};
// Check that the scanner can recognize synthetic credentials, without storing a real token.
assert.ok(new RegExp(patterns.github).test('ghp_' + 'a'.repeat(36)));
assert.ok(new RegExp(patterns.npm).test('npm_' + 'a'.repeat(36)));
assert.ok(!new RegExp(patterns.npm).test('npm_package_name'));
assert.ok(new RegExp(patterns.homePath).test(['C:', 'Users', 'sample', 'App.tsx'].join('\\')));
const findings = [];
for (const file of files) {
  if (/(^|\/)(?:\.env(?:\..+)?|\.npmrc|id_rsa|id_ed25519)$|\.(?:pem|key|p12|pfx)$/i.test(file) && !file.endsWith('.env.example')) findings.push(file + ': sensitive file is selected for publication');
  if (/\.(?:gif|png|mp4|jpg|jpeg|webm|ico|woff2?|ttf)$/i.test(file)) continue;
  const buffer = await readFile(join(root, file));
  if (buffer.includes(0)) continue;
  const text = buffer.toString('utf8');
  for (const [kind, pattern] of Object.entries(patterns)) for (const match of text.matchAll(new RegExp(pattern))) findings.push(`${file}:${text.slice(0, match.index).split('\n').length}: ${kind} pattern; value withheld`);
}
assert.equal(findings.length, 0, findings.join('\n'));
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const license = await readFile(join(root, 'LICENSE'), 'utf8');
assert.equal(manifest.author, 'Duran Gezer');
assert.equal(typeof manifest.private, 'boolean');
if (!manifest.private) {
  assert.equal(manifest.publishConfig?.registry, 'https://registry.npmjs.org/');
  assert.equal(manifest.publishConfig?.access, 'public');
  assert.ok(manifest.scripts?.prepublishOnly, 'Publish the reviewed release archive instead of the source directory');
}
assert.equal(manifest.license, 'SEE LICENSE IN LICENSE');
assert.ok(license.startsWith('Required Notice: Copyright (c) 2026 Duran Gezer\n\n# PolyForm Shield License 1.0.0'));
const packed = await packPackage({ dryRun: true });
for (const file of ['LICENSE', 'README.md', 'dist/index.js', 'dist/react.js', 'dist/vue.js', 'dist/vite.js', 'dist/next.js']) assert.ok(packed.files.some(entry => entry.path === file), 'Missing package file: ' + file);
assert.ok(!packed.files.some(entry => /^(tests|examples|scripts|reports|node_modules|\.local-validation)\//.test(entry.path) || /\.(gif|png|mp4)$/.test(entry.path)), 'Development files or large media entered the npm package');
for (const file of files.filter(file => /\.md$/i.test(file) && file !== 'LICENSE')) {
  const text = await readFile(join(root, file), 'utf8');
  for (const match of text.matchAll(/\]\(([^)]+)\)|(?:src|href)="([^"]+)"/g)) {
    const target = match[1] || match[2];
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
    assert.ok((await stat(resolve(root, dirname(file), target.split('#')[0])).catch(() => null)), `${file}: broken local link ${target}`);
  }
}
for (const file of packed.files.filter(file => /\.md$/i.test(file.path))) {
  const text = await readFile(join(packed.directory, file.path), 'utf8');
  for (const match of text.matchAll(/\]\(([^)]+)\)|(?:src|href)="([^"]+)"/g)) {
    const target = match[1] || match[2];
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
    const destination = resolve(packed.directory, dirname(file.path), target.split('#')[0]);
    assert.ok(await stat(destination).catch(() => null), `${file.path}: broken packaged link ${target}`);
  }
}
console.log(`PASS ${files.length} publication files: ignore rules, common secret patterns, local paths, documents and license.`);
console.log(`PASS npm archive: ${packed.files.length} files, ${packed.size} bytes; large media and development fixtures excluded.`);
console.log('These checks do not change GitHub settings or upload files. Verify private vulnerability reporting separately.');
