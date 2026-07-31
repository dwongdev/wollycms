import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const packageDir = process.argv[2];
if (!packageDir) {
  console.error('Usage: node scripts/publish-if-needed.mjs <package-directory>');
  process.exit(2);
}

const manifest = JSON.parse(
  await readFile(resolve(packageDir, 'package.json'), 'utf8'),
);
const spec = `${manifest.name}@${manifest.version}`;
const existing = spawnSync('npm', ['view', spec, 'version', '--json'], {
  encoding: 'utf8',
});

if (existing.status === 0) {
  const publishedVersion = JSON.parse(existing.stdout);
  if (publishedVersion === manifest.version) {
    console.log(`${spec} is already published; skipping.`);
    process.exit(0);
  }
}

console.log(`Publishing ${spec}...`);
const published = spawnSync(
  'npm',
  ['publish', `--workspace=${packageDir}`, '--access', 'public'],
  { stdio: 'inherit' },
);
process.exit(published.status ?? 1);
