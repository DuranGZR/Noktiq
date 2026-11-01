import { spawn } from 'node:child_process';
const engine = process.argv[2] || 'turbopack';
if (!['webpack', 'turbopack'].includes(engine)) throw new Error('Unknown Next.js bundler');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', 'examples/next', `--${engine}`, '--hostname', '127.0.0.1', '--port', engine === 'webpack' ? '5182' : '5181'], {
  stdio: 'inherit', env: { ...process.env, NOKTIQ_NEXT_BUNDLER: engine, NEXT_TELEMETRY_DISABLED: '1' },
});
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
