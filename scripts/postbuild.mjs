// After `next build` (static export): write out/precache-manifest.json and stamp the build id into out/sw.js
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'out';
if (!fs.existsSync(OUT)) {
  console.log('postbuild: no out/ folder (not a static export) - skipped');
  process.exit(0);
}
const buildId = fs.existsSync('.next/BUILD_ID') ? fs.readFileSync('.next/BUILD_ID', 'utf8').trim() : String(Date.now());

const urls = new Set(['/']);
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = '/' + path.relative(OUT, full).split(path.sep).join('/');
    if (fs.statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (rel === '/sw.js' || rel === '/precache-manifest.json' || rel.endsWith('.map')) continue;
    if (rel === '/404.html' || rel.startsWith('/404')) continue;
    if (rel.endsWith('.html')) {
      // Firebase Hosting cleanUrls: /orders.html -> /orders, /index.html -> /
      const clean = rel === '/index.html' ? '/' : rel.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
      urls.add(clean);
    } else if (/\.(js|css|txt|png|webmanifest|woff2?)$/.test(rel)) {
      urls.add(rel);
    }
  }
}
walk(OUT);

const list = [...urls].sort();
fs.writeFileSync(path.join(OUT, 'precache-manifest.json'), JSON.stringify({ buildId, urls: list }));
const swPath = path.join(OUT, 'sw.js');
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace(/__BUILD_ID__/g, buildId));
console.log(`postbuild: precache ${list.length} files, sw version wb-${buildId}`);
