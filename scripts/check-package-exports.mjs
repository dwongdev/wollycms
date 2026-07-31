import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirs = ['packages/server', 'packages/astro', 'packages/create-wolly'];
const missing = [];

async function checkTarget(packageDir, label, target) {
  if (typeof target !== 'string') return;
  const path = resolve(root, packageDir, target.replace(/^\.\//, ''));
  try {
    await access(path);
  } catch {
    missing.push(`${packageDir}: ${label} points to missing ${target}`);
  }
}

for (const packageDir of packageDirs) {
  const manifestPath = resolve(root, packageDir, 'package.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  for (const [name, target] of Object.entries(manifest.exports ?? {})) {
    await checkTarget(packageDir, `export ${name}`, target);
  }
  for (const [name, target] of Object.entries(manifest.bin ?? {})) {
    await checkTarget(packageDir, `binary ${name}`, target);
  }
}

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('All published package exports and binaries resolve to files.');
