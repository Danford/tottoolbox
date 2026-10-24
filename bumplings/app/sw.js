// Bumplings on the web: every file cached at install, served from the cache first, so it opens offline.
// Written by scripts/publish-apps.js; the cache name changes whenever any file does.
const CACHE = 'bumplings-6f6de46ac07b';
const FILES = ["./","app.js","art.js","boot.js","care.js","growth.js","icon-512.png","img/week-04.jpg","img/week-05.jpg","img/week-06.jpg","img/week-07.jpg","img/week-08.jpg","img/week-09.jpg","img/week-10.jpg","img/week-11.jpg","img/week-12.jpg","img/week-13.jpg","img/week-14.jpg","img/week-15.jpg","img/week-16.jpg","img/week-17.jpg","img/week-18.jpg","img/week-19.jpg","img/week-20.jpg","img/week-21.jpg","img/week-22.jpg","img/week-23.jpg","img/week-24.jpg","img/week-25.jpg","img/week-26.jpg","img/week-27.jpg","img/week-28.jpg","img/week-29.jpg","img/week-30.jpg","img/week-31.jpg","img/week-32.jpg","img/week-33.jpg","img/week-34.jpg","img/week-35.jpg","img/week-36.jpg","img/week-37.jpg","img/week-38.jpg","img/week-39.jpg","img/week-40.jpg","logic.js","manifest.webmanifest","pix.js","safe.js","style.css","sync.js","vault.js","vendor/jsQR-LICENSE.txt","vendor/jsQR.js","vendor/qrcode.js","weeks.js"];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
