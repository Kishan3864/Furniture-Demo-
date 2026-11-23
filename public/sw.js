/* FurniCraft service worker.
 * - Precaches the whole app (pages + JS/CSS) listed in /precache-manifest.json (generated at build)
 *   so the installed app opens instantly and works offline.
 * - Firestore data is cached separately by the Firestore SDK (IndexedDB).
 * - __BUILD_ID__ is replaced at build time, so every deploy installs a fresh worker.
 */
const VERSION = 'wb-__BUILD_ID__';
const APP = `${VERSION}-app`;
const RUNTIME = `${VERSION}-runtime`;
const IMAGES = 'wb-images-v1';

// Dynamic routes are exported once as "_" placeholders (see firebase.json rewrites)
const DYNAMIC = [
  [/^\/orders\/[^/]+\/edit(\.txt)?$/, '/orders/_/edit'],
  [/^\/(orders|customers|karigar|jobs|status)\/(?!new(\.txt)?$)[^/]+?(\.txt)?$/, (m) => `/${m[1]}/_`],
  [/^\/print\/(bill|receipt)\/[^/]+?(\.txt)?$/, (m) => `/print/${m[1]}/_`],
];

function placeholderFor(pathname) {
  const isTxt = pathname.endsWith('.txt');
  for (const [re, to] of DYNAMIC) {
    const m = pathname.match(re);
    if (m) {
      const base = typeof to === 'function' ? to(m) : to;
      return isTxt ? `${base}.txt` : base;
    }
  }
  return null;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP);
      let urls = ['/', '/login', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];
      try {
        const res = await fetch('/precache-manifest.json', { cache: 'no-store' });
        if (res.ok) urls = (await res.json()).urls || urls;
      } catch {
        /* offline during install - keep the minimal list */
      }
      // add in small batches; a single failure must not break install
      for (let i = 0; i < urls.length; i += 12) {
        await Promise.allSettled(urls.slice(i, i + 12).map((u) => cache.add(new Request(u, { cache: 'reload' }))));
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('wb-') && !k.startsWith(VERSION) && k !== IMAGES).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function isImageHost(url) {
  return url.hostname === 'firebasestorage.googleapis.com' || url.hostname.endsWith('.firebasestorage.app');
}

async function fromCache(pathname) {
  return (
    (await caches.match(pathname, { ignoreSearch: true })) ||
    (placeholderFor(pathname) ? await caches.match(placeholderFor(pathname), { ignoreSearch: true }) : undefined)
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cloud Storage images: stale-while-revalidate
  if (isImageHost(url)) {
    event.respondWith(
      caches.open(IMAGES).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js' || url.pathname === '/precache-manifest.json') return;

  // Hashed build assets + icons: cache first
  if (url.pathname.startsWith('/_next/static/') || /\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) (await caches.open(RUNTIME)).put(req, res.clone());
        return res;
      })(),
    );
    return;
  }

  // Pages (HTML) and page data (.txt): network first with a short timeout, then cache
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.txt');
  if (!isPage) return;
  event.respondWith(
    (async () => {
      try {
        const res = await Promise.race([
          fetch(req),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
        ]);
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(url.pathname, copy));
        }
        return res;
      } catch {
        const cached = await fromCache(url.pathname);
        if (cached) return cached;
        if (req.mode === 'navigate') return (await caches.match('/', { ignoreSearch: true })) || Response.error();
        return Response.error();
      }
    })(),
  );
});
