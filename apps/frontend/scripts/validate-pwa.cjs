const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../dist/manifest.webmanifest');
if (!fs.existsSync(manifestPath)) {
  console.error('manifest.webmanifest not found. Build first.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
let hasError = false;

for (const icon of manifest.icons || []) {
  const iconPath = path.join(__dirname, '../dist', icon.src);
  if (!fs.existsSync(iconPath)) {
    console.error(`Missing icon referenced in manifest: ${icon.src}`);
    hasError = true;
  } else {
    console.log(`Verified icon exists: ${icon.src}`);
  }
}

if (hasError) {
  process.exit(1);
}
console.log('PWA Manifest and icons validated successfully.');
