#!/usr/bin/env node
// Copies the Expo static export from dist/ to the repo root so GitHub Pages
// (which serves from the gh-pages branch root) picks up the latest build.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src  = path.join(root, 'dist');

function copyRecursive(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// _expo/static/js/web/ uses a content hash per build, so a stale bundle from
// the previous deploy never gets overwritten by the copy below — it just sits
// there accumulating forever. Clear it first so only the current build's
// files are ever present (and tracked in git) at the destination.
const expoDir = path.join(root, '_expo');
fs.rmSync(expoDir, { recursive: true, force: true });

copyRecursive(src, root);

// Ensure .nojekyll exists so GitHub Pages serves _expo/ and _sitemap.html
const nojekyll = path.join(root, '.nojekyll');
if (!fs.existsSync(nojekyll)) fs.writeFileSync(nojekyll, '');

console.log('Copied dist/ → repo root');
