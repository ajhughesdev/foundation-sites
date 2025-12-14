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

const buildDropdown = spawnSync(yarn, ['f7:dropdown:build'], { stdio: 'inherit' });
if (buildDropdown.status !== 0) {
  process.exit(buildDropdown.status ?? 1);
}

const buildTooltip = spawnSync(yarn, ['f7:tooltip:build'], { stdio: 'inherit' });
if (buildTooltip.status !== 0) {
  process.exit(buildTooltip.status ?? 1);
}

const buildTabs = spawnSync(yarn, ['f7:tabs:build'], { stdio: 'inherit' });
if (buildTabs.status !== 0) {
  process.exit(buildTabs.status ?? 1);
}

const buildAccordion = spawnSync(yarn, ['f7:accordion:build'], { stdio: 'inherit' });
if (buildAccordion.status !== 0) {
  process.exit(buildAccordion.status ?? 1);
}

const buildOffCanvas = spawnSync(yarn, ['f7:offcanvas:build'], { stdio: 'inherit' });
if (buildOffCanvas.status !== 0) {
  process.exit(buildOffCanvas.status ?? 1);
}

const buildToast = spawnSync(yarn, ['f7:toast:build'], { stdio: 'inherit' });
if (buildToast.status !== 0) {
  process.exit(buildToast.status ?? 1);
}

const tsc = spawn(yarn, ['f7:core:watch'], { stdio: 'inherit' });
const revealTsc = spawn(yarn, ['f7:reveal:watch'], { stdio: 'inherit' });
const dropdownTsc = spawn(yarn, ['f7:dropdown:watch'], { stdio: 'inherit' });
const tooltipTsc = spawn(yarn, ['f7:tooltip:watch'], { stdio: 'inherit' });
const tabsTsc = spawn(yarn, ['f7:tabs:watch'], { stdio: 'inherit' });
const accordionTsc = spawn(yarn, ['f7:accordion:watch'], { stdio: 'inherit' });
const offcanvasTsc = spawn(yarn, ['f7:offcanvas:watch'], { stdio: 'inherit' });
const toastTsc = spawn(yarn, ['f7:toast:watch'], { stdio: 'inherit' });
const vite = spawn(
  yarn,
  ['vite', '--host', host, '--port', port, '--strictPort'],
  { stdio: 'inherit' }
);

const children = [tsc, revealTsc, dropdownTsc, tooltipTsc, tabsTsc, accordionTsc, offcanvasTsc, toastTsc, vite];
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
dropdownTsc.on('exit', (code) => shutdown(code ?? 0));
tooltipTsc.on('exit', (code) => shutdown(code ?? 0));
tabsTsc.on('exit', (code) => shutdown(code ?? 0));
accordionTsc.on('exit', (code) => shutdown(code ?? 0));
offcanvasTsc.on('exit', (code) => shutdown(code ?? 0));
toastTsc.on('exit', (code) => shutdown(code ?? 0));
vite.on('exit', (code) => shutdown(code ?? 0));

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
