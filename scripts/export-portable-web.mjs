#!/usr/bin/env node
/**
 * Builds a subpath-portable static web bundle for PawCast that runs cleanly at:
 *   - Root domains (Vercel, Cloudflare Pages, Netlify)
 *   - Subpaths (GitHub Pages `/pawcast/`, static subdirectories)
 *
 * Usage:
 *   node scripts/export-portable-web.mjs [outputDir]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const APP_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..'
);
const outDir = path.resolve(
  process.argv[2] || '/tmp/pawcast-web-dist'
);

console.log(`Exporting PawCast web bundle -> ${outDir}`);
execFileSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', outDir], {
  cwd: APP_DIR,
  stdio: 'inherit',
});

// Rewrite Expo's root-relative HTML asset tags to relative (`./`) so subpath hosting
// (such as GitHub Pages `/pawcast/` or static subdirectories) resolves JS bundles,
// favicon, manifest, and icons without 404s.
const indexHtmlPath = path.join(outDir, 'index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf8');
html = html
  .replace(/href="\/favicon\.ico"/g, 'href="./favicon.ico"')
  .replace(/src="\/_expo\//g, 'src="./_expo/')
  .replace(/href="\/_expo\//g, 'href="./_expo/')
  .replace(/href="\/manifest\.json"/g, 'href="./manifest.json"')
  .replace(/href="\/apple-touch-icon\.png"/g, 'href="./apple-touch-icon.png"')
  .replace(/content="\/icon-512\.png"/g, 'content="./icon-512.png"');

fs.writeFileSync(indexHtmlPath, html, 'utf8');
// Ensure GitHub Pages serves the underscore-prefixed `_expo/` directory without Jekyll stripping it
fs.writeFileSync(path.join(outDir, '.nojekyll'), '', 'utf8');

// Verify no accidental root-relative script/link/img paths remain in index.html
const rootRelMatches = html.match(/(?:src|href)="\/[^/][^"]*"/g) || [];
if (rootRelMatches.length > 0) {
  throw new Error(
    `Found unexpected root-relative URLs in exported index.html: ${rootRelMatches.join(', ')}`
  );
}

const scriptMatch = html.match(/src="(\.\/_expo\/static\/js\/web\/[^"]+\.js)"/);
if (!scriptMatch) {
  throw new Error('Could not find relative ./_expo JS bundle tag in index.html');
}

const jsBundlePath = path.join(outDir, scriptMatch[1].replace(/^\.\//, ''));
const jsContent = fs.readFileSync(jsBundlePath, 'utf8');
if (jsContent.includes('"/park-thumbs/')) {
  throw new Error('Found root-relative "/park-thumbs/ path inside compiled JS bundle');
}

console.log(`Portable web export verified OK:`);
console.log(`  index.html -> ${indexHtmlPath}`);
console.log(`  JS bundle  -> ${scriptMatch[1]} (${fs.statSync(jsBundlePath).size.toLocaleString()} bytes)`);
