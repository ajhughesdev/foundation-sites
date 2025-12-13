const fs = require('fs');

const target = process.argv[2];
if (!target) {
  // eslint-disable-next-line no-console
  console.error('Usage: node scripts/f7-clean-dist.js <path>');
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });

