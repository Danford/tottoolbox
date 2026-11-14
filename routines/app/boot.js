// Tot Routines starts here: it opens this phone's copy (vault.js), then loads the page's scripts in order.
// A copy that's locked with a key not on this phone (it was moved or restored here) asks first for the backup
// key, or an invite scanned from another family phone (which gives the family's secret).
const PAGE = ['data.js', 'activities.js', 'logic.js', 'media.js', 'cutout.js', 'sync.js', 'vendor/qrcode.js', 'vendor/jsQR.js', 'app.js'];
function loadScripts(srcs) {
  return Promise.all(srcs.map(src => new Promise((ok, bad) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false; // in this order
    s.onload = ok;
    s.onerror = () => bad(new Error(`${src} didn't load`));
    document.body.append(s);
  })));
}
// What went wrong while starting, shown (oops) if the page doesn't get to a screen, rather than a blank page.
const bootErrors = [];
addEventListener('error', e => bootErrors.push(e.error ? e.error.stack || e.error.message : `${e.message} (${e.filename}:${e.lineno})`));
addEventListener('unhandledrejection', e => bootErrors.push(e.reason ? e.reason.stack || e.reason.message || String(e.reason) : 'unknown'));
// open: how to go on without what failed (app.js's start), if there is a way.
// The app's copy of the page's errors is in full; it hears of them a moment after, so it's read again then.
function oops(why, open) {
  const el = id => document.getElementById(id);
  const tell = () => el('oopsWhy').textContent = `Tot Routines ${window.Android ? Android.version() : ''}\n${navigator.userAgent}\n\n${why}${
    window.Android && Android.pageErrors ? '\n\n' + Android.pageErrors() : ''}`;
  tell();
  setTimeout(tell, 1000);
  el('oopsOpen').hidden = !open;
  el('oopsOpen').onclick = open;
  el('oopsAgain').onclick = () => location.reload();
  document.body.dataset.screen = 'oops';
}
// On the web, the newest things the page leans on, and the browser's own locks (only on an https page).
const browserTooOld = !window.Android && !(window.crypto && crypto.subtle && Object.hasOwn && Array.prototype.at);
(async () => {
  try {
    if (browserTooOld) { oops('This browser is too old for Tot Routines, or the page was not opened over https. On an iPhone it needs iOS 15.4 or newer.'); return; }
    if (await vault.open()) {
      await loadScripts(PAGE);
      if (document.body.dataset.screen === 'boot') oops(bootErrors.join('\n\n') || 'It stopped before its first page.');
      return;
    }
    // Locked. The invite's scanner needs sync.js (talking to the server) and jsQR; both start nothing by themselves.
    await loadScripts(['sync.js', 'vendor/jsQR.js']);
    lockScreen();
  } catch (e) {
    oops([e.stack || e.message, ...bootErrors].join('\n\n'));
  }
})();

function lockScreen() {
  const el = id => document.getElementById(id);
  document.body.dataset.screen = 'locked';
  // Locked while sharing, there may be no backup key: then only the family's invite opens it.
  el('lockFamily').hidden = !vault.forFamily;
  el('lockByKey').hidden = !vault.hasBackup && vault.forFamily;
  el('lockHow').textContent = !vault.forFamily ? 'with the backup key you kept'
    : vault.hasBackup ? 'with the backup key you kept, or from another phone in your family' : 'from another phone in your family';
  const say = text => { el('lockErr').textContent = text; el('lockErr').hidden = !text; };
  const opened = () => location.reload();
  el('lockOpen').onclick = async () => {
    if (!vault.backupBytes(el('lockCode').value)) { say('A backup key is 26 letters and numbers, like XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XX.'); return; }
    if (await vault.unlockWithBackup(el('lockCode').value)) opened();
    else say("That backup key doesn't open this. Check each letter and number, or use a newer key if you made one.");
  };

  // Scanning, as the share sheet does (app.js), a few frames a second.
  let cam = null;
  const video = document.createElement('video'), canvas = document.createElement('canvas');
  video.muted = true;
  video.setAttribute('playsinline', '');
  const stop = () => { if (cam) cam.getTracks().forEach(t => t.stop()); cam = null; el('lockScanBox').hidden = true; };
  el('lockScan').onclick = async () => {
    say('');
    try {
      cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    } catch (e) {
      say(e.name === 'NotAllowedError' ? "Scanning needs the camera. Allow it for Tot Routines in the phone's Settings, then try again." : "The camera wouldn't start (" + e.message + ').');
      return;
    }
    video.srcObject = cam;
    el('lockScanBox').append(video);
    el('lockScanBox').hidden = false;
    video.play().catch(() => {});
    frame();
  };
  function frame() {
    if (!cam) return;
    const w = video.videoWidth, h = video.videoHeight;
    if (w && h) {
      const s = Math.min(1, 640 / Math.max(w, h)), cw = Math.round(w * s), ch = Math.round(h * s);
      canvas.width = cw;
      canvas.height = ch;
      const g = canvas.getContext('2d', { willReadFrequently: true });
      g.drawImage(video, 0, 0, cw, ch);
      const qr = jsQR(g.getImageData(0, 0, cw, ch).data, cw, ch, { inversionAttempts: 'dontInvert' });
      if (qr && inviteCode(qr.data)) { stop(); joined(qr.data); return; }
    }
    setTimeout(frame, 150);
  }
  async function joined(text) {
    let invite, secret;
    try {
      invite = await inviteOpen(text);
      secret = invite.secret;
    } catch (e) {
      say(e.status ? e.message : "Couldn't reach the sharing server. Check the internet connection and try again.");
      return;
    }
    if (await vault.unlockWithFamily(secret)) { opened(); return; }
    // Another family's invite (or this copy stopped sharing before it was moved): it can't open this copy,
    // but the phone can join that family afresh.
    if (confirm("That invite is from a family this phone's copy wasn't shared with, so it can't unlock it. Start over on this phone and join that family instead? What's locked here is erased.")) {
      await eraseAll();
      localStorage.setItem(SYNC_KEY, JSON.stringify(await joinInfo(invite)));
      opened();
    }
  }

  el('lockErase').onclick = async () => {
    if (!confirm("Start over without what's locked here? It's erased from this phone: children, routines, the journal and its photos and videos. A family you shared with still has its copy, and you can join it again.")) return;
    await eraseAll();
    opened();
  };
}
// Everything locked on this phone, gone: the page's (vault.js, the journal's photos and videos) and the app's.
async function eraseAll() {
  vault.erase();
  await new Promise((ok, bad) => { const r = indexedDB.deleteDatabase('tot-routines'); r.onsuccess = ok; r.onerror = () => bad(r.error); r.onblocked = ok; });
  if (window.Android) Android.vaultErase();
}
