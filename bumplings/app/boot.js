// Bumplings starts here: it opens what's locked on this phone (vault.js), then loads the page's scripts in order.
// Moved or restored here from another phone, the data key didn't come along (keys never leave a phone): the 🔒
// private photos and entries are unlocked first, with the backup key or an invite scanned from the other phone
// (which gives the family's secret). With neither to open them, they can't be: they go, and the page says so.
// The sharing info is locked too (it holds the family's secret), so it goes with them, and an invite starts
// sharing again.
const PAGE = ['weeks.js', 'growth.js', 'care.js', 'safe.js', 'logic.js', 'art.js', 'pix.js', 'sync.js', 'vendor/qrcode.js', 'vendor/jsQR.js', 'app.js'];
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
(async () => {
  if (await vault.open()) { await loadScripts(PAGE); return; }
  const priv = vault.kept(PRIV_KEY);
  if (priv && (vault.hasBackup || vault.forFamily)) {
    // The invite's scanner needs sync.js (talking to the server) and jsQR; both start nothing by themselves.
    await loadScripts(['sync.js', 'vendor/jsQR.js']);
    lockScreen();
    return;
  }
  vault.erase();
  await loadScripts(PAGE);
  if (priv) alert("Your 🔒 private photos and entries were locked on the phone this came from, with no backup key and no sharing to open them here, so they couldn't come along. Everything shared is here.");
})();

function lockScreen() {
  const el = id => document.getElementById(id);
  document.body.dataset.screen = 'locked';
  el('locked').classList.add('on');
  el('lockFamily').hidden = !vault.forFamily;
  el('lockByKey').hidden = !vault.hasBackup;
  el('lockHow').textContent = !vault.forFamily ? 'with the backup key you kept'
    : vault.hasBackup ? 'with the backup key you kept, or with an invite from the other phone' : 'with an invite from the other phone';
  const say = text => { el('lockErr').textContent = text; el('lockErr').hidden = !text; };
  const opened = () => location.reload();
  el('lockOpen').onclick = async () => {
    if (!vault.backupBytes(el('lockCode').value)) { say('A backup key is 26 letters and numbers, like XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XX.'); return; }
    if (await vault.unlockWithBackup(el('lockCode').value)) opened();
    else say("That backup key doesn't open them. Check each letter and number, or use a newer key if you made one.");
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
      say(e.name === 'NotAllowedError' ? "Scanning needs the camera. Allow it for Bumplings in the phone's Settings, then try again." : "The camera wouldn't start (" + e.message + ').');
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
    let secret;
    try {
      secret = await inviteSecret(text);
    } catch (e) {
      say(e.status ? e.message : "Couldn't reach the sharing server. Check the internet connection and try again.");
      return;
    }
    if (await vault.unlockWithFamily(secret)) { opened(); return; }
    say("That invite can't unlock them: this phone's copy wasn't shared with that family when it was backed up.");
  }

  el('lockErase').onclick = () => {
    if (!confirm("Go on without your 🔒 private photos and entries? They're erased from this phone. Sharing stops too: an invite from the other phone starts it again.")) return;
    vault.erase();
    opened();
  };
}
