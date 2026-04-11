#!/usr/bin/env node
// Static CSP check for the admin SPA build.
//
// Why this exists: WollyCMS issue #65 — the admin shipped with a strict
// `default-src 'self'` CSP from the server, but the built admin HTML had
// inline scripts, inline styles, and an external Google Fonts link. Browsers
// blocked all of it and the admin rendered as a blank page on every fresh
// Node-mode install. The bug only manifested in a real browser, so unit
// tests missed it.
//
// This script catches that exact class of bug at build time. It verifies:
//   1. The built admin HTML contains no external (cross-origin) URLs.
//   2. Every <script>...</script> with body content has a matching
//      sha256 hash in a <meta http-equiv="content-security-policy"> tag.
//   3. There are no inline <style> blocks or `style="..."` attributes.
//   4. The server's security-headers middleware does NOT apply
//      `default-src 'self'` to /admin/* paths (which would override the
//      meta CSP and break the admin).
//
// Run after `npm run build` in packages/admin/. Exits non-zero on violation.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const adminBuildHtml = resolve(repoRoot, 'packages/admin/build/index.html');
const serverApp = resolve(repoRoot, 'packages/server/src/app.ts');

const errors = [];

if (!existsSync(adminBuildHtml)) {
  console.error(`error: ${adminBuildHtml} does not exist. Run \`npm run build\` in packages/admin/ first.`);
  process.exit(1);
}
if (!existsSync(serverApp)) {
  console.error(`error: ${serverApp} does not exist.`);
  process.exit(1);
}

const html = readFileSync(adminBuildHtml, 'utf8');
const serverSrc = readFileSync(serverApp, 'utf8');

// 1. No external (cross-origin) URLs in <link> or <script> src attributes.
//    Same-origin paths and the SvelteKit asset placeholder are fine.
const externalUrlPattern = /(?:href|src)\s*=\s*["']https?:\/\/[^"']+["']/gi;
const externalMatches = [...html.matchAll(externalUrlPattern)];
if (externalMatches.length > 0) {
  errors.push(
    `Found ${externalMatches.length} external URL(s) in admin build/index.html:\n` +
      externalMatches.map((m) => `    ${m[0]}`).join('\n') +
      `\n  Cross-origin resources break strict CSP. Self-host fonts/scripts instead.`,
  );
}

// 2. Extract the meta CSP and collect script-src/style-src hashes from it.
//    The content attribute typically holds single-quoted CSP keywords like
//    'self' and 'sha256-...', so we have to capture between matching outer
//    quotes (not stop at the first inner quote of the wrong kind).
const metaCspMatch =
  html.match(
    /<meta\s+http-equiv\s*=\s*["']content-security-policy["']\s+content\s*=\s*"([^"]+)"/i,
  ) ||
  html.match(
    /<meta\s+http-equiv\s*=\s*["']content-security-policy["']\s+content\s*=\s*'([^']+)'/i,
  );
const metaCsp = metaCspMatch ? metaCspMatch[1] : '';
const hashFromCsp = (directive) => {
  const re = new RegExp(`${directive}\\s+([^;]+)`, 'i');
  const m = metaCsp.match(re);
  if (!m) return new Set();
  return new Set(
    [...m[1].matchAll(/'sha256-([A-Za-z0-9+/=]+)'/g)].map((x) => x[1]),
  );
};
const scriptHashes = hashFromCsp('script-src');
const styleHashes = hashFromCsp('style-src');

// 3. Every inline <script>...</script> body must have a matching sha256 in script-src.
//    Inline meaning a <script> tag without a src attribute that has non-empty body content.
const inlineScriptPattern = /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
for (const match of html.matchAll(inlineScriptPattern)) {
  const body = match[1];
  if (!body.trim()) continue;
  const hash = createHash('sha256').update(body).digest('base64');
  if (!scriptHashes.has(hash)) {
    errors.push(
      `Inline <script> in admin build/index.html has no matching sha256 in meta CSP script-src.\n` +
        `  Computed hash: 'sha256-${hash}'\n` +
        `  CSP hashes:    ${[...scriptHashes].map((h) => `'sha256-${h}'`).join(', ') || '(none)'}\n` +
        `  First 80 chars of body: ${body.trim().slice(0, 80).replace(/\n/g, ' ')}...`,
    );
  }
}

// 4. No inline <style>...</style> blocks unless hashed in style-src.
const inlineStylePattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
for (const match of html.matchAll(inlineStylePattern)) {
  const body = match[1];
  if (!body.trim()) continue;
  const hash = createHash('sha256').update(body).digest('base64');
  if (!styleHashes.has(hash)) {
    errors.push(
      `Inline <style> block in admin build/index.html has no matching sha256 in meta CSP style-src.\n` +
        `  Computed hash: 'sha256-${hash}'\n` +
        `  First 80 chars: ${body.trim().slice(0, 80).replace(/\n/g, ' ')}...`,
    );
  }
}

// 5. No `style="..."` inline style attributes. These can't be hashed without
//    'unsafe-hashes' and we want to avoid that entirely.
const inlineStyleAttrPattern = /\sstyle\s*=\s*["'][^"']*["']/gi;
const styleAttrMatches = [...html.matchAll(inlineStyleAttrPattern)];
if (styleAttrMatches.length > 0) {
  errors.push(
    `Found ${styleAttrMatches.length} inline style="..." attribute(s) in admin build/index.html.\n` +
      `  Move these to a CSS class. Inline style attributes are blocked by strict CSP.`,
  );
}

// 6. Server middleware must NOT apply strict CSP to /admin/* paths. Anything
//    other than frame-ancestors would intersect with SvelteKit's meta CSP and
//    drop the script-src hash, breaking the admin.
const middlewareMatch = serverSrc.match(
  /\/\/\s*Security headers[\s\S]*?app\.use\(['"]\*['"]\s*,[\s\S]*?\}\);/,
);
if (!middlewareMatch) {
  errors.push(
    `Could not locate the security-headers middleware in packages/server/src/app.ts.\n` +
      `  This check needs that block to verify /admin/* CSP behavior. If the middleware\n` +
      `  was renamed or moved, update scripts/check-admin-csp.mjs to match.`,
  );
} else {
  const block = middlewareMatch[0];
  const hasAdminGuard =
    /c\.req\.path\.startsWith\(['"]\/admin['"]\)/.test(block) ||
    /c\.req\.path\.match\(\/\^\\\/admin/.test(block);
  if (!hasAdminGuard) {
    errors.push(
      `packages/server/src/app.ts security-headers middleware does not appear to\n` +
        `  branch on c.req.path.startsWith('/admin'). The strict default-src 'self'\n` +
        `  CSP must be skipped (or narrowed to frame-ancestors only) for /admin/*\n` +
        `  responses, otherwise it will intersect with SvelteKit's meta CSP and\n` +
        `  drop the script-src hash, blanking the admin (issue #65).`,
    );
  }
}

if (errors.length > 0) {
  console.error('\n[check-admin-csp] FAILED with the following issue(s):\n');
  for (const e of errors) console.error('- ' + e + '\n');
  console.error(
    'Background: https://github.com/wollycms/wollycms/issues/65 — strict CSP must be',
  );
  console.error('compatible with the built admin SPA, including SvelteKit hash directives.');
  process.exit(1);
}

console.log('[check-admin-csp] OK — admin build CSP looks consistent.');
console.log(`  - external URLs: 0`);
console.log(`  - inline scripts hashed: ${scriptHashes.size}`);
console.log(`  - inline style attributes: 0`);
console.log(`  - server middleware skips strict CSP on /admin/*: yes`);
