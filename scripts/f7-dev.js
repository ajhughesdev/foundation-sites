const { spawn, spawnSync } = require('child_process');

const host = process.env.F7_DEV_HOST || '127.0.0.1';
const port = process.env.F7_DEV_PORT || '5173';

const yarn = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';

const buildCore = spawnSync(yarn, ['f7:core:build'], { stdio: 'inherit' });
if (buildCore.status !== 0) {
  process.exit(buildCore.status ?? 1);
}

const buildReveal = spawnSync(yarn, ['f7:reveal:build'], { stdio: 'inherit' });
if (buildReveal.status !== 0) {
  process.exit(buildReveal.status ?? 1);
}

const tsc = spawn(yarn, ['f7:core:watch'], { stdio: 'inherit' });
const revealTsc = spawn(yarn, ['f7:reveal:watch'], { stdio: 'inherit' });
const vite = spawn(
  yarn,
  ['vite', '--host', host, '--port', port, '--strictPort'],
  { stdio: 'inherit' }
);

const children = [tsc, revealTsc, vite];
let didExit = false;

function shutdown(code = 0) {
  if (didExit) return;
  didExit = true;

  for (const child of children) {
    if (!child.pid) continue;
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  }

  process.exit(code);
}

tsc.on('exit', (code) => shutdown(code ?? 0));
revealTsc.on('exit', (code) => shutdown(code ?? 0));
vite.on('exit', (code) => shutdown(code ?? 0));

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
