// Tot Potty on the web: every file cached at install, served from the cache first, so it opens offline.
// Written by scripts/publish-apps.js; the cache name changes whenever any file does.
const CACHE = 'potty-4dd425df852b';
const FILES = ["./","app.js","art.js","boot.js","fonts/Fraunces-OFL.txt","fonts/fraunces.woff2","guide.js","icon-512.png","kidmode.js","learn.js","logic.js","manifest.webmanifest","screens.js","start.js","style.css","sync.js","vault.js","vendor/jsQR-LICENSE.txt","vendor/jsQR.js","vendor/qrcode.js"];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
