const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const scopeDir = path.join(root, 'node_modules', '@foundation');
fs.mkdirSync(scopeDir, { recursive: true });

const packages = [
  { name: 'core', dir: 'packages/core' },
  { name: 'css', dir: 'packages/css' },
  { name: 'reveal', dir: 'packages/reveal' },
  { name: 'dropdown', dir: 'packages/dropdown' },
  { name: 'tooltip', dir: 'packages/tooltip' },
  { name: 'tabs', dir: 'packages/tabs' },
  { name: 'accordion', dir: 'packages/accordion' },
  { name: 'offcanvas', dir: 'packages/offcanvas' },
  { name: 'toast', dir: 'packages/toast' },
];

function resolveLinkTarget(linkPath) {
  try {
    const raw = fs.readlinkSync(linkPath);
    return path.resolve(path.dirname(linkPath), raw);
  } catch {
    return null;
  }
}

for (const pkg of packages) {
  const target = path.join(root, pkg.dir);
  if (!fs.existsSync(target)) continue;

  const linkPath = path.join(scopeDir, pkg.name);
  if (fs.existsSync(linkPath)) {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      const existingTarget = resolveLinkTarget(linkPath);
      if (existingTarget && path.resolve(existingTarget) === path.resolve(target)) continue;
    }

    fs.rmSync(linkPath, { recursive: true, force: true });
  }

  const relativeTarget = path.relative(path.dirname(linkPath), target);
  fs.symlinkSync(relativeTarget, linkPath, 'junction');
}

