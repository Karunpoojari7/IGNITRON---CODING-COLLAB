const fs = require('fs');
const path = require('path');

const requiredAssets = [
  'apps/frontend/public/gmu-logo.png',
  'apps/frontend/public/ignitron-logo.png',
  'apps/frontend/public/coding-collab-logo.png',
  'apps/frontend/public/logo-icon.svg'
];

let hasError = false;
for (const asset of requiredAssets) {
  const p = path.resolve(__dirname, '..', asset);
  if (!fs.existsSync(p)) {
    console.error('[FAIL] Missing asset: ' + asset);
    hasError = true;
  } else {
    const stat = fs.statSync(p);
    console.log('[OK] ' + asset + ' (' + stat.size + ' bytes)');
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log('All branding assets verified successfully.');
}
