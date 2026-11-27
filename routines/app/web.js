// Tot Routines in a browser (tottoolbox.com/routines/app/, for iPhones): what the Android app does for the page,
// here. It opens offline (a service worker, written by scripts/web-app.js), asks the browser to keep what's stored,
// tells the page when it goes into and comes back from the background, and on an iPhone asks the grown-up to add it
// to the Home Screen. An iPhone can clear what a website keeps after 7 days without a visit, and that's the only
// copy of a family that doesn't share. The app has none of this to do, so it stops at the first line.
// Keys and data stay in this browser: localStorage and IndexedDB, through vault.js, media.js and sync.js, the same
// files the Android app runs.
const WEB_LATER = 'tot-web-home-later', WEB_ASK_AGAIN = 3 * 86400e3;
// An iPhone or iPad (which says it's a Mac, but a Mac has no touch screen).
const webOnIos = (n = navigator) => /iPhone|iPad|iPod/.test(n.userAgent) || (n.platform === 'MacIntel' && n.maxTouchPoints > 1);
const webInstalled = () => navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const webNeedsHome = () => webOnIos() && !webInstalled();
function webAskHome() {
  if (!webNeedsHome() || Date.now() - Number(localStorage.getItem(WEB_LATER) || 0) < WEB_ASK_AGAIN) return;
  const box = document.getElementById('homeBody');
  box.innerHTML = `<h2>Add Tot Routines to your Home Screen first</h2>
    <p class="muted">An iPhone can clear what a website keeps after 7 days without a visit: your children, routines and journal on this phone. Added to your Home Screen, it's kept like an app's.</p>
    <p class="muted">What's kept here in Safari may not carry over, so do this before you set anything up or join your family.</p>
    <ol class="steps"><li>Tap the <b>Share</b> button, the square with an arrow.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Open Tot Routines from your Home Screen.</li></ol>
    <button class="btn big" id="homeLater">Not now</button>`;
  document.getElementById('homeLater').onclick = () => {
    localStorage.setItem(WEB_LATER, String(Date.now()));
    document.getElementById('homeSheet').classList.remove('open');
  };
  document.getElementById('homeSheet').classList.add('open');
}
// For Photos and privacy: what this copy can't do, said plainly.
function webLimits() {
  return `<h3>📱 In this browser</h3>
    <p class="muted">Routines, picture charts, day plans, the journal and sharing all work here, and work with Android phones. These need the Android app: reminders and news while it's closed, spoken steps, photos and voices on steps, cutting a child out of their photo, saving to your gallery, and videos over 5 minutes.</p>
    <p class="muted">What's here is kept in this browser, on this phone, locked with a key kept beside it.${webNeedsHome() ? " It isn't on your Home Screen yet, so an iPhone can clear it after 7 days without a visit." : ''}</p>`;
}
if (!window.Android) {
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(e => console.warn(`it won't open offline: ${e.message}`));
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(e => console.warn(`the browser wouldn't promise to keep this: ${e.message}`));
  // As the Android app tells the page (app.js). Not there yet while the page is locked or starting.
  const paused = () => { if (window.appPaused) appPaused(); }, resumed = () => { if (window.appResumed) appResumed(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) paused(); else resumed(); });
  addEventListener('pageshow', e => { if (e.persisted) resumed(); });
  webAskHome();
}
