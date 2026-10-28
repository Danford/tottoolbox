// Tot Potty: reminders, sharing with the other grown-ups' phones, what the app tells the page, and the start.

// ---- Reminders ----
// The app keeps its own copy of reminderList() and sets the alarms; send it whenever anything changes.
function syncReminders() {
  if (!phone) return;
  const mine = new Set(Object.keys(state.kids).filter(id => !state.priv.mute[id]));
  Android.setReminders(JSON.stringify(reminderList(state, Date.now(), mine)));
}
// A notification was tapped: its screen.
window.openFromReminder = screen => {
  if (!isSetUp() || !Object.hasOwn(OPEN, screen)) return;
  closeSheets();
  OPEN[screen]();
};
// What was tapped on the timer's alarm screen, kept by the app until the page runs: [{kid, t, at}], logged as
// if tapped on home then, and home shows the last one's child, with confetti and the sticker for a win.
window.takeAlarmLogs = () => {
  if (!phone || !isSetUp()) return;
  const taken = JSON.parse(Android.takeAlarmLogs()).filter(x => state.kids[x.kid] && Object.hasOwn(EVENT, x.t) && Number.isFinite(x.at));
  if (!taken.length) return;
  const before = { ...state.timers }, ids = taken.map(x => logEvent(x.t, { kid: x.kid, at: x.at })), last = taken.at(-1);
  state.priv.cur = last.kid;
  saveLocal();
  closeSheets();
  goHome();
  const undo = { label: 'Undo', fn: () => {
    for (const id of ids) removeEvent(id);
    for (const x of taken) if (before[x.kid]) state.timers[x.kid] = before[x.kid];
    save();
    renderHome();
  } };
  const words = taken.filter(x => x.kid === last.kid).map(x => quickWords(x.t, state.kids[x.kid]) || EVENT[x.t].short).join(', ');
  const win = taken.findLastIndex(x => WINS.has(x.t));
  const star = win < 0 ? null : state.stars[taken[win].kid]?.[ids[win]];
  // On the first frame drawn: the app is still coming up from the alarm screen, and the confetti only lasts a moment.
  if (win >= 0) requestAnimationFrame(() => party(star && star.e, true));
  toast(`${EVENT[last.t].emoji} Logged for ${esc(state.kids[last.kid].name)}: ${esc(words)}${star ? ` ${star.e} sticker` : ''}`, [undo]);
};
// Notifications or exact alarms were allowed or refused, or the grown-up is back from the phone's Settings.
window.permsChanged = () => { if (document.body.dataset.screen === 'setup' && isSetUp()) renderNotifyRow(); syncReminders(); };

// ---- Opened from Tot Routines, for one of its children ----
// {rid (Tot Routines' id for the child), name, birth, open (a screen)}: the child here is found by that id, else
// by name (and linked); one not here yet is added, with what Tot Routines knows.
window.openFromRoutines = () => {
  const j = phone ? Android.takeFromRoutines() : null;
  if (!j) return;
  let k;
  try { k = JSON.parse(j); } catch (e) { console.error('Tot Routines sent something that isn\'t JSON:', j); return; }
  const rid = typeof k.rid === 'string' && safeKey(k.rid) ? k.rid : '', name = typeof k.name === 'string' ? k.name.trim().slice(0, 30) : '';
  const birth = /^\d{4}-\d{2}-\d{2}$/.test(k.birth || '') ? k.birth : '', screen = Object.hasOwn(OPEN, k.open) ? k.open : 'home';
  const ids = Object.keys(state.kids), low = s => s.trim().toLowerCase();
  const id = ids.find(i => rid && state.kids[i].rid === rid) || ids.find(i => !state.kids[i].rid && name && low(state.kids[i].name) === low(name));
  closeSheets();
  if (id) {
    if (rid && state.kids[id].rid !== rid) { state.kids[id].rid = rid; save(); }
    state.priv.cur = id;
    saveLocal();
    if (isSetUp()) OPEN[screen](); else openSetup();
    return;
  }
  if (!name) { if (isSetUp()) goHome(); else openSetup(); return; }
  if (!isSetUp() && !kidList().length) { fromRoutinesKid = { rid, name, birth }; openSetup(); return; }
  openKidEdit(null, { rid, name, birth });
};

// ---- Sharing with the other grown-ups ----
let shareCode = null, shareBusy = false, shareErr = '';
// After a sync: other phones' changes are in `state` when `remote`; show them.
function syncChanged(remote) {
  if (remote) {
    syncReminders();
    const s = document.body.dataset.screen;
    // Joined from the first screen: the children arrived; now this phone says who it is.
    if (!isSetUp()) { if ($('shareSheet').classList.contains('open')) closeSheets(); openSetup(); }
    else if (s !== 'kidEdit' && s !== 'setup' && !$('logSheet').classList.contains('open')) redraw();
  }
  renderShareCard();
  if ($('shareSheet').classList.contains('open')) renderShare();
}
const syncedAt = () => syncInfo && syncInfo.at ? fmtTime(syncInfo.at) : '';
function renderShareCard() {
  const [title, sub] = !syncOn() ? ['Share with other grown-ups', 'A partner, grandparent or nanny: everyone logs, everyone sees']
    : syncInfo.error ? ['Sharing: not synced', syncInfo.error === 'offline' ? 'Offline' : syncInfo.error === 'unknown' ? 'Paused' : 'Trying again']
    : ['Sharing is on', syncedAt() ? 'Synced ' + syncedAt() : 'Every phone in step'];
  $('shareCard').innerHTML = `${scatter('share')}<span class="sq">${icon('share')}</span><span class="lbl"><b>${title}</b><small>${sub}</small></span><i class="chev">${icon('chev')}</i>`;
}
function qrSvg(text) {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 6, margin: 4, scalable: true, alt: 'Invite QR code' });
}
const HOW_JOIN = 'On the other phone, get Tot Potty (from Tot Toolbox, or on an iPhone open tottoolbox.com/potty/app), tap 👪 Already set up on another phone?, and point it at this code.';
function renderShare() {
  if (scanning) {
    $('shareBody').innerHTML = `<h2>📷 Scan the invite</h2>
      <p class="muted">On the phone that's already set up, open Tot Potty's menu, tap Sharing, then Invite another phone. Point this phone's camera at the QR code it shows.</p>
      <div class="scan" id="scanBox"></div><p class="advice" id="scanNote" hidden></p>
      <button class="btn big" id="scanCancel">Cancel</button>`;
    $('scanBox').append(scanVideo);
    scanVideo.play().catch(() => {});
    $('scanCancel').onclick = () => { scanStop(); renderShare(); };
    return;
  }
  const code = shareCode ? `<div class="card code"><p class="muted">${HOW_JOIN}</p><div class="qr">${qrSvg(shareCode)}</div>
      <p class="muted">Works once, for the next 15 minutes. Anyone who scans it joins, so show it only to someone you trust with ${esc(kidList().map(k => k.name).join(' and ') || 'your child')}'s log.</p></div>` : '';
  const privacy = `<p class="muted">🔒 Everything is locked on your phones before it's sent. The server keeps only the locked copy, and only your family's phones have the key, so no one else can read it, Tot Toolbox included.</p>`;
  const people = Object.entries(state.people).map(([pid, p]) => esc(p.name) + (pid === state.me ? ' (this phone)' : '')).join(', ');
  const err = shareErr ? `<p class="advice">${esc(shareErr)}</p>` : '';
  $('shareBody').innerHTML = syncOn() ? `<h2>👪 Sharing is on</h2>
    <p class="muted">Sharing with: ${people}. The children, the log, the timers, stickers, the plan and the gear list are the same on every phone. Each phone chooses its own timer reminders.
      ${syncInfo.error && syncInfo.error !== 'unknown' ? 'Not synced just now: ' + esc(syncInfo.error) + '. It keeps trying.' : syncedAt() ? 'Last synced ' + syncedAt() + '.' : ''}</p>
    ${syncInfo.error === 'unknown' ? `<p class="advice">Sharing is paused: the sharing server doesn't recognize this family right now. It tries again every half hour. If it stays like this, tap Stop sharing on every phone, then invite again: each phone keeps everything it has.</p>` : ''}
    ${privacy}${code}${err}
    <button class="btn primary big" id="shareInvite"${shareBusy ? ' disabled' : ''}>Invite another phone</button>
    <button class="btn big" id="shareLeave">Stop sharing on this phone</button>
    <button class="btn big" data-close>Done</button>` : `<h2>👪 Share with other grown-ups</h2>
    <p class="muted">A partner, grandparent, nanny or sitter: each logs on their own phone, and everyone sees the day, the timer and the stickers as they happen. As many phones as you like, Android and iPhone (Tot Potty on the web).</p>
    ${privacy}${err}
    <button class="btn primary big" id="shareInvite"${shareBusy ? ' disabled' : ''}>Invite another phone</button>
    <h3>Already set up on another phone?</h3>
    <button class="btn big" id="shareScan"${shareBusy ? ' disabled' : ''}>📷 Scan the invite</button>
    <button class="btn big" data-close>Cancel</button>`;
  $('shareInvite').onclick = () => {
    if (!isSetUp()) { shareErr = 'Save your name and your child first, then invite.'; renderShare(); return; }
    shareStep(async () => { if (!syncOn()) await syncCreate(); shareCode = (await syncInvite()).text; });
  };
  if (syncOn()) {
    $('shareLeave').onclick = () => {
      if (!confirm('Stop sharing on this phone? It keeps its own copy; changes stop going to and from the other phones.')) return;
      syncLeave();
      shareCode = null;
      renderShare();
      renderShareCard();
    };
  } else $('shareScan').onclick = scanStart;
}
// Scanning an invite: the camera shows in the sheet and a few frames a second are checked (vendor/jsQR.js).
const scanVideo = document.createElement('video');
scanVideo.muted = true;
scanVideo.setAttribute('playsinline', '');
const scanCanvas = document.createElement('canvas');
let scanning = null;
async function scanStart() {
  shareErr = '';
  try {
    scanning = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  } catch (e) {
    shareErr = e.name === 'NotAllowedError' ? "Scanning needs the camera. Allow it for Tot Potty in the phone's Settings, then try again."
      : e.name === 'NotFoundError' ? "This phone's camera couldn't be found." : "The camera wouldn't start (" + e.message + ').';
    renderShare();
    return;
  }
  scanVideo.srcObject = scanning;
  renderShare();
  scanFrame();
}
function scanStop() {
  if (!scanning) return;
  scanning.getTracks().forEach(t => t.stop());
  scanning = null;
  scanVideo.srcObject = null;
}
function scanFrame() {
  if (!scanning) return;
  const w = scanVideo.videoWidth, h = scanVideo.videoHeight;
  if (w && h) {
    const s = Math.min(1, 640 / Math.max(w, h)), cw = Math.round(w * s), ch = Math.round(h * s);
    scanCanvas.width = cw;
    scanCanvas.height = ch;
    const g = scanCanvas.getContext('2d', { willReadFrequently: true });
    g.drawImage(scanVideo, 0, 0, cw, ch);
    const qr = jsQR(g.getImageData(0, 0, cw, ch).data, cw, ch, { inversionAttempts: 'dontInvert' });
    if (qr && inviteCode(qr.data)) {
      scanStop();
      if (kidList().length && !confirm("Join the other phones? This phone's children and log are replaced by the shared ones.")) { renderShare(); return; }
      shareStep(() => syncJoin(qr.data));
      return;
    }
    if (qr && qr.data) { $('scanNote').textContent = "That QR code isn't a Tot Potty invite."; $('scanNote').hidden = false; }
  }
  setTimeout(scanFrame, 150);
}
async function shareStep(fn) {
  shareBusy = true;
  shareErr = '';
  renderShare();
  try {
    await fn();
  } catch (e) {
    console.error('shareStep error:', e);
    shareErr = e.status ? e.message : e instanceof TypeError ? `App error: ${e.message}`
      : e.message && e.message !== 'Failed to fetch' ? e.message : "Couldn't reach the sharing server. Check the internet connection and try again.";
  }
  shareBusy = false;
  renderShare();
  renderShareCard();
}
const openShare = () => { closeSheets(); shareErr = ''; shareCode = null; renderShare(); $('shareSheet').classList.add('open'); };
$('shareCard').onclick = openShare;
$('shareBtn2').onclick = openShare;
$('setupJoin').onclick = () => { openShare(); scanStart(); };
// The menu: the round button at home's bottom left opens it and, turned to a ×, closes it; so does a tap beside it.
$('menuBtn').onclick = () => { const on = !$('menuSheet').classList.contains('open'); closeSheets(); if (on) $('menuSheet').classList.add('open'); };
$('menuSheet').onclick = e => { if (e.target === $('menuSheet')) closeSheets(); };
document.querySelectorAll('[data-ic]').forEach(e => { e.innerHTML = icon(e.dataset.ic); });
document.querySelectorAll('[data-sc]').forEach(e => { e.outerHTML = scatter(e.dataset.sc); });
$('routinesBtn').onclick = () => { closeSheets(); Android.openRoutines(); };

// The app tells the page when it goes into and comes back from the background; the camera isn't kept on, and a
// change saved in the last moment still goes, so the other phones hear of it now.
window.appPaused = () => { syncStop(); if (syncOn()) syncNow(); if (scanning) { scanStop(); renderShare(); } };
window.appResumed = () => {
  if (syncOn()) { syncNow(); syncListen(); }
  tellFamily();
  if (isSetUp() && document.body.dataset.screen === 'home') renderHome();
  takeAlarmLogs();
};
// Android back: close a sheet, else back a screen; at home, false lets the app close. Kid mode stays.
window.goBack = () => {
  const s = document.body.dataset.screen;
  if (s === 'kidmode') { toast('Grown-ups: hold the lock to leave.'); return true; }
  if (document.querySelector('.sheet.open')) { closeSheets(); return true; }
  if (!isSetUp()) return false;
  if (s === 'kidEdit' || s === 'about') { openSetup(); return true; }
  if (s === 'learn' && learnBack) { learnBack(); return true; }
  if (s !== 'home') { goHome(); return true; }
  return false;
};

// ---- The start ----
if (isSetUp()) goHome(); else openSetup();
if (phone) { openFromRoutines(); tellFamily(); }
// In a browser: the same pausing and resuming the app does, a service worker so it opens offline, and asking
// the browser not to clear what's stored.
if (!phone) {
  document.addEventListener('visibilitychange', () => { if (document.hidden) appPaused(); else appResumed(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
  if (navigator.storage?.persist) navigator.storage.persist();
}
// Alarms are the app's copy of the reminders; refresh it in case this is the first start after an update.
syncReminders();
if (syncOn()) { syncNow(); syncListen(); }
if (phone) { const launch = Android.takeLaunch(); if (launch) openFromReminder(launch); takeAlarmLogs(); }
