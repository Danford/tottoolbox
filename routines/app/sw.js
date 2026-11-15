// Tot Routines on the web: every file cached at install, served from the cache first, so it opens offline.
// Written by scripts/web-app.js; the cache name changes whenever any file does.
const CACHE = 'routines-d18859f63070';
const FILES = ["./","activities.js","app.js","boot.js","cutout.js","data.js","fonts/Fraunces-OFL.txt","fonts/fraunces.woff2","icon-512.png","logic.js","manifest.webmanifest","media.js","style.css","sync.js","vault.js","vendor/jsQR-LICENSE.txt","vendor/jsQR.js","vendor/qrcode.js","web.js"];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('routines-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
