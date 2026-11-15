// Tot Routines page: children, their routines, the editor, the guide and the picture chart.
// Everything is kept in localStorage under KEY, through vault.js (sealed while the lock is on). With family sharing on (sync.js), it also goes to the
// family's copy on the sync server, and the other grown-up's changes come back.
const KEY = 'tot-routines';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// Line icons for the grown-ups' screens (the same drawing as Bumplings'), on a 24 grid in the text color (a dot
// is a zero-length line). The child's chart keeps its bright pictures.
const ICON = {
  sleep: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z',
  attention: 'M12 6.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15ZM12 14v-3.5M9.5 2.5h5M12 2.5v4',
  directions: 'M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 4v-4h0A2 2 0 0 1 5 13ZM9 8h6M9 11h4',
  steps: 'M4 20h4.5v-4.5H13V11h4.5V6.5H21M4 20v-1',
  today: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2ZM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4',
  week: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2ZM4 10h16M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01',
  journal: 'M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6ZM6 3v18M4 7.5h3M4 12h3M4 16.5h3M10.5 8h5M10.5 11.5h3',
  camera: 'M3 9a2 2 0 0 1 2-2h2.2l1.6-2.5h6.4L16.8 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM12 9.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z',
  share: 'M9 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14c1.8.9 3 2.9 3 6',
  settings: 'M4 7h9M17 7h3M15 5v4M4 17h3M11 17h9M9 15v4',
  guide: 'M3 5.5c2.6-1.4 5.6-1.3 9 .8 3.4-2.1 6.4-2.2 9-.8v13c-2.6-1.4-5.6-1.3-9 .8-3.4-2.1-6.4-2.2-9-.8ZM12 6.3v13',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  quiet: 'M5 12a7 7 0 0 1 14 0v3H5ZM3 15h18v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM12 5V3',
  tip: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z',
  print: 'M7 9V3.5h10V9M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v6.5H7Z',
  play: 'M8 5.5v13l10.5-6.5Z',
  edit: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16ZM13.5 6.5l4 4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  missed: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM5.6 5.6l12.8 12.8',
  lately: 'M12 3a9 9 0 1 1-8.5 6M3.5 4v5h5M12 7.5V12l3 2',
  family: 'M12 20s-8-4.7-8-10.2A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 8 2.3C20 15.3 12 20 12 20Z',
  lock: 'M6 11a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2ZM8.5 9V7a3.5 3.5 0 0 1 7 0v2M12 14v3',
  speak: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4ZM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
  chev: 'M9.5 6l6 6-6 6',
  // These from Bumplings' art.js, for what it shares.
  appts: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2ZM4 10h16M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01',
  care: 'M9 3.5h6v3H9ZM7 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1M8.5 13.5l2.5 2.5 4.5-4.5',
  kicks: 'M8.5 10.5c1.9 0 3 2 3 4.7S10.4 21 8.5 21s-3-3.1-3-5.8 1.1-4.7 3-4.7ZM6.3 7.6h.01M8.6 7h.01M10.8 7.6h.01M15.5 5.5c1.9 0 3 2 3 4.7S17.4 16 15.5 16s-3-3.1-3-5.8 1.1-4.7 3-4.7ZM13.3 2.6h.01M15.6 2h.01M17.8 2.6h.01',
  bag: 'M4.5 9a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2ZM9 7V5.5a3 3 0 0 1 6 0V7M12 11v6M9 14h6',
  mood: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM8.5 14c.9 1.4 2.1 2.1 3.5 2.1s2.6-.7 3.5-2.1M9 9.5h.01M15 9.5h.01',
  bottle: 'M9.5 7.5h5V9c1.3.8 2 2 2 3.5V19a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-6.5c0-1.5.7-2.7 2-3.5ZM10.5 7.5V5.5a1.5 1.5 0 0 1 3 0v2M7.5 13.5h3.5M7.5 16.5h3.5',
  call: 'M5.5 3.5h3l1.8 4.6-2.3 1.4a11 11 0 0 0 6.5 6.5l1.4-2.3 4.6 1.8v3a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 3.5 5.6a2 2 0 0 1 2-2.1Z',
  drop: 'M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z',
  home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  size: 'M3 8.5h18v7H3ZM7 8.5v3M11 8.5v3M15 8.5v3M19 8.5v3',
};
const icon = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[n]}"/></svg>`;
// An icon on a soft square in a hue (teal unless given: sun, sky, coral, plum).
const sq = (n, hue = '') => `<span class="sq${hue ? ' ' + hue : ''}">${icon(n)}</span>`;
// Done: a tick on a teal round, in place of a ✅; missed, a red circle with a line through it.
const did = (missed = false) => `<span class="did${missed ? ' no' : ''}">${icon(missed ? 'missed' : 'check')}</span>`;
// A news line's emoji (familyNews, newsOf), with those two drawn the same way. Notifications keep the emoji.
const newsEmoji = e => e === '✅' ? did() : e === '🚫' ? did(true) : esc(e);
// Rows down a thin line, as in Bumplings: each [picture, heading, words], the picture (an emoji, a number or a line
// icon) on a soft round. `kind` 'small': a dot on the line instead, for a list of short points; 'avoid': in coral.
const trail = (rows, kind = '') => `<ol class="trail${kind ? ' ' + kind : ''}">${rows.map(([e, name, text]) =>
  `<li><span class="em${typeof e === 'number' ? ' n' : ''}">${kind === 'small' ? '' : e}</span><div>${name ? `<b>${name}</b>` : ''}${text ? `<p>${text}</p>` : ''}</div></li>`).join('')}</ol>`;
const numbered = xs => trail(xs.map((x, i) => [i + 1, x.t, x.d]));
// A list as rows down the same line: each {em (an emoji, or a line icon with `ic` its hue, true for teal, 'ok'
// for a done tick), title, sub (a smaller line under it), more (anything under that), done or missed (a tick or
// the red mark at the end, else `end`), open (attributes that make the words a button)}. `kind` 'flat': no line.
const rowList = (xs, kind = '') => `<ol class="trail rows${kind ? ' ' + kind : ''}">${xs.map(x => {
  const words = `<b>${x.title}</b>${x.sub ? `<p>${x.sub}</p>` : ''}`;
  return `<li${x.done || x.missed ? ' class="over"' : ''}><span class="em${x.ic ? ' ic' + (x.ic === true ? '' : ' ' + x.ic) : ''}">${x.em}</span><div>${
    x.open ? `<span class="lately" role="button" tabindex="0" ${x.open}>${words}</span>` : words}${x.more || ''}</div>${
    x.done ? did() : x.missed ? did(true) : x.end || ''}</li>`;
}).join('')}</ol>`;
document.querySelectorAll('[data-ic]').forEach(e => { e.innerHTML = icon(e.dataset.ic); });
const OWN_EMOJI =['⭐', '🐶', '🐱', '🌱', '💊', '🧴', '👓', '🎻', '🙏', '🤗', '🏃', '🧩', '🎨', '🍌', '🥛', '📖'];
// What a screen reader says for each.
const OWN_EMOJI_NAMES = ['Star', 'Dog', 'Cat', 'Plant', 'Medicine', 'Lotion', 'Glasses', 'Violin', 'Thanks', 'Hug', 'Running', 'Puzzle', 'Paint', 'Banana', 'Milk', 'Book'];
// A name's first letter, or its first emoji whole (not half of one).
const initial = name => [...String(name)][0] || '';
// A chip that's chosen or not: its look, and the same said to a screen reader.
const pressed = on => on ? 'class="on" aria-pressed="true"' : 'aria-pressed="false"';

// { children: [{id, name, birth, naps}], current, routines: {childId: [routine]}, done: {day: {childId: {routineId: true}}}, wake: {childId: 'HH:MM'} }
// `v`: the shape's version (1 from 1.43), for a later version that has to change it.
// Saved data that can't be read (cut short, say) is kept aside under KEY + '-unread' rather than lost, and the app
// starts empty, saying so; with sharing on, the family's copy comes back at the first sync.
const STATE_V = 1;
// Something else kept (who this phone is, what's in the gallery): `d` when it's missing or can't be read.
const readSaved = (k, d) => { try { return JSON.parse(vault.get(k) || 'null') ?? d; } catch (e) { console.error(`${k} couldn't be read:`, e.message); return d; } };
let state = (() => {
  const text = vault.get(KEY);
  try {
    const s = JSON.parse(text || 'null');
    if (s === null || (typeof s === 'object' && Array.isArray(s.children) && s.routines && typeof s.routines === 'object')) return s;
    throw new Error('not in the shape this app keeps');
  } catch (e) {
    console.error("this phone's saved routines couldn't be read:", e.message);
    try { localStorage.setItem(KEY + '-unread', text); } catch {}
    setTimeout(() => alert("Tot Routines couldn't read what it had saved on this phone, so it's starting fresh. A copy was kept aside in case it can be put right." + (syncOn() ? " Your family's shared copy comes back in a moment." : '')));
    return null;
  }
})();
// A phone that shares and starts fresh takes the family's copy, rather than telling the family everything was
// removed (sync.js, syncBoot).
const stateSaved = !!state;
state = state || { children: [], current: null, routines: {}, done: {}, wake: {} };
syncBoot(stateSaved);
state.v = STATE_V;
const saveLocal = () => vault.set(KEY, JSON.stringify(state));
const save = () => { saveLocal(); syncSoon(); remindSoon(); };
// When the phone won't keep what's saved (its storage full): said once a run, as nothing else would show it.
let saveWarned = false;
window.saveFailed = e => {
  if (saveWarned) return;
  saveWarned = true;
  setTimeout(() => alert(/quota|space|full/i.test(String(e && (e.name + e.message))) ? "This phone's storage is full, so Tot Routines can't save. Free some space (old videos and apps), or changes made now may be lost when the app closes."
    : `Tot Routines couldn't save on this phone (${e && e.message}). Changes made now may be lost when the app closes.`));
};
Object.values(state.routines).forEach(rs => rs.forEach(dropOffSteps));
// The day planner (1.2): plans: {childId: {day: {busy, items: [{slot, id, interest}], done: {slot: true}, swaps}}},
// likes: {childId: {activityId: 1 | -1}}. Children also gained interests: [id] and busy: [weekday].
state.plans = state.plans || {};
state.likes = state.likes || {};
// Medicine given (1.73): {childId: {doseId: dose}} (see medStatus).
state.meds = state.meds || {};
// Plans from Triangle Tots (1.89): {planId: plan} (see "Plans from Triangle Tots").
state.outings = state.outings || {};
// Children kept but none chosen (or the chosen one gone): the first of them, rather than "Add a child".
if (!state.children.some(c => c.id === state.current)) state.current = state.children[0] ? state.children[0].id : null;

const kid = () => state.children.find(c => c.id === state.current);
const kidBand = () => bandFor(ageMonths(kid().birth, new Date()));
// Under 3 they nap; from 6 they don't; in between, as the grown-up says.
const napsNow = (c, band) => band.id === 't1' || band.id === 't2' ? true : band.id === 't5' ? false : c.naps;
// A nap routine is "Nap" or "Quiet time", by whether the child naps now (see nameRest); true when one changed.
const nameRests = c => (state.routines[c.id] || []).filter(r => nameRest(r, napsNow(c, bandFor(ageMonths(c.birth, new Date())).band))).length > 0;
state.children.forEach(nameRests);
const kidRoutines = () => state.routines[state.current] || (state.routines[state.current] = []);
let editing = null;   // routine id open in the editor
let editingKid = null; // child id open in setup, or null for a new child

let weekAt = 0, weekNote = ''; // the week screen's week and line at the top (renderWeek)
const WEEKS_AHEAD = 12;
function show(screen) {
  if (screen !== 'home') pane = ''; // coming back to home shows a child
  if (screen !== 'week') weekNote = ''; // "2 plans added" is said once
  if (recName) stopRec(); // leaving the editor mid-recording keeps what was said
  forgetRemoved();        // and the chance to undo a removed step
  if (screen !== 'chart') document.querySelectorAll('.confetti').forEach(c => c.remove()); // the cheer stays on the chart
  document.body.dataset.screen = screen;
  window.scrollTo(0, 0);
  if (window.Android) { Android.keepAwake(screen === 'chart'); Android.hush(); }
}

// ---- Photos and voices (the app on a phone only) ----
// Each step can have a photo of the child's own thing and a recording of the grown-up saying it, kept by the
// app as files named mediaName(child, step). Photos are read once and kept here as data URLs.
const phone = !!window.Android;
document.body.classList.toggle('phone', phone);
const photos = {};
function photoSrc(name) {
  if (!phone) return null;
  if (!(name in photos)) {
    const b64 = Android.photo(name);
    photos[name] = b64 ? 'data:image/jpeg;base64,' + b64 : null;
  }
  return photos[name];
}
// The step's picture: its photo if it has one, else its emoji.
function pictureHtml(childId, s, cls) {
  const src = photoSrc(mediaName(childId, s.key));
  return src ? `<img class="${cls.img}" src="${src}" alt="">` : `<span class="${cls.em}">${stepInfo(s).emoji}</span>`;
}
// Called by the app when a photo has been taken or picked (or not).
window.photoDone = (name, ok, why) => {
  delete photos[name];
  if (why) alert(why);
  if (ok && document.body.dataset.screen === 'edit') renderEditor();
};

let recName = null, recTimer = null, recSecs = 0;
const REC_MAX = 10;
function startRec(name) {
  if (Android.recStart(name) === 'permission') { alert('Allow the microphone when Android asks, then tap Record again.'); return; }
  recName = name;
  recSecs = 0;
  recTimer = setInterval(() => { if (++recSecs >= REC_MAX) stopRec(); renderEditor(); }, 1000);
  renderEditor();
}
// Stop and keep the recording. The caller redraws the editor if it's still showing.
function stopRec() {
  const name = recName, ms = Android.recStop();
  clearInterval(recTimer);
  recName = null;
  if (ms < 400) { Android.deleteVoice(name); alert('That was too short. Tap Record, say the step, then tap Stop.'); }
}
// The app stopped the recording itself (it went into the background); what was said so far is kept.
window.recStopped = () => { clearInterval(recTimer); recName = null; if (document.body.dataset.screen === 'edit') renderEditor(); };

// Say a step on the chart: the grown-up's recording if there is one, else the phone's voice reads its name.
function sayStep(r, s) {
  if (!phone || r.speak === false) return;
  if (!Android.play(mediaName(state.current, s.key))) Android.say(stepInfo(s).label);
}

// ---- Reminders ----
// The app keeps its own copy of the reminders and sets the alarms: every child's week ahead (dayReminders), the
// day plan's parts unless switched off for that child (routines and school have their own switches), with
// what's at the same minute as one notification (groupReminders). Sent whenever anything in it changes;
// something ticked off drops out, and a notification with nothing left in it goes.
let remindAsked = false, remindSent = null, remindTimer;
function allReminders(now = new Date()) {
  const items = [];
  for (const c of state.children) for (let i = 0; i < REMIND_DAYS; i++) {
    const d = addDays(now, i);
    const rows = kidTimeRows(c, d).filter(r => c.planRemind !== false || r.rid || r.slot === 'leave' || r.slot === 'home');
    items.push(...dayReminders(c, dayKey(d), rows, now.getTime()));
  }
  for (const c of state.children) items.push(...medReminders(c, state.meds[c.id], now.getTime()));
  return groupReminders(items);
}
function syncReminders() {
  if (!phone) return;
  clearTimeout(remindTimer);
  const json = JSON.stringify(allReminders());
  if (json === remindSent) return;
  remindSent = json;
  if (Android.setReminders(json) === 'asked') remindAsked = true;
}
// After each change (save), a moment later, so a run of them is sent once.
function remindSoon() { if (phone) { clearTimeout(remindTimer); remindTimer = setTimeout(syncReminders, 1000); } }
// ✓ Done on a reminder's notification. The app keeps each one ({child, day, slot or routine, at}) until the page
// takes it, and here it's ticked as of when it was tapped: a day plan's row, or a routine. Ones already ticked or
// missed, and children, routines or activities gone since, are left. True if anything was ticked.
function applyDone(list) {
  let any = false;
  for (const d of list) {
    const c = state.children.find(c => c.id === d.child);
    if (!c || !/^\d{4}-\d{2}-\d{2}$/.test(d.day || '') || !Number.isFinite(d.at)) continue;
    const tick = (what, emoji) => ({ ...tickOf(what, emoji), at: d.at });
    if (d.med) {
      // The medicine's next dose, given: the same again, unless one's been put in since.
      const ds = state.meds[c.id] || {}, last = ds[d.med];
      if (!isDose(last) || Object.values(ds).some(x => isDose(x) && medKey(x.name) === medKey(last.name) && x.at > last.at)) continue;
      state.meds[c.id] = { ...ds, [uid()]: { ...last, at: d.at, by: me.name, dev: me.dev } };
    } else if (d.slot) {
      const date = fromKey(d.day), plan = planFor(c, date), row = dayRows(c, date).find(r => r.slot === d.slot);
      if (!row || plan.done[d.slot] || (plan.missed && plan.missed[d.slot])) continue;
      plan.done[d.slot] = tick(row.label, row.emoji);
    } else {
      const r = (state.routines[c.id] || []).find(r => r.id === d.routine), day = state.done[d.day] = state.done[d.day] || {};
      const kd = day[c.id] = day[c.id] || {};
      if (!r || kd[r.id]) continue;
      kd[r.id] = tick(r.name, r.emoji);
    }
    any = true;
  }
  return any;
}
function takeDone() {
  if (!phone || !applyDone(JSON.parse(Android.takeDone()))) return;
  save();
  const s = document.body.dataset.screen;
  if (s === 'home' && kid()) renderHome(); else if (s === 'week') renderWeek();
}
window.takeDone = takeDone; // the app calls it on ✓ Done with the page open
// Notifications or the microphone were allowed or refused, or the grown-up is back from Settings.
window.permsChanged = () => { if (document.body.dataset.screen === 'edit') renderReminder(); };
// A reminder's notification was tapped: straight to that routine's chart.
window.openFromReminder = launch => {
  // The news notification (Watch.java) opens the family page, with what's happened lately.
  if (launch === 'family') {
    if (!kid()) return;
    closeSheets();
    $('yay').classList.remove('show');
    openFamily();
    return;
  }
  const [childId, routineId, day, slot] = launch.split(' ');
  // A school or day plan reminder opens that child's day; an activity's also opens the activity, to tick it off
  // and say how it went (unless it's been swapped out since).
  if (routineId === 'day' || routineId === 'act') {
    const c = state.children.find(c => c.id === childId);
    if (!c) return;
    state.current = childId;
    pane = '';
    save();
    closeSheets();
    $('yay').classList.remove('show');
    renderHome();
    show('home');
    if (routineId === 'act' && planFor(c, fromKey(day)).items.some(i => i.slot === slot)) openAct(day, slot);
    return;
  }
  const r = (state.routines[childId] || []).find(r => r.id === routineId);
  // The routine or child may have been deleted since the reminder was shown.
  if (!r) return;
  state.current = childId;
  save();
  closeSheets();
  $('yay').classList.remove('show');
  openChart(r.id);
};

// ---- The baby on the way (Bumplings) ----
// Bumplings follows the pregnancy. On a phone with both apps the baby shows here beside the other children,
// read from Bumplings each time it's drawn (it changes there, not here). Once the baby is born it can join as a
// child; then it's one of the children and the baby chip goes.
const BUMP_URL = 'https://tottoolbox.com/bumplings/';
// What Bumplings shares (its familySummary), or null.
function bumpShare() {
  if (!phone) return null;
  const j = Android.bump();
  return j ? JSON.parse(j) : null;
}
function baby() {
  const s = bumpShare();
  return s ? expecting(s, state.children, new Date()) : null;
}
const longDay = k => fromKey(k).toLocaleDateString([], { month: 'long', day: 'numeric' });
const babyLabel = b => b.born ? `👶 ${esc(b.name)}` : `🤰 ${esc(b.name)} · week ${b.week}`;
function renderExpectBtn() {
  const b = baby();
  $('expectBtn').innerHTML = b ? babyLabel(b) : "🤰 We're expecting a baby";
}
// The baby's own page: all that Bumplings shares (the family page's baby card), with a button at the bottom that
// opens Bumplings to log anything. Once the baby is born, a button at the top adds them as a child.
// On the home screen it takes the place of a child's page, under the same bar of children (pane). From the setup
// screen, where there is no bar, it is a page of its own with a Back button.
let babyFrom = 'home'; // the screen it was opened from, for Back
let pane = '';         // what the home screen shows in place of a child: 'baby', 'family' or '' (the child)
function renderBabyPage(el = $('babyPage')) {
  const share = bumpShare(), v = share && babyView(share, state.children, new Date(), Date.now());
  if (!v) return false;
  el.innerHTML = (v.born ? `<div class="card lead"><div class="eyebrow">Welcome</div><h2>${esc(v.name)} is here!</h2>
      <p class="muted">Tot Routines is written for 1 to 7 year olds. Add ${esc(v.name)} now for a calm bedtime routine, or any time later.</p>
      <button class="btn primary big" data-babyadd>Add ${esc(v.name)}</button></div>` : '') + babyCard(v);
  return true;
}
function openBaby() {
  // The baby is there in Bumplings: their page, in place of a child's when the bar of children is showing.
  if (document.body.dataset.screen === 'home' && kid() && renderBabyPage($('homePane'))) { pane = 'baby'; renderHome(); show('home'); return; }
  if (renderBabyPage()) { babyFrom = document.body.dataset.screen === 'setup' ? 'setup' : 'home'; show('baby'); return; }
  // Bumplings is there but has no pregnancy yet: straight to setting it up, with the name typed here.
  if (phone && Android.bumpInstalled()) {
    Android.openBump(document.body.dataset.screen === 'setup' ? $('kidName').value.trim() : '');
    return;
  }
  const others = state.children.length ? 'beside the other children' : 'here';
  $('babyBody').innerHTML = `<h2>🤰 We're expecting</h2>
      <p>Our Bumplings app follows the pregnancy week by week: how the baby is growing, checkups, kicks,
      contractions and the hospital bag. Set it up there and the baby shows ${others}.</p>
      <button class="btn primary big" id="babyGet">Get Bumplings</button>
      <button class="btn big" data-close>Close</button>`;
  $('babyGet').onclick = () => { closeSheets(); if (phone) Android.getBump(); else window.open(BUMP_URL, '_blank'); };
  $('babySheet').classList.add('open');
}
$('expectBtn').onclick = openBaby;
function addBaby() {
  const b = baby();
  if (!b || !b.born) return;
  openSetup(null);
  $('expectRow').hidden = true;
  $('kidName').value = b.name;
  $('kidBirth').value = b.born;
  showNapRow();
  renderPlan();
}

// ---- Setup ----
function openSetup(childId) {
  editingKid = childId;
  const c = state.children.find(c => c.id === childId);
  $('setupTitle').textContent = c ? `About ${c.name}` : state.children.length ? 'Add a child' : 'Who is this routine for?';
  $('setupTop').hidden = !state.children.length; // Back, unless there's nothing to go back to
  $('setupJoin').hidden = state.children.length > 0;
  // Bumplings is offered once there's a child here; on the very first screen only a baby already in it shows.
  $('expectRow').hidden = !!c || (!state.children.length && !baby());
  renderExpectBtn();
  $('kidName').value = c ? c.name : '';
  $('kidBirth').value = c ? c.birth : '';
  $('kidBirth').max = dayKey(new Date());
  $('kidNaps').checked = c ? c.naps : true;
  pickInterests = c ? [...(c.interests || [])] : [];
  pickBusy = c ? [...(c.busy || [])] : [];
  pickSchool = c && c.school ? JSON.parse(JSON.stringify(c.school)) : null;
  renderSetupChips();
  renderSchool();
  pickAway = c && c.away ? awayFromNow(JSON.parse(JSON.stringify(c.away))) : null;
  renderAwaySetup();
  showNapRow();
  pickWake = (c && state.wake[c.id]) || '07:00';
  pickPlanRemind = !c || c.planRemind !== false;
  pickTimes = c && c.times ? JSON.parse(JSON.stringify(c.times)) : {};
  renderPlan();
  $('delKid').hidden = !c;
  $('setupErr').hidden = true;
  show('setup');
}
// Napping is only asked about from 3 to 5; younger children nap and older ones don't. Not asked until there's a birthday.
function showNapRow() {
  const b = $('kidBirth').value, m = /^\d{4}-\d{2}-\d{2}$/.test(b) ? ageMonths(b, new Date()) : null;
  $('napRow').hidden = m === null || m < 36 || m >= 72;
}
$('kidBirth').oninput = () => { showNapRow(); renderPlan(); };
// What "Add a name." said goes once they type.
$('setup').addEventListener('input', () => { $('setupErr').hidden = true; });
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let pickInterests = [], pickBusy = [];
function renderSetupChips() {
  $('kidInterests').innerHTML = Object.entries(INTERESTS).map(([id, i]) =>
    `<button ${pressed(pickInterests.includes(id))} data-int="${id}">${i.emoji} ${i.name}</button>`).join('');
  $('kidBusy').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d =>
    `<button ${pressed(pickBusy.includes(d))} data-busy="${d}">${WEEKDAYS[d]}</button>`).join('');
}
const toggle = (list, v) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];
$('kidInterests').onclick = e => { const b = e.target.closest('[data-int]'); if (b) { pickInterests = toggle(pickInterests, b.dataset.int); renderSetupChips(); } };
$('kidBusy').onclick = e => { const b = e.target.closest('[data-busy]'); if (b) { pickBusy = toggle(pickBusy, Number(b.dataset.busy)); renderSetupChips(); } };

// School: at a school or at home, the days, when they leave and get home (or lessons start and finish), how and
// where, what changes day by day, and the days off.
let pickSchool = null;
const newSchool = () => ({ kind: 'out', days: [1, 2, 3, 4, 5], leave: '07:30', home: '15:00', to: 'bus', toWhere: '', from: 'bus', fromWhere: '', byDay: {}, off: [], remind: true });
const monFirst = days => [...days].sort((a, b) => (a + 6) % 7 - (b + 6) % 7);
// Whether a routine is for some days only (School morning, on school days), for its streak; undefined is every day.
// A day at the other home doesn't count either: one with the routine's time while they're away, or for one with
// no time, a day they're away from getting up to asleep.
function routineDays(c, r) {
  const school = r.template === 'school' && c.school;
  if (!school && !c.away) return undefined;
  return d => {
    if (school && !schoolDay(c.school, d)) return false;
    const ad = awayOf(c, d);
    if (!ad) return true;
    const t = dayTimes(c, d);
    return r.when ? !awayAt(ad, toMin(r.when)) : !awayAllDay(ad, toMin(t.wake), toMin(t.bedtime));
  };
}
function renderSchool() {
  const s = pickSchool;
  $('kidSchool').checked = !!s;
  $('schoolBox').hidden = !s;
  if (!s) return;
  const hs = s.kind === 'home';
  $('schKind').innerHTML = [['out', '🏫 At a school'], ['home', '🏠 Homeschool']].map(([k, n]) => `<button ${pressed((s.kind || 'out') === k)} data-skind="${k}">${n}</button>`).join('');
  $('schKindNote').textContent = hs ? 'Homeschool days get their own plan: lessons, then free time. Up and asleep by stay the same every day.'
    : 'School days get their own plan: when to leave, how they get there and home, and who picks them up.';
  for (const el of document.querySelectorAll('#schoolBox .schOut')) el.hidden = hs;
  $('schLeaveLbl').textContent = hs ? 'Lessons start at' : 'Leaves home at';
  $('schHomeLbl').textContent = hs ? 'Lessons finish at' : 'Home or pick-up time';
  $('schByDayNote').textContent = hs ? 'A shorter day on some days? Change when lessons finish here.'
    : 'Early release, or a different driver on some days? Change it here, and the plan says who it is that day.';
  $('schRemindLbl').textContent = hs ? 'Remind me before lessons start and finish' : 'Remind me before leaving and before pick-up';
  $('schDays').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d => `<button ${pressed(s.days.includes(d))} data-sday="${d}">${WEEKDAYS[d]}</button>`).join('');
  $('schLeave').value = s.leave;
  $('schHome').value = s.home;
  s.off = s.off || [];
  $('schOff').innerHTML = s.off.map((b, i) => `<div class="offRow" data-o="${i}"><input type="text" data-f="name" maxlength="30" placeholder="e.g. Track-out, Winter break" value="${esc(b.name || '')}">
    <label>From <input type="date" data-f="from" value="${b.from}"></label><label>To <input type="date" data-f="to" value="${b.to}"></label>
    <button class="link" data-offdel="${i}" aria-label="Remove">Remove</button></div>`).join('');
  $('schTo').innerHTML = Object.entries(SCHOOL.to).map(([id, w]) => `<button ${pressed(s.to === id)} data-sto="${id}">${w.emoji} ${w.name}</button>`).join('');
  $('schFrom').innerHTML = Object.entries(SCHOOL.from).map(([id, w]) => `<button ${pressed(s.from === id)} data-sfrom="${id}">${w.emoji} ${w.name}</button>`).join('');
  $('schToWhere').value = s.toWhere;
  $('schToWhere').placeholder = SCHOOL.to[s.to].where;
  $('schFromWhere').value = s.fromWhere;
  $('schFromWhere').placeholder = SCHOOL.from[s.from].where;
  const am = !hs && SCHOOL.to[s.to].who, pm = !hs && SCHOOL.from[s.from].who, n = 1 + !!am + !!pm;
  $('schByDay').innerHTML = `<div class="byday" style="--n:${n}"><span></span><span>${hs ? 'Finish' : s.from === 'pickup' || s.from === 'aftercare' ? 'Pick-up' : 'Home'}</span>${am ? `<span>${am} there</span>` : ''}${pm ? `<span>${pm}${s.from === 'pickup' || s.from === 'aftercare' ? '' : ' home'}</span>` : ''}</div>` +
    monFirst(s.days).map(d => {
      const x = s.byDay[d] || {};
      return `<div class="byday" style="--n:${n}" data-d="${d}"><b>${WEEKDAYS[d]}</b><input type="time" data-f="home" value="${x.home || s.home}">${
        am ? `<input type="text" data-f="amWho" maxlength="24" placeholder="${am}" value="${esc(x.amWho || '')}">` : ''}${
        pm ? `<input type="text" data-f="pmWho" maxlength="24" placeholder="${pm}" value="${esc(x.pmWho || '')}">` : ''}</div>`;
    }).join('');
  $('schRemind').checked = s.remind;
}
$('kidSchool').onchange = e => { pickSchool = e.target.checked ? newSchool() : null; renderSchool(); };
$('schoolBox').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.sday) pickSchool.days = toggle(pickSchool.days, Number(b.dataset.sday));
  else if (b.dataset.skind) {
    pickSchool.kind = b.dataset.skind;
    // Homeschool lessons don't start at the bus's time.
    if (b.dataset.skind === 'home' && pickSchool.leave === '07:30' && pickSchool.home === '15:00') Object.assign(pickSchool, { leave: '09:00', home: '13:00' });
  }
  else if (b.id === 'schAddOff') { const t = dayKey(new Date()); pickSchool.off.push({ name: '', from: t, to: t }); }
  else if (b.dataset.offdel) pickSchool.off.splice(Number(b.dataset.offdel), 1);
  else if (b.dataset.sto) pickSchool.to = b.dataset.sto;
  else if (b.dataset.sfrom) pickSchool.from = b.dataset.sfrom;
  else return;
  renderSchool();
  renderPlan();
};
// Typing doesn't redraw, so the field keeps focus.
$('schoolBox').oninput = e => {
  const t = e.target, s = pickSchool, row = t.closest('[data-d]'), off = t.closest('[data-o]');
  if (off) {
    const b = s.off[off.dataset.o];
    b[t.dataset.f] = t.value;
    // A single day off is the commonest: the end follows the start until it's set apart.
    if (t.dataset.f === 'from' && (!b.to || b.to < b.from)) { b.to = b.from; off.querySelector('[data-f="to"]').value = b.to; }
  }
  else if (row) (s.byDay[row.dataset.d] = s.byDay[row.dataset.d] || {})[t.dataset.f] = t.value;
  else if (t.id === 'schLeave') s.leave = t.value;
  else if (t.id === 'schHome') s.home = t.value;
  else if (t.id === 'schToWhere') s.toWhere = t.value;
  else if (t.id === 'schFromWhere') s.fromWhere = t.value;
  else if (t.id === 'schRemind') s.remind = t.checked;
};
// The usual home time fills the day-by-day times that weren't changed.
$('schHome').onchange = () => renderSchool();
// What's kept: trimmed, with day-by-day entries only where a day differs.
function cleanSchool(s) {
  const byDay = {}, hs = s.kind === 'home';
  for (const d of s.days) {
    const x = s.byDay[d] || {}, keep = {};
    if (x.home && x.home !== s.home) keep.home = x.home;
    if (!hs && SCHOOL.to[s.to].who && (x.amWho || '').trim()) keep.amWho = x.amWho.trim();
    if (!hs && SCHOOL.from[s.from].who && (x.pmWho || '').trim()) keep.pmWho = x.pmWho.trim();
    if (Object.keys(keep).length) byDay[d] = keep;
  }
  // Days off: the ones with dates, in order; those over a year gone are dropped (nothing looks back that far).
  const long = dayKey(addDays(new Date(), -366));
  const off = (s.off || []).filter(b => b.from && b.to && b.to >= long).map(b => ({ from: b.from, to: b.to, name: (b.name || '').trim() }))
    .sort((a, b) => a.from < b.from ? -1 : 1);
  return { ...s, kind: hs ? 'home' : 'out', days: monFirst(s.days), toWhere: s.toWhere.trim(), fromWhere: s.fromWhere.trim(), byDay, off };
}
function schoolError(s) {
  if (!s) return null;
  const hs = s.kind === 'home';
  if (!s.days.length) return 'Pick at least one school day.';
  if (!s.leave || !s.home) return hs ? 'Add when lessons start and finish.' : 'Add the time they leave and the time they\'re home or picked up.';
  for (const d of s.days) {
    const home = (s.byDay[d] && s.byDay[d].home) || s.home;
    if (toMin(home) <= toMin(s.leave)) return hs ? `On ${WEEKDAYS[d]}, lessons finish before they start.` : `On ${WEEKDAYS[d]}, home time is before they leave.`;
  }
  const bad = (s.off || []).find(b => (b.from || b.to) && !(b.from && b.to && b.to >= b.from));
  if (bad) return `Days off${bad.name ? ` (${bad.name.trim()})` : ''}: ${bad.from && bad.to ? 'the last day is before the first' : 'add the first and last day'}.`;
  return null;
}

// Another home: whose, the usual schedule (every week or every other week), holidays and swaps.
let pickAway = null;
const thisMonday = () => { const d = new Date(); return addDays(d, -((d.getDay() + 6) % 7)); };
const newAway = () => ({ who: '', start: dayKey(thisMonday()), weeks: 2, stays: [{ wk: 0, from: 5, fromAt: '15:00', to: 0, toAt: '18:00' }], dates: [], remind: true });
// Counted from this week, so "This week" and "Next week" say what they mean: a stay every other week keeps its weeks.
function awayFromNow(a) {
  const mon = thisMonday(), start = fromKey(a.start || dayKey(mon)), base = addDays(start, -((start.getDay() + 6) % 7));
  const w = Math.round((Date.UTC(mon.getFullYear(), mon.getMonth(), mon.getDate()) - Date.UTC(base.getFullYear(), base.getMonth(), base.getDate())) / 6048e5);
  const odd = a.weeks === 2 ? ((w % 2) + 2) % 2 : 0;
  return { ...a, start: dayKey(mon), stays: (a.stays || []).map(s => ({ ...s, wk: a.weeks === 2 ? ((s.wk || 0) - odd + 2) % 2 : 0 })), dates: a.dates || [] };
}
const dayOpts = v => [1, 2, 3, 4, 5, 6, 0].map(d => `<option value="${d}"${d === v ? ' selected' : ''}>${DAY_NAMES[d]}</option>`).join('');
function renderAwaySetup() {
  const a = pickAway;
  $('kidAway').checked = !!a;
  $('awayBox').hidden = !a;
  if (!a) return;
  $('awWho').value = a.who;
  $('awWeeks').innerHTML = [[1, 'Every week'], [2, 'Every other week']].map(([n, t]) => `<button ${pressed(a.weeks === n)} data-awweeks="${n}">${t}</button>`).join('');
  $('awStays').innerHTML = a.stays.map((s, i) => `<div class="offRow" data-st="${i}">
    ${a.weeks === 2 ? `<label>Week <select data-f="wk"><option value="0"${s.wk === 0 ? ' selected' : ''}>This week</option><option value="1"${s.wk === 1 ? ' selected' : ''}>Next week</option></select></label>` : ''}
    <label>From <select data-f="from">${dayOpts(s.from)}</select> <input type="time" data-f="fromAt" value="${s.fromAt}"></label>
    <label>Until <select data-f="to">${dayOpts(s.to)}</select> <input type="time" data-f="toAt" value="${s.toAt}"></label>
    <button class="link" data-stdel="${i}">Remove</button></div>`).join('');
  const there = `At ${esc(awayPlace(a))}`;
  $('awDates').innerHTML = a.dates.map((d, i) => `<div class="offRow" data-dt="${i}"><input type="text" data-f="name" maxlength="30" placeholder="e.g. Christmas Eve, a swap" value="${esc(d.name || '')}">
    <label>From <input type="datetime-local" data-f="from" value="${d.from}"></label><label>Until <input type="datetime-local" data-f="to" value="${d.to}"></label>
    <select data-f="here"><option value="0"${d.here ? '' : ' selected'}>${there}</option><option value="1"${d.here ? ' selected' : ''}>With us</option></select>
    <select data-f="every">${[[0, 'Just this once'], [1, 'Every year'], [2, 'Every other year']].map(([n, t]) => `<option value="${n}"${(d.every || 0) === n ? ' selected' : ''}>${t}</option>`).join('')}</select>
    <button class="link" data-dtdel="${i}">Remove</button></div>`).join('');
  $('awRemind').checked = a.remind !== false;
}
$('kidAway').onchange = e => { pickAway = e.target.checked ? newAway() : null; renderAwaySetup(); };
$('awayBox').onclick = e => {
  const b = e.target.closest('button'), a = pickAway;
  if (!b) return;
  if (b.dataset.awweeks) { a.weeks = Number(b.dataset.awweeks); if (a.weeks === 1) a.stays.forEach(s => { s.wk = 0; }); }
  else if (b.id === 'awAddStay') a.stays.push({ wk: 0, from: 3, fromAt: '17:00', to: 3, toAt: '19:30' });
  else if (b.dataset.stdel) a.stays.splice(Number(b.dataset.stdel), 1);
  else if (b.id === 'awAddDate') { const t = dayKey(new Date()); a.dates.push({ name: '', from: `${t}T09:00`, to: `${dayKey(addDays(new Date(), 1))}T18:00`, here: false, every: 0 }); }
  else if (b.dataset.dtdel) a.dates.splice(Number(b.dataset.dtdel), 1);
  else return;
  renderAwaySetup();
};
// Typing doesn't redraw, so the field keeps focus.
$('awayBox').oninput = e => {
  const t = e.target, a = pickAway, st = t.closest('[data-st]'), dt = t.closest('[data-dt]');
  if (st) { const s = a.stays[st.dataset.st], f = t.dataset.f; s[f] = ['wk', 'from', 'to'].includes(f) ? Number(t.value) : t.value; }
  else if (dt) { const d = a.dates[dt.dataset.dt], f = t.dataset.f; d[f] = f === 'here' ? t.value === '1' : f === 'every' ? Number(t.value) : t.value; }
  else if (t.id === 'awWho') a.who = t.value;
  else if (t.id === 'awRemind') a.remind = t.checked;
};
// The name shows in the holidays' "At Dad's".
$('awWho').onchange = () => renderAwaySetup();
function awayError(a) {
  if (!a) return null;
  if (!a.stays.length && !a.dates.length) return 'Another home: add the usual time there, or a holiday or swap.';
  if (a.stays.some(s => !s.fromAt || !s.toAt)) return 'Another home: add the times they go and come back.';
  const bad = a.dates.find(d => !d.from || !d.to || stamp(d.to) <= stamp(d.from));
  if (bad) return `Another home${bad.name ? ` (${bad.name.trim()})` : ''}: ${bad.from && bad.to ? 'the end is before the start' : 'add when it starts and ends'}.`;
  return null;
}
// What's kept: trimmed; one-off holidays and swaps over a year gone are dropped (nothing looks back that far).
function cleanAway(a) {
  const long = dayKey(addDays(new Date(), -366));
  return { who: a.who.trim(), start: a.start, weeks: a.weeks === 2 ? 2 : 1, stays: a.stays.map(s => ({ wk: a.weeks === 2 ? s.wk : 0, from: s.from, fromAt: s.fromAt, to: s.to, toAt: s.toAt })),
    dates: a.dates.filter(d => d.every || d.to.slice(0, 10) >= long).map(d => ({ name: (d.name || '').trim(), from: d.from, to: d.to, here: !!d.here, every: d.every || 0 })),
    remind: a.remind !== false };
}

$('saveKid').onclick = () => {
  const name = $('kidName').value.trim(), birth = $('kidBirth').value;
  const err = !name ? 'Add a name.' : !birth ? 'Add a birthday.' : ageMonths(birth, new Date()) < 0 ? "That birthday hasn't happened yet." : schoolError(pickSchool) || awayError(pickAway);
  if (err) { $('setupErr').textContent = err; $('setupErr').hidden = false; return; }
  let c = state.children.find(c => c.id === editingKid);
  if (!c) {
    c = { id: uid() };
    state.children.push(c);
    state.current = c.id;
  }
  const school = pickSchool && cleanSchool(pickSchool);
  const when = s => s ? [s.days, s.off || []] : [];
  const retune = JSON.stringify([c.interests || [], c.busy || [], c.birth, when(c.school)]) !==
    JSON.stringify([pickInterests, pickBusy, birth, when(school)]);
  Object.assign(c, { name, birth, naps: $('kidNaps').checked, interests: pickInterests, busy: pickBusy });
  if (school) c.school = school; else delete c.school;
  if (pickAway) c.away = cleanAway(pickAway); else delete c.away;
  if (pickWake !== (state.wake[c.id] || '07:00')) state.wake[c.id] = pickWake;
  if (pickPlanRemind !== (c.planRemind !== false)) c.planRemind = pickPlanRemind;
  if (Object.keys(pickTimes).length) c.times = pickTimes; else delete c.times;
  if (retune) replanFrom(c.id, new Date());
  nameRests(c);
  const bandId = bandFor(ageMonths(birth, new Date())).band.id;
  // A new child starts with bedtime: the routine with the clearest payoff.
  if (!state.routines[c.id]) state.routines[c.id] = [newRoutine('bedtime', bandId, uid())];
  // A school child gets a school morning routine, starting 45 minutes before they leave; homeschool, 30 before
  // lessons, with no lunch to pack, shoes or bag.
  if (school && !state.routines[c.id].some(r => r.template === 'school')) {
    const r = newRoutine('school', bandId, uid()), hs = school.kind === 'home';
    r.when = minusMinutes(school.leave, hs ? 30 : 45);
    if (hs) { r.name = 'Homeschool morning'; r.steps = r.steps.filter(s => !['lunch', 'shoes', 'bag'].includes(s.key)); }
    state.routines[c.id].push(r);
  }
  save();
  syncReminders(); // reminders say the child's name
  renderHome();
  show('home');
};
$('delKid').onclick = () => {
  const c = state.children.find(c => c.id === editingKid);
  if (!confirm(`Remove ${c.name}, their routines and their journal?`)) return;
  state.children = state.children.filter(x => x.id !== c.id);
  delete state.routines[c.id];
  delete state.plans[c.id];
  delete state.likes[c.id];
  delete state.meds[c.id];
  for (const [id, e] of Object.entries(state.journal)) if (e.child === c.id) delete state.journal[id];
  pruneMedia();
  state.current = state.children[0] ? state.children[0].id : null;
  save();
  syncReminders();
  if (phone) { Android.deleteChildMedia(c.id); Object.keys(photos).forEach(n => { if (n.startsWith(c.id + '-')) delete photos[n]; }); }
  if (state.current) { renderHome(); show('home'); } else openSetup(null);
};

// ---- The child's photo, at the top right of their page ----
// Cut out from its background (cutout.js) and shared with the family like the journal's photos: the child's
// `photo` is a media item (sync.js's sharedMedia), its bytes in mediaStore.
let picBusy = null; // the child whose photo is being cut out
function kidPicHtml(c) {
  if (picBusy === c.id) return `<span class="kidPic busy" id="kidPic"><span class="busy"></span><small>Cutting out…</small></span>`;
  if (!c.photo) return `<button class="kidPic add" id="kidPic">${icon('camera')}<small>Add a photo</small></button>`;
  return `<button class="kidPic${c.photo.cut ? ' cut' : ''}" id="kidPic" aria-label="${esc(c.name)}'s photo"><img data-mid="${c.photo.id}" alt="" hidden></button>`;
}
function openPicSheet() {
  const c = kid();
  $('picBody').innerHTML = `<h2>${sq('camera', 'coral')}${esc(c.name)}'s photo</h2>
    <div class="picBig${c.photo.cut ? ' cut' : ''}"><img data-mid="${c.photo.id}" alt="" hidden></div>
    <p class="muted">${c.photo.cut ? `Cut out from its background on this phone.` : `Nobody could be cut out of this one, so it's shown in a circle. A photo of ${esc(c.name)} on their own, head to toe or from the waist up, cuts out best.`}${syncOn() ? ' Shared with the family.' : ''}</p>
    <button class="btn primary big" id="picNew">${icon('camera')}A new photo</button>
    <button class="btn big" id="picDel">Remove the photo</button>
    <button class="btn big" data-close>Close</button>`;
  $('picNew').onclick = () => { closeSheets(); $('kidPicIn').click(); };
  $('picDel').onclick = () => { closeSheets(); delete kid().photo; save(); pruneMedia(); renderHome(); };
  fillMedia($('picBody'));
  $('picSheet').classList.add('open');
}
$('kidPicIn').onchange = async ev => {
  const f = ev.target.files[0], c = kid();
  ev.target.value = '';
  if (!f || !c) return;
  picBusy = c.id;
  renderHome();
  const id = uid();
  mediaStore.hold([id]); // not taken by a sync arriving before it's the child's
  try {
    const p = await cutoutPhoto(f);
    await mediaStore.put(id, p.blob);
    // Still here (not removed on another phone meanwhile).
    const now = state.children.find(k => k.id === c.id);
    if (now) { now.photo = { id, type: 'photo', mime: p.blob.type, size: p.blob.size, w: p.w, h: p.h, cut: p.cut }; save(); }
  } catch (e) {
    alert(e.message);
  } finally {
    mediaStore.letGo([id]);
    pruneMedia();
    picBusy = null;
    if (document.body.dataset.screen === 'home') renderHome();
  }
};

// ---- Home ----
function renderHome() {
  const c = kid(), months = ageMonths(c.birth, new Date()), { band, note } = bandFor(months);
  document.querySelectorAll('.ageNow').forEach(e => e.textContent = ageLabel(months));
  const b = baby();
  // The baby is chosen like a child; if Bumplings no longer has them (removed there), back to the child.
  if (pane === 'baby' && !(b && renderBabyPage($('homePane')))) pane = '';
  if (pane === 'family') renderFamily();
  $('homePane').hidden = !pane;
  $('kidPane').hidden = !!pane;
  $('kids').innerHTML = `<button class="kid${pane === 'family' ? ' on' : ''}" data-family>Family</button>` + state.children.map(k => `<button class="kid${k.id === c.id && !pane ? ' on' : ''}" data-kid="${k.id}">${esc(k.name)}</button>`).join('') +
    (b ? `<button class="kid baby${pane === 'baby' ? ' on' : ''}" data-baby>${babyLabel(b)}</button>` : '') +
    `<button class="kid" data-kid="+">+ Child</button><span class="spacer"></span>` +
    (pane ? '' : `<button class="link" data-editkid>Edit ${esc(c.name)}</button>`);
  const tip = TIPS[Math.floor(Date.now() / 864e5) % TIPS.length];
  $('tipCard').innerHTML = `${sq('tip', 'sun')}<div><div class="eyebrow">Today's tip</div><p><b>${tip.t}.</b> ${tip.d}</p></div>`;
  if (pane) { fillMedia($('homePane')); return; }

  $('snap').innerHTML = `${kidPicHtml(c)}
    <div class="eyebrow">${esc(c.name)} is</div>
    <div class="age">${ageLabel(months)}</div>
    <span class="pill">${band.name} · ${band.span}</span>
    ${note ? `<div class="note">${note}</div>` : ''}
    <details class="typical"><summary>What's typical at ${ageLabel(months)}</summary>
    <dl class="facts">
      <dt>${sq('sleep', 'plum')}</dt><dd><b>${band.sleep.total[0]}–${band.sleep.total[1]} hours of sleep</b>in 24 hours, naps included. ${band.sleep.naps}</dd>
      <dt>${sq('attention', 'sun')}</dt><dd><b>Attention</b>${band.attention}</dd>
      <dt>${sq('directions', 'sky')}</dt><dd><b>Directions</b>${band.directions}</dd>
      <dt>${sq('steps')}</dt><dd><b>Routine length</b>About ${band.maxSteps} steps or fewer.</dd>
    </dl>
    <h3 class="part">${sq('tip', 'sun')}What's realistic now</h3>
    ${trail(band.big.map(b => ['', '', b]), 'small')}
    <p class="src">Every child gets there on their own schedule; these are typical ages, not deadlines.</p></details>`;
  $('kidPic').onclick = () => { if (picBusy) return; if (c.photo) openPicSheet(); else $('kidPicIn').click(); };
  fillMedia($('snap'));

  const today = new Date(), dk = dayKey(today);
  const rs = kidRoutines();
  // A child with nothing ticked off yet: where to start.
  const started = Object.values(state.done).some(d => d && d[c.id] && Object.keys(d[c.id]).length), first = rs.find(r => r.template === 'bedtime') || rs[0];
  const hint = started || !first ? '' : `<p class="muted hint">${band.id === 't1' ? `Tap Print for a picture chart of ${esc(first.name.toLowerCase())} to put on the wall.`
    : first.template === 'bedtime' ? "Tap Chart to start tonight's bedtime." : `Tap Chart to start ${esc(first.name.toLowerCase())}.`}</p>`;
  $('routines').innerHTML = hint + (rs.length ? rs.map(r => {
    const n = onSteps(r).length, s = streak(state.done, c.id, r.id, today, routineDays(c, r));
    const doneToday = !!(state.done[dk] && state.done[dk][c.id] && state.done[dk][c.id][r.id]);
    const when = !doneToday && routineWhen(c, r, today), moved = when && when !== r.when ? ` (${clock(when)} today)` : '';
    const dots = recent(state.done, c.id, r.id, today, 14).map(d => `<i class="${d.done ? 'on' : ''}" title="${d.day}"></i>`).join('');
    return `<div class="card routine${doneToday ? ' isDone' : ''}">
      <div class="em">${r.emoji}${doneToday ? `<i class="ok">${icon('check')}</i>` : ''}</div>
      <div><div class="name">${esc(r.name)}</div>
        <div class="muted">${n} step${n === 1 ? '' : 's'}${r.when ? ' · ' + clock(r.when) + moved : ''}${phone && r.remind !== false && r.when ? ' 🔔' : ''}${s ? ` · ${s}-day streak` : ''}${doneToday ? doneWords(state.done[dk][c.id][r.id]) : ''}</div>
        <div class="dots" aria-label="Last 14 days">${dots}</div>${fromLine(c, dk, 'r:' + r.id)}</div>
      <div class="acts"><button class="btn" data-edit="${r.id}">${icon('edit')}Edit</button>${
        // Under 2, paper first: pediatricians advise little or no screen time.
        band.id === 't1' ? `<button class="btn" data-chart="${r.id}">${icon('play')}Chart</button><button class="btn primary" data-print="${r.id}">${icon('print')}Print</button>`
          : `<button class="btn" data-print="${r.id}">${icon('print')}Print</button><button class="btn primary" data-chart="${r.id}">${icon('play')}Chart</button>`}</div>
    </div>`;
  }).join('') : '<p class="muted">No routines yet. Bedtime is the best one to start with.</p>');

  renderToday();
  renderJournalCard();
}

// A day that fits them, on their setup page: from what's filled in there, kept with the rest on Save.
// pickTimes: the nap, quiet time and bedtime set by hand (the child's `times`); only what differs from typical.
let pickWake = '07:00', pickPlanRemind = true, pickTimes = {};
function renderPlan() {
  const el = $('planCard'), birth = $('kidBirth').value;
  el.hidden = !/^\d{4}-\d{2}-\d{2}$/.test(birth) || ageMonths(birth, new Date()) < 0;
  if (el.hidden) return;
  const { band } = bandFor(ageMonths(birth, new Date())), wake = pickWake;
  const name = esc($('kidName').value.trim() || 'them');
  const napping = napsNow({ naps: $('kidNaps').checked }, band);
  const typical = dayPlan(wake, band, napping), p = dayPlan(wake, band, napping, pickTimes);
  const s = pickSchool && pickSchool.days.length && pickSchool.leave ? pickSchool : null;
  const rest = napping ? 'nap' : 'quiet', own = !!(pickTimes.bed || pickTimes[rest]);
  const at = (f, v) => `<input type="time" class="timeIn" data-t="${f}" value="${v}">`;
  const c = state.children.find(k => k.id === editingKid);
  const bedR = c && (state.routines[c.id] || []).find(r => r.template === 'bedtime' && r.when);
  const warn = timeWarnings(name, band, p, typical, s && { leave: s.leave, kind: s.kind, way: s.to }, bedR ? bedR.when : null);
  // Redrawn as times change; a note being read stays open.
  const why = el.querySelector('details.why'), whyOpen = !!(why && why.open);
  el.innerHTML = `
    <h2>${sq('sun', 'sun')}A day that fits ${name}</h2>
    <div class="times">
      <span>${sq('sun', 'sun')}Usually wakes up</span><b><input type="time" class="timeIn" id="wakeIn" value="${wake}"></b>
      <span>${napping ? `${sq('sleep', 'plum')}Nap from` : `${sq('quiet', 'plum')}Quiet time from`}</span><b>${at(rest + '.start', p[rest].start)}</b>
      <span>${napping ? `${sq('sleep', 'plum')}Nap until` : `${sq('quiet', 'plum')}Quiet time until`}</span><b>${at(rest + '.end', p[rest].end)}</b>
      <span>${sq('sleep', 'sky')}Asleep by</span><b>${at('bed', p.bedtime)}</b>
    </div>
    ${warn.map(w => `<p class="note">⚠️ ${w}</p>`).join('')}
    <p class="muted">About ${hoursWords(p.total)} hours of sleep (recommended ${p.range[0]}–${p.range[1]}). Start the bedtime routine 20–30 minutes before "asleep by".
    ${own ? `Typical at this age: ${napping ? 'nap' : 'quiet time'} ${clock(typical[rest].start)} – ${clock(typical[rest].end)}, asleep by ${clock(typical.bedtime)}.`
      : `These are typical times: tap one to change it, if ${name}'s day runs differently.`}</p>
    ${own ? '<button class="link" id="typicalTimes">Use the typical times</button>' : ''}
    <details class="typical why"${whyOpen ? ' open' : ''}><summary>Why the same times every day</summary>
    <p>Being up and asleep at the same times every day, weekends and school breaks too, keeps ${name}'s body clock steady. If a weekend has to differ, keep it within about an hour.<sup>2</sup></p>
    <p>Regular bedtimes may matter beyond the next morning: in a study of over 11,000 children, irregular bedtimes at age 3 were linked to lower reading and math scores at 7. The study shows a link, not that one caused the other.<sup>3</sup></p>
    <p>The hours of sleep above are the American Academy of Sleep Medicine's, endorsed by the American Academy of Pediatrics.<sup>1</sup> The AAP advises keeping the bedtime routine to 30 minutes or less.<sup>4</sup></p>
    <p class="src">1. Paruthi S, et al. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4877308/" target="_blank" rel="noopener">Recommended amount of sleep for pediatric populations</a>. J Clin Sleep Med. 2016;12(6):785–786.<br>
    2. National Heart, Lung, and Blood Institute (NIH). <a href="https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits" target="_blank" rel="noopener">Healthy sleep habits</a>.<br>
    3. Kelly Y, Kelly J, Sacker A. <a href="https://jech.bmj.com/content/67/11/926" target="_blank" rel="noopener">Time for bed: associations with cognitive performance in 7-year-old children</a>. J Epidemiol Community Health. 2013;67(11):926–931.<br>
    4. American Academy of Pediatrics. <a href="https://www.healthychildren.org/English/healthy-living/sleep/Pages/Bedtime-Routines-for-School-Aged-Children.aspx" target="_blank" rel="noopener">Bedtime routines for school-aged children</a>. HealthyChildren.org.</p></details>
    ${phone ? `<label class="check"><input type="checkbox" id="planRemind"${pickPlanRemind ? ' checked' : ''}> 🔔 Remind me about each part of ${name}'s day, and to tick it off</label>` : ''}`;
  $('wakeIn').onchange = e => { if (e.target.value) { pickWake = e.target.value; renderPlan(); } };
  // A time set back to the typical one is no longer kept as theirs, so it follows the wake-up time again.
  el.querySelectorAll('.timeIn[data-t]').forEach(i => i.onchange = () => {
    if (!i.value) { renderPlan(); return; }
    const [f, end] = i.dataset.t.split('.');
    if (end) {
      const v = { ...p[f], [end]: i.value };
      if (toMin(v.end) <= toMin(v.start)) { renderPlan(); return; } // ends before it starts
      if (v.start === typical[f].start && v.end === typical[f].end) delete pickTimes[f]; else pickTimes[f] = v;
    } else if (i.value === typical.bedtime) delete pickTimes.bed;
    else pickTimes.bed = i.value;
    renderPlan();
  });
  if (own) $('typicalTimes').onclick = () => { pickTimes = {}; renderPlan(); };
  if (phone) $('planRemind').onchange = e => { pickPlanRemind = e.target.checked; };
}
// The plan follows the birthday, napping and school as they're changed (not while typing a name).
$('setup').addEventListener('change', e => { if (!e.target.closest('#planCard')) renderPlan(); });

document.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;
  if ('baby' in t.dataset) openBaby();
  else if ('family' in t.dataset) openFamily();
  else if (t.dataset.kid === '+') openSetup(null);
  else if (t.dataset.kid) { state.current = t.dataset.kid; pane = ''; save(); renderHome(); }
  else if ('editkid' in t.dataset) openSetup(state.current);
  else if (t.dataset.edit) openEditor(t.dataset.edit);
  else if (t.dataset.chart) openChart(t.dataset.chart);
  else if (t.dataset.print) printChart(t.dataset.print);
  else if ('back' in t.dataset) goBack();
  else if ('close' in t.dataset) closeSheets();
});

// ---- Day planner ----
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// What the planner needs to know about a child on a day; `recent` is what was planned the 4 days before.
function planCtx(c, date) {
  const ps = state.plans[c.id] || {}, recent = new Set();
  for (let i = 1; i <= 4; i++) { const p = ps[dayKey(addDays(date, -i))]; if (p) p.items.forEach(it => { recent.add(it.id); if (it.easy) recent.add(it.easy.id); }); }
  const before = weekOf(date).filter(d => dayKey(d) < dayKey(date)).map(d => ps[dayKey(d)]);
  return { childId: c.id, bandId: bandFor(ageMonths(c.birth, date)).band.id, interests: c.interests || [],
    busyDays: [...(c.busy || []), ...(schoolDay(c.school, date) ? [date.getDay()] : [])], likes: state.likes[c.id] || {}, recent, weekCounts: focusCounts(before) };
}
// A day's plan, made the first time it's looked at and kept, so it doesn't change under you. The days before
// it in the week are planned first, so the week balances.
function planFor(c, date) {
  const ps = state.plans[c.id] || (state.plans[c.id] = {}), k = dayKey(date);
  if (!ps[k]) {
    for (const d of weekOf(date)) {
      const dk = dayKey(d);
      if (dk > k) break;
      if (!ps[dk]) ps[dk] = { ...planDay(planCtx(c, d), d), done: {}, swaps: 0 };
    }
    save();
  }
  return ps[k];
}
// After interests, busy days or the birthday change: plan again from `date` on, keeping any day already
// started or changed by hand.
function replanFrom(childId, date) {
  const ps = state.plans[childId] || {}, from = dayKey(date), c = state.children.find(k => k.id === childId);
  for (const k of Object.keys(ps)) if (k >= from) replanDay(c, k);
}
// One day: planned again if nothing's started, or else, if it's turned from a school or daycare day into a free
// one (a day off school) or back, given that day's slots, keeping what's ticked and the activities kept.
function replanDay(c, k) {
  const ps = state.plans[c.id] || {}, p = ps[k];
  if (!p) return;
  if (!p.edited && !Object.keys(p.done).length && !Object.keys(p.missed || {}).length) { delete ps[k]; return; }
  const d = fromKey(k), fresh = planDay(planCtx(c, d), d);
  if (fresh.busy === !!p.busy) return;
  p.items = fresh.items.map(it => p.items.find(o => o.slot === it.slot) || it);
  p.busy = fresh.busy;
}
// Old plans aren't needed past a couple of months.
for (const ps of Object.values(state.plans)) for (const k of Object.keys(ps)) if (k < dayKey(addDays(new Date(), -60))) delete ps[k];
// Plans from Triangle Tots go the same way, two months after their day.
for (const [id, p] of Object.entries(state.outings || {})) if (!p || typeof p.date !== 'string' || p.date < dayKey(addDays(new Date(), -60))) delete state.outings[id];
// Ticks over a year old go: nothing shows them, and they'd fill the phone's storage in time. (Here, not with
// the rest of the start, as addDays only exists from just above.)
for (const k of Object.keys(state.done || {})) if (k < dayKey(addDays(new Date(), -400))) delete state.done[k];

// A day's times for a child: the same every day, school or not.
function dayTimes(c, date) {
  const { band } = bandFor(ageMonths(c.birth, date));
  return dayPlan(state.wake[c.id] || '07:00', band, napsNow(c, band), c.times);
}
// A day's times as it's turning out (dayShift): the usual ones moved by when they really got up and napped (as
// put in, with a time), a sick day, and too little sleep last night or in the nap. School and daycare days
// keep the usual times, but for bedtime after a short night.
function shiftedTimes(c, date) {
  const usual = dayTimes(c, date), plan = planFor(c, date), { band } = bandFor(ageMonths(c.birth, date)), d = plan.done;
  // Only a time put in counts: a tick from a reminder's ✓ Done may have come long after.
  const put = t => isTick(t) && HHMM.test(t.t || '');
  const span = t => { if (!put(t)) return null; const s = toMin(t.t), e = tickEnd(t); return { start: s, end: e != null && e > s ? e : null }; };
  const up = put(d.wake) ? toMin(d.wake.t) : null;
  // Last night: from asleep, put in on yesterday's plan, to up this morning.
  const before = (state.plans[c.id] || {})[dayKey(addDays(date, -1))], bed = before && before.done && before.done.bed;
  const night = up != null && put(bed) ? up + 1440 - (toMin(bed.t) < 720 ? toMin(bed.t) + 1440 : toMin(bed.t)) : null;
  return dayShift(usual, band, napsNow(c, band), { up, night: night > 0 ? night : null, nap: span(d.nap), nap2: span(d.nap2), fixed: !!(schoolDay(c.school, date) || plan.busy),
    noNap: isTick((plan.missed || {}).nap), sick: sickDay(plan) });
}
// A routine's time on a day: a nap or bedtime routine moves with the nap or bedtime (routineTime).
const routineWhen = (c, r, date, t = shiftedTimes(c, date)) => { const d = planFor(c, date).done; return routineTime(r, dayTimes(c, date), t, !!d.nap, !!d.nap2); };
// A day made easier for a sick child (EASY's sickKid).
const sickDay = plan => plan.items.some(it => (easyOf(it) || {}).mode === 'sickKid');
// The rows of a day, in order: planned activities with the day's fixed points (nap, bedtime) between them.
function dayRows(c, date) {
  const plan = planFor(c, date), { band } = bandFor(ageMonths(c.birth, date));
  const napping = napsNow(c, band);
  const times = shiftedTimes(c, date);
  const item = slot => { const it = plan.items.find(i => i.slot === slot); if (!it) return null;
    const t = itemText(it);
    return { slot, emoji: t.emoji, label: t.title, sub: SLOTS[slot].name, done: !!plan.done[slot], missed: !!(plan.missed && plan.missed[slot]), item: it }; };
  const anchor = (slot, emoji, label, sub) => ({ slot, emoji, label, sub, done: !!plan.done[slot], missed: !!(plan.missed && plan.missed[slot]), anchor: true });
  const sd = schoolDay(c.school, date);
  if (sd) {
    const w = schoolWords(sd);
    return awayFilter(c, date, [anchor('wake', '☀️', 'Wake up', clock(times.wake)), anchor('leave', w.leave.emoji, w.leave.label, w.leave.sub),
      anchor('home', w.home.emoji, w.home.label, w.home.sub), item('outside'), item('books'),
      anchor('bed', '🌙', 'Bedtime', clock(times.bedtime))].filter(Boolean));
  }
  let rows = plan.busy
    ? [anchor('care', '🏫', 'Daycare, nursery or preschool', 'Busy day'), item('outside'), item('books')]
    : [item('morning'), item('outside'),
      napping ? anchor('nap', '😴', 'Nap', clock(times.nap.start))
        : anchor('nap', '🧸', times.restNap ? 'Quiet time, or a nap' : 'Quiet time', clock(times.quiet.start)),
      times.nap2 && anchor('nap2', '😴', 'A second nap', `${clock(times.nap2.start)} · a short one`),
      item('afternoon'), item('books')];
  // In time order: an early nap comes before the morning's things.
  if (!plan.busy) { const at = slotMins(c, date); rows = rows.filter(Boolean).sort((a, b) => at[a.slot] - at[b.slot]); }
  rows.push(anchor('bed', '🌙', 'Bedtime', clock(times.bedtime)));
  return awayFilter(c, date, rows.filter(Boolean));
}
// A day's rows (dayRows) with what's while they're at the other home left out, and going and coming back put
// in, in order.
function awayFilter(c, date, rows) {
  const ad = awayOf(c, date);
  if (!ad) return rows;
  const at = slotMins(c, date), plan = planFor(c, date), moves = awayRows(c, date, ad), fromSchool = moves.some(r => r.school);
  const kept = rows.filter(r => !awayAt(ad, at[r.slot]) && !(fromSchool && r.slot === 'home')).map(r => ({ r, min: at[r.slot] }));
  for (const m of moves) {
    const i = kept.findIndex(k => k.min > m.min);
    const row = { ...m, done: !!plan.done[m.slot], missed: !!(plan.missed && plan.missed[m.slot]) };
    if (i < 0) kept.push({ r: row, min: m.min }); else kept.splice(i, 0, { r: row, min: m.min });
  }
  return kept.map(k => k.r);
}
// An activity's row says what photos, videos and notes were taken with it; the activity's sheet shows them.
// The family page shows every child's day the same way, each activity opening for its own child, and with
// the note left when it was done.
// A pill for each kind taken: 📷 2, 🎬 1, 📝 1; '' when there's nothing.
function takenPills(t) {
  const p = [['photos', '📷', 'photo'], ['videos', '🎬', 'video'], ['notes', '📝', 'note']].filter(([k]) => t[k])
    .map(([k, e, one]) => `<span class="pill" aria-label="${t[k]} ${one}${t[k] === 1 ? '' : 's'}">${e} ${t[k]}</span>`);
  return p.length ? `<span class="taken">${p.join('')}</span>` : '';
}
const rowHtml = (r, k, c = kid(), fam = false) => {
  // A plan from Triangle Tots opens the whole plan.
  if (r.outing) return `<button class="prow anchor outingRow" data-outing="${esc(r.outing)}"><span class="em">${esc(r.emoji)}</span><span><small>${esc(clock(minHHMM(r.min)))} · ${esc(r.sub)}</small><b>${esc(r.label)}</b></span><span class="tick">${icon('chev')}</span></button>`;
  // Going to the other home or back opens what's coming up there.
  if (r.away) return `<button class="prow anchor${r.done ? ' done' : ''}" data-away="${c.id}"><span class="em">${r.emoji}</span><span><small>${esc(r.sub)}</small><b>${esc(r.label)}</b></span><span class="tick${r.done ? ' ok' : ''}">${r.done ? icon('check') : icon('chev')}</span></button>`;
  const taken = r.anchor ? '' : takenPills(mediaTally(entriesFrom(state.journal, c.id, k, 'a:' + r.slot, itemKey(r.item))));
  const plan = state.plans[c.id][k], tick = r.done ? plan.done[r.slot] : r.missed ? plan.missed[r.slot] : null;
  const note = (fam || r.anchor) && tick && noteWords(tick);
  // A fixed point (up, the nap, bedtime, school) opens the sheet to put in when it really happened, which then
  // shows in place of when it was planned.
  const said = { wake: 'Up ', bed: 'Asleep ', leave: 'Left ', home: 'Home ', care: 'Dropped off ' }[r.slot] || '';
  const sub = r.anchor && r.done && isTick(tick) ? said + loggedClock(tick) : r.sub;
  return `<button class="prow${r.anchor ? ' anchor' : ''}${r.done || r.missed ? ' done' : ''}" ${r.anchor ? `data-log="${c.id}:${r.slot}" data-log-day="${k}"`
    : `data-act-day="${k}" data-act-slot="${r.slot}"${fam ? ` data-act-kid="${c.id}"` : ''}`}>
  <span class="em">${r.emoji}</span><span><small>${esc(sub)}${r.missed ? ' · missed' : ''}</small><b>${esc(r.label)}</b>${note ? `<small class="note">${note}</small>` : ''}${taken}</span><span class="tick${r.done ? ' ok' : r.missed ? ' no' : ''}">${r.done ? icon('check') : r.missed ? icon('missed') : icon('chev')}</span></button>`;
};

// The next school morning (today's or tomorrow's) with too little time after getting up, in a line that opens
// their times and what would fit; '' otherwise.
function schoolWarnHtml(c, today) {
  const sd = [today, addDays(today, 1)].map(d => schoolDay(c.school, d)).find(Boolean);
  const w = sd && schoolWarning(dayTimes(c, today), { leave: sd.leave, kind: sd.kind, way: sd.kind === 'home' ? null : sd.to.way });
  return w ? `<p class="note warnLine">⚠️ ${w[0]} <button class="link" id="fixTimes">What would fit ${icon('chev')}</button></p>` : '';
}
function renderToday() {
  const c = kid(), today = new Date();
  $('todayCard').innerHTML = `<h2>${sq('today')}Today for ${esc(c.name)}</h2>
    ${outingLineHtml(c, today)}${awayLineHtml(c, today)}${schoolWarnHtml(c, today)}${easyLineHtml(c, today)}${shiftLineHtml(c, today)}${medLineHtml(c, today)}
    <div class="day1">${withOutings(c, today, withExtras(dayRows(c, today), planFor(c, today))).map(r => rowHtml(r, dayKey(today))).join('')}</div>
    <button class="link more" data-add-day="${dayKey(today)}">➕ Something else ${esc(c.name)} did today</button>
    ${dayEasy(planFor(c, today)) ? '' : '<button class="link more" data-easy>🫶 Need an easier day?</button>'}
    ${sleepHtml(c, today)}
    ${apptNote(apptsOn(bumpAppts(bumpShare(), today.getTime()), today))}
    ${pottyHtml(c, today)}
    <p class="muted">Everything else is free play, which matters most. Follow ${esc(c.name)}'s lead.</p>
    <div class="twoBtn">${phone ? `<button class="btn" id="tellDay">${icon('speak')}Tell ${esc(c.name)}</button>` : ''}<button class="btn primary" id="showDay">${icon('play')}Show ${esc(c.name)}</button></div>
    <button class="link more" id="openWeek">This week and the weeks ahead ${icon('chev')}</button>`;
  if (phone) $('tellDay').onclick = () => Android.say(daySentence(c, today));
  $('showDay').onclick = () => openDayBoard();
  if ($('fixTimes')) $('fixTimes').onclick = () => { openSetup(c.id); $('planCard').scrollIntoView({ block: 'start' }); };
  $('openWeek').onclick = () => openWeekAt(0);
}

// ---- At the other home ----
// On the Today card: at the other home now, until when; or going there in the next day. Tapping opens the sheet
// to change it.
function awayLineHtml(c, today) {
  if (!c.away) return '';
  const now = today.getTime(), s = awayStay(c.away, now), p = esc(awayPlace(c.away));
  if (s && s[0] <= now) return `<p class="note warnLine">🏡 At ${p} until ${awayWhen(s[1], now)}. <button class="link" data-away="${c.id}">Change ${icon('chev')}</button></p>`;
  if (s && s[0] - now < 864e5) return `<p class="note warnLine">🎒 Off to ${p} ${awayWhen(s[0], now)}, back ${awayWhen(s[1], now)}. <button class="link" data-away="${c.id}">Change ${icon('chev')}</button></p>`;
  return '';
}
// The sheet: when they're going and when they're back, changed for this time only (the usual schedule and the
// holidays are on their setup page). Each change is a swap in `dates`, after the rest, so it wins.
let awayKid = null;
const localStamp = t => { const d = new Date(t); return `${dayKey(d)}T${hhmmOf(d)}`; };
function openAway(childId) {
  awayKid = childId;
  renderAway();
  $('awayBody').scrollTop = 0;
  $('awaySheet').classList.add('open');
}
function renderAway() {
  const c = state.children.find(k => k.id === awayKid), now = Date.now(), p = esc(awayPlace(c.away)), n = esc(c.name);
  const s = awayStay(c.away, now), on = s && s[0] <= now;
  // Going now (to the next half hour) unless one's coming up today, back when that one ends or else tomorrow evening.
  const go = s && !on && s[0] - now < 864e5 ? s[0] : Math.ceil(now / 18e5) * 18e5;
  const back = s && !on && s[0] - now < 864e5 ? s[1] : stamp(`${dayKey(addDays(new Date(), 1))}T18:00`);
  const next = s && !on ? `<p class="muted">Next time: ${awayWhen(s[0], now)} to ${awayWhen(s[1], now)}.</p>` : '';
  $('awayBody').innerHTML = `<h2>🏡 ${n} at ${p}</h2>
    ${on ? `<p class="lede">At ${p} since ${awayWhen(s[0], now)}, back ${awayWhen(s[1], now)}.</p>
      <label class="field">Back on <input type="datetime-local" id="awBackIn" value="${localStamp(s[1])}"></label>
      <button class="btn big primary" id="awBackSave">${icon('check')}Save</button>
      <button class="btn big" id="awBackNow">${n} is back now</button>`
    : `${next}<p class="muted">Going at a different time, or an extra visit? Change it here, just for this time.</p>
      <label class="field">Going <input type="datetime-local" id="awGoIn" value="${localStamp(go)}"></label>
      <label class="field">Back <input type="datetime-local" id="awBackIn" value="${localStamp(back)}"></label>
      <button class="btn big primary" id="awGoSave">${icon('check')}Save</button>`}
    <p class="muted">While ${n} is at ${p}, their plan, reminders and streaks wait. Routines and the day pick up again when they're back.</p>
    <button class="link more" id="awSetup">The usual schedule and holidays ${icon('chev')}</button>
    <button class="btn big" data-close>Close</button>`;
  const add = (from, to, here) => { if (to > from) { c.away.dates = [...c.away.dates || [], { name: '', from: localStamp(from), to: localStamp(to), here, every: 0 }]; } };
  const done = () => { save(); syncReminders(); closeSheets(); if (pane) renderHome(); else renderToday(); };
  const val = id => $(id).value ? stamp($(id).value) : null;
  if (on) {
    $('awBackSave').onclick = () => {
      const b = val('awBackIn');
      if (!b) return;
      // Back sooner: home from then; later: there until then.
      if (b < s[1]) add(Math.max(b, now - 6e4), s[1], true); else add(s[1], b, false);
      done();
    };
    $('awBackNow').onclick = () => { add(now - 6e4, s[1], true); done(); };
  } else $('awGoSave').onclick = () => {
    const g = val('awGoIn'), b = val('awBackIn');
    if (!g || !b || b <= g) { alert('Back has to be after going.'); return; }
    // In place of the coming one, if this changes it.
    if (s && s[0] - now < 864e5) add(s[0], s[1], true);
    add(g, b, false);
    done();
  };
  $('awSetup').onclick = () => { closeSheets(); openSetup(c.id); $('awayHead').scrollIntoView({ block: 'start' }); };
}
document.addEventListener('click', e => { const b = e.target.closest('[data-away]'); if (b) openAway(b.dataset.away); });

// ---- Easier days ----
// For a day the grown-up needs a break (see EASY): today's plan, for every child, becomes things that ask
// little of them. The Today card says so; or, after a couple of days at home, offers an easy way out.
function easyLineHtml(c, today) {
  const mode = dayEasy(planFor(c, today));
  if (mode) return `<p class="note warnLine">${EASY[mode].emoji} ${EASY[mode].day}: ${EASY[mode].pick} <button class="link" data-easy>What helps ${icon('chev')}</button></p>`;
  const ps = state.plans[c.id] || {}, before = [1, 2, 3, 4, 5, 6, 7].map(i => ps[dayKey(addDays(today, -i))] || null);
  return today.getHours() < 16 && stuckIn(before)
    ? `<p class="note warnLine">🚪 A couple of days at home? <button class="link" data-easy="out">An easy way out today ${icon('chev')}</button></p>` : '';
}
// The sheet: what do you need today, or, for today's easier day, what helps with it and the others to change to.
// `show`: the one to offer first (the nudge to get out offers getting out).
function renderEasy(show) {
  const today = new Date(), c = kid(), now = dayEasy(planFor(c, today)), e = EASY[now];
  const kids = state.children.length > 1 ? 'everyone\'s' : esc(c.name) + '\'s';
  const choice = ([k, x]) => `<button class="pick" data-easy-set="${k}"><span class="em">${x.emoji}</span><span><b>${x.name}</b><br><span class="muted">${x.pick}</span></span></button>`;
  if (!e) {
    $('easyBody').innerHTML = `<h2>What do you need today?</h2>
      <p class="muted">Today's plan for ${kids} day becomes things that ask little of you. Anything already done stays.</p>
      ${Object.entries(EASY).sort(([a], [b]) => (b === show) - (a === show)).map(choice).join('')}
      <button class="btn big" data-close>Close</button>`;
    return;
  }
  const alone = now === 'work' ? state.children.map(k => `<p class="note">${state.children.length > 1 ? `<b>${esc(k.name)}</b>: ` : ''}${e.alone[bandFor(ageMonths(k.birth, today)).band.id]}</p>`).join('') : '';
  $('easyBody').innerHTML = `<div class="actHead"><span class="em">${e.emoji}</span><div><h2>${e.day}</h2><span class="tag">Today</span></div></div>
    <p class="lede">${e.lede}</p>${alone}
    <h3 class="part">${sq('tip', 'sun')}What helps</h3>${numbered(e.tips)}
    <button class="btn big primary" data-close>${icon('check')}See today's plan</button>
    <h3 class="part">Need something else?</h3>${Object.entries(EASY).filter(([k]) => k !== now).map(choice).join('')}
    <button class="btn big" data-easy-off>Back to the usual plan</button>`;
}
function openEasy(show) { renderEasy(show); $('easyBody').scrollTop = 0; $('easySheet').classList.add('open'); }
// Today's plan made easier with `mode` for every child, or (null) back to the usual one. False when there was
// nothing left in it to change.
function setEasy(mode) {
  const today = new Date();
  let changed = false;
  for (const c of state.children) {
    const plan = planFor(c, today), items = mode ? easyItems(planCtx(c, today), today, plan, mode) : usualItems(plan);
    if (JSON.stringify(items) === JSON.stringify(plan.items)) continue;
    plan.items = items;
    plan.edited = true;
    changed = true;
  }
  save();
  if (document.body.dataset.screen === 'week') renderWeek(); else if (pane) renderHome(); else renderToday();
  return changed;
}
$('easyBody').onclick = e => {
  const b = e.target.closest('[data-easy-set],[data-easy-off]');
  if (!b) return;
  if ('easyOff' in b.dataset) { setEasy(null); closeSheets(); return; }
  if (!setEasy(b.dataset.easySet)) { alert('Everything in today\'s plan is already done. Enjoy the rest of the day.'); return; }
  renderEasy(null);
  $('easyBody').scrollTop = 0;
};
document.addEventListener('click', e => { const b = e.target.closest('[data-easy]'); if (b) openEasy(b.dataset.easy || null); });

// ---- Today's times ----
// When today has moved (shiftedTimes): why, and the nap, second nap and bedtime it's moved to, in a line that
// opens them to change; '' on a usual day.
// Too little sleep, a night or a nap, says so as soon as it's put in, with how the day makes up for it.
function shiftLineHtml(c, today) {
  const t = shiftedTimes(c, today), w = t.why, plan = planFor(c, today), d = plan.done, s = t.short || {};
  if (!w.length) return '';
  const up = isTick(d.wake) && HHMM.test(d.wake.t || '') ? clock(d.wake.t) : null;
  const long = m => [m >= 60 && `${Math.floor(m / 60)} hr`, m % 60 && `${m % 60} min`].filter(Boolean).join(' ');
  const short = [w.includes('shortNight') && `Only ${long(s.night)} of sleep last night, ${long(s.nightLess)} less than usual`,
    w.includes('shortNap') && `${w.includes('shortNight') ? 'and a' : 'A'} short nap, ${long(s.nap)}`].filter(Boolean).join(' ');
  const why = w.includes('noNap') ? 'No nap today' : short || (w.includes('nap') ? `Nap at ${clock(t.nap.start)}`
    : w.includes('early') ? `Up early, at ${up}` : w.includes('late') ? `Up at ${up}` : w.includes('sick') ? 'A sick day' : 'Times changed for today');
  // School and daycare days keep their times but bedtime, so there's nothing else to say or change.
  const parts = [], tired = w.includes('sick') || w.includes('shortNight'), fixed = schoolDay(c.school, today) || plan.busy;
  if (t.nap && !w.includes('noNap') && !fixed) {
    if (!isTick(d.nap) && !(plan.missed || {}).nap) parts.push(`${tired ? 'a longer nap' : 'nap'} about ${clock(t.nap.start)}`);
    else if (isTick(d.nap) && tickEnd(d.nap) == null) parts.push(`nap until about ${clock(t.nap.end)}`);
  }
  if (t.restNap) parts.push('a nap at quiet time if they\'re tired');
  if (t.nap2 && !d.nap2 && !(plan.missed || {}).nap2) parts.push(`a short second nap about ${clock(t.nap2.start)}`);
  if (!d.bed) parts.push(`asleep by ${clock(t.bedtime)}${short && t.bedtime < dayTimes(c, today).bedtime ? ', sooner to catch up' : ''}`);
  // The next sleep to put in (logSheet), so the rest of the day moves with it.
  const log = (slot, words) => ` <button class="link" data-log="${c.id}:${slot}" data-log-day="${dayKey(today)}">${words} ${icon('chev')}</button>`;
  const asleep = x => isTick(x) && HHMM.test(x.t || '') && tickEnd(x) == null, missed = plan.missed || {};
  const next = fixed || !t.nap || w.includes('noNap') || d.bed ? ''
    : asleep(d.nap) || asleep(d.nap2) ? log(asleep(d.nap) ? 'nap' : 'nap2', 'Awake? Put in when')
    : !d.nap && !missed.nap ? log('nap', 'Asleep? Put in the nap')
    : !d.nap2 && !missed.nap2 ? log('nap2', t.nap2 ? 'Down for the second nap? Put it in' : 'Napping again? Put in a second nap') : '';
  return `<p class="note warnLine">😴 ${why}${parts.length ? `, so today: ${andList(parts)}` : ''}.${next}</p>`;
}
// ---- Medicine ----
// On a sick day, or after any medicine in the last day: what was given and when the next can be, on Today and
// the family page, and a sheet to put a dose in. Every phone in the family has it, so it's never given twice.
// "2:15 pm", "yesterday 11:30 pm", "tomorrow 1:00 am".
const medWhen = (ms, now = Date.now()) => {
  const k = dayKey(new Date(ms)), today = dayKey(new Date(now));
  return (k === today ? '' : k < today ? 'yesterday ' : 'tomorrow ') + timeWords(ms);
};
function medLineHtml(c, today) {
  const st = medStatus(state.meds[c.id], today.getTime()), open = `<button class="link" data-meds="${c.id}">`;
  if (!st.length) return sickDay(planFor(c, today)) ? `<p class="note warnLine">💊 Giving ${esc(c.name)} medicine? ${open}Keep track of it here ${icon('chev')}</button></p>` : '';
  const one = s => `<b>${esc(s.name)}</b> at ${medWhen(s.last.at, today.getTime())}, ${s.due ? 'the next can be now' : `next from ${medWhen(s.next, today.getTime())}`}`;
  return `<p class="note warnLine">💊 ${st.map(one).join('; ')}. ${open}Medicine ${icon('chev')}</button></p>`;
}
let medKid = null;
function openMeds(childId) {
  medKid = childId;
  renderMeds();
  $('medBody').scrollTop = 0;
  $('medSheet').classList.add('open');
}
// The ones given in the last 90 days, newest first, each as it was last given: to pick and give again.
function medsKnown(c) {
  const seen = new Map();
  for (const d of Object.values(state.meds[c.id] || {}).filter(isDose).sort((a, b) => b.at - a.at))
    if (d.at > Date.now() - 90 * 864e5 && !seen.has(medKey(d.name))) seen.set(medKey(d.name), d);
  return [...seen.values()];
}
function renderMeds(fill) {
  const c = state.children.find(k => k.id === medKid), n = esc(c.name), now = Date.now(), st = medStatus(state.meds[c.id], now);
  const f = fill || { name: '', amount: '', every: 6, max: '', remind: true };
  const known = medsKnown(c);
  const recent = Object.entries(state.meds[c.id] || {}).filter(([, d]) => isDose(d) && d.at > now - 3 * 864e5).sort(([, a], [, b]) => b.at - a.at);
  $('medBody').innerHTML = `<h2>💊 Medicine for ${n}</h2>
    <p class="muted">How much and how often comes from the label or your doctor. This keeps count, says when the next one can be given${syncOn() ? ', and shows it on every phone in the family' : ''}.</p>
    ${st.length ? rowList(st.map(s => ({ em: '💊', title: esc(s.name),
      sub: `${s.last.amount ? esc(s.last.amount) + ' ' : ''}at ${medWhen(s.last.at, now)}${s.last.by ? ' by ' + esc(s.last.by) : ''} · ${s.due ? '<b>the next can be now</b>' : `next from <b>${medWhen(s.next, now)}</b>`}${s.max ? ` · ${s.count} of ${s.max} in 24 hours` : ''}` }))) : ''}
    <h3 class="part">Gave ${n} medicine</h3>
    ${known.length ? `<div class="chips">${known.map((d, i) => `<button data-med-pick="${i}">${esc(d.name)}</button>`).join('')}</div>` : ''}
    <label class="field">Medicine <input type="text" id="mdName" maxlength="60" placeholder="Children's Tylenol" value="${esc(f.name)}"></label>
    <label class="field">How much <input type="text" id="mdAmt" maxlength="40" placeholder="5 ml" value="${esc(f.amount)}"></label>
    <label class="field">How often <select id="mdEvery">${[...new Set([...MED_EVERY, f.every])].sort((a, b) => a - b).map(h => `<option value="${h}"${h === f.every ? ' selected' : ''}>${medEveryWords(h)}</option>`).join('')}</select></label>
    <label class="field">No more than <select id="mdMax"><option value="">No limit given</option>${[1, 2, 3, 4, 5, 6].map(x => `<option value="${x}"${x === f.max ? ' selected' : ''}>${x} in 24 hours</option>`).join('')}</select></label>
    <label class="field">Given at <input type="time" id="mdAt" value="${hhmmOf(new Date())}"></label>
    ${phone ? `<label class="check"><input type="checkbox" id="mdRemind"${f.remind ? ' checked' : ''}> 🔔 Remind me when the next one can be given</label>` : ''}
    <button class="btn big primary" id="mdSave" style="margin-top:12px">${icon('check')}Save</button>
    ${recent.length ? `<h3 class="part">The last few days</h3>${rowList(recent.map(([id, d]) => ({ em: '💊', title: esc(d.name),
      sub: `${d.amount ? esc(d.amount) + ' · ' : ''}${dayWords(dayKey(new Date(d.at)))} ${timeWords(d.at)}${d.by ? ' · ' + esc(d.by) : ''}`,
      end: `<button class="link" data-med-del="${id}">Remove</button>` })))}` : ''}
    <button class="btn big" data-close style="margin-top:10px">Close</button>`;
  medPicks = known;
}
let medPicks = [];
$('medBody').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  const c = state.children.find(k => k.id === medKid);
  if (b.dataset.medPick) {
    const d = medPicks[Number(b.dataset.medPick)];
    renderMeds({ name: d.name, amount: d.amount || '', every: d.every, max: d.max || '', remind: d.remind !== false });
  } else if (b.dataset.medDel) {
    const d = state.meds[c.id][b.dataset.medDel];
    if (!confirm(`Remove ${d.name} at ${timeWords(d.at)}${syncOn() ? ' from every phone' : ''}? Only if it wasn't given.`)) return;
    delete state.meds[c.id][b.dataset.medDel];
    save();
    renderMeds();
    if (pane) renderHome(); else renderToday();
  } else if (b.id === 'mdSave') saveMed(c);
};
function saveMed(c) {
  const name = $('mdName').value.trim(), amount = $('mdAmt').value.trim(), t = $('mdAt').value;
  if (!name) { alert('Which medicine?'); return; }
  if (!HHMM.test(t)) { alert('When was it given?'); return; }
  // A time later than now was last night's, put in after midnight.
  const d = new Date(), [h, m] = t.split(':').map(Number);
  let at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
  if (at > Date.now() + 5 * 60e3) at -= 864e5;
  const soon = medTooSoon(state.meds[c.id], name, at, ms => medWhen(ms));
  if (soon && !confirm(`${soon} Put this one in anyway?`)) return;
  const max = Number($('mdMax').value) || null;
  state.meds[c.id] = { ...state.meds[c.id] || {}, [uid()]: { name, amount, every: Number($('mdEvery').value), max, at, by: me.name, dev: me.dev,
    remind: $('mdRemind') ? $('mdRemind').checked : true } };
  save();
  closeSheets();
  if (pane) renderHome(); else renderToday();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-meds]'); if (b) openMeds(b.dataset.meds); });

// The last week's sleep as it was put in (logSheet), each night and nap, with what's usual; and the school
// mornings the bus was missed this month. Nothing until something's been put in. `head`: its heading.
function sleepHtml(c, today, head = 'Sleep this week') {
  const ps = state.plans[c.id] || {}, s = sleepLog(ps, today);
  const days = s.days.filter(d => d.up != null || d.asleep != null || d.nap || d.noNap);
  const missed = c.school ? missedDays(ps, 'leave', today) : [];
  if (!days.length && !missed.length) return '';
  const at = m => m == null ? '–' : clock(minHHMM(m % 1440)), long = m => m == null ? '–' : hm(m * 60e3);
  const naps = days.some(d => d.nap || d.noNap);
  const nap = d => d.noNap ? 'None' : d.napMins != null ? long(d.napMins) : d.nap ? at(d.nap.start) : '–';
  const tr = (th, cells) => `<tr><th>${th}</th>${cells.map(x => `<td>${x}</td>`).join('')}</tr>`;
  const row = d => tr(d.day === dayKey(today) ? 'Today' : fromKey(d.day).toLocaleDateString([], { weekday: 'short' }),
    [at(d.up), ...naps ? [nap(d)] : [], at(d.asleep), long(d.night)]);
  const { band } = bandFor(ageMonths(c.birth, today)), a = s.avg;
  const sum = a.night == null ? '' : `<p class="muted">About ${long(a.night + (naps && a.napMins || 0))} of sleep a day${naps && a.napMins ? ', naps included' : ''}; at ${esc(c.name)}'s age it's ${band.sleep.total[0]}–${band.sleep.total[1]} hours.</p>`;
  const drift = driftWords(esc(c.name), days, dayTimes(c, today), today);
  const bus = !c.school ? '' : c.school.kind === 'home' ? '📚 Lessons skipped' : c.school.to === 'bus' ? '🚌 Missed the bus' : '🎒 Missed leaving for school';
  return `${days.length ? `<h3 class="part">${sq('sleep', 'plum')}${head}</h3>
    <table class="sleepLog"><tr><th></th><th>Up</th>${naps ? '<th>Nap</th>' : ''}<th>Asleep</th><th>Night</th></tr>${days.map(row).join('')}
    ${days.length > 1 ? `<tr class="avg"><th>Usual</th><td>${at(a.up)}</td>${naps ? `<td>${long(a.napMins)}</td>` : ''}<td>${at(a.asleep)}</td><td>${long(a.night)}</td></tr>` : ''}</table>${sum}${drift ? `<p class="muted">${drift}</p>` : ''}` : ''}
    ${missed.length ? `<p class="muted">${bus} ${missed.length === 1 ? 'once' : missed.length + ' times'} in the last 30 days: ${missed.map(k => fromKey(k).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })).join(', ')}.</p>` : ''}`;
}

// "Good morning, Sam! Today: first, painting. Then, the playground. After your nap, …"
function daySentence(c, date) {
  const rows = dayRows(c, date), lc = s => s.charAt(0).toLowerCase() + s.slice(1);
  const say = slot => { const r = rows.find(r => r.slot === slot); return r ? lc(r.label) : null; };
  const parts = [`Good morning, ${c.name}! Here's our day.`];
  const sd = schoolDay(c.school, date);
  // Picked up by the other home: that's said below, in place of the usual way home.
  const fromOther = rows.some(r => r.slot === 'go' && r.school);
  if (sd) parts.push(fromOther ? schoolWords(sd).say.replace(/ After school,.*$/, '') : schoolWords(sd).say);
  if (say('care')) parts.push(`Today is a daycare day.`);
  for (const { p } of outingsFor(c, date)) for (const t of outingTrips(p)) parts.push(`At ${clock(t.arrive)}, we're going to ${tripName(t)}!`);
  if (say('morning')) parts.push(`First, ${say('morning')}.`);
  if (say('outside')) parts.push(`${say('morning') ? 'Then' : sd ? 'At home' : 'After that'}, ${say('outside')}.`);
  const nap = rows.find(r => r.slot === 'nap');
  if (say('afternoon')) parts.push(`After your ${nap && nap.label === 'Nap' ? 'nap' : 'quiet time'}, ${say('afternoon')}.`);
  if (rows.some(r => r.slot === 'nap2')) parts.push('And later, another little rest.');
  if (say('books')) parts.push(`And at book time, ${say('books')}.`);
  const go = rows.find(r => r.slot === 'go'), back = rows.find(r => r.slot === 'back'), p = c.away && awayPlace(c.away);
  if (!rows.length && p) parts.push(`Today you're at ${p}.`);
  if (back) parts.push(`You'll be back from ${p} at ${clock(minHHMM(back.min))}.`);
  if (go) parts.push(go.school && (c.away.who || '').trim() ? `After school, ${c.away.who.trim()} picks you up.` : `At ${clock(minHHMM(go.min))}, you're going to ${p}.`);
  return parts.join(' ');
}

// The week shown: 0 this one, 1 next week, and so on up to WEEKS_AHEAD (plans from Triangle Tots are often for
// weeks ahead). `weekNote` is a line at the top, as when plans have just come in; it goes when the screen is left.
function openWeekAt(at, note = '') { weekAt = Math.max(0, Math.min(WEEKS_AHEAD, at)); show('week'); weekNote = note; renderWeek(); }
// The week a day (YYYY-MM-DD) is in, counted from this one.
const weeksTo = k => Math.round((weekOf(fromKey(k))[0] - weekOf(new Date())[0]) / (7 * 864e5));
function renderWeek() {
  const c = kid(), today = dayKey(new Date()), days = weekOf(addDays(new Date(), 7 * weekAt)), appts = bumpAppts(bumpShare(), days[0].getTime());
  $('weekTitle').textContent = weekAt === 0 ? `${c.name}'s week` : weekAt === 1 ? `${c.name}'s next week`
    : `${c.name}'s week of ${days[0].toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
  // Plans from Triangle Tots in the weeks ahead, so they can be found from any week.
  const ahead = [...new Set(Object.values(state.outings || {}).filter(p => p && typeof p.date === 'string' && p.date >= today && outingKid(p, c, state.children))
    .map(p => weeksTo(p.date)).filter(w => w !== weekAt && w <= WEEKS_AHEAD))].sort((a, b) => a - b);
  $('weekNav').innerHTML = `${weekNote ? `<p class="note outLine">${esc(weekNote)}</p>` : ''}
    <div class="twoBtn"><button class="btn" id="weekBack"${weekAt ? '' : ' disabled'}>‹ ${weekAt === 1 ? 'This week' : 'Week before'}</button><button class="btn" id="weekOn"${weekAt < WEEKS_AHEAD ? '' : ' disabled'}>${weekAt ? 'Week after' : 'Next week'} ›</button></div>
    ${ahead.length ? `<p class="muted">📍 Plans from Triangle Tots: ${ahead.map(w => `<button class="link" data-week-at="${w}">${esc(weekOf(addDays(new Date(), 7 * w))[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))} week</button>`).join(' · ')}</p>` : ''}`;
  $('weekBack').onclick = () => openWeekAt(weekAt - 1);
  $('weekOn').onclick = () => openWeekAt(weekAt + 1);
  $('weekNav').querySelectorAll('[data-week-at]').forEach(b => { b.onclick = () => openWeekAt(+b.dataset.weekAt); });
  $('weekDays').innerHTML = days.map(d => {
    const k = dayKey(d), rows = withExtras(withOutings(c, d, dayRows(c, d)).filter(r => !r.anchor || ['care', 'leave', 'home'].includes(r.slot)), planFor(c, d));
    const name = k === today ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'long' });
    return `<div class="card day${k === today ? ' isToday' : ''}"><h2>${name}<span class="muted">${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></h2>
      ${rows.map(r => rowHtml(r, k)).join('')}${apptNote(apptsOn(appts, d))}
      ${k <= today ? `<button class="link more" data-add-day="${k}">➕ Something else ${esc(c.name)} did</button>` : ''}</div>`;
  }).join('');
  // What's planned while they're at the other home doesn't count toward the week.
  const bal = weekBalance(days.map(d => { const p = planFor(c, d), shown = new Set(dayRows(c, d).map(r => r.slot)); return { ...p, items: p.items.filter(it => shown.has(it.slot)) }; }));
  const rows = [['read', '📚', 'Books & words', bal.read],
    ['out', '🌳', 'Active & outside', { planned: bal.move.planned + bal.nature.planned, done: bal.move.done + bal.nature.done }],
    ...FOCUS.map(d => [d, DOMAINS[d].emoji, DOMAINS[d].name, bal[d]])];
  $('balance').innerHTML = `<div class="eyebrow">Monday to Sunday</div><h2>${weekAt ? "That week's balance" : "This week's balance"}</h2>
    <p class="muted">Every day: books and active play. Each other area two or three times a week. Light: planned · dark: done.</p>
    ${rows.map(([, e, n, b]) => `<div class="bal"><span>${e}</span><span>${n}</span><span class="muted">${b.done}/${b.planned}</span>
      <div class="bar"><i class="plan" style="width:${b.planned / 7 * 100}%"><i style="width:${b.planned ? b.done / b.planned * 100 : 0}%"></i></i></div></div>`).join('')}
    <h3 class="part">${sq('tip', 'sun')}Why these</h3>${trail(Object.values(DOMAINS).map(d => [d.emoji, d.name, d.why]))}`;
}

// What to try when a child says no: why at this age, what helps, what to avoid, and with a brother or sister.
function saidNoHtml(c, bandId) {
  return `<p class="lede">${SAID_NO.why[bandId]}</p><p class="muted">${SAID_NO.framing}</p>
    <h3 class="part">${sq('tip', 'sun')}What helps</h3>${numbered(SAID_NO.first)}
    <h3 class="part">${sq('missed', 'coral')}What usually backfires</h3>${trail(SAID_NO.avoid.map(x => [icon('missed'), x.t, x.d]), 'avoid')}
    ${state.children.length > 1 ? `<h3 class="part">${sq('share', 'sky')}With a brother or sister</h3>${numbered(SAID_NO.siblings)}` : ''}
    <p class="src">${SAID_NO.worry}</p>`;
}

// An activity, from the day card or the week: how, why, and done (with how the child liked it and a note) /
// swap / missed / not for us / they said no / we did something else.
// Or, from the day's ➕ Something else we did (`add`), what they did on top of the plan, which then has a sheet
// of its own (how it went, photos and notes, or taking it off the day).
let act = null; // { day, slot, add, no: showing what to try after a no, rating: {rate} while saying how it went, other: {q, d, set} while saying what they did }
function openAct(day, slot) { act = { day, slot, add: false, no: false, rating: null, other: null }; renderAct(); $('actSheet').classList.add('open'); }
function openAdd(day) { act = { day, slot: null, add: true, no: false, rating: null, other: { q: '', d: null, set: false } }; renderAct(); $('actSheet').classList.add('open'); }
// The item a sheet is for: the plan's, or something done on top of it; null when it's gone (taken off on another phone).
function actItem(plan, slot) {
  if (!isExtra(slot)) return plan.items.find(i => i.slot === slot) || null;
  return isTick(plan.done[slot]) ? extraItem(slot, plan.done[slot]) : null;
}
// What was done on top of a day's plan, as rows, in the order it was done, before bedtime.
function withExtras(rows, plan) {
  const xs = extrasOf(plan).map(({ slot, t }) => { const it = extraItem(slot, t), x = itemText(it);
    return { slot, emoji: x.emoji, label: x.title, sub: 'Also did', done: true, missed: false, item: it, extra: true }; });
  const bed = rows.findIndex(r => r.slot === 'bed');
  return bed < 0 ? [...rows, ...xs] : [...rows.slice(0, bed), ...xs, ...rows.slice(bed)];
}
// The areas a slot is for, which what they did instead is most likely from (none for something on top).
const slotAreas = (slot, it) => !it ? [] : slot === 'outside' ? ['nature', 'move'] : slot === 'books' ? ['read'] : [itemArea(it)];
// The area something in their own words counts towards: the one tapped, or else what the words say, or else
// the slot's; null for something on top with words that don't say.
const otherArea = (o, q) => o.set ? o.d : guessArea(q) || o.d;
// What the family did instead before, in their own words, for any child: newest first, each title once.
function ownBefore() {
  const out = new Map();
  const put = (k, own) => { const key = own.title.toLowerCase(), had = out.get(key); if (!had || had.k < k) out.set(key, { k, ...own }); };
  for (const ps of Object.values(state.plans)) for (const [k, p] of Object.entries(ps)) {
    for (const it of p.items) if (it.own && p.done[it.slot]) put(k, it.own);
    for (const { t } of extrasOf(p)) if (!t.act) put(k, { title: t.what, d: t.d });
  }
  return [...out.values()].sort((a, b) => a.k < b.k ? 1 : -1);
}
// The list under "What did they do instead?", as it's typed: theirs from before, a new one of their own (and
// the area it counts towards), and the activities for their age.
function otherListHtml(c, it) {
  const o = act.other, q = o.q.trim(), lq = q.toLowerCase(), band = bandFor(ageMonths(c.birth, fromKey(act.day))).band.id;
  const list = otherChoices(band, c.interests || [], q, slotAreas(act.slot, it)).filter(x => !it || it.own || x.id !== it.id).slice(0, q ? 12 : 60);
  const mine = ownBefore().filter(x => x.title.toLowerCase().includes(lq)).slice(0, 8);
  const row = (attrs, emoji, title, sub) => `<button class="pick" data-a="${attrs}"><span class="em">${emoji}</span><span><b>${esc(title)}</b><br><span class="muted">${sub}</span></span></button>`;
  const fresh = q && !mine.some(x => x.title.toLowerCase() === lq) && !list.some(x => x.title.toLowerCase() === lq), area = otherArea(o, q);
  return `${fresh ? `<h3 class="part">Counts towards</h3><div class="chips">${Object.entries(DOMAINS).map(([d, x]) =>
      `<button class="${area === d ? 'on' : ''}" data-a="otherArea" data-d="${d}">${x.emoji} ${x.name}</button>`).join('')}</div>
    ${area ? `<button class="btn big primary" data-a="ownNew" style="margin-top:10px">${icon('check')}${esc(q)}</button>`
      : '<p class="muted">Tap what it counts towards, for the week\'s balance.</p>'}` : ''}
    ${mine.length ? `<h3 class="part">${q ? 'Yours from before' : 'You did before'}</h3>${mine.map(x =>
      row(`ownAgain" data-title="${esc(x.title)}" data-d="${x.d}`, DOMAINS[x.d].emoji, x.title, DOMAINS[x.d].name)).join('')}` : ''}
    ${list.length ? `<h3 class="part">${q ? 'Or one of these' : `For ${esc(c.name)}'s age`}</h3>${list.map(x =>
      row(`otherPick" data-id="${x.id}" data-interest="${x.interest || ''}`, x.emoji, x.title, x.domain.name)).join('')}` : ''}`;
}
function renderAct() {
  const c = kid(), plan = state.plans[c.id][act.day], it = act.add ? null : actItem(plan, act.slot);
  if (!act.add && !it) { closeSheets(); return; }
  if (act.other) {
    const when = act.day === dayKey(new Date()) ? 'today' : 'on ' + fromKey(act.day).toLocaleDateString([], { weekday: 'long' });
    $('actBody').innerHTML = `<h2>${act.add ? `What else did ${esc(c.name)} do ${when}?` : `What did ${esc(c.name)} do instead?`}</h2>
      <label class="field">Type it, or pick one below<input type="text" id="otherIn" maxlength="60" placeholder="${act.add ? 'e.g. Splash pad with cousins' : 'e.g. Zoo with Grandma'}" value="${esc(act.other.q)}" autocomplete="off"></label>
      <div id="otherList">${otherListHtml(c, it)}</div>
      <button class="btn big" ${act.add ? 'data-close' : 'data-a="back"'} style="margin-top:10px">${act.add ? 'Cancel' : '‹ Back'}</button>`;
    return;
  }
  const t = itemText(it), done = plan.done[act.slot], missed = !!(plan.missed && plan.missed[act.slot]);
  const iid = easyOf(it) ? it.easy.interest : it.interest, interest = iid ? INTERESTS[iid] : null, said = !!(plan.no && plan.no[act.slot]);
  const head = `<div class="actHead"><span class="em">${t.emoji}</span><div><h2>${esc(t.title)}</h2>
      <span class="tag">${t.domain.emoji} ${t.domain.name}</span>${t.mins ? `<span class="tag">about ${t.mins} min</span>` : ''}${interest ? `<span class="tag">${interest.emoji} ${interest.name}</span>` : ''}${t.easy ? `<span class="tag">${t.easy.emoji} ${t.easy.day}</span>` : ''}${said ? '<span class="tag">🙅 Said no</span>' : ''}</div></div>`;
  if (act.no) {
    const times = timesRefused(Object.values(state.plans[c.id]), itemKey(it));
    $('actBody').innerHTML = `${head}<h2>When ${esc(c.name)} says no</h2>
      <div class="btnGrid">
        <button class="btn primary" data-a="choose">👆 Let ${esc(c.name)} choose</button>
        <button class="btn" data-a="swap">🔀 Suggest another</button>
      </div>
      ${times >= REFUSED_ENOUGH ? `<p class="note">${esc(c.name)} has said no to this on ${times} days. It may not be for them right now.
        <button class="btn" data-a="nope" style="margin-top:6px">👎 Stop suggesting it</button></p>` : ''}
      ${saidNoHtml(c, bandFor(ageMonths(c.birth, fromKey(act.day))).band.id)}
      <button class="btn big" data-a="back" style="margin-top:10px">‹ Back</button>`;
    return;
  }
  // Done: how the child liked it, and a few words if there's something to remember.
  if (act.rating) {
    const old = isTick(done) ? done : {};
    $('actBody').innerHTML = `${head}<h2>How did ${esc(c.name)} like it?</h2>
      <div class="rateGrid">${Object.keys(RATINGS).reverse().map(n => `<button class="btn${act.rating.rate === Number(n) ? ' on' : ''}" data-a="rate" data-rate="${n}">
        <span class="em">${RATINGS[n][0]}</span>${RATINGS[n][1]}</button>`).join('')}</div>
      <textarea id="rateNote" class="jtextIn" rows="3" maxlength="500" placeholder="A quick note, if you like: what they said, what worked…">${esc(old.note || '')}</textarea>
      <button class="btn big primary" data-a="saveDone" style="margin-top:10px">${icon('check')}${done ? 'Save' : 'Done'}</button>
      ${done ? `<p style="text-align:center;margin:10px 0 0"><button class="link" data-a="undone">${it.extra ? 'Take it off the day' : 'Not done after all'}</button></p>` : ''}
      <button class="btn big" data-a="back" style="margin-top:10px">‹ Back</button>`;
    return;
  }
  const rated = rateWords(done), note = isTick(done) && done.note;
  $('actBody').innerHTML = `${head}
    ${trail([...t.how ? [[icon('steps'), 'How', esc(t.how)]] : [], ...t.you ? [[icon('quiet'), 'Your part', esc(t.you)]] : [], [icon('tip'), 'Why it helps', t.domain.why]])}
    ${done ? `<p class="note doneNote">${did()}<span>Done${isTick(done) ? ` ${timeWords(done.at)}${done.by ? ' by ' + esc(done.by) : ''}` : ''}${rated ? ` · ${rated}` : ''}${note ? `<br>📝 ${esc(note)}` : ''}</span></p>` : ''}
    ${it.extra ? `<div class="btnGrid">
      <button class="btn on" data-a="done">✏️ How it went</button>
      <button class="btn" data-a="undone">🗑️ Take it off</button>
    </div>
    ${takenHtml(c, act.day, 'a:' + act.slot, itemKey(it), t)}
    <button class="btn big" data-a="journal" style="margin-top:8px">📸 Add a photo or note</button>
    <button class="btn big" data-close style="margin-top:10px">Close</button>` : `
    <div class="btnGrid">
      <button class="btn${done ? ' on' : ''}" data-a="done">${done ? '✏️ How it went' : icon('check') + 'Mark done'}</button>
      <button class="btn" data-a="swap">🔀 Suggest another</button>
      <button class="btn${missed ? ' on' : ''}" data-a="missed">🚫 ${missed ? 'Missed' : 'We missed it'}</button>
      ${t.own ? '' : '<button class="btn" data-a="no">🙅 They said no</button>'}
    </div>
    <button class="btn big" data-a="other" style="margin-top:8px">✍️ We did something else</button>
    ${takenHtml(c, act.day, 'a:' + act.slot, itemKey(it), t)}
    <button class="btn big" data-a="journal" style="margin-top:8px">📸 Add a photo or note</button>
    ${t.own ? '' : '<p style="text-align:center;margin:10px 0 0"><button class="link" data-a="nope">👎 Never suggest this again</button></p>'}
    <button class="btn big" data-close style="margin-top:10px">Close</button>`}`;
  fillMedia($('actBody'));
}
// The photos, videos and notes taken with an activity, on its sheet: counted, then each one, with who took it.
function takenHtml(c, day, about, actId, t) {
  const es = entriesFrom(state.journal, c.id, day, about, actId), w = tallyWords(mediaTally(es));
  if (!w) return '';
  const media = es.flatMap(e => e.media || []);
  return `<div class="taken"><h3>Taken with ${t.emoji} ${esc(t.title)}</h3><p class="muted">${w}</p>
    ${media.length ? `<div class="jgrid">${media.map(thumbHtml).join('')}</div>` : ''}
    ${es.filter(e => e.text).map(e => `<p class="jtext">📝 ${esc(e.text)}<span class="muted">${e.by ? ' · ' + esc(e.by) : ''}</span></p>`).join('')}</div>`;
}
$('actBody').onclick = e => {
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const c = kid(), plan = state.plans[c.id][act.day], it = act.add ? null : actItem(plan, act.slot);
  if (!act.add && !it) { closeSheets(); return; }
  const likes = state.likes[c.id] || (state.likes[c.id] = {});
  const swap = () => {
    const date = fromKey(act.day), next = swapItem(planCtx(c, date), date, plan, act.slot, ++plan.swaps);
    if (!next) { alert('Nothing else to swap in for this at this age.'); return; }
    plan.items[plan.items.indexOf(it)] = next;
    plan.edited = true;
    delete plan.done[act.slot];
    if (plan.missed) delete plan.missed[act.slot];
    act.no = false;
  };
  // What they did instead takes the slot's place, done, and then it's how it went.
  const instead = next => {
    const t = itemText(next);
    plan.items[plan.items.indexOf(it)] = next;
    plan.edited = true;
    plan.done[act.slot] = tickOf(t.title, t.emoji);
    if (plan.missed) delete plan.missed[act.slot];
    if (plan.no) delete plan.no[act.slot];
    act.other = null;
    act.rating = { rate: null };
  };
  // Something on top of the plan: a tick of its own (see isExtra), and then it's how it went, on its own sheet.
  const also = next => {
    const t = itemText(next), slot = 'x' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
    plan.done[slot] = { ...tickOf(t.title, t.emoji), d: itemArea(next), ...next.own ? {} : { act: next.id, ...next.interest ? { interest: next.interest } : {} } };
    act = { day: act.day, slot, add: false, no: false, rating: { rate: null }, other: null };
  };
  const did = next => act.add ? also(next) : instead(next);
  const own = (title, d) => ({ slot: act.slot, id: it ? it.id : null, own: { title, d } });
  const a = b.dataset.a;
  // Which area a new one of their own counts towards: only the list changes, so what's typed stays.
  if (a === 'otherArea') { act.other.d = b.dataset.d; act.other.set = true; $('otherList').innerHTML = otherListHtml(c, it); return; }
  if (a === 'choose') { closeSheets(); openChoose(act.day, act.slot); return; }
  if (a === 'journal') { const day = act.day, t = itemText(it); closeSheets(); openEntryFor({ about: 'a:' + it.slot, act: itemKey(it), title: t.title, emoji: t.emoji }, day); return; }
  // Picking how they liked it isn't saved until Done, so what's typed in the note stays as it is.
  if (a === 'rate') {
    const n = Number(b.dataset.rate);
    act.rating.rate = act.rating.rate === n ? null : n;
    for (const x of $('actBody').querySelectorAll('[data-rate]')) x.classList.toggle('on', Number(x.dataset.rate) === act.rating.rate);
    return;
  }
  if (a === 'done') {
    const old = plan.done[act.slot];
    act.rating = { rate: isTick(old) && RATINGS[old.rate] ? old.rate : null };
    $('actBody').scrollTop = 0;
    renderAct();
    return;
  }
  if (a === 'saveDone') {
    const t = itemText(it), old = plan.done[act.slot], note = $('rateNote').value.trim();
    const tick = isTick(old) ? { ...old } : tickOf(t.title, t.emoji);
    if (act.rating.rate) tick.rate = act.rating.rate; else delete tick.rate;
    if (note) tick.note = note; else delete tick.note;
    plan.done[act.slot] = tick;
    if (plan.missed) delete plan.missed[act.slot];
    // Loved: suggested more often, as the old ⭐ did (one of their own is never suggested).
    if (it.own) {}
    else if (tick.rate === 4) likes[itemKey(it)] = 1;
    else if (likes[itemKey(it)] === 1 && isTick(old) && old.rate === 4) delete likes[itemKey(it)];
    act.rating = null;
  }
  else if (a === 'undone') { delete plan.done[act.slot]; act.rating = null; }
  else if (a === 'missed') {
    plan.missed = plan.missed || {};
    if (plan.missed[act.slot]) delete plan.missed[act.slot];
    else { const t = itemText(it); plan.missed[act.slot] = tickOf(t.title, t.emoji); delete plan.done[act.slot]; }
  }
  else if (a === 'swap') swap();
  else if (a === 'nope') { likes[itemKey(it)] = -1; swap(); }
  // A no is kept with the day, so a pattern shows over a few days; it isn't a dislike.
  else if (a === 'no') { (plan.no = plan.no || {})[act.slot] = true; act.no = true; }
  else if (a === 'other') { act.other = { q: '', d: slotAreas(act.slot, it)[0], set: false }; $('actBody').scrollTop = 0; renderAct(); return; }
  else if (a === 'otherPick') did({ slot: act.slot, id: b.dataset.id, interest: b.dataset.interest || null });
  else if (a === 'ownAgain') did(own(b.dataset.title, b.dataset.d));
  else if (a === 'ownNew') { const title = act.other.q.trim(), d = otherArea(act.other, title); if (!title || !d) return; did(own(title, d)); }
  else if (a === 'back') { act.no = false; act.rating = null; act.other = null; }
  save();
  $('actBody').scrollTop = 0;
  renderAct();
  if (document.body.dataset.screen === 'week') renderWeek(); else if (pane) renderHome(); else renderToday();
};
$('actBody').addEventListener('input', e => {
  if (e.target.id !== 'otherIn' || !act || !act.other) return;
  const c = kid();
  act.other.q = e.target.value;
  $('otherList').innerHTML = otherListHtml(c, act.add ? null : actItem(state.plans[c.id][act.day], act.slot));
});
document.addEventListener('click', e => { const b = e.target.closest('[data-add-day]'); if (b) openAdd(b.dataset.addDay); });
// From the family page the activity is that child's: they become the current child (the family page stays
// open), so the sheet, choosing and the journal all work on them.
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act-slot]');
  if (!b) return;
  if (b.dataset.actKid && b.dataset.actKid !== state.current) { state.current = b.dataset.actKid; save(); }
  openAct(b.dataset.actDay, b.dataset.actSlot);
});

// ---- When it really happened ----
// Up, the nap (or quiet time), asleep, leaving for school and home again, daycare, and routines: a grown-up puts
// in when each really happened, for every child the row is for, so sleep shows as it was (sleepLog) and a missed
// bus is kept. It's the day's tick with `t` (and `end`, for a nap); a missed one is in the plan's `missed`; a
// routine's tick is in state.done as ever.
let logDraft = null; // { day, note, noted, rows: [{ c, slot | rid, label, emoji, words, missWords, t, end, missed, had, dirty }] }
function logRow(c, what, day) {
  const date = fromKey(day), hh = t => isTick(t) ? minHHMM(tickMin(t)) : '';
  if (what.startsWith('r.')) {
    const r = (state.routines[c.id] || []).find(x => x.id === what.slice(2));
    if (!r) return null;
    const tick = ((state.done[day] || {})[c.id] || {})[r.id];
    return { c, rid: r.id, label: routineName(r), emoji: r.emoji, words: ['Done at'], t: hh(tick), end: '', missed: false, had: tick, school: r.template === 'school', nap: r.template === 'nap', planned: r.when };
  }
  // A second nap the day didn't plan for, put in all the same: the day moves with it once it's in.
  const row = kidTimeRows(c, date).find(r => r.slot === what && !r.act) || (what === 'nap2' && shiftedTimes(c, date).nap ? { emoji: '😴', min: null } : null);
  if (!row) return null;
  const plan = planFor(c, date), done = plan.done[what], missed = (plan.missed || {})[what], quiet = row.emoji === '🧸';
  const sd = schoolDay(c.school, date), hs = sd && sd.kind === 'home';
  const W = { wake: ['Up', ['Woke up at']], nap: [quiet ? 'Quiet time' : 'Nap', quiet ? ['From', 'Until'] : ['Fell asleep', 'Woke up']],
    nap2: ['A second nap', ['Fell asleep', 'Woke up'], 'No second nap'],
    bed: ['Asleep', ['Asleep at']], leave: [row.label, [hs ? 'Started at' : 'Left at'], hs ? 'Skipped today' : sd && sd.to.way === 'bus' ? 'Missed the bus' : 'Missed it'],
    home: [row.label, [hs ? 'Finished at' : 'Home at']], care: [row.label, ['Dropped off at'], "Didn't go today"] }[what];
  return { c, slot: what, label: W[0], emoji: row.emoji, words: W[1], missWords: what === 'nap' ? (quiet ? 'No quiet time today' : 'No nap today') : W[2],
    t: hh(done), end: isTick(done) && tickEnd(done) != null ? done.end : '', missed: !!missed, had: done || missed, planned: row.min == null ? null : minHHMM(row.min) };
}
function openLog(day, spec) {
  const rows = [];
  for (const s of spec.split(' ')) {
    const at = s.indexOf(':'), c = state.children.find(k => k.id === s.slice(0, at));
    const r = c && logRow(c, s.slice(at + 1), day);
    if (!r) continue;
    rows.push(r);
    // A School morning routine on a school day has leaving for school with it, for a missed bus.
    if (r.school && schoolDay(c.school, fromKey(day)) &&!spec.includes(`${c.id}:leave`)) rows.push(logRow(c, 'leave', day));
    // A nap routine has the sleep it leads into with it (the second nap once the nap's in), to put in when they
    // fell asleep and woke, not just when the routine was done.
    const sleep = r.nap && (isTick(planFor(c, fromKey(day)).done.nap) ? 'nap2' : 'nap');
    if (sleep && !spec.includes(`${c.id}:${sleep}`)) { const s = logRow(c, sleep, day); if (s) rows.push(s); }
  }
  if (!rows.length) return;
  const had = rows.find(r => isTick(r.had) && r.had.note);
  logDraft = { day, rows, note: had ? had.had.note : '', noted: false, fam: pane === 'family' };
  renderLog();
  $('logSheet').classList.add('open');
}
function renderLog() {
  const d = logDraft, first = d.rows[0], kids = new Set(d.rows.map(r => r.c.id)).size;
  // Each child's name when there's more than one; leaving for school, under a School morning routine.
  const head = r => { const h = [kids > 1 ? esc(r.c.name) : '', r.label !== first.label ? `${esc(r.emoji)} ${esc(r.label)}` : ''].filter(Boolean).join(' · ');
    return h ? `<h3>${h}</h3>` : ''; };
  $('logBody').innerHTML = `<div class="actHead"><span class="em">${esc(first.emoji)}</span><div><h2>${esc(first.label)}</h2>
      <span class="tag">${dayWords(d.day)}</span>${first.planned ? `<span class="tag">Planned ${clock(first.planned)}</span>` : ''}</div></div>
    <p class="muted">When it really happened. ${kids > 1 ? 'Their pages show' : esc(first.c.name) + "'s page shows"} the week's sleep.</p>
    ${d.rows.map((r, i) => `<div class="logKid">${head(r)}
      <div class="logTimes">${r.words.map((w, j) => `<label>${w}<input type="time" class="timeIn" data-i="${i}" data-f="${j ? 'end' : 't'}" value="${j ? r.end : r.t}"${r.missed ? ' disabled' : ''}></label>`).join('')}
        <button class="btn small" data-now="${i}"${r.missed ? ' disabled' : ''}>Now</button></div>
      <div class="logMore">${r.missWords ? `<button class="btn small${r.missed ? ' on' : ''}" data-miss="${i}">${icon('missed')}${r.missWords}</button>` : ''}
        ${r.t || r.end || r.missed ? `<button class="link" data-clear="${i}">Clear</button>` : ''}
        ${r.slot === 'leave' || r.slot === 'home' && !d.rows.some(x => x.c === r.c && x.slot === 'leave')
          ? `<button class="link" data-noschool="${i}">No school ${d.day === dayKey(new Date()) ? 'today' : 'that day'}</button>` : ''}</div></div>`).join('')}
    ${d.day === dayKey(new Date()) ? d.rows.filter(r => r.rid).map(r => `<button class="btn big" data-start="${d.rows.indexOf(r)}" style="margin-top:10px">${icon('play')}Start ${
      esc(r.label)}${kids > 1 ? ' with ' + esc(r.c.name) : ''}</button>`).join('') : ''}
    <textarea id="logNote" class="jtextIn logNote" rows="2" maxlength="500" placeholder="A note, if you like: a bad night, the bus came early…">${esc(d.note)}</textarea>
    <button class="btn big primary" id="logSave" style="margin-top:10px">${icon('check')}Save</button>
    ${d.fam ? [...new Map(d.rows.map(r => [r.c.id, r.c])).values()].map(c => `<button class="link more" data-logkid="${c.id}">${esc(c.name)}'s page ${icon('chev')}</button>`).join('') : ''}
    <button class="btn big" data-close style="margin-top:10px">Close</button>`;
}
$('logBody').addEventListener('input', e => {
  const i = e.target.closest('[data-i]');
  if (i) { const r = logDraft.rows[i.dataset.i]; r[i.dataset.f] = i.value; r.dirty = true; }
  else if (e.target.id === 'logNote') { logDraft.note = e.target.value; logDraft.noted = true; }
});
$('logBody').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  const d = logDraft, r = d.rows[b.dataset.now ?? b.dataset.miss ?? b.dataset.clear ?? b.dataset.noschool];
  if (b.dataset.logkid) { state.current = b.dataset.logkid; pane = ''; save(); closeSheets(); renderHome(); show('home'); return; }
  if (b.id === 'logSave') return saveLog();
  // Start: the routine's chart, for that child, as its reminder opens it; finishing it ticks it.
  if (b.dataset.start) { const s = d.rows[b.dataset.start]; state.current = s.c.id; save(); closeSheets(); openChart(s.rid); return; }
  if (!r) return;
  if (b.dataset.noschool) return noSchool(r.c, d.day);
  // Now: the first time still to put in (a nap's end, once it started), or else the last.
  if (b.dataset.now) { const n = new Date(), f = r.words.length > 1 && r.t && !r.end ? 'end' : 't'; r[f] = minHHMM(n.getHours() * 60 + n.getMinutes()); }
  else if (b.dataset.miss) { r.missed = !r.missed; if (r.missed) r.t = r.end = ''; }
  else { r.t = r.end = ''; r.missed = false; }
  r.dirty = true;
  renderLog();
};
// A snow day, a sick day, a holiday that wasn't put in: a day off on the child's school, so that day is planned
// as an ordinary one and has no school reminders. Leaving and getting home, put in or missed, go with it. Taken
// back on the child's edit page, under Days off.
function noSchool(c, day) {
  const s = c.school;
  s.off = [...(s.off || []), { from: day, to: day, name: day === dayKey(new Date()) ? 'No school today' : 'No school' }].sort((a, b) => a.from < b.from ? -1 : 1);
  const plan = (state.plans[c.id] || {})[day];
  if (plan) {
    for (const slot of ['leave', 'home']) { delete plan.done[slot]; if (plan.missed) delete plan.missed[slot]; }
    if (plan.missed && !Object.keys(plan.missed).length) delete plan.missed;
  }
  replanDay(c, day);
  save();
  closeSheets();
  if (document.body.dataset.screen === 'week') renderWeek(); else renderHome();
}
function saveLog() {
  const d = logDraft, note = d.note.trim();
  const bad = d.rows.find(r => r.t && r.end && toMin(r.end) <= toMin(r.t)) || d.rows.find(r => r.end && !r.t);
  if (bad) { alert(bad.t ? `${bad.c.name}'s ${bad.label.toLowerCase()} ends before it starts.` : `When did ${bad.c.name}'s ${bad.label.toLowerCase()} start?`); return; }
  // A tick keeps who first ticked it; the note goes on every one saved here.
  const stamp = (r, old, missed) => {
    const x = isTick(old) ? { ...old } : tickOf(r.label, r.emoji);
    if (missed) { delete x.t; delete x.end; } else { x.t = r.t; if (r.end) x.end = r.end; else delete x.end; }
    if (note) x.note = note; else delete x.note;
    return x;
  };
  for (const r of d.rows) {
    if (!r.dirty && !(d.noted && isTick(r.had))) continue; // untouched (an old tick without a time stays as it is)
    if (!r.dirty) { const n = { ...r.had }; if (note) n.note = note; else delete n.note; r.had = n; }
    if (r.rid) {
      const day = state.done[d.day] = state.done[d.day] || {}, kd = day[r.c.id] = day[r.c.id] || {};
      if (!r.dirty) kd[r.rid] = r.had; else if (r.t) kd[r.rid] = stamp(r, kd[r.rid]); else delete kd[r.rid];
      continue;
    }
    const plan = planFor(r.c, fromKey(d.day)), missed = plan.missed = plan.missed || {};
    if (!r.dirty) { if (plan.done[r.slot]) plan.done[r.slot] = r.had; else missed[r.slot] = r.had; }
    else if (r.missed) { missed[r.slot] = stamp(r, missed[r.slot], true); delete plan.done[r.slot]; }
    else if (r.t) { plan.done[r.slot] = stamp(r, plan.done[r.slot]); delete missed[r.slot]; }
    else { delete plan.done[r.slot]; delete missed[r.slot]; }
    if (!Object.keys(missed).length) delete plan.missed;
  }
  save();
  closeSheets();
  if (document.body.dataset.screen === 'week') renderWeek(); else renderHome();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-log]');
  if (b) openLog(b.dataset.logDay, b.dataset.log);
});

// The child picks between what was planned and one other thing from the same area: a say in how, not whether.
let choice = null; // { day, slot, options: [item, item] }
function openChoose(day, slot) {
  const c = kid(), plan = state.plans[c.id][day], it = plan.items.find(i => i.slot === slot), date = fromKey(day);
  const alt = swapItem(planCtx(c, date), date, plan, slot, ++plan.swaps);
  if (!alt) { alert('There\'s nothing else to choose from for this at this age.'); return; }
  save();
  choice = { day, slot, options: [it, alt] };
  const ts = choice.options.map(itemText);
  $('chooseTitle').textContent = `Which one, ${c.name}?`;
  $('chooseTiles').innerHTML = ts.map((t, i) => `<button class="tile" data-pick="${i}"><span class="em">${t.emoji}</span>${esc(t.title)}</button>`).join('');
  show('choose');
  if (phone) Android.say(`${c.name}, which one? ${ts[0].title}, or ${ts[1].title}?`);
}
$('chooseTiles').onclick = e => {
  const b = e.target.closest('[data-pick]');
  if (!b || !choice) return;
  const c = kid(), plan = state.plans[c.id][choice.day], picked = choice.options[Number(b.dataset.pick)];
  const i = plan.items.findIndex(x => x.slot === choice.slot);
  if (itemKey(plan.items[i]) !== itemKey(picked)) { plan.items[i] = picked; plan.edited = true; delete plan.done[choice.slot]; if (plan.missed) delete plan.missed[choice.slot]; }
  if (plan.no) delete plan.no[choice.slot]; // they chose it: that's a yes
  save();
  choice = null;
  b.classList.add('chosen');
  chime(true);
  if (phone) Android.say(`${itemText(picked).title}. Good choice!`);
  setTimeout(() => { renderHome(); show('home'); }, 1400);
};

// ---- Adding a routine ----
// One already added says so, and opens that one rather than adding it twice.
$('addRoutine').onclick = () => {
  const had = id => kidRoutines().find(r => r.template === id);
  $('picks').innerHTML = TEMPLATES.map(t => `<button class="pick" data-tpl="${t.id}"><span class="em">${t.emoji}</span><span><b>${t.name}</b><br><span class="muted">${
    had(t.id) ? `Already added: open it` : t.intro}</span></span></button>`).join('');
  $('pickSheet').classList.add('open');
};
$('picks').onclick = e => {
  const b = e.target.closest('[data-tpl]');
  if (!b) return;
  const old = kidRoutines().find(r => r.template === b.dataset.tpl);
  if (old) { closeSheets(); openEditor(old.id); return; }
  const r = newRoutine(b.dataset.tpl, kidBand().band.id, uid());
  nameRest(r, napsNow(kid(), kidBand().band));
  r.added = { at: Date.now(), by: me.name, dev: me.dev };
  kidRoutines().push(r);
  save();
  closeSheets();
  openEditor(r.id);
};
const closeSheets = () => { scanStop(); dropDraft(); closeView(); document.querySelectorAll('.sheet.open').forEach(s => s.classList.remove('open')); };

// ---- Editor ----
// The current child's routine, or null when it (or the child) was deleted, maybe on another phone.
const routine = id => (kid() && kidRoutines().find(r => r.id === id)) || null;
// Home, or "Add a child" when there's no child left.
function goHome() {
  if (kid()) { renderHome(); show('home'); } else openSetup(null);
}
// The routine open here was deleted on another phone: back home, saying so. Null, for `return routineGone()`.
function routineGone() {
  closeSheets();
  goHome();
  alert('That routine was deleted on another phone.');
  return null;
}
let openStep = -1;
function openEditor(id) {
  const r = routine(id);
  if (!r) return routineGone();
  editing = id;
  openStep = -1;
  const t = TEMPLATES.find(t => t.id === r.template);
  $('editIntro').textContent = t ? t.intro : '';
  $('editNameIn').value = r.name;
  $('editWhen').value = r.when || '';
  $('editSpeak').checked = r.speak !== false;
  $('editScreens').hidden = kidBand().band.id !== 't1';
  remindAsked = false;
  renderReminder();
  renderEditor();
  show('edit');
}
function renderReminder() {
  const r = routine(editing);
  if (!r) return routineGone();
  // On unless switched off (before 1.27, off unless switched on).
  $('editRemind').checked = r.remind !== false;
  $('editRemind').disabled = !r.when;
  $('editRemindLbl').textContent = r.when ? `Remind me ${REMIND_BEFORE} minutes before` : 'Remind me (set a usual time first)';
  const blocked = phone && r.remind !== false && r.when && !Android.notifyAllowed();
  $('remindNote').hidden = !blocked;
  $('remindNote').textContent = remindAsked ? 'Choose Allow when Android asks about notifications, or reminders can\'t show.'
    : 'Notifications are off for Tot Routines, so reminders can\'t show. Turn them on in Settings › Apps › Tot Routines › Notifications.';
}
function renderEditor() {
  const r = routine(editing);
  if (!r) return routineGone();
  const { band } = kidBand();
  $('editEmoji').textContent = r.emoji;
  $('editName').textContent = r.name;
  const advice = lengthAdvice(r, band);
  $('editAdvice').hidden = !advice;
  $('editAdvice').textContent = advice || '';
  $('steps').innerHTML = r.steps.map((s, i) => {
    const info = stepInfo(s), exp = s.custom ? null : expectFor(s.key, band.id);
    const more = (s.custom ? '<p>Your own step.</p>'
      : trail([[icon('steps'), 'At this age', exp || 'Not usually expected yet. Fine to keep if your child is ready.'], [icon('tip'), 'How to teach it', STEPS[s.key].how]])) +
      (phone && i === openStep ? mediaHtml(mediaName(state.current, s.key)) : '');
    return `<div class="step${i === openStep ? ' open' : ''}" data-i="${i}">
      <div class="head">
        ${pictureHtml(state.current, s, { img: 'thumb', em: 'em' })}
        <span class="lbl" data-act="open">${esc(info.label)}<small>${s.custom ? 'Your own' : exp ? 'Tap for tips' : 'Not suggested yet'}</small></span>
        <span class="mvs"><button class="mv" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(info.label)} up">▲</button>
        <button class="mv" data-act="down" ${i === r.steps.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(info.label)} down">▼</button>
        <button class="mv del" data-act="del" aria-label="Remove ${esc(info.label)}">✕</button></span>
      </div>
      <div class="more">${more}</div>
    </div>`;
  }).join('');
}
// Photo and voice controls for the open step.
function mediaHtml(name) {
  const hasPhoto = !!photoSrc(name), hasVoice = Android.hasVoice(name), busy = recName !== null;
  return `<div class="media">
    <div class="mrow"><span class="mlabel">📷 Photo</span>
      <button class="btn" data-act="cam">Take</button><button class="btn" data-act="gal">Choose</button>
      ${hasPhoto ? '<button class="btn danger" data-act="nophoto">Remove</button>' : ''}</div>
    <div class="mrow"><span class="mlabel">🎙 Your voice</span>
      ${recName === name ? `<button class="btn rec" data-act="stop">■ Stop (${REC_MAX - recSecs})</button>`
        : `<button class="btn" data-act="rec" ${busy ? 'disabled' : ''}>${hasVoice ? 'Record again' : 'Record'}</button>`}
      ${hasVoice && recName !== name ? '<button class="btn" data-act="play">▶ Play</button><button class="btn danger" data-act="novoice">Remove</button>' : ''}</div>
    <p class="muted">A photo of their own toothbrush or pajamas means more to a toddler than a drawing. Say the step the way you
      would ("Time to brush teeth!"). Both show in every routine with this step.</p>
  </div>`;
}
$('steps').onclick = e => {
  const el = e.target.closest('[data-act]'), row = e.target.closest('.step');
  if (!el || !row) return;
  const r = routine(editing), i = Number(row.dataset.i);
  if (!r) return routineGone();
  if (!r.steps[i]) return renderEditor(); // changed on another phone meanwhile
  const act = el.dataset.act, name = mediaName(state.current, r.steps[i].key);
  if (act === 'cam' || act === 'gal') {
    if (!Android.takePhoto(name, act === 'cam')) alert(act === 'cam' ? 'This phone has no camera app to take the photo.' : 'This phone has no app to choose a photo from.');
    return;
  }
  if (act === 'nophoto') { Android.deletePhoto(name); delete photos[name]; }
  else if (act === 'rec') return startRec(name);
  else if (act === 'stop') { stopRec(); return renderEditor(); }
  else if (act === 'play') { Android.play(name); return; }
  else if (act === 'novoice') Android.deleteVoice(name);
  if (recName && act !== 'open') return; // nothing moves while recording
  if (act === 'open') {
    if (recName) stopRec();
    openStep = openStep === i ? -1 : i;
  }
  else if (act === 'up' || act === 'down') {
    const j = act === 'up' ? i - 1 : i + 1;
    [r.steps[i], r.steps[j]] = [r.steps[j], r.steps[i]];
    if (openStep === i) openStep = j; else if (openStep === j) openStep = i;
  } else if (act === 'del') {
    forgetRemoved();
    removed = { routine: r.id, i, step: r.steps.splice(i, 1)[0] };
    removed.timer = setTimeout(forgetRemoved, 8000);
    $('undoMsg').textContent = `Removed ${stepInfo(removed.step).label}.`;
    $('undoBar').classList.add('show');
    openStep = -1;
  }
  save();
  renderEditor();
};

// A removed step can be put back for a few seconds. Built-in steps can also come back from "Add a step";
// a step of your own can't, so once the undo has gone its photo and voice go too.
let removed = null;
function forgetRemoved() {
  if (!removed) return;
  clearTimeout(removed.timer);
  const s = removed.step;
  if (s.custom && phone) { const n = mediaName(state.current, s.key); Android.deletePhoto(n); Android.deleteVoice(n); delete photos[n]; }
  removed = null;
  $('undoBar').classList.remove('show');
}
$('undo').onclick = () => {
  const r = routine(removed.routine);
  if (r) r.steps.splice(removed.i, 0, removed.step);
  clearTimeout(removed.timer);
  removed = null;
  $('undoBar').classList.remove('show');
  save();
  renderEditor();
};
$('editNameIn').oninput = e => { const r = routine(editing); if (!r) return routineGone(); r.name = e.target.value.trim() || 'Routine'; save(); $('editName').textContent = r.name; };
$('editNameIn').onchange = syncReminders; // reminders say the routine's name
$('editWhen').onchange = e => {
  const r = routine(editing);
  if (!r) return routineGone();
  r.when = e.target.value || null;
  save();
  syncReminders();
  renderReminder();
};
$('editRemind').onchange = e => { const r = routine(editing); if (!r) return routineGone(); r.remind = e.target.checked; save(); syncReminders(); renderReminder(); };
$('editSpeak').onchange = e => { const r = routine(editing); if (!r) return routineGone(); r.speak = e.target.checked; save(); };
$('editChart').onclick = () => openChart(editing);
$('editPrint').onclick = () => printChart(editing);
$('delRoutine').onclick = () => {
  const r = routine(editing);
  if (!r) return routineGone();
  if (!confirm(`Delete the ${r.name} routine?`)) return;
  state.routines[state.current] = kidRoutines().filter(x => x.id !== r.id);
  save();
  syncReminders();
  renderHome();
  show('home');
};

// Adding a step: the suggested ones not already in the routine, or the grown-up's own.
let ownEmoji = OWN_EMOJI[0];
$('addStep').onclick = () => {
  const r = routine(editing);
  if (!r) return routineGone();
  const { band } = kidBand(), keys = stepSuggestions(r, band.id);
  $('stepPicks').innerHTML = keys.length ? keys.map(k => `<button class="pick" data-step="${k}"><span class="em">${STEPS[k].emoji}</span><span><b>${STEPS[k].label}</b><br><span class="muted">${expectFor(k, band.id)}</span></span></button>`).join('')
    : '<p class="muted">Every suggested step is already in this routine.</p>';
  $('ownLabel').value = '';
  renderOwnEmoji();
  $('stepSheet').classList.add('open');
};
function renderOwnEmoji() {
  $('ownEmoji').innerHTML = OWN_EMOJI.map((e, i) => `<button ${pressed(e === ownEmoji)} data-em="${e}" aria-label="${OWN_EMOJI_NAMES[i]}">${e}</button>`).join('');
}
$('ownEmoji').onclick = e => { const b = e.target.closest('[data-em]'); if (b) { ownEmoji = b.dataset.em; renderOwnEmoji(); } };
$('stepPicks').onclick = e => {
  const b = e.target.closest('[data-step]');
  if (!b) return;
  const r = routine(editing);
  if (!r) return routineGone();
  r.steps.push({ key: b.dataset.step });
  save(); closeSheets(); renderEditor();
};
$('ownAdd').onclick = () => {
  const label = $('ownLabel').value.trim();
  if (!label) { $('ownLabel').focus(); return; }
  const r = routine(editing);
  if (!r) return routineGone();
  r.steps.push({ key: 'own-' + uid(), custom: true, emoji: ownEmoji, label });
  save(); closeSheets(); renderEditor();
};

// ---- Sharing with another grown-up ----
let shareCode = null, shareBusy = false, shareErr = '';
// After a sync: the other phone's changes are in `state` when `remote`; show them, set their reminders, and
// say what's new in them (`docs`, given what this phone `known` before; null when it's the whole family).
function syncChanged(remote, docs, known) {
  if (remote) {
    if (docs) tellNews(newsOf(docs, known, me.dev));
    if (!kid()) { state.current = state.children[0] ? state.children[0].id : null; saveLocal(); }
    if (state.children.filter(nameRests).length) saveLocal(); // a phone before 1.77 still says "Nap / quiet time"
    syncReminders();
    pruneMedia(); // an entry deleted on another phone takes its photos and videos with it
    if (draft && !draft.isNew && !state.journal[draft.id]) { closeSheets(); alert('That journal entry was deleted on another phone.'); }
    const s = document.body.dataset.screen;
    if (!state.current) { if (s === 'home' || s === 'week' || s === 'journal') openSetup(null); }
    else if (s === 'home') renderHome();
    else if (s === 'week') renderWeek();
    else if (s === 'journal') renderJournal();
    // Joined from the first screen: the family's children arrived.
    else if (s === 'setup' && $('shareSheet').classList.contains('open')) { renderHome(); show('home'); }
  }
  renderShareCard();
  // Not while the grown-up is typing their name in it.
  if ($('shareSheet').classList.contains('open') && document.activeElement !== $('shareMe')) renderShare();
}
// The other phones' news while the app is open: a note at the top for a few seconds. (While it's closed, the
// phone app checks for it and sends a notification: Watch.java.)
let newsTimer;
function tellNews(lines) {
  // Not over the picture chart, which is the child's.
  if (!lines.length || document.body.dataset.screen === 'chart') return;
  const bys = [...new Set(lines.map(l => l.by))];
  $('newsToast').innerHTML = `<b>${bys.length === 1 && bys[0] ? 'From ' + esc(bys[0]) : 'New from the family'}</b>` +
    lines.slice(0, 4).map(l => `<span>${newsEmoji(l.emoji)} ${esc(l.text)}</span>`).join('') + (lines.length > 4 ? `<span class="muted">and ${lines.length - 4} more</span>` : '');
  $('newsToast').classList.add('show');
  clearTimeout(newsTimer);
  newsTimer = setTimeout(() => $('newsToast').classList.remove('show'), 6000);
}
$('newsToast').onclick = () => { $('newsToast').classList.remove('show'); if (state.current) openFamily(); };
// This phone's name in the family's list of phones (sync.js), and the news of a phone joining: said wherever
// the grown-up is, since one they didn't expect should be removed (in Sharing).
const syncPhoneName = () => me.name;
function syncPhoneJoined(names) {
  shareCode = null; // the invite was used
  tellNews(names.map(n => ({ emoji: '📱', text: `${n ? n + "'s phone" : 'A new phone'} joined your family's sharing. Not expected? Remove it in Sharing.`, by: '' })));
}
// What the app's news check needs (Watch.java): the family's secret, how far this phone has synced, this phone's
// id (its own ticks aren't news) and what it knows (newsKnown). Off ('') when sharing stops or the server lost
// the family. It's called from inside each sync round, and notifications are extra: if Android won't set the
// check up, that's logged and sharing carries on (in 1.17 a refusal here stopped every round).
function syncWatch(info) {
  // While sharing, this phone's copy is locked (vault.js), unless the grown-up turned the lock off: it holds the
  // family's secret, which shouldn't sit readable in the phone's backups. The family's other phones are its
  // backup then, so there's no key to keep. When sharing stops, a lock that was only for sharing comes off.
  if (info && !vault.on && !localStorage.getItem(LOCK_AUTO)) autoLock();
  else if (!info && vault.on && !vault.locked && localStorage.getItem(LOCK_AUTO) === 'auto') autoUnlock();
  // With the lock on, the family's secret also opens this phone's copy, while it shares. When sharing stops,
  // a copy the grown-up locked without a backup key (none is needed while sharing) gets one now.
  else vault.family(info ? info.secret : null).then(async () => {
    if (!info && vault.on && !vault.locked && !vault.hasBackup && !vault.forFamily) showBackup(await vault.newBackup(), true);
  }).catch(e => console.error("the lock couldn't follow the family:", e.message));
  watchNews(info);
}
function watchNews(info) {
  if (!phone) return;
  try {
    Android.setWatch(info ? JSON.stringify({ secret: info.secret, rev: info.rev, dev: me.dev, ...newsKnown(state) }) : '');
  } catch (e) {
    console.error('the news check could not be set up:', e.message);
  }
}
const syncedAt = () => syncInfo && syncInfo.at ? new Date(syncInfo.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
function renderShareCard() {
  const [title, sub] = !syncOn() ? (syncRedo ? ['Sharing is now private', 'Share again'] : ['Share with another grown-up', 'The same children, routines and journal on both phones'])
    : syncInfo.error ? ['Sharing is on', `Not synced (${syncInfo.error === 'offline' ? 'offline' : 'trying again'})`]
    : ['Sharing is on', syncedAt() ? 'Synced ' + syncedAt() : 'With your family'];
  $('shareCard').innerHTML = `${sq('share', 'coral')}<span><b>${title}</b><small>${sub}</small></span><i class="chev">${icon('chev')}</i>`;
}
// The invite as a QR code (vendor/qrcode.js).
function qrSvg(text) {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 6, margin: 4, scalable: true, alt: 'Invite QR code' });
}
const phoneLabel = p => p.name ? `${p.name}'s phone` : 'A phone';
function renderShare() {
  if (scanning) {
    $('shareBody').innerHTML = scanFor === 'plans' ? `
      <h2>📷 Scan the code from Triangle Tots</h2>
      <p class="muted">On triangletots.com/family, tap Send to Tot Routines. Point this phone's camera at the QR code it shows.</p>`
      : `
      <h2>📷 Scan the invite</h2>
      <p class="muted">On the other phone, tap Share with another grown-up, then Invite a grown-up. Point this phone's camera at the QR code it shows.</p>`;
    $('shareBody').insertAdjacentHTML('beforeend', `
      <div class="scan" id="scanBox"></div>
      <p class="advice" id="scanNote" hidden></p>
      <button class="btn big" id="scanCancel">Cancel</button>`);
    $('scanBox').append(scanVideo);
    scanVideo.play().catch(() => {});
    $('scanCancel').onclick = () => { scanStop(); scanBack(); };
    return;
  }
  const code = shareCode ? `<div class="card code"><p class="muted">On the other phone, open Tot Routines, tap Share with another grown-up, then 📷 Scan their invite, and point it at this code. On an iPhone, open tottoolbox.com/routines in Safari first, and add it to the Home Screen.</p>
      <div class="qr">${qrSvg(shareCode)}</div><p class="muted">Works once, for the next 15 minutes, then a new one is needed. Anyone who scans it joins your family, so show it only to the other grown-up. Each phone that joins is listed below, and can be removed.</p></div>` : '';
  const privacy = `<p class="muted">🔒 Everything is locked on your phones before it's sent. The server keeps only the locked copy, and only the phones in your family have the key, so no one else can read it, Tot Toolbox included. Photos and videos wait there, locked, only until your other phones collect them (48 hours at most).</p>`;
  const err = shareErr ? `<p class="advice">${esc(shareErr)}</p>` : '';
  const others = syncOn() ? syncPhones() : [];
  const phones = `<h3>Phones sharing</h3>
    <ul class="phones"><li><span><b>This phone</b>${me.name ? `<small>${esc(me.name)}</small>` : ''}</span></li>${others.map(p => `
      <li><span><b>${esc(phoneLabel(p))}</b><small>Joined ${p.at ? new Date(p.at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}${
        p.by === syncDev ? ' · added by this phone' : others.some(o => o.dev === p.by) ? ` · added by ${esc(phoneLabel(others.find(o => o.dev === p.by)))}` : ''}</small>${
        p.keyed ? '' : `<small class="warn">Not verified: it didn't join with an invite from a phone here. If it's yours, remove it and invite it again.</small>`}</span>
        <button class="btn" data-rm="${esc(p.dev)}"${shareBusy ? ' disabled' : ''}>Remove</button></li>`).join('')}</ul>
    <p class="muted">Removing a phone gives your family a new key, which the other phones get by themselves: the removed phone keeps what it already had, but gets nothing new. A phone with a Tot Routines older than 1.43 shows here once it's updated.</p>`;
  $('shareBody').innerHTML = syncOn() ? `
    <h2>${sq('share', 'coral')}Sharing is on</h2>
    <p class="muted">Children, routines, plans, ticks and the journal are the same on every phone you've invited${phone ? ', and each gets the reminders' : ''}.
      ${syncInfo.error ? 'Not synced just now: ' + esc(syncInfo.error) + '. It keeps trying.' : syncedAt() ? 'Last synced ' + syncedAt() + '.' : ''}</p>
    <label class="field">Your name, so the others see who did what <input type="text" id="shareMe" maxlength="24" placeholder="Your first name" value="${esc(me.name)}"></label>
    ${privacy}${code}${err}
    <button class="btn primary big" id="shareInvite"${shareBusy ? ' disabled' : ''}>Invite another grown-up</button>
    ${phones}
    <button class="btn big" id="shareLeave"${shareBusy ? ' disabled' : ''}>Stop sharing on this phone</button>
    <button class="btn big danger" id="shareDelete"${shareBusy ? ' disabled' : ''}>Stop sharing on every phone and delete the shared copy</button>
    <button class="btn big" data-close>Done</button>` : `
    <h2>${sq('share', 'coral')}Share with another grown-up</h2>
    <p class="muted">Both phones show the same children, routines, day plans, ticks and journal${phone ? ', and both get the reminders' : ''}. A change on one shows on the other in a moment.</p>
    ${syncRedo ? `<p class="advice">Sharing is now private, so it was switched off when the app updated. Invite from one phone and scan the QR code with the other to turn it back on. Nothing on this phone was changed.</p>` : ''}
    ${privacy}
    <p class="muted">The journal's photos and videos are shared too. The photos and recorded voices on routine steps stay on the phone that made them.</p>
    ${err}
    <button class="btn primary big" id="shareInvite"${shareBusy ? ' disabled' : ''}>Invite a grown-up</button>
    <h3>Did the other grown-up already share?</h3>
    <button class="btn big" id="shareScan"${shareBusy ? ' disabled' : ''}>📷 Scan their invite</button>
    <button class="btn big" data-close>Cancel</button>`;
  $('shareInvite').onclick = () => shareStep(async () => {
    if (syncOn() && !await phoneRoom()) return;
    if (!syncOn()) await syncCreate();
    shareCode = (await syncInvite()).text;
  });
  if (syncOn()) {
    $('shareMe').oninput = e => { me.name = e.target.value.trim(); vault.set(ME_KEY, JSON.stringify(me)); syncSoon(2000); };
    $('shareBody').querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
      const p = others.find(x => x.dev === b.dataset.rm);
      if (!p || !confirm(`Remove ${p.name ? p.name + "'s phone" : 'this phone'} from your family's sharing? It keeps what it already has, but gets nothing new, and can't change anything. To share with it again, invite it again.`)) return;
      // The phones it let in may be its grown-up's too: offered for removal with it.
      const added = syncLetInBy(p.dev).map(d => others.find(o => o.dev === d)).filter(Boolean);
      const also = added.length && confirm(`${phoneLabel(p)} added ${added.length === 1 ? 'another phone' : `${added.length} other phones`}: ${added.map(phoneLabel).join(', ')}. Remove ${added.length === 1 ? 'it' : 'them'} too?`);
      shareCode = null;
      shareStep(() => syncRemove([p.dev, ...(also ? added.map(o => o.dev) : [])]));
    });
    $('shareLeave').onclick = () => {
      const last = !syncPhones().length;
      if (!confirm(`Stop sharing on this phone? It keeps its own copy of everything; changes stop going to and from the other phones.${last ? " It's the only phone sharing, so the shared copy is deleted from the server too." : ''}`)) return;
      shareCode = null;
      shareStep(() => syncLeave());
    };
    $('shareDelete').onclick = () => {
      if (!confirm("Stop sharing on every phone, and delete your family's shared copy from the server? Every phone keeps its own copy of everything.")) return;
      shareCode = null;
      shareStep(() => syncLeave(true));
    };
  } else {
    $('shareScan').onclick = () => scanStart('invite');
  }
}

// ---- Scanning an invite ----
// The camera shows in the share sheet and a few frames a second are checked for a QR code (vendor/jsQR.js).
const scanVideo = document.createElement('video');
scanVideo.muted = true;
scanVideo.setAttribute('playsinline', '');
const scanCanvas = document.createElement('canvas');
let scanning = null; // the camera while scanning
// What's being scanned: 'invite' (Share) or 'plans' (a code from Triangle Tots, from Photos and privacy). Either way
// the camera shows in the share sheet; scanning for plans goes back to Photos and privacy after.
let scanFor = 'invite';
function scanBack() {
  if (scanFor !== 'plans') { renderShare(); return; }
  $('shareSheet').classList.remove('open');
  renderSettings();
  $('setSheet').classList.add('open');
}
async function scanStart(what = 'invite') {
  scanFor = what;
  shareErr = '';
  try {
    scanning = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  } catch (e) {
    const why = e.name === 'NotAllowedError' ? "Scanning needs the camera. Allow it for Tot Routines in the phone's Settings, then try again."
      : e.name === 'NotFoundError' ? "This phone's camera couldn't be found." : "The camera wouldn't start (" + e.message + ').';
    if (what === 'plans') { outingMsg = why; scanBack(); return; }
    shareErr = why;
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
    // Shrunk to at most 640 pixels across: plenty for a QR code filling part of the picture, and quick.
    const s = Math.min(1, 640 / Math.max(w, h)), cw = Math.round(w * s), ch = Math.round(h * s);
    scanCanvas.width = cw;
    scanCanvas.height = ch;
    const g = scanCanvas.getContext('2d', { willReadFrequently: true });
    g.drawImage(scanVideo, 0, 0, cw, ch);
    const qr = jsQR(g.getImageData(0, 0, cw, ch).data, cw, ch, { inversionAttempts: 'dontInvert' });
    if (qr && (plansCode(qr.data) || plansDay(qr.data))) {
      scanStop();
      $('shareSheet').classList.remove('open');
      outingAdd(qr.data);
      return;
    }
    if (qr && scanFor === 'plans' && qr.data) { $('scanNote').textContent = "That QR code isn't one from Triangle Tots."; $('scanNote').hidden = false; }
    else if (qr && inviteCode(qr.data)) {
      scanStop();
      if (state.children.length && !confirm("Join the other phone's family? This phone's children and routines are replaced by the shared ones.")) { renderShare(); return; }
      shareStep(() => syncJoin(qr.data));
      return;
    }
    else if (qr && qr.data) { $('scanNote').textContent = "That QR code isn't a Tot Routines invite."; $('scanNote').hidden = false; }
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
    shareErr = e.status ? e.message : "Couldn't reach the sharing server. Check the internet connection and try again.";
  }
  shareBusy = false;
  renderShare();
  renderShareCard();
}
$('shareCard').onclick = () => { shareErr = ''; shareCode = null; renderShare(); $('shareSheet').classList.add('open'); };
$('setupJoin').onclick = () => { $('shareCard').onclick(); scanStart(); };

// ---- Photos and privacy ----
// The lock (vault.js): on by itself while sharing (see syncWatch), and otherwise off unless the grown-up turns
// it on, offered once after the first child is added. Turning it on gives a backup key to keep; while sharing,
// the family's other phones can open a moved copy instead.
let lockBusy = null; // what the lock is doing: 'Locking…', '12 of 40 photos and videos'
const LOCK_ASKED = 'tot-vault-asked';
// 'auto': the lock is on only because sharing is (it comes off when sharing stops); 'off': the grown-up turned
// it off while sharing, so it isn't put back on. Not there: the grown-up's own choice, or never decided.
const LOCK_AUTO = 'tot-vault-auto';
function lockWords() {
  // In a browser there's no keystore: the key is beside what it locks, so it's said as it is.
  if (!phone) return `<p class="muted">${vault.on ? "🔒 What Tot Routines keeps in this browser is locked, but the lock's key is kept beside it, so it's less protected than in the Android app." : "🔓 Not locked. Locking seals what Tot Routines keeps in this browser, but the lock's key is kept beside it, so it's less protected than in the Android app."}</p>`;
  return vault.on ? `<p class="muted">🔒 Everything Tot Routines keeps on this phone is locked with a key only this phone has. A backup of this phone (Google's included) can't be read without ${
      vault.forFamily ? (vault.hasBackup ? 'your backup key or an invite from your family' : "an invite from your family's other phones, so there's no key to remember") : 'your backup key'}.${
      localStorage.getItem(LOCK_AUTO) === 'auto' ? ' It was locked when sharing started, and unlocks when sharing stops.' : ''}</p>`
    : `<p class="muted">🔓 Not locked. Locking seals everything Tot Routines keeps on this phone (children, routines, the journal and its photos and videos) with a key only this phone has, so its files and its backups (Google's included) can't be read without it.${
      syncOn() ? " While sharing, that includes your family's key, which unlocks your family's shared copy." : ''}</p>`;
}
// Sharing started (or was on before 1.43) with the lock off: it goes on, with no backup key to keep.
let autoLocking = false;
async function autoLock() {
  if (autoLocking || lockBusy || vault.on || !syncOn()) return;
  autoLocking = true;
  lockBusy = 'Locking…';
  try {
    await vault.enable(syncInfo.secret);
    localStorage.setItem(LOCK_AUTO, 'auto');
    if (phone) Android.vaultConvert(true);
  } catch (e) {
    console.error("this phone's copy couldn't be locked for sharing:", e.message);
    lockBusy = null;
    return;
  } finally {
    autoLocking = false;
  }
  lockBusy = null;
  resealMedia();
}
// Sharing stopped, and the lock was only for it: back off, as before sharing.
async function autoUnlock() {
  if (autoLocking || lockBusy || !vault.on || vault.locked) return;
  autoLocking = true;
  try {
    vault.leave();
    await resealMedia();
    if (phone) Android.vaultConvert(false);
    await vault.disable();
    localStorage.removeItem(LOCK_AUTO);
  } catch (e) {
    console.error("this phone's copy couldn't be unlocked when sharing stopped:", e.message);
  } finally {
    autoLocking = false;
  }
}
function lockSection() {
  return `<h3>🔒 Lock this phone's copy</h3>${lockWords()}
    ${lockBusy ? `<p class="advice">${esc(lockBusy)}</p>` : vault.on
      ? `<button class="btn big" id="lockNewKey">🔑 ${vault.hasBackup ? 'Make a new backup key' : 'Make a backup key too'}</button><button class="btn big" id="lockOff">Turn the lock off</button>`
      : `<button class="btn primary big" id="lockOn">Lock it</button>`}`;
}
function wireLock() {
  if ($('lockOn')) $('lockOn').onclick = lockOn;
  if ($('lockOff')) $('lockOff').onclick = lockOff;
  if ($('lockNewKey')) $('lockNewKey').onclick = async () => {
    if (vault.hasBackup && !confirm('Make a new backup key? The one you kept stops working.')) return;
    localStorage.removeItem(LOCK_AUTO); // with a key kept, the lock is the grown-up's: it stays when sharing stops
    showBackup(await vault.newBackup());
  };
}
// Turn the lock on: what's kept here sealed now, the journal's photos and videos one by one after.
async function lockOn() {
  lockBusy = 'Locking…';
  renderSettings();
  let words;
  try {
    words = await vault.enable(syncOn() ? syncInfo.secret : null);
    localStorage.removeItem(LOCK_AUTO); // the grown-up's own choice: it stays on when sharing stops
    if (phone) Android.vaultConvert(true);
  } catch (e) {
    alert("This phone's copy couldn't be locked: " + e.message);
    throw e;
  } finally {
    lockBusy = null;
  }
  // While sharing there's no backup key to keep: the family's phones open it.
  if (words) showBackup(words); else renderSettings();
  resealMedia();
}
async function lockOff() {
  if (!confirm(`Turn the lock off? Everything Tot Routines keeps on this phone is kept unlocked again${vault.hasBackup ? ', and your backup key stops working' : ''}${
    syncOn() ? ". While sharing, that includes your family's key, so a backup of this phone could open your family's shared copy" : ''}.`)) return;
  vault.leave();
  await resealMedia();
  if (phone) Android.vaultConvert(false);
  await vault.disable();
  // Turned off by hand while sharing: it isn't put back on by itself.
  if (syncOn()) localStorage.setItem(LOCK_AUTO, 'off'); else localStorage.removeItem(LOCK_AUTO);
  renderSettings();
}
async function resealMedia() {
  try {
    await mediaStore.reseal((done, all) => {
      lockBusy = done < all ? `${vault.sealing ? 'Locking' : 'Unlocking'} the journal's photos and videos: ${done} of ${all}` : null;
      if ($('setSheet').classList.contains('open') && !$('backupKey')) renderSettings();
    });
  } catch (e) {
    alert(`Some photos or videos couldn't be ${vault.sealing ? 'locked' : 'unlocked'}: ${e.message}. It tries again when the app next starts.`);
  }
  lockBusy = null;
  if ($('setSheet').classList.contains('open') && !$('backupKey')) renderSettings();
}
// The backup key, once: it isn't kept anywhere it could be shown again.
// sharingStopped: made because sharing stopped, and with it the family's way in.
function showBackup(words, sharingStopped) {
  $('setBody').innerHTML = `<h2>🔑 Your backup key</h2>
    ${sharingStopped ? `<p class="advice">This phone isn't sharing with your family any more, so their phones can't unlock its copy on a new phone. Keep this key instead.</p>` : ''}
    <div class="backupKey" id="backupKey">${words}</div>
    <p class="muted">Write it down, or keep it in a password manager: somewhere other than this phone. It's the only way to open this phone's copy on a new phone${syncOn() ? " when no other phone in your family can send an invite" : ''}. It isn't shown again; you can make a new one in Photos and privacy, at the bottom of the home screen.</p>
    <button class="btn big" id="backupCopy">Copy it</button>
    <label class="check" style="margin-top:12px"><input type="checkbox" id="backupKept"> I've kept it somewhere safe</label>
    <button class="btn primary big" id="backupDone" disabled style="margin-top:10px">Done</button>`;
  $('setSheet').classList.add('open');
  $('backupCopy').onclick = () => navigator.clipboard.writeText(words).then(() => { $('backupCopy').innerHTML = icon('check') + 'Copied'; },
    () => alert("It couldn't be copied here: write it down instead."));
  $('backupKept').onchange = e => { $('backupDone').disabled = !e.target.checked; };
  $('backupDone').onclick = () => renderSettings();
}
// Once, at a start after the first child was added (not over the first screen), and not while sharing (it's
// locked by itself then): lock it?
function offerLock() {
  if (vault.on || syncOn() || !state.children.length || vault.get(LOCK_ASKED)) return;
  vault.set(LOCK_ASKED, '1');
  $('setBody').innerHTML = `<h2>🔒 Lock what's on this phone?</h2>${lockWords()}
    <p class="muted">${syncOn() ? "There's no key to remember: if this phone is lost, a new phone gets back in with an invite from another family phone. (If you stop sharing, you'll be given a backup key then.)"
      : "You'll get a backup key to keep somewhere safe, not on this phone. Without it, a backup moved to a new phone can't be opened."}</p>
    <div class="twoBtn"><button class="btn" data-close>Not now</button><button class="btn primary" id="lockOn">Lock it</button></div>
    <p class="muted">You can change this any time in Photos and privacy, at the bottom of the home screen.</p>`;
  $('lockOn').onclick = lockOn;
  $('setSheet').classList.add('open');
}
function renderSettings() {
  $('setBody').innerHTML = `<h2>${sq('settings', 'sky')}Photos and privacy</h2>
    ${lockSection()}
    ${phone ? `<h3>📷 The journal in your gallery</h3>
    <p class="muted">The journal's photos and videos can go into this phone's gallery too, in a Tot Routines album. Any one can be saved from the viewer with ⬇ Save to phone. In the gallery they aren't locked: they're like any other photo on the phone, and its backups.</p>
    <div class="chips" id="galleryMode"><button data-g="auto"${galleryAuto() ? ' class="on"' : ''}>Save every one</button><button data-g=""${galleryAuto() ? '' : ' class="on"'}>Only when I tap Save</button></div>
    <p class="muted">${galleryAuto() ? `Each new photo and video goes in, the other phones' too.` : ''}</p>` : ''}
    ${outingSection()}
    ${phone ? '' : webLimits()}
    ${planSection()}
    <button class="btn big" data-close style="margin-top:14px">Done</button>`;
  wireLock();
  wirePlan();
  wireOutings();
  if (phone) $('galleryMode').onclick = ev => {
    const b = ev.target.closest('[data-g]');
    if (!b) return;
    me.gallery = b.dataset.g;
    vault.set(ME_KEY, JSON.stringify(me));
    const left = notInGallery();
    if (galleryAuto() && left.length && confirm(`Save ${left.length === 1 ? 'the one photo or video' : `the ${left.length} photos and videos`} already in the journal too?`)) autoGallery(left);
    renderSettings();
  };
}
$('setCard').onclick = () => { renderSettings(); $('setSheet').classList.add('open'); planRefresh(); };

// ---- Plans from Triangle Tots: days planned on the website, carried here with a code (sync.js) ----
// Each plan shows in the day it's for: a line at the top of that child's Today card (or the next one coming up this
// week), its leaving, being there and coming home among the day's rows and in everyone's day by time, and the whole
// plan in a sheet (every stop, address and link, each child's day, moved naps, the rainy-day one). Children are
// matched by name (logic.js outingKid). Plans are only read here: the website is where they're made and changed.
let outingMsg = '';
const outingDay = d => new Date(`${d}T12:00:00Z`).toLocaleDateString([], { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
// A day's plans for a child: [{p, k}], k being the plan's entry for them (outingKid).
const outingsFor = (c, date) => outingsOn(state.outings, dayKey(date)).map(p => ({ p, k: outingKid(p, c, state.children) })).filter(x => x.k);
// A day's rows (dayRows, with extras) with the plan's rows put in at their times.
function withOutings(c, date, rows) {
  const add = outingsFor(c, date).flatMap(({ p }) => outingRows(p));
  if (!add.length) return rows;
  const at = slotMins(c, date), out = rows.slice();
  for (const o of add) {
    const i = out.findIndex(r => { const m = r.outing || r.away ? r.min : at[r.slot]; return m != null && m > o.min; });
    if (i < 0) out.push(o); else out.splice(i, 0, o);
  }
  return out;
}
// The line at the top of the Today card: today's plan, or the next one this week.
function outingLineHtml(c, today) {
  const now = outingsFor(c, today)[0];
  if (now) {
    const t = outingTrips(now.p)[0], d = t && tripDrive(t);
    const when = !t ? '' : d ? `, leave home by ${clock(minHHMM(toMin(t.arrive) - d))}` : `, from ${clock(t.arrive)}`;
    return `<p class="note outLine">📍 <b>Today: ${esc(t ? tripName(t) : now.p.title || 'your plan')}</b>${esc(when)}. <button class="link" data-outing="${esc(now.p.id)}">The plan ${icon('chev')}</button></p>`;
  }
  const next = outingNext(state.outings, dayKey(addDays(today, 1)), 7 * WEEKS_AHEAD);
  if (!next || !outingKid(next, c, state.children)) return '';
  const t = outingTrips(next)[0], tomorrow = next.date === dayKey(addDays(today, 1)), soon = next.date <= dayKey(addDays(today, 6));
  return `<p class="note outLine">📅 ${tomorrow ? 'Tomorrow' : esc(soon ? outingDay(next.date).split(',')[0] : outingDay(next.date))}: <b>${esc(t ? tripName(t) : next.title || 'a plan')}</b>${t ? ` at ${esc(clock(t.arrive))}` : ''}. <button class="link" data-outing="${esc(next.id)}">The plan ${icon('chev')}</button></p>`;
}
// The whole plan, in a sheet.
const mapLink = a => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
const webOnly = u => typeof u === 'string' && /^https?:\/\//.test(u) ? u : null;
function tripHtml(t) {
  const d = tripDrive(t), stops = tripStops(t);
  const money = Number.isFinite(t.usd) ? (t.usd === 0 ? 'Free.' : `About $${Math.round(t.usd)} for the family.`) : '';
  const meta = s => [s.label, HHMM.test(s.time || '') ? `at ${clock(s.time)}` : '', s.venue && s.venue !== s.title ? s.venue : ''].filter(Boolean).map(String).join(' · ');
  return `<div class="outTrip">
    <p class="lede">${esc(clock(t.arrive))} to ${esc(clock(t.leave))}${d ? ` · leave home by ${esc(clock(minHHMM(toMin(t.arrive) - d)))}, about ${d} minutes' drive, home about ${esc(clock(minHHMM(toMin(t.leave) + d)))}` : ''}</p>
    ${stops.map(s => `<div class="outStop"><b>${esc(s.icon || '📍')} ${webOnly(s.url) ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>` : esc(s.title)}</b>
      ${meta(s) ? `<small class="muted">${esc(meta(s))}</small>` : ''}
      ${s.address ? `<p><a href="${esc(mapLink(s.address))}" target="_blank" rel="noopener">${esc(s.address)}</a></p>` : ''}
      ${s.cost ? `<p class="muted">${esc(s.cost)}</p>` : ''}</div>`).join('')}
    ${t.why ? `<p>${esc(t.why)}</p>` : ''}${t.tips ? `<p class="muted">💡 ${esc(t.tips)}</p>` : ''}${money ? `<p class="muted">${esc(money)}${t.outdoor ? ' Outdoors.' : ''}</p>` : t.outdoor ? '<p class="muted">Outdoors.</p>' : ''}
  </div>`;
}
let outingOpen = null;
function openOuting(id) {
  const p = state.outings[id];
  if (!p) return;
  outingOpen = id;
  const trips = outingTrips(p), many = trips.length > 1;
  const kids = (Array.isArray(p.kids) ? p.kids : []).filter(k => k && typeof k === 'object');
  const day = kids.map(k => {
    const nap = outingNapWords(k), tl = (Array.isArray(k.timeline) ? k.timeline : []).filter(b => b && HHMM.test(b.start || ''));
    return `<details class="outing"><summary><b>${esc(k.name || 'Your child')}'s day</b></summary>
      ${nap ? `<p class="muted">Moved for this plan: ${esc(nap)}.</p>` : ''}
      <ul class="outTl">${tl.map(b => `<li><span class="t">${esc(clock(b.start))}</span> ${esc(b.title || '')}${b.detail ? `<small class="muted">${esc(b.detail)}</small>` : ''}</li>`).join('')}</ul></details>`;
  }).join('');
  const warned = (Array.isArray(p.warned) ? p.warned : []).filter(w => typeof w === 'string');
  const rain = p.rain && outingTrips({ trips: [p.rain] })[0];
  $('outingBody').innerHTML = `<h2>📍 ${esc(p.title || 'Your plan')}</h2>
    <p class="muted">${esc(outingDay(p.date))} · planned on Triangle Tots</p>
    ${warned.length ? `<div class="note warnLine"><p><b>Planned anyway, as you asked.</b> Keep in mind:</p><ul>${warned.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
    ${trips.map((t, i) => `${many ? `<h3>${i ? 'Later on' : 'First'}</h3>` : ''}${tripHtml(t)}`).join('') || '<p>A day at home.</p>'}
    ${rain ? `<h3>☔ If it rains</h3>${tripHtml(rain)}` : ''}
    ${Number.isFinite(p.miles) && p.miles > 0 ? `<p class="muted">${esc(String(p.miles))} miles of driving in all${Number.isFinite(p.dollars) && p.dollars > 0 ? `, about $${Math.round(p.dollars)} to spend` : ''}.</p>` : ''}
    ${day}
    <p class="muted">Drive times are by road, without traffic. Check an event's own page before you go. To change this plan, change it on triangletots.com and send it again.</p>
    <button class="btn big" data-close>Close</button>
    <button class="link more" id="outingDel">Remove this plan from every phone</button>`;
  $('outingDel').onclick = () => {
    // A linked phone would only get it back: it goes from the website's saved plans.
    if (linkPair()) { alert('This phone is linked to Triangle Tots, so the plan would come back. Remove it under Saved plans on triangletots.com/family, and it goes from every phone.'); return; }
    if (!confirm('Remove this plan from Tot Routines on every phone in your family? It stays saved on triangletots.com.')) return;
    delete state.outings[id];
    save(); closeSheets();
    if (pane) renderHome(); else renderToday();
  };
  $('outingBody').scrollTop = 0;
  $('outingSheet').classList.add('open');
}
document.addEventListener('click', e => { const b = e.target.closest('[data-outing]'); if (b) openOuting(b.dataset.outing); });
// Under Photos and privacy: the plans coming up, and the box to paste a code into.
function outingSection() {
  const today = dayKey(new Date());
  const list = Object.values(state.outings || {}).filter(p => p && typeof p.date === 'string' && p.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const one = p => `<button class="prow anchor" data-outing="${esc(p.id)}"><span class="em">📍</span><span><small>${esc(outingDay(p.date))}</small><b>${esc(p.title || 'A plan')}</b></span><span class="tick">${icon('chev')}</span></button>`;
  const msg = outingMsg ? `<p class="note outLine" role="status">${esc(outingMsg)}</p>` : '';
  if (linkPair()) return `<h3 id="outingHead">📅 Plans from Triangle Tots</h3>${msg}
    <p class="muted">🔗 Linked to your Triangle Tots account: days you save or remove on triangletots.com change here by themselves, each time the app opens.</p>
    ${list.map(one).join('') || '<p class="muted">No plans coming up. Save a day on triangletots.com/family and it shows up here.</p>'}
    <button class="btn big" id="outingCheck">🔄 Check now</button>
    <button class="link more" id="outingUnlink">Unlink this phone</button>`;
  return `<h3 id="outingHead">📅 Plans from Triangle Tots</h3>${msg}
    ${list.map(one).join('') ||'<p class="muted">With a Triangle Tots family plan, days you save on triangletots.com come here. Tap Link Tot Routines under Saved plans there, then scan its QR code here, or paste the code. You only do it once: from then on, each day you save shows on its Today card and in the family\'s day, on every phone.</p>'}
    <button class="btn big" id="outingScan">📷 Scan the code</button>
    <input id="outingCode" placeholder="Paste the code" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Code from Triangle Tots">
    <button class="btn big" id="outingAdd">Add plans</button>`;
}
// The settings sheet open at the plans, with outingMsg at their top.
function outingShow() {
  renderSettings();
  $('setSheet').classList.add('open');
  if ($('outingHead')) $('outingHead').scrollIntoView({ block: 'start' });
}
// "Saturday, November 14 and Sunday, November 15".
const outingDays = ks => { const w = [...new Set(ks)].map(outingDay); return w.length < 3 ? w.join(' and ') : `${w.slice(0, -1).join(', ')} and ${w.at(-1)}`; };
// A code scanned, pasted or opened from the website's page. While the server is asked, the sheet says so; then the
// week with the soonest new plan opens, saying what came, or the sheet says what went wrong.
async function outingAdd(text) {
  outingMsg = '⏳ Adding the plans…';
  outingShow();
  let took = 0, coming = [];
  try {
    const r = plansTake(await plansOpen(text)), today = dayKey(new Date());
    took = r.took;
    coming = r.days.filter(k => k >= today);
    const gone = took - coming.length, skipped = r.bad ? ` ${r.bad === 1 ? 'One plan' : `${r.bad} plans`} couldn't be read; make a new code on the website.` : '';
    outingMsg = !took ? `No plans came with that code.${skipped}`
      : `✅ ${took === 1 ? 'One plan' : `${took} plans`} added${coming.length ? `: ${outingDays(coming)}` : ''}.${gone > 0 ? ` ${gone === 1 ? 'One was' : `${gone} were`} for a day already past.` : ''}${skipped}${r.pass ? ' Your family plan is on too.' : ''}`;
    if (r.linked) outingMsg = `${took ? outingMsg : '✅'} This phone is linked to Triangle Tots: from now on, days you save or remove on the website change here by themselves.`;
    save();
    if (r.pass) planRefresh();
  } catch (e) {
    outingMsg = e.status ? e.message : "Couldn't reach the server. Check the internet connection and try again.";
  }
  if (coming.length && state.children.length) { closeSheets(); openWeekAt(weeksTo(coming[0]), outingMsg); outingMsg = ''; return; }
  outingShow();
}
// A linked phone asks for the account's plans (sync.js linkPull): when it opens or comes back, and on Check now
// (`asked`), which also says when nothing changed or it couldn't ask.
async function outingSync(asked = false) {
  let r;
  try { r = await linkPull(asked); } catch (e) {
    console.warn(`plans from Triangle Tots: ${e.message}`);
    if (!asked) return;
    r = { failed: true };
  }
  if (!r) return;
  if (r.failed) outingMsg = "Couldn't reach Triangle Tots. Check the internet connection and try again.";
  else if (r.unlinked) outingMsg = r.unlinked;
  else if (r.ended) outingMsg = 'Your Triangle Tots family plan has ended, so plans have stopped coming. The ones here stay.';
  else if (r.changed) {
    save();
    if (r.pass) planRefresh();
    const parts = [r.added.length && `${r.added.length === 1 ? 'A new plan' : `${r.added.length} new plans`}: ${outingDays(r.added)}`,
      r.removed && `${r.removed === 1 ? 'one plan' : `${r.removed} plans`} removed on the website`].filter(Boolean);
    outingMsg = `✅ Up to date with Triangle Tots${parts.length ? `. ${parts.join('; ')}` : ''}.`;
  } else if (asked) outingMsg = '✅ Up to date with Triangle Tots.';
  else return;
  if ($('setSheet').classList.contains('open')) renderSettings();
  else if (r.changed && document.body.dataset.screen === 'home') { if (pane) renderHome(); else renderToday(); }
}
function wireOutings() {
  if ($('outingCheck')) $('outingCheck').onclick = () => { outingMsg = '⏳ Checking…'; renderSettings(); outingSync(true); };
  if ($('outingUnlink')) $('outingUnlink').onclick = async () => {
    if (!confirm('Unlink this phone from Triangle Tots? The plans here stay, but new ones stop coming until you link it again.')) return;
    await linkForget();
    outingMsg = 'This phone is unlinked. To link it again, tap Link Tot Routines under Saved plans on triangletots.com/family.';
    renderSettings();
  };
  if (!$('outingAdd')) return;
  $('outingAdd').onclick = () => outingAdd($('outingCode').value);
  $('outingScan').onclick = () => {
    outingMsg = '';
    $('setSheet').classList.remove('open');
    $('shareSheet').classList.add('open');
    scanStart('plans');
  };
}

// ---- Video quality: the journal's videos at the best quality (up to 4K) with the Supporter plan (sync.js, sync/plans.js) ----
// Paid on Stripe's page in the browser; the app hears of it when it's back in front (appResumed). The prices are
// Stripe's, shown here as they are. The web version sells too, for its phones: it makes its videos at 720p whatever
// the plan, and it only sells to a family already sharing, whose plan key comes from the family's secret. A Safari
// tab keeps its own storage apart from the Home Screen copy, so one with no family would pay for a key nothing reads.
// A copy from Google Play sells nothing and links to nothing that does, as Play's Payments policy asks of an app
// without Play's billing: planGo and openPlanSheet refuse there, and it shows a plain note instead. A family that
// already supports us keeps everything: what a plan unlocks comes from the server (planCheck), not from this copy.
// Two plans, Supporter (up to 4 phones) and Supporter for 5 or more phones ('big'), both tier '4k'. Free shares
// with up to 2 phones; the server says how many a family's plan covers (planInfo.phones, null for any number).
const PLAN_NAMES = { free: '720p', '4k': 'the best quality your phones make (up to 4K)' };
const PLAN_PRICES = { 'supporter-month': '$8 a month', 'supporter-year': '$80 a year', 'big-month': '$12 a month', 'big-year': '$120 a year', 'family-month': '$10 a month', 'family-year': '$100 a year' };
const PLAN_PHONES = { supporter: 'up to 4 phones', big: '5 or more phones', family: 'up to 4 phones' };
const PLAN_QUALITY = { free: '720', '4k': '4k' };
let planInfo = null, planBusy = false, planErr = '';
// Only a clear false from the app counts: when in doubt, a copy sells nothing.
const playCopy = () => phone && !(Android.fromPlay && Android.fromPlay() === false);
// The app makes videos at the family's quality from now on.
// As HEVC when every phone in the family plays it at the plan's size (sync.js).
const PLAN_HEVC_SIDE = { free: 0, '4k': 3840 };
const planApply = () => { if (phone) Android.videoQuality(PLAN_QUALITY[planTier], planTier !== 'free' && familyPlaysHevc(PLAN_HEVC_SIDE[planTier])); };
async function planRefresh() {
  // The web version asks only when sharing or looking: on its own it talks to no server.
  if (!phone && !syncOn() && !$('setSheet').classList.contains('open')) return;
  try {
    planInfo = await planCheck();
    planErr = '';
  } catch (e) {
    planErr = navigator.onLine === false ? "This phone is offline, so the family's plan can't be checked just now." : `The family's plan couldn't be checked: ${e.message}.`;
  }
  planApply();
  // Only Photos and privacy itself (the sheet also shows the lock's offer and the backup key).
  if ($('setSheet').classList.contains('open') && $('galleryMode')) renderSettings();
}
function planSection() {
  const i = planInfo, paid = planTier !== 'free', play = playCopy();
  // Shown once plans are on sale, or the family has one.
  if (!(paid || (i && i.selling))) return '';
  const intro = phone ? `<p class="muted">Journal videos are made smaller to share with your family, at ${PLAN_NAMES[planTier]}${paid ? ', as thanks for supporting us' : ''}. The whole video you recorded is always kept in this phone's gallery (Movies/Tot Routines) at the quality it was filmed.</p>` : '';
  let body;
  if (!i) body = `<p class="muted">${planErr ? esc(planErr) : 'Checking…'}</p>`;
  else if (paid) {
    const day = i.until ? new Date(i.until).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const when = !day ? '' : i.renews ? ` It renews ${day}${play ? '' : `, at ${PLAN_PRICES[`${i.plan}-${i.period}`]}`}.` : ` It's cancelled, and ends ${day}: nothing more is charged.`;
    body = `<p class="advice">💛 Thank you for supporting Tot Toolbox! Your family can share with ${PLAN_PHONES[i.plan]}, and every one makes its videos at the best quality it can, up to 4K.${when}</p>
      ${play ? `<p class="muted">To change or cancel it, email support@tottoolbox.com and we'll do it for you.</p>` : i.manage ? `<p class="muted">${i.renews ? 'Cancel, or change between monthly and yearly or to more phones, from Manage.' : 'Changed your mind? Renew it from Manage.'}</p>
      <button class="btn big" id="planManage"${planBusy ? ' disabled' : ''}>${i.renews ? 'Manage or cancel' : 'Manage'}</button>` : `<p class="muted">${i.plan === 'family' ? 'It comes with your Triangle Tots family plan, and is changed or cancelled there.' : 'It can be changed or cancelled on the phone that became a supporter.'}</p>`}`;
  }
  else if (play) body = `<p class="muted">Tot Routines is free for every family, and always will be: share with a second grown-up, your videos at 720p, at no cost.</p>`;
  else if (!phone && !syncOn()) body = `<p class="muted">Tot Routines is free for every family, and always will be: share with a second grown-up, your videos at 720p, at no cost. To bring in grandparents or a sitter, start sharing first, then come back here.</p>`;
  else body = `<p class="muted">Tot Routines is free for every family, and always will be: share with a second grown-up, your videos at 720p, at no cost. Supporters bring in the other people who look after your child, like grandparents, a sitter or a nanny${phone ? ', and share videos at the best quality' : ''}.</p>
      <button class="btn primary big" id="planBuy"${planBusy ? ' disabled' : ''}>💛 Become a supporter</button>`;
  return `<div id="planBox"><h3>${phone ? '🎬 Video quality and more phones' : '💛 More phones'}</h3>${intro}${body}${planErr && i ? `<p class="advice">${esc(planErr)}</p>` : ''}</div>`;
}
// Opens Stripe's page from what make() gives; the settings and the packages show it's on its way meanwhile.
const planGo = make => async () => {
  if (playCopy()) throw new Error("a Google Play copy doesn't open Stripe's page");
  planBusy = true;
  renderSettings();
  if ($('planSheet').classList.contains('open')) openPlanSheet();
  try {
    const url = await make();
    save(); // a new plan key reaches the family's other phones
    $('planSheet').classList.remove('open');
    location.href = url; // the app opens it in the browser
  } catch (e) {
    alert(`Stripe's page couldn't be opened: ${e.message}.`);
  }
  planBusy = false;
  renderSettings();
  if ($('planSheet').classList.contains('open')) openPlanSheet();
};
// Becoming a supporter: the packages, over the settings or the sharing, each going straight to Stripe's page.
// `have`: the phones the family shares with, when it was opened for one more than free covers (only the packages
// that cover one more are shown then). Opened again as it is while Stripe's page is on its way.
let planHave = 0;
function openPlanSheet(have = planHave) {
  if (playCopy()) throw new Error("a Google Play copy doesn't offer the packages");
  planHave = have;
  const pack = (plan, period, emoji, sub) => `<button class="pick" data-p="${plan}-${period}"${planBusy ? ' disabled' : ''}><span class="em">${emoji}</span><span><b>${PLAN_PRICES[`${plan}-${period}`]}</b><br><span class="muted">${sub}</span></span></button>`;
  const group = plan => plan === 'supporter' && have >= 4 ? '' : `<h3>${PLAN_PHONES[plan][0].toUpperCase() + PLAN_PHONES[plan].slice(1)}</h3>
    ${pack(plan, 'year', '🎁', '2 months free. Renews each year.')}
    ${pack(plan, 'month', '🌱', 'Renews each month.')}`;
  $('planBody').innerHTML = `<h2>💛 Become a supporter</h2>
    ${have ? `<p class="advice">Free families share with up to 2 phones, and yours has ${have}. To add another, become a supporter.</p>` : ''}
    <p class="muted">Bring in everyone who looks after your child, like grandparents, a sitter or a nanny, with the same routines, week and journal on every phone. Your family's support also helps keep Tot Toolbox free for every family.</p>
    <p class="muted">${phone ? 'As our thanks, every Android phone shares its videos at the best quality it can make: up to 4K and 60 frames a second, about 90 to 150 MB a minute of video on each phone. Videos already in the journal stay as they are.' : 'As our thanks, Android phones in your family share their videos at the best quality they can make, up to 4K. Videos from the web version, on iPhone, stay at 720p.'}</p>
    ${group('supporter')}
    ${group('big')}
    <p class="muted">Cancel any time, here in the app: it lasts to the end of what was paid for, and nothing more is charged. Phones already sharing keep sharing.${phone ? '' : " If this iPhone ever clears the app, email support@tottoolbox.com and we'll change or cancel it for you."}</p>
    <button class="btn big" id="planNot">Not now</button>`;
  $('planBody').onclick = ev => {
    const b = ev.target.closest('[data-p]');
    if (b && !planBusy) planGo(() => planCheckout(...b.dataset.p.split('-')))();
  };
  $('planNot').onclick = () => $('planSheet').classList.remove('open');
  $('planSheet').classList.add('open');
}
function wirePlan() {
  if (!$('planBox')) return;
  if ($('planBuy')) $('planBuy').onclick = () => openPlanSheet(0);
  if ($('planManage')) $('planManage').onclick = planGo(planManage);
}
// Whether the family may share with one more phone. Free covers 2 and a plan more (the server says how many). Past
// it no invite is made: the phone or web version shows the packages that cover one more (or, with a plan already,
// offers Stripe's page to change it), and a copy from Google Play just says so. Phones already sharing past it (from before there was a
// count, or with a plan that ended) keep sharing.
async function phoneRoom() {
  const have = 1 + syncPhones().length, p = await planCheck();
  if (p.phones == null || have < p.phones) return true;
  const most = `Your family shares with ${have} phones, the most ${p.plan ? 'its Supporter plan covers' : 'for free'}.`;
  planInfo = p;
  if (playCopy()) throw Object.assign(new Error(most), { status: 403 });
  if (!p.plan) openPlanSheet(have);
  else if (!p.manage) throw Object.assign(new Error(`${most} To add another, change the plan on the phone that became a supporter.`), { status: 403 });
  else if (confirm(`${most} Change it to 5 or more phones (${PLAN_PRICES['big-month']}, or ${PLAN_PRICES['big-year']}) on Stripe's page?`)) await planGo(planManage)();
  return false;
}
// The app tells the page when it goes into and comes back from the background; the camera isn't kept on.
window.appPaused = () => { syncStop(); if (scanning) { scanStop(); scanBack(); } };
window.appResumed = () => {
  if (syncOn()) { syncNow(); syncListen(); }
  planRefresh(); // back from Stripe's page, say
  outingSync(); // a day saved on the website meanwhile
  takeDone();
  remindSoon(); // a day may have gone by, and the week ahead moved on
  // Back from Bumplings, maybe with the baby on the way set up or born.
  const s = document.body.dataset.screen;
  if (s === 'home' && kid()) renderHome(); else if (s === 'setup') renderExpectBtn();
  else if (s === 'baby' && !renderBabyPage()) goBack();
};

// ---- Potty training (Tot Potty) ----
// On a phone with Tot Potty, a child it knows (pottyFor) shows how today is going there: in the potty and
// accidents, the last pee, the next try on the timer, and stickers toward the prize. Tapping opens Tot Potty on
// that child. A child of potty-training age without it gets an offer, until it's waved away on this phone.
const POTTY_URL = 'https://tottoolbox.com/potty/', POTTY_PROMO = 'tot-potty-promo-hidden';
let pottyRead = { at: 0, sum: null };
// What Tot Potty shares (its familySummary), or null; read at most once a second, as each card asks for it.
function pottyShare() {
  if (!phone || !Android.potty) return null;
  if (Date.now() - pottyRead.at > 1000) { const j = Android.potty(); pottyRead = { at: Date.now(), sum: j ? JSON.parse(j) : null }; }
  return pottyRead.sum;
}
const pottyOpen = (c, open) => ` role="button" data-potty="${open}" data-potty-kid="${c.id}"`;
function pottyHtml(c, date) {
  if (!phone) return '';
  const v = pottyView(pottyFor(pottyShare(), c), Date.now());
  if (v) {
    const w = v.words, bits = [`${v.wins} in the ${esc(w.potty)}`, `${v.acc} accident${v.acc === 1 ? '' : 's'}`];
    if (v.asked) bits.push(`asked ${v.asked}×`);
    const more = [v.lastPee ? `Last ${esc(w.pee)} ${agoWords(v.lastPee, Date.now())}` : '', v.next ? `next try ${timeWords(v.next)}` : '',
      v.goal ? `⭐ ${Math.min(v.stars, v.goal)} of ${v.goal}${v.prize ? ' toward ' + esc(v.prize) : ''}` : '', v.streak > 1 ? `${v.streak} dry days in a row` : ''].filter(Boolean);
    return `<div class="note potty"${pottyOpen(c, 'home')}><b>🚽 ${v.trained ? 'Potty trained!' : 'Potty training'}${v.stage ? ' · ' + esc(v.stage) : ''}</b><br>
      Today: ${bits.join(', ')}${more.length ? `<br><span class="muted">${more.join(' · ')}</span>` : ''}<br><span class="muted">From Tot Potty</span></div>`;
  }
  // Not on a day the child is ill or has had medicine: the page is for that then.
  if (!pottyAge(ageMonths(c.birth, date)) || vault.get(POTTY_PROMO) || medLineHtml(c, date)) return '';
  const has = Android.pottyInstalled();
  return `<div class="note potty"><b>🚽 Potty training ${esc(c.name)}?</b><br>${has ? `Set ${esc(c.name)} up in Tot Potty and how it's going shows here.`
    : 'Our Tot Potty app has a plan for each day, a timer that learns how often they go, stickers and a potty song, and shows here.'}
    <div class="twoBtn"><button class="btn"${has ? pottyOpen(c, 'home') : ' data-pottyget'}>${has ? 'Open Tot Potty' : 'Get Tot Potty'}</button><button class="btn" data-pottyhide>Not now</button></div></div>`;
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-potty],[data-pottyget],[data-pottyhide],button,a,input,label');
  if (!t) return;
  if ('pottyhide' in t.dataset) { vault.set(POTTY_PROMO, '1'); renderHome(); }
  else if ('pottyget' in t.dataset) Android.getPotty();
  else if (t.dataset.potty) {
    const c = state.children.find(k => k.id === t.dataset.pottyKid);
    if (c) Android.openPotty(JSON.stringify({ rid: c.id, name: c.name, birth: c.birth, open: t.dataset.potty }));
  }
});

// ---- The family page ----
// Every child's day at a glance, and the baby on the way with what Bumplings knows about the pregnancy.
// Tapping a child opens their home.
function openFamily() { pane = 'family'; renderHome(); show('home'); }
function kidCard(c, now) {
  const dk = dayKey(now), months = ageMonths(c.birth, now), { band } = bandFor(months);
  const sd = schoolDay(c.school, now);
  // The day as the child's own page shows it: the activities in order, with waking, naps and bedtime between.
  const plan = planFor(c, now), day = dayRows(c, now), acts = day.filter(r => !r.anchor && !r.away);
  // The routines on today, as By time has them, in among it at their times (one without a time at the end):
  // tapping one puts in when it was done, or starts it. Bedtime is the routine there, so the sleep is "Asleep by".
  const at = slotMins(c, now), list = withExtras(day, plan).map(r => ({ html: rowHtml(r.slot === 'bed' ? { ...r, label: 'Asleep by' } : r, dk, c, true), min: r.min ?? at[r.slot] }));
  for (const r of kidTimeRows(c, now).filter(r => r.rid)) {
    const x = (state.routines[c.id] || []).find(x => x.id === r.rid), n = onSteps(x).length;
    const s = streak(state.done, c.id, x.id, now, routineDays(c, x)), when = r.min == null ? null : minHHMM(r.min);
    const sub = (r.done ? doneWords(r.done).slice(3) : `${when ? clock(when) + ' · ' : ''}${n} step${n === 1 ? '' : 's'}`) + (s ? ` · ${s}-day streak` : '');
    const html = `<button class="prow${r.done ? ' done' : ''}" data-log="${c.id}:r.${r.rid}" data-log-day="${dk}"><span class="em">${esc(r.emoji)}</span><span><small>${sub}</small><b>${esc(r.label)}</b>${
      takenPills(mediaTally(entriesFrom(state.journal, c.id, dk, 'r:' + r.rid)))}</span><span class="tick${r.done ? ' ok' : ''}">${r.done ? icon('check') : icon('chev')}</span></button>`;
    const i = r.min == null ? -1 : list.findIndex(l => l.min > r.min);
    list.splice(i < 0 ? list.length : i, 0, { html, min: r.min });
  }
  const st = c.away && awayStay(c.away, now.getTime()), away = st && st[0] <= now.getTime();
  const moments = fromLine(c, dk, '');
  return `<div class="card fam lead${c.photo ? ' withPic' : ''}" role="button" data-famkid="${c.id}">
    ${c.photo ? `<span class="kidPic${c.photo.cut ? ' cut' : ''}"><img data-mid="${c.photo.id}" alt="" hidden></span>` : ''}
    <div class="eyebrow">${away ? `At ${esc(awayPlace(c.away))} now` : sd ? 'School day' : plan.busy ? 'Daycare day' : 'At home today'}</div>
    <h2>${esc(c.name)}</h2>
    <span class="pill">${ageLabel(months)} · ${band.name}</span>
    ${away ? '' : shiftLineHtml(c, now)}${medLineHtml(c, now)}
    <h3 class="part">${sq('today', 'sun')}Today</h3><div class="day1">${list.map(l => l.html).join('')}</div>
    ${moments ? `<h3 class="part">${sq('journal', 'sky')}Other moments today</h3><p>${moments}</p>` : ''}
    ${sleepHtml(c, now)}
    ${pottyHtml(c, now)}
    <p class="src">${acts.filter(r => r.done).length} of ${acts.length} planned activities done · needs ${band.sleep.total[0]}–${band.sleep.total[1]} hours of sleep</p>
  </div>`;
}
// Under a routine or an activity: the photos, videos and notes taken with it on `day`, counted apart. Tapping
// opens the journal at the first of them.
function fromLine(c, day, about, act) {
  const es = entriesFrom(state.journal, c.id, day, about, act), w = tallyWords(mediaTally(es));
  return w ? `<button class="link from" data-jopen="${es[0].id}">${w}</button>` : '';
}
// " · done 7:32 PM by Nikki · 😍 Loved it", or " · done" for a tick from before 1.17, which says neither.
// When it happened: the time put in for it (and until when, for a nap), or else when it was ticked.
const loggedClock = t => HHMM.test(t.t || '') ? clock(t.t) + (tickEnd(t) != null ? ' to ' + clock(t.end) : '') : timeWords(t.at);
const doneWords = t => isTick(t) ? ` · done ${loggedClock(t)}${t.by ? ' by ' + esc(t.by) : ''}${rateWords(t) ? ' · ' + rateWords(t) : ''}` : ' · done';
const missedWords = t => isTick(t) ? ` · missed${t.by ? ', said ' + esc(t.by) : ''}` : ' · missed';
// An activity's note, in quotes.
const noteWords = t => isTick(t) && typeof t.note === 'string' && t.note ? `“${esc(t.note)}”` : '';
// The last two days in the family: what's been finished and done, the photos, videos and notes added (with the
// photos and videos themselves; tap one to see it, or the words to open the journal there), and what's
// happened in Bumplings (tap it to open Bumplings there), newest first.
function latelyCard(now, share) {
  const since = dayStart(addDays(now, -1));
  const news = [...familyNews(state, since), ...bumpNewsSince(share, since)].sort((a, b) => b.at - a.at).slice(0, 10);
  if (!news.length) return '';
  // A Bumplings checklist tick or mood check from before its 1.11 has just its day.
  const when = n => n.day ? (dayKey(new Date(n.at)) === dayKey(now) ? 'Today' : 'Yesterday')
    : (dayKey(new Date(n.at)) === dayKey(now) ? '' : 'Yesterday ') + timeWords(n.at);
  return `<div class="card"><h2>${sq('lately', 'sky')}Lately</h2>${rowList(news.map(n => {
    const bump = 'open' in n, ok = n.emoji === '✅', no = n.emoji === '🚫';
    return { em: ok ? icon('check') : no ? icon('missed') : esc(n.emoji), ic: ok ? 'ok' : no ? 'no' : '', title: esc(n.text),
      sub: [when(n), n.by && esc(n.by), bump && 'in Bumplings'].filter(Boolean).join(' · '),
      open: n.jid ? `data-jopen="${n.jid}"` : bump && phone && n.open ? `data-fambump="${n.open}"` : '',
      more: n.jid && n.media.length ? `<div class="jgrid lately">${n.media.map(thumbHtml).join('')}</div>` : '' };
  }))}</div>`;
}
const dayStart = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
// "Today 2:30 PM", "Tomorrow 9:00 AM", else "Thu, Dec 3, 9:30 AM".
function apptTime(at) {
  const d = new Date(at), k = at.slice(0, 10), t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), now = new Date();
  if (k === dayKey(now)) return `Today ${t}`;
  if (k === dayKey(addDays(now, 1))) return `Tomorrow ${t}`;
  return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
const apptRow = a => ({ em: icon('appts'), ic: 'sky', title: esc(a.title),
  sub: `${apptTime(a.at)}${a.where ? ' · ' + esc(a.where) : ''}${a.asks ? ` · ${a.asks} question${a.asks === 1 ? '' : 's'} to ask` : ''}` });
// Of Bumplings' appointments (bumpAppts), those on the day `date`: they show on a child's day and week, since
// someone has to look after the children then.
const apptsOn = (list, date) => list.filter(a => a.at.slice(0, 10) === dayKey(date));
const apptNote = list => list.length ? `<p class="note"${toBump('appts')}>${list.map(a => `${a.emoji} <b>${esc(a.title)}</b> at ${new Date(a.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${a.where ? ', ' + esc(a.where) : ''}`).join('<br>')}<br><span class="muted">From Bumplings</span></p>` : '';
// How things are going (moodView), gently put: it's for the grown-ups.
function moodCard(m, babyName, born) {
  const out = [], now = Date.now();
  // Both grown-ups' last feelings, newest first; one from before Bumplings 1.11 says no one, so it's the
  // journal's (from a Bumplings before 1.13: the journal's last 7 days, whoever wrote them).
  if (m.recent && m.recent.length) out.push(rowList(m.recent.map(f => ({ em: esc(f.mood), title: f.me ? 'You' : f.name ? esc(f.name) : 'In the journal',
    sub: `${f.label ? esc(f.label) + ' · ' : ''}${agoWords(f.at, now, f.day)}` })), 'feels'));
  if (!m.recent && m.days.length) {
    out.push(`<p>The journal, the last 7 days</p><div class="moods">${m.days.map(d =>
      `<span title="${esc(d.label)}">${esc(d.mood)}<small>${fromKey(d.day).toLocaleDateString([], { weekday: 'narrow' })}</small></span>`).join('')}</div>`);
  }
  // Harder days, said about whoever had them.
  for (const h of m.hardFor || []) out.push(h.me
    ? `<p>A few harder days for you lately. That's common${born ? ' with a new baby' : m.mine ? ' in pregnancy' : ''}, and you don't have to push through alone: rest when you can, ask for help, and tell your provider if low days keep coming.</p>`
    : h.name
    ? `<p>A few harder days for ${esc(h.name)} lately. A check-in, an hour off, or taking the children out can help. If low days keep coming, encourage ${esc(h.name)} to mention it to the provider.</p>`
    : `<p>A few harder days in the journal lately. A check-in, rest, or an hour off can help, and if low days keep coming, it's worth mentioning to the provider.</p>`);
  const c = m.check;
  if (c) {
    const when = longDay(c.day);
    out.push(c.level === 'likely'
      ? `<p>Your mood check on ${when} suggested talking with your provider. Depression during pregnancy and after is common, it isn't anyone's fault, and it's very treatable.</p>`
      : c.level === 'possible'
      ? `<p>Your mood check on ${when} suggested mentioning how you've been feeling to your provider, and checking again two weeks later.${c.ago >= 14 ? " It's time for another." : ''}</p>`
      : `<p>Your mood check on ${when} looked good.${!m.people.length && c.ago >= 28 ? ' Another one now and then keeps an eye on things.' : ''}</p>`);
    if (c.call) out.push(`<div class="note"><p>If hard thoughts come, you don't have to wait for an appointment: call or text 988, or the National Maternal Mental Health Hotline, any time. It's free and confidential.</p>
      <div class="twoBtn"><button class="btn" data-famcall="988">📞 988</button><button class="btn" data-famcall="18338526262">📞 Maternal hotline</button></div></div>`);
  }
  // Each grown-up's mood checks: when the last was, and whether one's due (never how the other's went).
  if (m.people.length) out.push(rowList(m.people.map(p => ({ em: icon(p.due ? 'mood' : 'check'), ic: p.due ? 'sun' : 'ok',
    title: p.me ? 'Your mood check' : esc(p.name) + "'s mood check",
    sub: (p.last ? `Last one ${longDay(p.last)}${p.at && dayKey(new Date(p.at)) === p.last ? ', ' + timeWords(p.at) : ''}` : 'None yet') + (p.due ? ' · due now' : '') }))));
  if (m.due) out.push(`<p class="muted">Bumplings has a two-minute mood check, the one doctors use, for both of you${born ? ': the months after a birth are when it matters most' : ''}. <button class="link" data-fammood>Open it</button></p>`);
  return `<div class="moodBox"${toBump('mood')}><h3 class="part">${sq('mood', 'plum')}How we're feeling</h3>${out.join('')}</div>`;
}
const hm = ms => { const m = Math.max(0, Math.round(ms / 60e3)); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`; };
// A number to call, as a row with a Call button.
const tel = (label, x) => x && x.phone ? { em: icon('call'), ic: true, title: label, sub: `${x.name ? esc(x.name) + ' · ' : ''}${esc(x.phone)}`,
  end: `<button class="btn small" data-famcall="${esc(x.phone)}">${icon('call')}Call</button>` } : null;
// "12 journal entries, 3 this week, 2 just on this phone"
const journalWords = j => `${j.total} journal entr${j.total === 1 ? 'y' : 'ies'}, ${j.week} this week${j.priv ? `, ${j.priv} just on this phone` : ''}`;
// The newest bump photo, in spans so it can sit in a button too. Drawn as it is, so only a JPEG.
const BUMP_JPEG = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;
const bumpPhoto = (p, cls, attrs = '') => p && typeof p.url === 'string' && BUMP_JPEG.test(p.url)
  ? `<span class="${cls}"${attrs}><img src="${p.url}" alt="Bump photo, week ${esc(p.week)}"><span class="cap">Week ${esc(p.week)}</span></span>` : '';
// The baby's card: tapping any of it opens Bumplings, on the screen that part is from (else its home), so there's
// no button for it. A Call button still calls.
const toBump = screen => phone ? ` role="button" data-fambump="${screen}"` : '';
function babyCard(v) {
  const nm = esc(v.name), rows = [];
  if (v.contracting) rows.push(`<p class="advice"${toBump('timer')}><b>A contraction is being timed in Bumplings.</b></p>`);
  const parents = v.full && (v.mom || v.partner) ? ` · ${esc(v.mom)}${v.partner ? ' & ' + esc(v.partner) : ''}` : '';
  const bumpOpen = screen => phone ? `data-fambump="${screen}"` : '';
  if (v.born) {
    const n = v.newborn;
    rows.push(`<div class="eyebrow">Day ${n.day} of life</div><h2>${nm}</h2><span class="pill">Born ${longDay(v.born)}</span>${parents ? `<span class="muted">${parents}</span>` : ''}`);
    if (v.photo) rows.push(bumpPhoto(v.photo, 'bumpPic', toBump('photos')));
    const f = (ic, hue, b, s) => `<span>${sq(ic, hue)}<b>${b}</b><small>${s}</small></span>`;
    if (v.full) rows.push(`<h3 class="part">${sq('bottle', 'sky')}The last 24 hours</h3><div class="facts2"${toBump('babylog')}>${f('bottle', 'sky', n.feeds, 'feeds')}${f('drop', 'sky', n.wet, 'wet diapers')}
      ${f('drop', 'sun', n.dirty, 'dirty diapers')}${f('sleep', 'plum', hm(n.sleepMs), 'sleep logged')}</div>
      ${n.last ? `<p class="muted"${toBump('babylog')}>Last feed ${hm(Date.now() - n.last.at)} ago${n.last.side === 'bottle' ? ' (bottle' + (n.last.oz ? `, ${n.last.oz} oz` : '') + ')' : ''}${n.nextSide ? ` · next on the ${n.nextSide === 'L' ? 'left' : 'right'}` : ''}</p>` : ''}`);
  } else {
    const wk = toBump('week');
    rows.push(`<div class="eyebrow"${wk}>On the way · trimester ${v.trimester}</div><h2${wk}>${nm}</h2><span class="pill"${wk}>Week ${v.week}${v.day ? `, day ${v.day}` : ''}</span>${parents ? `<span class="muted">${parents}</span>` : ''}`);
    if (v.photo) rows.push(bumpPhoto(v.photo, 'bumpPic', toBump('photos')));
    rows.push(rowList([{ em: icon('appts'), ic: 'sky', title: `Due ${longDay(v.due)}`, sub: v.left > 0 ? `${v.left} days to go` : v.left === 0 ? 'Due today!' : `${-v.left} days past the due date`, open: bumpOpen('week') },
      ...v.size ? [{ em: v.size[0], title: `The size of ${esc(v.size[1])}`, sub: esc(v.size[2]), open: bumpOpen('week') }] : []], 'flat'));
  }
  if (v.full) {
    const next = [...v.appts.map(a => ({ ...apptRow(a), open: bumpOpen('appts') })),
      ...v.care.map(c => ({ em: icon('care'), ic: true, title: esc(c.title), sub: c.now ? 'Now, until ' + longDay(c.end) : 'From ' + longDay(c.start), open: bumpOpen('care') }))];
    rows.push(`<h3 class="part">${sq('appts', 'sky')}Coming up</h3>${next.length ? rowList(next) : '<p class="muted">Nothing in the next two weeks.</p>'}`);
    const more = [];
    if (v.bag) more.push({ em: icon('bag'), ic: 'coral', title: 'Hospital bag', sub: `${v.bag.packed} of ${v.bag.total} packed`, open: bumpOpen('bag'),
      more: `<span class="bar"><i style="width:${v.bag.total ? v.bag.packed / v.bag.total * 100 : 0}%"></i></span>` });
    if (v.kicks && !v.born) more.push({ em: icon('kicks'), ic: 'plum', title: 'Last kick count', sub: `${v.kicks.n} kicks, ${longDay(dayKey(new Date(v.kicks.start)))}`, open: bumpOpen('kicks') });
    if (v.names.length) more.push({ em: icon('family'), ic: 'coral', title: 'Names', sub: v.names.map(n => esc(n.name) + (n.both ? ' (you both love it)' : '')).join(', '), open: bumpOpen('names') });
    if (v.journal) more.push({ em: icon('journal'), ic: 'sky', title: 'Journal', sub: journalWords(v.journal), open: bumpOpen('journal') });
    if (more.length) rows.push(`<h3 class="part">${sq(v.born ? 'journal' : 'bag', v.born ? 'sky' : 'coral')}${v.born ? 'In Bumplings' : 'Getting ready'}</h3>${rowList(more)}`);
    const call = [tel('Doctor', v.doc), tel('Hospital', v.hosp)].filter(Boolean);
    if (call.length) rows.push(`<h3 class="part">${sq('call')}Who to call</h3>${rowList(call, 'flat')}`);
    if (v.mood) rows.push(moodCard(v.mood, v.name, v.born));
  } else rows.push('<p class="muted">Update Bumplings to see appointments, the checklist and more here.</p>');
  // On the way: Bumplings' picture of the baby this week, where a child's photo goes (prepare.js copies them in).
  const art = v.born ? '' : `<span class="kidPic bumpArt"${toBump('week')}><img src="bump/week-${String(Math.max(4, Math.min(40, v.week))).padStart(2, '0')}.jpg" alt="The baby at week ${v.week}"></span>`;
  return `<div class="card fam baby lead${art ? ' withPic' : ''}"${phone ? ' data-fambump="home"' : ''}>${art}${rows.join('')}</div>`;
}
// A nap routine the app named "Nap" or "Quiet time" is the routine before it, on the day and its sheet, so it
// isn't taken for the sleep itself; a name typed in is the grown-up's own.
const routineName = r => r.template === 'nap' && REST_NAMES.includes(r.name) ? `${r.name} routine` : r.name;
// A child's day as rows for the timeline (familyTimeline): the day's fixed points and routines at their times;
// the planned activities, which have none, about when they'd be (after waking, before the nap, after it, before
// bed; after school or daycare, the afternoon); a routine without a time, any time.
function kidTimeRows(c, now) {
  const dk = dayKey(now), sd = schoolDay(c.school, now), plan = planFor(c, now), rows = [];
  // `slot`: the day plan's row it is (reminders tick it); routines have none. `act`: an activity, which opens its sheet.
  const add = (min, emoji, label, done, about, missed, slot, act) => rows.push({ min, about, kid: c, emoji, label, done, missed, slot, act });
  const t = shiftedTimes(c, now), at = slotMins(c, now);
  const rest = t.nap || t.quiet, missed = plan.missed || {};
  // The day's fixed points: tapping one puts in when it really happened (logSheet).
  const fixed = (min, emoji, label, slot, about) => add(min, emoji, label, plan.done[slot], about, missed[slot], slot);
  fixed(at.wake, '☀️', 'Up', 'wake');
  if (sd) {
    const w = schoolWords(sd);
    fixed(at.leave, w.leave.emoji, w.leave.label, 'leave');
    fixed(at.home, w.home.emoji, w.home.label, 'home');
  } else if (plan.busy) fixed(null, '🏫', 'Daycare, nursery or preschool', 'care', at.care);
  else {
    // Until when it's planned to end; one that's ended says when, under it.
    const until = (slot, end) => isTick(plan.done[slot]) && tickEnd(plan.done[slot]) != null ? '' : `, until ${clock(end)}`;
    fixed(at.nap, t.nap ? '😴' : '🧸', `${t.nap ? 'Nap' : t.restNap ? 'Quiet time, or a nap' : 'Quiet time'}${until('nap', rest.end)}`, 'nap');
    if (t.nap2) fixed(at.nap2, '😴', `A second nap${until('nap2', t.nap2.end)}`, 'nap2');
  }
  fixed(at.bed, '🌙', 'Asleep by', 'bed');
  for (const r of dayRows(c, now)) if (!r.anchor && !r.away) add(null, r.emoji, r.label, plan.done[r.slot], at[r.slot], r.missed && plan.missed[r.slot], r.slot, itemKey(r.item));
  const doneDay = (state.done[dk] || {})[c.id] || {};
  // A routine with a time reminds unless switched off. A School morning routine is only in a school day (a
  // child without a school set up has it every day, as before).
  for (const r of state.routines[c.id] || []) {
    if (r.template === 'school' && c.school && !sd) continue;
    const when = routineWhen(c, r, now, t);
    // A nap routine with no sleep left to lead into isn't on the day; one before the second nap says so.
    if (r.when && !when && !doneDay[r.id]) continue;
    const label = r.template === 'nap' && when && plan.done.nap && t.nap2 ? `${routineName(r)}, before the second nap` : routineName(r);
    rows.push({ min: when ? toMin(when) : null, kid: c, emoji: r.emoji, label, done: doneDay[r.id], rid: r.id, remind: r.remind !== false });
  }
  // A plan from Triangle Tots: leaving, there, home again. No `slot`, so no reminder and nothing to tick.
  for (const { p } of outingsFor(c, now)) for (const r of outingRows(p)) rows.push({ ...r, kid: c });
  // At the other home: nothing of the day while they're there, a routine with no time not on a day they're
  // away from getting up to asleep; going and coming back in its place.
  const ad = awayOf(c, now);
  if (!ad) return rows;
  const all = awayAllDay(ad, at.wake, at.bed), moves = awayRows(c, now, ad), fromSchool = moves.some(r => r.school);
  return [...rows.filter(r => r.min == null && r.about == null ? !all : !awayAt(ad, r.min ?? r.about) && !(fromSchool && r.slot === 'home')),
    ...moves.map(r => ({ ...r, kid: c, done: plan.done[r.slot], missed: missed[r.slot] }))];
}
// When each slot of a child's day is, in minutes: the fixed points at their times, the planned activities about
// when they'd be (after waking, before the nap, after it, before bed; after school or daycare, the afternoon).
function slotMins(c, date) {
  const sd = schoolDay(c.school, date), plan = planFor(c, date), t = shiftedTimes(c, date);
  const up = toMin(t.wake), bed = toMin(t.bedtime), rest = t.nap || t.quiet, n2 = t.nap2;
  const back = sd ? toMin(sd.home) : 900; // home from school, or from daycare by about 3
  // The evening activity comes before the Bedtime routine (by its time, if it has one before asleep-by), not in it.
  const bedR = (state.routines[c.id] || []).filter(r => r.template === 'bedtime' && r.when).map(r => toMin(routineWhen(c, r, date, t)))
    .find(m => m > 720 && m < bed);
  const evening = (bedR ?? bed - 30) - 30;
  // A nap soon after getting up (an early start, a sick day): the morning's things after it.
  const early = toMin(rest.start) - up < 240, after = toMin(rest.end);
  return { wake: up, bed, nap: toMin(rest.start), nap2: n2 ? toMin(n2.start) : null, care: up + 60, leave: sd ? toMin(sd.leave) : null, home: sd ? toMin(sd.home) : null,
    ...sd || plan.busy ? { outside: back + 30, books: evening }
      : early ? { morning: up + 60, outside: after + 60, afternoon: n2 ? toMin(n2.end) + 30 : after + 180, books: evening }
      : { morning: up + 90, outside: toMin(rest.start) - 60, afternoon: n2 ? toMin(n2.end) + 30 : after + 30, books: evening } };
}
// ---- Another home ----
// A child's day at the other home (awayDay), or null when they're home all day or have none.
const awayOf = (c, date) => c.away ? awayDay(c.away, date) : null;
// Going to the other home and coming back, as a day's rows: { slot: 'go' | 'back', away, min, emoji, label, sub }.
// Picked up from school by the other home: that's said, and there's no pick-up of our own. Back at school pick-up
// time: our pick-up says it.
function awayRows(c, date, ad) {
  const sd = schoolDay(c.school, date), p = awayPlace(c.away), who = (c.away.who || '').trim(), out = [];
  const home = sd && sd.kind !== 'home' ? toMin(sd.home) : null;
  for (const g of ad.go) {
    const school = home != null && Math.abs(g.min - home) <= 15;
    out.push({ slot: 'go', away: 'go', min: g.min, emoji: '🎒', school,
      label: school && who ? `${who} picks ${c.name} up from school` : `Off to ${p}`, sub: `${clock(minHHMM(g.min))} · until ${awayWhen(g.until, date.getTime())}` });
  }
  for (const b of ad.back) if (!(home != null && b.min === home))
    out.push({ slot: 'back', away: 'back', min: b.min, emoji: '🏡', label: `Back from ${p}`, sub: clock(minHHMM(b.min)) });
  return out;
}
// A nap routine still to do is part of the nap it leads into (the second nap once the nap's in), so the day
// shows one nap, not two: the nap's row puts in both. Reminders keep the routine's own time (dayReminders).
function napLed(c, rows, now) {
  const sleep = rows.find(r => r.slot === (isTick(planFor(c, now).done.nap) ? 'nap2' : 'nap') && !r.act && !r.done && !r.missed);
  if (!sleep) return rows;
  const led = rows.find(r => r.rid && r.min != null && !r.done && ((state.routines[c.id] || []).find(x => x.id === r.rid) || {}).template === 'nap');
  if (!led) return rows;
  sleep.lead = led.rid;
  return rows.filter(r => r !== led);
}
// Everyone's day together, by time, with a line at now; Bumplings' appointments in it too, since someone has to
// look after the children then.
function timeCard(now, share) {
  // The same thing at the same time for more than one child is one row, with each child's photo on it.
  const rows = [], same = new Map();
  for (const r of state.children.flatMap(c => napLed(c, kidTimeRows(c, now), now))) {
    const k = [r.min, r.about, r.emoji, r.label].join('|'), g = same.get(k);
    if (g) g.kids.push(r); else { const n = { ...r, kids: [r] }; same.set(k, n); rows.push(n); }
  }
  for (const g of rows) if (g.kids.length > 1) {
    g.done = g.kids.every(r => r.done) && g.kids[0].done;
    g.missed = !g.done && g.kids.every(r => r.missed) && g.kids[0].missed;
  }
  for (const a of apptsOn(bumpAppts(share, now.getTime()), now)) {
    const d = new Date(a.at);
    rows.push({ min: d.getHours() * 60 + d.getMinutes(), emoji: a.emoji, label: a.title + (a.where ? ', ' + a.where : ''), who: 'Bumplings', bump: true });
  }
  if (!rows.length) return '';
  // Now is a row too, so it sorts in among the rest.
  rows.push({ min: now.getHours() * 60 + now.getMinutes(), now: true });
  const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, dk = dayKey(now);
  // An activity opens its sheet for that child, as on their card; anything else of a child's opens their page.
  // A shared row opens it for the first child still to do it; each photo, for that child.
  // Up, the nap, asleep, school and routines put in when they really happened, for every child on the row together.
  const logOf = r => `${r.kid.id}:${r.rid ? 'r.' + r.rid : r.slot}${r.lead ? ` ${r.kid.id}:r.${r.lead}` : ''}`;
  const tap = (r, all) => r.outing ? ` role="button" data-outing="${esc(r.outing)}"` : r.away ? ` role="button" data-away="${r.kid.id}"` : r.act ? ` role="button" data-act-day="${dk}" data-act-slot="${r.slot}" data-act-kid="${r.kid.id}"`
    : r.slot || r.rid ? ` role="button" data-log="${(all || [r]).map(logOf).join(' ')}" data-log-day="${dk}"`
    : ` role="button" data-famkid="${r.kid.id}"`;
  // A tick or the red mark on each photo of a shared row; a child's own row has it in place of the emoji.
  const face = (r, shared) => `<span class="face"${tap(r)} aria-label="${esc(r.kid.name)}">${r.kid.photo
    ? `<span class="pic"><img data-mid="${r.kid.photo.id}"${r.kid.photo.cut ? ' data-head' : ''} alt="" hidden></span>` : esc(initial(r.kid.name))}${!shared ? '' : r.done ?`<i class="ok">${icon('check')}</i>` : r.missed ? `<i class="no">${icon('missed')}</i>` : ''}</span>`;
  const said = r => { const t = r.done || r.missed; return !t ? '' : (r.done ? doneWords(t) : missedWords(t)).slice(3) + (noteWords(t) ? '<br>' + noteWords(t) : ''); };
  const sub = r => r.kids.length === 1 ? said(r) : r.kids.filter(k => k.done || k.missed).map(k => `${esc(k.kid.name)}: ${said(k)}`).join('<br>');
  // The photos, videos and notes in the journal from it today, every child's on the row together, on a pill.
  const taken = r => takenPills(mediaTally(r.kids.flatMap(k => k.rid ? entriesFrom(state.journal, k.kid.id, dk, 'r:' + k.rid)
    : k.act ? entriesFrom(state.journal, k.kid.id, dk, 'a:' + k.slot, k.act) : [])));
  // A row with no time of its own starts at the left, its picture where the time would be.
  const row = r => r.now ? `<div class="tlnow">Now · ${timeWords(now)}</div>`
    : `<div class="tl${r.min == null ? ' any' : ''}${r.done || r.missed ? ' done' : ''}"${r.kids ? tap(r.kids.find(k => !k.done && !k.missed) || r.kids[0], r.kids) : r.bump ? toBump('appts') : ''}>${r.min == null ? '' : `<span class="t">${clock(hhmm(r.min))}</span>`}
      <span class="em${r.done ? ' ok' : r.missed ? ' no' : ''}">${r.done ? icon('check') : r.missed ? icon('missed') : esc(r.emoji)}</span>
      <span class="w">${esc(r.label)}${r.kids && sub(r) ? `<small>${sub(r)}</small>` : ''}${r.kids ? taken(r) : ''}</span>${r.kids ? `<span class="faces">${r.kids.map(k => face(k, r.kids.length > 1)).join('')}</span>` : `<b>${esc(r.who)}</b>`}</div>`;
  // The parts of the day as headings with a line icon, in place of DAY_PARTS' emoji.
  const PART = { morning: ['sun', 'sun'], afternoon: ['sun', 'coral'], evening: ['sleep', 'plum'], any: ['lately', 'sky'] };
  return `<div class="card fam">${familyTimeline(rows).map(p => `<h3 class="part">${sq(...PART[p.part])}${p.title.replace(/^\S+\s/, '')}</h3>${p.rows.map(row).join('')}`).join('')}</div>`;
}
// Each child's card, or everyone's day by time: this phone remembers which.
const FAMVIEW_KEY = 'tot-routines-famview';
// "Expecting a baby?" waved away: it doesn't come back on this phone.
const PROMO_KEY = 'tot-bump-promo-hidden';
function renderFamily() {
  const now = new Date(), share = bumpShare(), v = share && babyView(share, state.children, now, Date.now());
  const byTime = vault.get(FAMVIEW_KEY) === 'time';
  const views = `<div class="chips famviews"><button data-famview="kids"${byTime ? ' aria-pressed="false"' : ' class="on" aria-pressed="true"'}>${icon('share')}Each child</button><button data-famview="time"${byTime ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"'}>${icon('lately')}By time</button></div>`;
  // By time, each child's sleep together under it; each child's card has their own.
  const sleep = byTime && state.children.map(c => sleepHtml(c, now, `${esc(c.name)}'s sleep this week`)).join('');
  $('homePane').innerHTML = latelyCard(now, share) + views + (byTime ? timeCard(now, share) + (sleep ? `<div class="card">${sleep}</div>` : '')
    : state.children.map(c => kidCard(c, now)).join('')) + famJournalCard() + (v ? babyCard(v)
    : share ? '' // the baby has joined the children
    : phone && !vault.get(PROMO_KEY) ? `<div class="card fam"><h2>${sq('family', 'coral')}Expecting a baby?</h2><p class="muted">Our Bumplings app follows the pregnancy week by week, and the baby shows here.</p>
      <div class="twoBtn"><button class="btn" data-famget>Get Bumplings</button><button class="btn" data-famhide>Not for us</button></div></div>` : '');
  fillMedia($('homePane')); // the children's photos, also when it's drawn again for a switch of view or a tick
}
// The family page's buttons, and the baby page's (its card is the same).
function famClick(e) {
  // A count under an activity opens the journal, an activity its sheet, up or a nap the sheet to put in its time.
  if (e.target.closest('[data-jopen],[data-act-slot],[data-log],[data-potty],[data-pottyget],[data-pottyhide],[data-meds]')) return;
  const t = e.target.closest('[data-famview],[data-famcall],[data-fammood],[data-famkid],[data-famget],[data-famhide],[data-babyadd]');
  if (!t) return;
  if ('babyadd' in t.dataset) return addBaby();
  if ('famhide' in t.dataset) { vault.set(PROMO_KEY, '1'); renderFamily(); return; }
  if (t.dataset.famview) { vault.set(FAMVIEW_KEY, t.dataset.famview); renderFamily(); }
  else if (t.dataset.famcall) Android.dial(t.dataset.famcall);
  else if ('fammood' in t.dataset) Android.openBumpAt('mood');
  else if (t.dataset.famkid) { state.current = t.dataset.famkid; pane = ''; save(); renderHome(); show('home'); }
  else Android.getBump();
}
$('babyPage').onclick = famClick;
$('homePane').onclick = famClick;
// Anything from Bumplings, wherever it shows (the baby's card, Lately, an appointment on a child's day), opens
// Bumplings on its screen: the nearest part that says which, unless a button or other tappable thing is nearer.
document.addEventListener('click', e => {
  const t = e.target.closest('[data-fambump],button,a,input,label,[role="button"]');
  if (t && t.dataset.fambump) Android.openBumpAt(t.dataset.fambump);
});

// ---- Journal ----
// Photos, videos and a few words about a routine or an activity, for the grown-ups. An entry is
// state.journal[id] = {child, day, about, title, emoji, text, by, dev, at, media: [item]}: `about` is
// 'r:<routine id>', 'a:<plan slot>' or '' (something else), with its title and emoji as they were then. With
// sharing on, entries and their photos and videos go to every phone in the family (sync.js). Each phone has
// its own id, `dev`, and the grown-up's name, `by`, which it puts on what it writes.
state.journal = state.journal || {};
const ME_KEY = 'tot-routines-me';
const me = readSaved(ME_KEY, null) || { dev: uid(), name: '' };
vault.set(ME_KEY, JSON.stringify(me));
// A tick, saying who did it and when (see isTick), so the family page and the other phones can tell.
const tickOf = (what, emoji) => ({ at: Date.now(), by: me.name, dev: me.dev, what, emoji });
const JOURNAL_MAX = 12; // photos and videos in one entry
const kidJournal = childId => Object.entries(state.journal).filter(([, e]) => e.child === childId)
  .map(([id, e]) => ({ id, ...e })).sort((a, b) => b.at - a.at);
const dayWords = k => k === dayKey(new Date()) ? 'Today' : k === dayKey(addDays(new Date(), -1)) ? 'Yesterday'
  : fromKey(k).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
const timeWords = at => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
// When an entry was written: just the time if it was on the day it's about.
const whenWords = e => dayKey(new Date(e.at)) === e.day ? timeWords(e.at) : 'written ' + dayWords(dayKey(new Date(e.at)));
const pruneMedia = () => mediaStore.prune(new Set(sharedMedia(state).keys()));

// Who has looked at what (logic.js seenAdd): this phone counts its own looks at the others' entries, at an
// entry on the journal screen once it's been in the middle of the screen a moment, and at a photo or video
// when the viewer shows it. Its own entries it doesn't count.
state.seen = state.seen || {};
const seenLast = {};
// Who a look is from: "you" on this phone.
const seenName = w => w.dev === me.dev ? 'you' : w.by || 'someone';
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const seenLine = (id, e, media) => seenWords(seenOf(state.seen, id, e, media), seenName);
function markSeen(entryId, media = '') {
  const e = state.journal[entryId];
  if (!e || e.dev === me.dev) return;
  const mine = state.seen[entryId] || {}, look = seenAdd(mine[me.dev], entryId, media, me.name || phoneName(), Date.now(), seenLast);
  if (!look) return;
  state.seen[entryId] = { ...mine, [me.dev]: look };
  save();
}
// The journal screen's entries, counted as seen after a second and a half across the middle of the screen.
let seenWatch = null;
function watchSeen(root) {
  if (seenWatch) seenWatch.disconnect();
  const wait = new Map();
  seenWatch = new IntersectionObserver(xs => {
    for (const x of xs) {
      const id = x.target.id.slice(3);
      clearTimeout(wait.get(id));
      if (x.isIntersecting) wait.set(id, setTimeout(() => markSeen(id), 1500));
    }
  }, { rootMargin: '-50% 0px -50% 0px' });
  for (const el of root.querySelectorAll('.jentry')) seenWatch.observe(el);
}
// Who has seen an entry, and each of its photos and videos: tapped on the entry's "Seen by".
function openSeen(entryId) {
  const e = state.journal[entryId];
  if (!e) return;
  const s = seenOf(state.seen, entryId, e), when = at => `${dayWords(dayKey(new Date(at))).replace(/^(Today|Yesterday)$/, w => w.toLowerCase())}, ${timeWords(at)}`;
  const times = n => `${n} ${n === 1 ? 'time' : 'times'}`;
  const media = (e.media || []).map((it, i) => ({ it, i, s: seenOf(state.seen, entryId, e, it.id) }));
  // Each photo and video first, with its views under it; then who has seen the entry.
  $('seenBody').innerHTML = `<h2>${e.emoji || '📝'} ${esc(e.title)}</h2><p class="muted">${dayWords(e.day)}${e.by ? ' · by ' + esc(e.by) : ''}</p>
    ${media.length ? `<div class="seenGrid">${media.map(({ it, s }) => `<div>${thumbHtml(it)}<b>👁 ${s.views} ${s.views === 1 ? 'view' : 'views'}</b>
      <span class="muted">${s.views ? s.who.map(w => `${esc(cap(seenName(w)))} ${w.n}`).join(' · ') : 'Not opened yet'}</span></div>`).join('')}</div>` : ''}
    <h3>Who's seen it</h3>
    ${s.views ? `<ul class="seenList">${s.who.map(w => `<li><b>${esc(cap(seenName(w)))}</b><span class="muted">${times(w.n)} · last ${when(w.at)}</span></li>`).join('')}</ul>`
      : `<p class="muted">Nobody else yet.</p>`}
    <p class="muted">Counted on the family's other phones: views by whoever added it aren't counted, and looking again within half an hour counts once.</p>
    <button class="btn big" data-close>Close</button>`;
  fillMedia($('seenBody'));
  $('seenSheet').classList.add('open');
}

// A photo or video in a grid, and an entry as a row with its first one. Pictures are read from the phone
// after drawing (fillMedia); until one's here (it comes from the phone that took it), it shows ⏳.
const picOf = it => it && (it.type === 'video' ? it.poster : it);
const imgSlot = (pic, wait) => `${pic ? `<img data-mid="${pic.id}" alt="" hidden>` : ''}<span class="wait">${wait}</span>`;
// A video's length on its thumbnail: 12s, 2:05, 1:02:05.
const lenWords = s => s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  : `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const thumbHtml = it => `<button class="jthumb" data-view="${it.id}">${imgSlot(picOf(it), '⏳')}${it.type === 'video' ? `<span class="play">▶${Number.isFinite(it.secs) ? ' ' + lenWords(it.secs) : ''}</span>` : ''}</button>`;
function jrowHtml(e, who) {
  const first = (e.media || [])[0], w = tallyWords({ ...mediaTally([e]), notes: 0 }), views = seenOf(state.seen, e.id, e).views;
  const count = (w ? ' · ' + w : '') + (views ? ` · 👁 ${views}` : '');
  return `<button class="jrow" data-jopen="${e.id}"><span class="jpic">${imgSlot(picOf(first), e.emoji || '📝')}${first && first.type === 'video' ? '<span class="play">▶</span>' : ''}</span>
    <span><b>${who ? esc(who) + ' · ' : ''}${esc(e.title)}</b><span class="muted">${dayWords(e.day)}${e.by ? ' · ' + esc(e.by) : ''}${count}</span>${e.text ? `<span class="muted">${esc(e.text)}</span>` : ''}</span></button>`;
}
async function fillMedia(root) {
  for (const img of root.querySelectorAll('img[data-mid]:not([src])')) {
    const id = img.dataset.mid, u = await mediaStore.url(id);
    if (u) { img.src = u; img.hidden = false; if ('head' in img.dataset) onHead(img); }
  }
}

// A cut-out child in a small circle shows their face: the circle a little wider than their head, its middle
// on their face. Their head is the top of them down to where they widen out at the shoulders.
const heads = new Map();
async function onHead(img) {
  try { await img.decode(); } catch { return; }
  let h = heads.get(img.dataset.mid);
  if (!h) {
    const W = 96, H = Math.round(W * img.naturalHeight / img.naturalWidth), c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, W, H);
    const px = g.getImageData(0, 0, W, H).data;
    // A head is widest a little over halfway down it, and about as tall as it is wide: so its width is the widest
    // they are until they're 0.7 of that down from the top, before the neck and shoulders.
    let top = -1, widest = 0, mid = W / 2;
    for (let y = 0; y < H; y++) {
      let x0 = -1, x1 = -1;
      for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 128) { if (x0 < 0) x0 = x; x1 = x; }
      if (x0 < 0) continue;
      if (top < 0) top = y;
      if (y - top > Math.max(widest, 4) * 0.7) break;
      if (x1 - x0 + 1 > widest) { widest = x1 - x0 + 1; mid = (x0 + x1 + 1) / 2; }
    }
    if (top < 0) return;
    const side = Math.min(widest * 1.45, W, H), cy = top + widest * 0.6;
    h = { s: W / side, x: (mid - side / 2) / side, y: Math.max(0, cy - side / 2) / side };
    heads.set(img.dataset.mid, h);
  }
  img.classList.add('head');
  Object.assign(img.style, { width: h.s * 100 + '%', left: -h.x * 100 + '%', top: -h.y * 100 + '%' });
}

function renderJournalCard() {
  const c = kid(), all = kidJournal(c.id);
  $('journalCard').innerHTML = `<h2>${sq('journal', 'plum')}${esc(c.name)}'s journal</h2>
    ${all.length ? all.slice(0, 3).map(e => jrowHtml(e)).join('') : `<p class="muted">Photos, videos and a few words about ${esc(c.name)}'s routines and activities${syncOn() ? ', shared with the family' : ''}.</p>`}
    <div class="twoBtn jBtns"><button class="btn primary" data-jnew>${icon('camera')}Add a photo or note</button>${all.length ? `<button class="btn" data-jall>See all ${all.length}</button>` : ''}</div>`;
  fillMedia($('journalCard'));
}
// Every child's journal together, on the family page: whose each entry is on it.
const kidName = id => (state.children.find(k => k.id === id) || {}).name || '';
function famJournalCard() {
  const all = famJournal();
  return `<div class="card"><h2>${sq('journal', 'plum')}Family's journal</h2>
    ${all.length ? all.slice(0, 3).map(e => jrowHtml(e, kidName(e.child))).join('') : `<p class="muted">Photos, videos and a few words about the children's routines and activities${syncOn() ? ', shared with the family' : ''}.</p>`}
    <div class="twoBtn jBtns"><button class="btn primary" data-jnew>${icon('camera')}Add a photo or note</button>${all.length ? `<button class="btn" data-jall>See all ${all.length}</button>` : ''}</div></div>`;
}
const famJournal = () => Object.entries(state.journal).filter(([, e]) => state.children.some(k => k.id === e.child))
  .map(([id, e]) => ({ id, ...e })).sort((a, b) => b.at - a.at);
// The journal screen shows the whole family's when opened from the family page.
let jFam = false;
function openJournal(entryId) {
  jFam = pane === 'family';
  renderJournal();
  show('journal');
  if (entryId && $('je-' + entryId)) $('je-' + entryId).scrollIntoView();
}
function renderJournal() {
  const c = kid(), all = jFam ? famJournal() : kidJournal(c.id);
  $('jTitle').innerHTML = `<span class="ico">${icon('journal')}</span>${jFam ? "Family's" : esc(c.name) + "'s"} journal`;
  renderJournalNote();
  let last = null;
  $('jList').innerHTML = all.length ? all.map(e => {
    const head = e.day !== last ? `<h3 class="jday">${dayWords(e.day)}</h3>` : '';
    last = e.day;
    return `${head}<div class="card jentry" id="je-${e.id}"><h2><span>${e.emoji || '📝'}</span>${jFam ? esc(kidName(e.child)) + ' · ' : ''}${esc(e.title)}<span class="muted">${whenWords(e)}</span></h2>
      <p class="fromTag"><span class="tag">${aboutKind(e.about)}</span>${tallyWords(mediaTally([e]))}</p>
      ${e.text ? `<p class="jtext">${esc(e.text)}</p>` : ''}
      ${(e.media || []).length ? `<div class="jgrid">${e.media.map(thumbHtml).join('')}</div>` : ''}
      <p class="muted">${e.by ? esc(e.by) + ' · ' : ''}<button class="link" data-jedit="${e.id}">Edit</button></p>
      ${syncOn() ? `<button class="link seenLine" data-seen="${e.id}">👁 ${esc(seenLine(e.id, e) || 'Not seen by anyone else yet')}</button>` : ''}</div>`;
  }).join('') : `<p class="muted">Nothing yet. After a routine or an activity, add a photo, a video or a few words: what ${jFam ? 'the children' : esc(c.name)} did, what they said.</p>`;
  fillMedia($('jList'));
  watchSeen($('jList'));
}
const renderJournalNote = () => {
  $('jNote').innerHTML = syncOn() ? `👥 Shared with every phone in the family.${mediaError ? ` Some photos or videos haven't come yet (${esc(mediaError)}); it keeps trying.` : ''}`
    : '📱 Just on this phone. Share with another grown-up (at the bottom of the home screen) and the journal goes to their phone too.';
};

// What an entry can be about: the child's routines and the day's planned activities, or something else.
function aboutChoices(c, day) {
  const date = fromKey(day);
  return [...(state.routines[c.id] || []).map(r => ({ about: 'r:' + r.id, act: null, title: r.name, emoji: r.emoji })),
    ...withExtras(dayRows(c, date), planFor(c, date)).filter(r => !r.anchor && !r.away).map(r => ({ about: 'a:' + r.slot, act: itemKey(r.item), title: r.label, emoji: r.emoji })),
    { about: '', act: null, title: 'A moment', emoji: '✨' }];
}

// The entry being written: a copy of it, with the photos and videos added since it was opened (not on the
// phone until it's saved) and the video being made smaller, if one is.
let draft = null; // { id, isNew, fixed, e, add: Map(id → {blob, url, poster, posterUrl}), busy: {secs, total} | null }
// A new entry about `about` ({about, title, emoji}, or null to choose) on `day`; this phone's own entry about
// the same thing that day, if it has one, opens instead, so a second photo goes in with the first.
function openEntryFor(about, day = dayKey(new Date())) {
  const c = kid(), mine = about && entriesFrom(state.journal, c.id, day, about.about, about.act).find(e => e.dev === me.dev);
  if (mine) return openEntry(mine.id);
  const base = about || aboutChoices(c, day).at(-1);
  // From the family page (or its journal), which child it's about is chosen too.
  const pick = !about && state.children.length > 1 && (pane === 'family' && document.body.dataset.screen === 'home' || document.body.dataset.screen === 'journal' && jFam);
  draft = { id: uid(), isNew: true, fixed: !!about, pick, e: { child: c.id, day, about: base.about, act: base.act || null, title: base.title, emoji: base.emoji, text: '', media: [] }, add: new Map(), busy: null };
  renderEntry();
  $('entrySheet').classList.add('open');
}
function openEntry(id) {
  draft = { id, isNew: false, fixed: true, e: JSON.parse(JSON.stringify(state.journal[id])), add: new Map(), busy: null };
  renderEntry();
  $('entrySheet').classList.add('open');
}
// The sheet closed without saving: what was added goes.
function dropDraft() {
  if (!draft) return;
  for (const a of draft.add.values()) { URL.revokeObjectURL(a.url); if (a.posterUrl) URL.revokeObjectURL(a.posterUrl); }
  draft = null;
}
function renderEntry() {
  // The family's phones may have changed since (whether they all play HEVC).
  planApply();
  const d = draft, e = d.e, c = state.children.find(k => k.id === e.child);
  const choices = d.fixed ? null : aboutChoices(c, e.day);
  $('entryBody').innerHTML = `<h2>${e.emoji} ${esc(e.title)}</h2><p class="muted">${aboutKind(e.about)} · ${esc(c.name)} · ${dayWords(e.day)}</p>
    ${d.pick ? `<p class="muted">Who's it about?</p><div class="chips" id="enKid">${state.children.map(k =>
      `<button class="${k.id === e.child ? 'on' : ''}" data-enkid="${k.id}">${esc(k.name)}</button>`).join('')}</div>` : ''}
    ${choices ? `<p class="muted">What's it about?</p><div class="chips" id="enAbout">${choices.map((x, i) =>
      `<button class="${x.about === e.about && x.title === e.title ? 'on' : ''}" data-ab="${i}">${x.emoji} ${esc(x.title)}</button>`).join('')}</div>` : ''}
    <label class="field">What happened? <textarea class="jtextIn" id="enText" maxlength="2000" placeholder="What they did, what they said">${esc(e.text)}</textarea></label>
    <div class="jgrid" id="enMedia"></div>
    <div class="twoBtn"><button class="btn" id="enPhoto">📷 Photo</button><button class="btn" id="enVideo">🎬 Video</button></div>
    <p class="muted">${syncOn() ? `👥 Every phone in the family gets this, with its photos and videos${me.name ? `, from ${esc(me.name)}` : ". To show who added it, put your name in Share with another grown-up"}.` : '📱 Just on this phone, until you share with another grown-up.'}</p>
    <button class="btn primary big" id="enSave"></button>
    ${d.isNew ? '' : '<button class="btn danger big" id="enDel">Delete this entry</button>'}
    <button class="btn big" data-close>Cancel</button>`;
  $('enText').oninput = ev => { e.text = ev.target.value; };
  // Another child: what it's about goes back to a moment, since routines and activities are each child's own.
  if (d.pick) $('enKid').onclick = ev => {
    const b = ev.target.closest('[data-enkid]');
    if (!b || b.dataset.enkid === e.child) return;
    const k = state.children.find(x => x.id === b.dataset.enkid), base = aboutChoices(k, e.day).at(-1);
    Object.assign(e, { child: k.id, about: base.about, act: null, title: base.title, emoji: base.emoji });
    renderEntry();
  };
  if (choices) $('enAbout').onclick = ev => {
    const b = ev.target.closest('[data-ab]');
    if (!b) return;
    Object.assign(e, choices[Number(b.dataset.ab)]);
    renderEntry();
  };
  $('enPhoto').onclick = () => $('jPhotoIn').click();
  $('enVideo').onclick = () => $('jVideoIn').click();
  $('enSave').onclick = saveEntry;
  if (!d.isNew) $('enDel').onclick = deleteEntry;
  renderEntryMedia();
}
// The entry's photos and videos, and what can be done while a video is being made smaller.
function renderEntryMedia() {
  const d = draft, full = d.e.media.length >= JOURNAL_MAX;
  $('enMedia').innerHTML = d.e.media.map(it => {
    const a = d.add.get(it.id);
    return `<div class="jthumb">${a ? `<img src="${a.posterUrl || a.url}" alt="">` : imgSlot(picOf(it), '⏳')}${it.type === 'video' ? `<span class="play">▶ ${lenWords(it.secs)}</span>` : ''}<button class="x" data-unmedia="${it.id}" aria-label="Remove">✕</button></div>`;
  }).join('') + (d.busy ? '<div class="jthumb"><span class="busy" id="enBusy"></span></div>' : '');
  tickEntry();
  fillMedia($('enMedia'));
  $('enPhoto').disabled = full;
  $('enVideo').disabled = full || !!d.busy;
  $('enSave').disabled = !!d.busy;
  $('enSave').textContent = d.busy ? 'Wait for the video' : 'Save';
}
const tickEntry = () => { if (draft && draft.busy && $('enBusy')) $('enBusy').innerHTML = `Making the video smaller${draft.busy.total ? `<br>${Math.round(100 * draft.busy.secs / draft.busy.total)}%` : ''}${phone ? '' : '<br>Keep this screen open'}`; };
$('entryBody').addEventListener('click', ev => {
  const x = ev.target.closest('[data-unmedia]');
  if (!x || !draft) return;
  const id = x.dataset.unmedia, a = draft.add.get(id);
  if (a) { URL.revokeObjectURL(a.url); if (a.posterUrl) URL.revokeObjectURL(a.posterUrl); draft.add.delete(id); }
  draft.e.media = draft.e.media.filter(it => it.id !== id);
  renderEntryMedia();
});
$('jPhotoIn').onchange = async ev => {
  const d = draft, files = [...ev.target.files], inGallery = phone && !Android.pickedWithCamera();
  ev.target.value = '';
  for (const f of files) {
    if (draft !== d) return;
    if (d.e.media.length >= JOURNAL_MAX) { alert(`An entry holds up to ${JOURNAL_MAX} photos and videos.`); break; }
    let p;
    try { p = await shrinkPhoto(f); } catch (err) { alert(err.message); continue; }
    const id = uid();
    d.e.media.push({ id, type: 'photo', mime: 'image/jpeg', size: p.blob.size, w: p.w, h: p.h });
    d.add.set(id, { blob: p.blob, url: URL.createObjectURL(p.blob), inGallery });
    if (draft === d) renderEntryMedia();
  }
};
// The app makes a video smaller before the input gets it, and says how far it's got.
window.videoShrinking = (secs, total) => {
  if (!draft) return;
  const was = draft.busy;
  draft.busy = { secs, total };
  if (was) tickEntry(); else renderEntryMedia();
};
window.videoFailed = why => {
  if (!draft) return;
  draft.busy = null;
  renderEntryMedia();
  alert(why);
};
$('jVideoIn').onchange = async ev => {
  const d = draft, f = ev.target.files[0], inGallery = phone && !Android.pickedWithCamera();
  ev.target.value = '';
  if (!f || !d) return;
  d.busy = d.busy || { secs: 0, total: 0 };
  renderEntryMedia();
  try {
    const v = phone ? await videoReady(f) : await shrinkVideo(f, (secs, total) => { d.busy = { secs, total }; if (draft === d) tickEntry(); });
    const id = uid(), poster = { id: uid(), type: 'poster', mime: 'image/jpeg', size: v.poster.size };
    d.e.media.push({ id, type: 'video', mime: v.blob.type, size: v.blob.size, w: v.w, h: v.h, secs: v.secs, poster });
    d.add.set(id, { blob: v.blob, url: URL.createObjectURL(v.blob), poster: v.poster, posterUrl: URL.createObjectURL(v.poster), inGallery });
  } catch (err) {
    if (draft === d) alert(err.message);
  } finally {
    d.busy = null;
    if (draft === d) renderEntryMedia();
  }
};
async function saveEntry() {
  const d = draft, e = d.e;
  e.text = $('enText').value.trim();
  if (!e.text && !e.media.length) { alert('Add a photo, a video or a few words first.'); return; }
  $('enSave').disabled = true;
  // The photos and videos go on the phone before the entry that has them, held meanwhile so a sync arriving
  // (which drops what no entry has) doesn't take them.
  const fresh = [], held = e.media.filter(it => d.add.has(it.id)).flatMap(it => it.poster ? [it.id, it.poster.id] : [it.id]);
  mediaStore.hold(held);
  try {
    for (const it of e.media) {
      const a = d.add.get(it.id);
      if (!a) continue;
      await mediaStore.put(it.id, a.blob);
      if (a.poster) await mediaStore.put(it.poster.id, a.poster);
      if (a.inGallery) markSaved(it.id); else fresh.push(it.id);
    }
  } catch (err) {
    mediaStore.letGo(held);
    $('enSave').disabled = false;
    alert(`The entry couldn't be saved: ${/quota|space|full/i.test(err.message + err.name) ? "this phone's storage is full" : err.message}. Free some space and try Save again.`);
    return;
  }
  const now = Date.now();
  if (d.isNew) Object.assign(e, { at: now, dev: me.dev });
  e.by = me.name;
  // Each photo and video keeps what it was taken with, who took it and when it was added (the family page's
  // Lately tells of ones added to an entry later).
  for (const it of e.media) if (!it.from) it.from = { about: e.about, act: e.act || null, title: e.title, emoji: e.emoji, by: me.name, at: now };
  state.journal[d.id] = e;
  mediaStore.letGo(held);
  save();
  closeSheets();
  await pruneMedia();
  journalChanged();
  autoGallery(fresh);
}
async function deleteEntry() {
  if (!confirm(`Delete this entry${syncOn() ? ' from every phone' : ''}?`)) return;
  delete state.journal[draft.id];
  delete state.seen[draft.id];
  save();
  closeSheets();
  await pruneMedia();
  journalChanged();
}
// Re-draw wherever the journal shows.
function journalChanged() {
  const s = document.body.dataset.screen;
  if (s === 'journal') renderJournal(); else if (s === 'home' && kid()) pane === 'family' ? renderFamily() : renderJournalCard();
}
// sync.js: a photo or video came from another phone (or couldn't). Fill it in wherever it shows.
function mediaArrived(id) {
  if (id) { const it = journalMedia(state).get(id); if (it && it.type !== 'poster') autoGallery([id]); }
  fillMedia(document.body);
  if (document.body.dataset.screen === 'journal') renderJournalNote();
  if (viewing && viewing === id) { showView(); if (zoomOn()) showZoom(); }
}

// A photo or video, big, with the others from where it was tapped (the entry, the journal, Lately) either side:
// swipe, or tap ‹ ›, to go through them. Tapping the photo (or ⛶) fills the screen, where it pinches and
// double-taps to zoom. A video that hasn't come from the other phone yet says so, and plays once it's here.
let viewing = null, viewList = [], viewAt = 0;
async function openView(id, list = [id]) {
  const all = journalMedia(state);
  viewList = list.filter(x => all.has(x));
  viewAt = viewList.indexOf(id);
  if (viewAt < 0) return;
  await showView();
  $('viewSheet').classList.add('open');
}
async function viewStep(d) {
  const at = viewAt + d;
  if (at < 0 || at >= viewList.length) return;
  viewAt = at;
  await showView();
  if (zoomOn()) showZoom();
}
// Left or right across `el` goes to the next or the one before; `ok(ev)` says whether a drag may be a swipe.
let swiped = 0; // when the last swipe was: the tap it ends with isn't one
function swipes(el, ok = () => true) {
  let x0 = null, y0 = 0;
  el.addEventListener('pointerdown', ev => { if (ev.isPrimary && ok(ev)) { x0 = ev.clientX; y0 = ev.clientY; } });
  el.addEventListener('pointerup', ev => {
    if (x0 === null || !ev.isPrimary) return;
    const dx = ev.clientX - x0, dy = ev.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) { swiped = Date.now(); viewStep(dx < 0 ? 1 : -1); }
  });
  el.addEventListener('pointercancel', () => { x0 = null; });
}
async function showView() {
  const id = viewList[viewAt], it = journalMedia(state).get(id);
  if (!it) { closeView(); return; }
  viewing = id;
  const u = await mediaStore.url(id);
  // What it was taken with, whose and when, under it.
  const e = Object.values(state.journal).find(e => (e.media || []).some(m => m.id === id)), f = e && mediaFrom(it, e);
  const kidName = e && (state.children.find(c => c.id === e.child) || {}).name;
  const eid = e && Object.keys(state.journal).find(k => state.journal[k] === e);
  if (eid && u) markSeen(eid, id);
  const seen = eid && syncOn() && seenLine(eid, e, id);
  const caption = f ? `<p class="fromTag"><span class="tag">${it.type === 'video' ? '🎬 Video' : '📷 Photo'}</span>taken with ${f.emoji} <b>${esc(f.title)}</b>
    <span class="muted">${aboutKind(f.about).toLowerCase()}${kidName ? ' · ' + esc(kidName) : ''} · ${dayWords(e.day)}${f.by || e.by ? ' · ' + esc(f.by || e.by) : ''}</span></p>
    ${seen ? `<p class="muted seenLine">👁 ${esc(seen)}</p>` : ''}` : '';
  if (viewList[viewAt] !== id) return; // gone on to another meanwhile
  const n = viewList.length;
  $('viewBody').innerHTML = `<div class="vstage" id="vStage">${u ? it.type === 'video' ? `<video controls autoplay playsinline src="${u}"></video>` : `<img src="${u}" alt="" draggable="false">`
    : `<p class="vwait">This ${it.type} is still on the phone that took it. It comes straight here while both phones have Tot Routines open${mediaError ? ` (${esc(mediaError)})` : ''}.</p>`}
    ${u ? '<button class="vbig" id="vBig" aria-label="Full screen">⛶</button>' : ''}
    ${viewAt > 0 ? '<button class="vnav prev" id="vPrev" aria-label="The one before">‹</button>' : ''}
    ${viewAt < n - 1 ? '<button class="vnav next" id="vNext" aria-label="The next one">›</button>' : ''}</div>
    ${n > 1 ? `<p class="vcount">${viewAt + 1} of ${n}</p>` : ''}` +
    caption + `<div class="twoBtn" style="margin-top:10px">${phone && u ? `<button class="btn" id="viewSave"${savedHere[id] ? ' disabled' : ''}>${savedHere[id] ? icon('check') + 'In your gallery' : '⬇ Save to phone'}</button>` : ''}
      <button class="btn" id="viewClose">Close</button></div>`;
  if ($('viewSave')) $('viewSave').onclick = async () => {
    if (!Android.galleryAllowed()) { alert('Allow Tot Routines to save to your gallery, then tap Save again.'); return; }
    $('viewSave').disabled = true;
    $('viewSave').textContent = 'Saving…';
    try { await toGallery(id); } catch (e) { alert(e.message); }
    if (viewing === id) showView();
  };
  const v = $('viewBody').querySelector('video');
  if (v) fixDuration(v);
  // Gone through to it full screen: it plays there, not under it too.
  if (v && zoomOn()) { v.removeAttribute('autoplay'); v.pause(); }
  if (u) $('vBig').onclick = openZoom;
  if (it.type === 'photo' && u) $('vStage').querySelector('img').onclick = openZoom;
  if ($('vPrev')) $('vPrev').onclick = () => viewStep(-1);
  if ($('vNext')) $('vNext').onclick = () => viewStep(1);
  $('viewClose').onclick = closeView;
}
swipes($('viewBody'), ev => !!ev.target.closest('#vStage'));
function closeView() {
  closeZoom();
  viewing = null;
  $('viewBody').innerHTML = '';
  $('viewSheet').classList.remove('open');
}

// ---- Into the phone's gallery ----
// A journal photo or video goes into the phone's gallery (its "Tot Routines" album) with a tap on Save in the
// viewer, or, with me.gallery 'auto', each as it's added here or comes from another phone. SAVED_KEY keeps
// which are there already; one picked from the gallery was there to begin with.
const SAVED_KEY = 'tot-routines-saved';
const savedHere = readSaved(SAVED_KEY, {});
const markSaved = id => { savedHere[id] = Date.now(); vault.set(SAVED_KEY, JSON.stringify(savedHere)); };
const galleryAuto = () => phone && me.gallery === 'auto';
// The page has each as a Blob, which reaches the app only as text: base64, in pieces of 768 KB (a multiple of
// 3 bytes, so each piece's base64 stands alone). One at a time.
const GALLERY_PIECE = 3 << 18;
const b64Of = blob => new Promise((ok, bad) => {
  const r = new FileReader();
  r.onload = () => ok(r.result.slice(r.result.indexOf(',') + 1));
  r.onerror = () => bad(r.error);
  r.readAsDataURL(blob);
});
let galleryChain = Promise.resolve();
function toGallery(id) {
  const run = galleryChain.then(async () => {
    if (savedHere[id]) return;
    const it = journalMedia(state).get(id), blob = it && await mediaStore.get(id);
    if (!it) return; // its entry went meanwhile
    if (!blob) throw new Error(`That ${it.type} isn't on this phone yet.`);
    const video = it.type === 'video', mime = blob.type || (video ? 'video/mp4' : 'image/jpeg');
    const day = dayKey(new Date((it.from && it.from.at) || Date.now()));
    const g = Android.galleryStart(it.type, mime, `TotRoutines-${day}-${id}.${video ? (mime.includes('webm') ? 'webm' : 'mp4') : 'jpg'}`);
    let ok = false;
    try {
      for (let i = 0; i < blob.size; i += GALLERY_PIECE) Android.galleryPart(g, await b64Of(blob.slice(i, i + GALLERY_PIECE)));
      ok = true;
    } finally {
      Android.galleryEnd(g, ok);
    }
    markSaved(id);
  });
  galleryChain = run.catch(() => {});
  return run;
}
// Saved by themselves: said once a run if it goes wrong, not at every one.
let galleryTold = false;
function autoGallery(ids) {
  if (!galleryAuto() || !ids.length || !Android.galleryAllowed()) return;
  for (const id of ids) toGallery(id).catch(e => {
    console.error('saving to the gallery:', e.message);
    if (!galleryTold) { galleryTold = true; alert("Some photos or videos couldn't be saved to your gallery: " + e.message); }
  });
}
// The journal's photos and videos that are on this phone and not in its gallery yet.
const notInGallery = () => [...journalMedia(state).values()].filter(it => it.type !== 'poster' && mediaStore.has(it.id) && !savedHere[it.id]).map(it => it.id);

// ---- Full screen ----
// The photo or video filling the screen. A photo pinches to zoom (up to 5×), double-taps to 2.5× there and
// back, and pans while zoomed; unzoomed, a swipe goes to the next or the one before, as in the sheet.
const zoomOn = () => $('zoom').classList.contains('open');
const zoom = { s: 1, x: 0, y: 0, pts: new Map(), from: null, tap: 0 };
function openZoom() {
  if (Date.now() - swiped < 400) return;
  const v = $('viewBody').querySelector('video');
  if (v) v.pause();
  $('zoom').classList.add('open');
  showZoom(v ? v.currentTime : 0);
}
async function showZoom(t = 0) {
  const id = viewList[viewAt], it = journalMedia(state).get(id), u = it && await mediaStore.url(id);
  if (viewList[viewAt] !== id || !zoomOn()) return;
  Object.assign(zoom, { s: 1, x: 0, y: 0, from: null });
  $('zoomStage').innerHTML = !u ? `<p class="vwait">This ${it ? it.type : 'photo'} hasn't come yet.</p>`
    : it.type === 'video' ? `<video controls autoplay playsinline src="${u}"></video>` : `<img src="${u}" alt="" draggable="false">`;
  const v = $('zoomStage').querySelector('video');
  if (v) { fixDuration(v); if (t) v.currentTime = t; }
  $('zoomCount').textContent = viewList.length > 1 ? `${viewAt + 1} of ${viewList.length}` : '';
  $('zoomPrev').hidden = viewAt === 0;
  $('zoomNext').hidden = viewAt === viewList.length - 1;
  zoomDraw();
}
function closeZoom() {
  if (!zoomOn()) return;
  $('zoom').classList.remove('open');
  $('zoomStage').innerHTML = '';
  zoom.pts.clear();
}
// Kept so the photo can't be pushed off the screen.
function zoomDraw() {
  const img = $('zoomStage').querySelector('img');
  if (!img) return;
  const r = $('zoomStage').getBoundingClientRect();
  const mx = Math.max(0, (zoom.s * img.offsetWidth - r.width) / 2), my = Math.max(0, (zoom.s * img.offsetHeight - r.height) / 2);
  zoom.x = Math.max(-mx, Math.min(mx, zoom.x));
  zoom.y = Math.max(-my, Math.min(my, zoom.y));
  img.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`;
}
// Zoom to `s` keeping the point (px, py) of the screen where it is.
function zoomAt(s, px, py) {
  const r = $('zoomStage').getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const qx = (px - cx - zoom.x) / zoom.s, qy = (py - cy - zoom.y) / zoom.s;
  zoom.s = Math.max(1, Math.min(5, s));
  zoom.x = px - cx - zoom.s * qx;
  zoom.y = py - cy - zoom.s * qy;
  zoomDraw();
}
(() => {
  const st = $('zoomStage'), photo = () => !!st.querySelector('img');
  const two = () => { const [a, b] = [...zoom.pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  // What the gesture started from: the pinch's spread, or the pan's start.
  const begin = () => {
    if (zoom.pts.size === 2) { const p = two(); zoom.from = { d: p.d, s: zoom.s, x: p.x, y: p.y, tx: zoom.x, ty: zoom.y }; }
    else if (zoom.pts.size === 1) { const [p] = zoom.pts.values(); zoom.from = { x: p.x, y: p.y, tx: zoom.x, ty: zoom.y, at: Date.now(), moved: 0 }; }
    else zoom.from = null;
  };
  st.addEventListener('pointerdown', ev => {
    if (!photo()) return;
    st.setPointerCapture(ev.pointerId);
    zoom.pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    begin();
  });
  st.addEventListener('pointermove', ev => {
    if (!zoom.pts.has(ev.pointerId) || !zoom.from) return;
    zoom.pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const f = zoom.from;
    if (zoom.pts.size === 2) {
      const p = two();
      // Zoom about where the pinch started, then follow the fingers.
      Object.assign(zoom, { s: f.s, x: f.tx, y: f.ty });
      zoomAt(f.s * p.d / f.d, f.x, f.y);
      zoom.x += p.x - f.x;
      zoom.y += p.y - f.y;
      zoomDraw();
    } else {
      f.moved = Math.max(f.moved, Math.hypot(ev.clientX - f.x, ev.clientY - f.y));
      if (zoom.s > 1) { zoom.x = f.tx + ev.clientX - f.x; zoom.y = f.ty + ev.clientY - f.y; zoomDraw(); }
    }
  });
  const end = ev => {
    if (!zoom.pts.has(ev.pointerId)) return;
    const f = zoom.from, single = zoom.pts.size === 1 && f && 'moved' in f;
    zoom.pts.delete(ev.pointerId);
    if (single && ev.type === 'pointerup') {
      const dx = ev.clientX - f.x, dy = ev.clientY - f.y;
      if (zoom.s === 1 && Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) viewStep(dx < 0 ? 1 : -1);
      else if (f.moved < 10 && Date.now() - f.at < 300) {
        // A second tap soon after the first: in to 2.5× there, or back out.
        if (Date.now() - zoom.tap > 350) zoom.tap = Date.now();
        else {
          zoom.tap = 0;
          if (zoom.s > 1) zoomAt(1, ev.clientX, ev.clientY); else zoomAt(2.5, ev.clientX, ev.clientY);
        }
      }
    }
    begin();
  };
  st.addEventListener('pointerup', end);
  st.addEventListener('pointercancel', end);
  // A computer's wheel zooms too.
  st.addEventListener('wheel', ev => { if (!photo()) return; ev.preventDefault(); zoomAt(zoom.s * (ev.deltaY < 0 ? 1.2 : 1 / 1.2), ev.clientX, ev.clientY); }, { passive: false });
  // A video swipes from its edges only: its own controls take the rest.
  swipes(st, ev => !photo() && !!st.querySelector('video') && (ev.clientX < 40 || ev.clientX > innerWidth - 40));
  $('zoomClose').onclick = closeZoom;
  $('zoomPrev').onclick = () => viewStep(-1);
  $('zoomNext').onclick = () => viewStep(1);
})();

document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-jnew],[data-jall],[data-jopen],[data-jedit],[data-view],[data-seen]');
  if (!t) return;
  if (t.dataset.seen) openSeen(t.dataset.seen);
  else if ('jnew' in t.dataset) openEntryFor(null);
  else if ('jall' in t.dataset) openJournal();
  else if (t.dataset.jopen) {
    const e = state.journal[t.dataset.jopen];
    if (e.child !== state.current) { state.current = e.child; save(); }
    openJournal(t.dataset.jopen);
  }
  else if (t.dataset.jedit) openEntry(t.dataset.jedit);
  else {
    // The others shown with it, in order: the whole journal's, or elsewhere the same card's.
    const near = t.closest('#jList') || t.closest('.card, .sheet, .screen') || document;
    openView(t.dataset.view, [...near.querySelectorAll('[data-view]')].map(b => b.dataset.view));
  }
});
$('jNew').onclick = () => openEntryFor(null);
$('yayJournal').onclick = () => {
  const about = board.about;
  $('yay').classList.remove('show');
  renderHome();
  show('home');
  openEntryFor(about);
};
mediaStore.ready.then(pruneMedia);

// ---- Guide ----
$('openGuide').onclick = () => {
  $('tips').innerHTML = numbered(TIPS);
  const c = kid(), cur = kidBand().band.id;
  $('ages').innerHTML = BANDS.map(b => `<div class="card lead${b.id === cur ? ' now' : ''}"><div class="eyebrow">${b.id === cur ? `${esc(c.name)} now` : 'Ages'}</div>
    <h2>${b.name}</h2><span class="pill">${b.span}</span>
    <div class="facts2"><span>${sq('sleep', 'plum')}<b>${b.sleep.total[0]}–${b.sleep.total[1]} h</b><small>of sleep</small></span><span>${sq('steps')}<b>Up to ${b.maxSteps}</b><small>steps a routine</small></span></div>
    ${trail(b.big.map(x => ['', '', x]), 'small')}</div>`).join('');
  $('saidNo').innerHTML = saidNoHtml(c, cur);
  $('schoolTips').innerHTML = numbered(SCHOOL.tips);
  $('doctor').textContent = ASK_DOCTOR;
  $('sources').innerHTML = trail(SOURCES.map(s => ['', '', s]), 'small');
  $('ver').textContent = window.Android ? `Tot Routines ${Android.version()}` : '';
  show('guide');
};

// ---- Picture chart ----
// The chart shows a board: a routine's steps, or today's plan. A board is { title, about (what a journal entry from the end is about), steps, speak, ticked,
// tick(i, on), finish() → the celebration line }.
let board = null, ticked = [];
function openBoard(b) {
  board = b;
  ticked = [...b.ticked];
  renderChart();
  show('chart');
  sayNext(500);
}
function openChart(id) {
  const r = routine(id), childId = state.current;
  if (!r) return routineGone();
  openBoard({ title: r.name, about: { about: 'r:' + r.id, title: r.name, emoji: r.emoji }, steps: onSteps(r), speak: r.speak !== false, ticked: [], tick() {},
    finish() {
      // The child or the routine may have been deleted on another phone while the chart was out: still a cheer.
      const c = state.children.find(k => k.id === childId);
      if (!c || !(state.routines[childId] || []).some(x => x.id === r.id)) return `${c ? c.name + ' finished' : 'All done with'} ${r.name}!`;
      const dk = dayKey(new Date());
      ((state.done[dk] = state.done[dk] || {})[childId] = state.done[dk][childId] || {})[r.id] = tickOf(r.name, r.emoji);
      save();
      return `${c.name} finished ${r.name}!`;
    } });
}
// Today's plan as pictures, to go through together in the morning and tick off through the day.
function openDayBoard() {
  const c = kid(), today = new Date(), rows = dayRows(c, today), plan = planFor(c, today);
  openBoard({ title: 'Today', about: null, speak: true,
    steps: rows.map(r => ({ key: 'day-' + r.slot, custom: true, emoji: r.emoji, label: r.label })),
    ticked: rows.flatMap((r, i) => r.done ? [i] : []),
    tick(i, on) { if (on) plan.done[rows[i].slot] = tickOf(rows[i].label, rows[i].emoji); else delete plan.done[rows[i].slot]; save(); },
    finish: () => `What a day, ${c.name}!` });
}
const nextStep = () => board.steps.findIndex((s, i) => !ticked.includes(i));
// Say the step that's next, after `wait` ms (so the tick's chime can finish first).
let sayTimer;
function sayNext(wait) {
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => {
    const i = nextStep();
    if (i >= 0 && document.body.dataset.screen === 'chart') sayStep(board, board.steps[i]);
  }, wait);
}
$('sayAgain').onclick = () => sayNext(0);
function renderChart() {
  const steps = board.steps;
  $('chartTitle').textContent = board.title;
  const next = nextStep();
  $('stars').textContent = ticked.map(() => '⭐').join('');
  $('tiles').className = 'tiles' + (steps.length <= 3 ? ' one' : '');
  $('tiles').innerHTML = steps.map((s, i) =>
    `<button class="tile${ticked.includes(i) ? ' done' : i === next ? ' next' : ''}" data-t="${i}"><span class="num">${i + 1}</span>${pictureHtml(state.current, s, { img: 'ph', em: 'em' })}${esc(stepInfo(s).label)}</button>`
  ).join('');
}

// ---- Printed chart ----
// Fills #printArea (the only thing the print stylesheet shows) and prints it. On the phone Android's print
// dialog also offers "Save as PDF".
async function printChart(id) {
  const r = routine(id);
  if (!r) return routineGone();
  const steps = onSteps(r), c = kid();
  if (!steps.length) { alert('Add at least one step first.'); return; }
  $('printArea').innerHTML = `<h1>${r.emoji} ${esc(r.name)}</h1><p class="who">${esc(c.name)}'s ${esc(r.name.toLowerCase())} routine</p>
    <div class="pgrid c${printColumns(steps.length)}">${steps.map((s, i) =>
      `<div class="pcell"><span class="num">${i + 1}</span><span class="box"></span>${pictureHtml(c.id, s, { img: '', em: 'em' })}<b>${esc(stepInfo(s).label)}</b></div>`).join('')}</div>
    <p class="foot">Tick each box, or add a sticker, as you go. Made with Tot Routines.</p>`;
  // Photos are data URLs, but still decode before the page is laid out for paper.
  await Promise.all([...$('printArea').querySelectorAll('img')].map(img => img.decode()));
  if (phone) Android.print(`${r.name} – ${c.name}`);
  else window.print();
}
$('tiles').onclick = e => {
  const b = e.target.closest('[data-t]');
  if (!b) return;
  const i = Number(b.dataset.t), steps = board.steps;
  if (ticked.includes(i)) { ticked = ticked.filter(x => x !== i); board.tick(i, false); }   // a mis-tap can be undone
  else { ticked.push(i); board.tick(i, true); chime(ticked.length === steps.length); }
  renderChart();
  if (ticked.length === steps.length) { clearTimeout(sayTimer); setTimeout(finish, 600); }
  else sayNext(700);
};
function finish() {
  $('yayName').textContent = board.finish();
  $('yay').classList.add('show');
  for (let i = 0; i < 30; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.textContent = ['🎉', '⭐', '🎈', '✨'][i % 4];
    c.style.left = Math.random() * 100 + 'vw';
    c.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
    c.style.animationDelay = Math.random() * .6 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4500);
  }
}
$('yayOk').onclick = () => { $('yay').classList.remove('show'); goHome(); };

// A soft rising chime per tick, a three-note one at the end. Web Audio: no sound files.
let audio;
function chime(last) {
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  const notes = last ? [523, 659, 784] : [523 + ticked.length * 40];
  notes.forEach((f, k) => {
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + k * .14;
    o.frequency.value = f;
    o.type = 'sine';
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(.25, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + .5);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + .55);
  });
}

// The chart's ✕ leaves only when held, so a toddler's tap can't close it.
let holdTimer;
const exitBtn = $('exit');
exitBtn.addEventListener('pointerdown', () => {
  exitBtn.classList.add('holding');
  holdTimer = setTimeout(() => { exitBtn.classList.remove('holding'); goHome(); }, 1200);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => exitBtn.addEventListener(ev, () => {
  if (!exitBtn.classList.contains('holding')) return;
  clearTimeout(holdTimer);
  exitBtn.classList.remove('holding');
  $('exitHint').classList.add('show');
  setTimeout(() => $('exitHint').classList.remove('show'), 1500);
}));

// Android back: close a sheet, else go home; on home, false lets the app close. The chart ignores back.
window.goBack = () => {
  if (zoomOn()) { closeZoom(); return true; }
  if ($('viewSheet').classList.contains('open')) { closeView(); return true; }
  if (document.querySelector('.sheet.open')) { closeSheets(); return true; }
  const s = document.body.dataset.screen;
  if (s === 'chart') {
    if ($('yay').classList.contains('show')) { $('yayOk').click(); return true; }
    $('exitHint').classList.add('show');
    setTimeout(() => $('exitHint').classList.remove('show'), 1500);
    return true;
  }
  // The family page is the first tab: Back from a child or the baby goes there, and from there leaves the app.
  if (s === 'home' && pane !== 'family') { openFamily(); return true; }
  if (s === 'baby' && babyFrom === 'setup') { renderExpectBtn(); show('setup'); return true; }
  if (s === 'setup' && !state.current) return false;
  if (s !== 'home') { renderHome(); show('home'); return true; }
  return false;
};
// Whether goBack has anywhere to go: the app's told as it changes, so that when it hasn't, Android takes Back and
// shows its own back-to-home animation during the gesture.
const canGoBack = () => {
  const s = document.body.dataset.screen;
  return zoomOn() || !!document.querySelector('.sheet.open') || (s === 'setup' ? !!state.current : s !== 'home' || pane !== 'family');
};
if (phone && Android.backable) {
  let was = null;
  const tell = () => { const on = canGoBack(); if (on !== was) { was = on; Android.backable(on); } };
  new MutationObserver(tell).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class', 'data-screen'] });
  setTimeout(tell);
}

renderShareCard();
// If the family page won't draw, what went wrong is shown (boot.js), and the child's page is a way on.
try {
  if (state.current && kid()) openFamily(); else openSetup(null);
} catch (e) {
  console.error("the first page couldn't open:", e);
  oops(e.stack || e.message, () => { pane = ''; renderHome(); show('home'); });
}
// What was ticked off on the notifications while the app was closed; then the alarms, the app's copy of the
// reminders, refreshed in case this is the first start after an update or a day has gone by.
takeDone();
syncReminders();
if (syncOn()) { syncNow(); syncListen(); }
// The lock: offered once. While it's on, photos and videos not sealed yet (the app closed while it was being
// turned on) are now.
if (vault.sealing) resealMedia();
offerLock();
// The family's video quality: as last known at once, then as the server says.
planApply();
planRefresh();
outingSync(); // plans saved on Triangle Tots since the app last opened, on a linked phone
if (phone) { const launch = Android.takeLaunch(); if (launch) openFromReminder(launch); }
// Opened from Open in Tot Routines on tottoolbox.com/routines/plans.html (1.91): the plans come in at once.
if (phone && Android.takePlans) { const code = Android.takePlans(); if (code) outingAdd(code); }
