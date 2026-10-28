// Tot Potty page: the core (state, saving, navigation), setup and settings, a child's details, and home. The other
// screens are in screens.js, the child's own screen in kidmode.js, sharing and the start in start.js. Everything
// is kept in localStorage under KEY; with family sharing on (sync.js) it also goes to the family's sealed copy on
// the sync server, and the other phones' changes come back. `me` and `priv` stay on this phone.
const KEY = 'tot-potty';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const phone = !!window.Android;

// { me: this phone's grown-up (a person id), people: {id: {name}}, kids: {id: {name, birth, rid, words: {pee,
//   poop, potty}, method, start, stage, stageDay (the day it reached that stage), goal: {n, prize}, stars, bed, wake, gear, notes, doc: {name, phone},
//   added: {at, by}}}, log, timers, stars, prizes, ready, tasks, gear (see sync.js and logic.js),
//   priv: {cur (the child showing), where (where this phone logs from), mute: {kid: true} (no timer reminders
//   here), look} }
let state = JSON.parse(localStorage.getItem(KEY) || 'null') || {};
normalizeState(state);
// Every save (here or from another phone) also tells the app what Tot Routines may show, when that changed.
function saveLocal() {
  localStorage.setItem(KEY, JSON.stringify(state));
  tellFamily();
}
let toldFamily = null;
function tellFamily() {
  if (!phone) return;
  const s = familySummary(state, Date.now()), json = s ? JSON.stringify(s) : '';
  if (json === toldFamily) return;
  Android.setFamily(json);
  toldFamily = json;
}
const save = () => { saveLocal(); syncSoon(300); syncReminders(); };

const today = () => dayKey(new Date());
const kidList = () => Object.entries(state.kids).map(([id, k]) => ({ id, ...k }))
  .sort((a, b) => (a.added?.at || 0) - (b.added?.at || 0) || String(a.name).localeCompare(b.name));
const curId = () => state.kids[state.priv.cur] ? state.priv.cur : kidList()[0]?.id || null;
const K = () => state.kids[curId()];
const kname = (k = K()) => esc(k?.name || 'your child');
// A text with {name}, {pee}, {poop} and {potty} filled in for the child, as HTML.
const fill = (t, k = K()) => { const w = wordsOf(k || {}); return esc(t).replace(/\{(name|pee|poop|potty)\}/g, (_, x) => esc(x === 'name' ? k?.name || 'your child' : w[x])); };
const myName = () => personName(state, state.me);
// Who logged something, as HTML: "you", a name, or ''.
const whoName = id => !id ? '' : id === state.me ? 'you' : esc(personName(state, id));
const fmtTime = ms => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const fmtDay = (k, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => parseDay(k).toLocaleDateString([], opts);
function ago(ms) {
  const m = Math.max(0, Math.round((Date.now() - ms) / MIN));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''} ago`;
  return `${Math.floor(m / 1440)} day${m >= 2880 ? 's' : ''} ago`;
}
const pickSticker = () => STICKERS[Math.floor(Math.random() * STICKERS.length)];

let clock = null; // ticks once a second on home (the timer) and in kid mode (the sit timer)
function show(screen) {
  clearInterval(clock);
  clock = null;
  if (document.body.dataset.screen !== screen) hideToast();
  document.body.dataset.screen = screen;
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === screen));
  window.scrollTo(0, 0);
  keepAwake(screen === 'kidmode');
  if (screen === 'home') clock = setInterval(renderTimer, 1000);
}
// In the app the activity keeps the screen on; in a browser, a wake lock does (where there is one).
let wake = null;
function keepAwake(on) {
  if (phone) { Android.keepAwake(on); return; }
  if (!navigator.wakeLock) return;
  if (on && !wake) navigator.wakeLock.request('screen').then(l => { wake = l; l.onrelease = () => { if (wake === l) wake = null; }; }, () => {});
  if (!on && wake) { wake.release(); wake = null; }
}
function call(number) {
  if (!number) { alert("Add the doctor's number in the child's details first (Settings)."); return; }
  if (phone) Android.dial(number); else location.href = 'tel:' + number.replace(/[^\d+]/g, '');
}
// Text to send somewhere else: the phone's share sheet, or the clipboard.
async function shareText(title, text) {
  if (phone) { Android.share(title, text); return; }
  if (navigator.share) { try { await navigator.share({ title, text }); } catch (e) { if (e.name !== 'AbortError') throw e; } return; }
  await navigator.clipboard.writeText(text);
  alert('Copied. Paste it into a message or email.');
}
function printText(title, text) {
  $('printOut').textContent = text;
  if (phone) Android.print(title); else window.print();
}
function chips(id, opts, on, set) {
  $(id).innerHTML = opts.map(([v, l]) => `<button data-v="${v}" class="${v === on ? 'on' : ''}">${esc(l)}</button>`).join('');
  $(id).onclick = e => { const b = e.target.closest('[data-v]'); if (b) set(b.dataset.v); };
}
// A message at the bottom for a few seconds, with buttons: [{label, fn}].
let toastTimer = null;
function toast(msg, actions = []) {
  const t = $('toast');
  t.innerHTML = `<span>${msg}</span>${actions.map((a, i) => `<button data-t="${i}">${a.label}</button>`).join('')}`;
  t.onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; hideToast(); actions[b.dataset.t].fn(); };
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 7000);
}
const hideToast = () => { clearTimeout(toastTimer); $('toast').classList.remove('on'); };

// ---- Setup and settings ----
// Opened from Tot Routines for a child who isn't here yet, before this phone was set up: {rid, name, birth}.
let fromRoutinesKid = null;
const isSetUp = () => !!state.me && !!state.people[state.me] && kidList().length > 0;
function openSetup() {
  const set = isSetUp(), joined = !set && kidList().length > 0;
  $('setupTitle').textContent = set ? 'Settings' : joined ? 'Welcome! Who are you?' : 'Welcome to Tot Potty';
  $('setupIntro').hidden = $('welcomeArt').hidden = set;
  $('setupJoin').hidden = set || joined;
  $('welcomeArt').innerHTML = set ? '' : pottyArt();
  $('setup').classList.toggle('first', !set);
  $('setupTop').hidden = $('setupMore').hidden = !set;
  $('firstKid').hidden = kidList().length > 0;
  $('meName').value = myName();
  $('fkName').value = fromRoutinesKid?.name || '';
  $('fkBirth').value = fromRoutinesKid?.birth || '';
  $('fkBirth').max = today();
  $('setupErr').hidden = true;
  if (set) {
    renderKidList();
    renderLook();
    renderNotifyRow();
    $('ver').textContent = phone ? `Tot Potty ${Android.version()}`
      : 'Tot Potty on the web. The timer reminds you only while this page is open; the Android app reminds you any time.';
    $('privRow').hidden = !phone;
    if (phone) $('backupOn').checked = Android.backupOn();
  }
  show('setup');
}
$('saveSetup').onclick = () => {
  const err = m => { $('setupErr').textContent = m; $('setupErr').hidden = false; };
  const name = $('meName').value.trim();
  if (!name) return err('Add your name: it shows the other grown-ups who logged what.');
  let kidName = '', birth = '';
  if (!$('firstKid').hidden) {
    kidName = $('fkName').value.trim();
    birth = $('fkBirth').value;
    if (!kidName) return err("Add your child's name.");
    if (birth && birth > today()) return err('That birthday is in the future.');
  }
  if (!state.me) state.me = uid();
  state.people[state.me] = { ...(state.people[state.me] || {}), name };
  if (kidName) {
    const id = uid();
    state.kids[id] = newKid(kidName, birth, fromRoutinesKid?.rid);
    state.priv.cur = id;
    fromRoutinesKid = null;
  }
  save();
  goHome();
};
const newKid = (name, birth, rid) => ({ name, birth: birth || '', ...(rid ? { rid } : {}), words: {}, stars: 'wins', goal: { n: 10, prize: PRIZES[0] },
  bed: '19:30', wake: '07:00', added: { at: Date.now(), by: state.me || '' } });
function renderKidList() {
  $('kidList').innerHTML = kidList().map(k => `<button class="next" data-kid="${k.id}"><span class="em">🧒</span><span><b>${esc(k.name)}</b>
    <small>${k.birth ? ageWords(ageMonths(k.birth, today())) : 'No birthday'}${k.method ? ' · ' + esc(METHODS[k.method].name) : ''}</small></span></button>`).join('')
    + '<button class="next" data-kid="+"><span class="em">➕</span><span><b>Add a child</b></span></button>';
}
$('kidList').onclick = e => { const b = e.target.closest('[data-kid]'); if (b) openKidEdit(b.dataset.kid === '+' ? null : b.dataset.kid); };
// Settings offers to turn notifications (and exact alarms) on when they're off: the app asks only once by itself.
function renderNotifyRow() {
  $('notifyRow').hidden = !phone || Android.notifyAllowed();
  $('exactRow').hidden = !phone || Android.exactAllowed();
  $('fullRow').hidden = !phone || Android.fullScreenAllowed();
}
$('notifyBtn').onclick = () => Android.askNotify();
$('exactBtn').onclick = () => Android.askExact();
$('fullBtn').onclick = () => Android.askFullScreen();
$('backupOn').onchange = e => Android.setBackup(e.target.checked);
// How the menu's buttons look, on this phone only: icons in a grid, or full-width color bars.
const LOOK_KEY = 'tot-potty-look';
const applyLook = () => document.body.classList.toggle('bars', localStorage.getItem(LOOK_KEY) === 'bars');
applyLook();
function renderLook() {
  chips('look', [['grid', 'Icons in a grid'], ['bars', 'Color bars']], localStorage.getItem(LOOK_KEY) === 'bars' ? 'bars' : 'grid',
    v => { localStorage.setItem(LOOK_KEY, v); applyLook(); renderLook(); });
}

// ---- A child's details ----
const STAR_RULES = [['wins', 'Each pee or poop in the potty'], ['poops', 'Poops only'], ['asked', 'Only when they ask'], ['off', 'None: I give them by hand']];
let editing = null, pickStars = 'wins', editRid = '';
function openKidEdit(id, from = null) {
  editing = id;
  const k = id ? state.kids[id] : { name: from?.name || '', birth: from?.birth || '', words: {}, bed: '19:30', wake: '07:00', stars: 'wins' };
  editRid = id ? k.rid || '' : from?.rid || '';
  $('kidTitle').textContent = id ? `About ${k.name}` : 'Add a child';
  $('kName').value = k.name;
  $('kBirth').value = k.birth || '';
  $('kBirth').max = today();
  $('kPee').value = k.words?.pee || '';
  $('kPoop').value = k.words?.poop || '';
  $('kPotty').value = k.words?.potty || '';
  $('kWake').value = k.wake || '07:00';
  $('kBed').value = k.bed || '19:30';
  $('kGear').value = k.gear || '';
  $('kNotes').value = k.notes || '';
  $('kDoc').value = k.doc?.name || '';
  $('kDocPhone').value = k.doc?.phone || '';
  $('kDel').hidden = !id;
  $('kErr').hidden = true;
  pickStars = k.stars || 'wins';
  renderStarRule();
  show('kidEdit');
}
function renderStarRule() { chips('kStars', STAR_RULES, pickStars, v => { pickStars = v; renderStarRule(); }); }
$('kSave').onclick = () => {
  const err = m => { $('kErr').textContent = m; $('kErr').hidden = false; };
  const name = $('kName').value.trim(), birth = $('kBirth').value;
  if (!name) return err("Add the child's name.");
  if (birth && birth > today()) return err('That birthday is in the future.');
  const wake = $('kWake').value || '07:00', bed = $('kBed').value || '19:30';
  if (hhmmMin(bed) <= hhmmMin(wake)) return err('Bedtime has to be after waking up.');
  const word = id => $(id).value.trim().toLowerCase();
  const id = editing || uid(), k = editing ? state.kids[editing] : newKid(name, birth, editRid);
  Object.assign(k, { name, birth, wake, bed, stars: pickStars, gear: $('kGear').value.trim(), notes: $('kNotes').value.trim(),
    words: Object.fromEntries([['pee', word('kPee')], ['poop', word('kPoop')], ['potty', word('kPotty')]].filter(([, v]) => v)),
    doc: { name: $('kDoc').value.trim(), phone: $('kDocPhone').value.trim() } });
  state.kids[id] = k;
  if (!editing) state.priv.cur = id;
  save();
  if (editing && isSetUp()) openSetup(); else goHome();
};
$('kDel').onclick = () => {
  const k = state.kids[editing];
  if (!confirm(`Remove ${k.name}, and everything logged for them, from every phone?`)) return;
  for (const [id, e] of Object.entries(state.log)) if (e.kid === editing) delete state.log[id];
  for (const part of ['kids', 'timers', 'stars', 'prizes', 'ready', 'tasks']) delete state[part][editing];
  delete state.priv.mute[editing];
  save();
  openSetup(); // with no child left, it asks for one
};

// ---- Logging ----
// Log `t` for the current child now (or as `o` says): with who and where, a sticker when it earns one, and the
// timer counting again. Returns the event's id.
function logEvent(t, o = {}) {
  const id = uid(), kid = o.kid || curId(), at = o.at || Date.now(), k = state.kids[kid], timer = state.timers[kid];
  const e = { kid, t, at, by: state.me || '', where: o.where || state.priv.where || 'home' };
  if (WINS.has(t)) {
    const due = nextTry(timer, k, at);
    e.how = o.how || (due !== null && at >= due - 5 * MIN ? 'timer' : 'told');
  }
  state.log[id] = e;
  if (earnsStar(k, e)) (state.stars[kid] ||= {})[id] = { at, e: pickSticker(), by: state.me || '', why: t };
  if (timer) state.timers[kid] = timerAfter(timer, e);
  save();
  return id;
}
function removeEvent(id) {
  const e = state.log[id];
  if (!e) return;
  delete state.log[id];
  if (state.stars[e.kid]) delete state.stars[e.kid][id];
}
// The buttons on home (QUICK, in logic.js): tap, it's logged, with a moment to undo or add more.
function quickLog(t) {
  const kid = curId(), before = state.timers[kid] ? { ...state.timers[kid] } : null, id = logEvent(t), w = wordsOf(K()), name = kname();
  const star = state.stars[kid]?.[id];
  if (WINS.has(t)) party(star && star.e);
  if (navigator.vibrate) navigator.vibrate(40);
  renderHome();
  const undo = { label: 'Undo', fn: () => { removeEvent(id); if (before) state.timers[kid] = before; save(); renderHome(); } };
  const acts = [undo];
  if (WINS.has(t)) acts.push({ label: `🙋 ${name} asked`, fn: () => { if (!state.log[id]) return; state.log[id].how = 'asked'; reStar(id); save(); renderHome(); toast(`Noted: ${name} asked. 🙌`); } });
  if (t === 'pee' || t === 'poop') acts.push({ label: t === 'pee' ? `+ ${esc(w.poop)} too` : `+ ${esc(w.pee)} too`, fn: () => { if (!state.log[id]) return; state.log[id].t = 'both'; save(); renderHome(); } });
  acts.push({ label: 'Edit', fn: () => openLog(id) });
  const msg = WINS.has(t) ? `${EVENT[t].emoji} ${esc(EVENT[t].short)} in the ${esc(w.potty)}!${star ? ` ${star.e} sticker` : ''}`
    : ACCIDENTS.has(t) ? `${EVENT[t].emoji} Logged. Calm and kind: "${esc(w.pee)} goes in the ${esc(w.potty)}."` : `${EVENT[t].emoji} Logged`;
  toast(msg, acts);
}
// The sticker an event earns, after something about it changed (asked, or its kind).
function reStar(id) {
  const e = state.log[id], k = state.kids[e.kid], has = state.stars[e.kid]?.[id];
  if (earnsStar(k, e) && !has) (state.stars[e.kid] ||= {})[id] = { at: e.at, e: pickSticker(), by: state.me || '', why: e.t };
  else if (!earnsStar(k, e) && has) delete state.stars[e.kid][id];
}

// A log entry's sheet: change anything, or remove it. `id` null: a new one, from earlier.
let logEdit = null;
function openLog(id) {
  const e = id ? { ...state.log[id] } : { kid: curId(), t: 'pee', at: Date.now(), how: 'told', where: state.priv.where || 'home', by: state.me || '' };
  if (!e.kid) return;
  logEdit = { id, e };
  renderLogSheet();
  $('logSheet').classList.add('open');
}
function renderLogSheet() {
  const { id, e } = logEdit, d = new Date(e.at);
  $('logBody').innerHTML = `<h2>${id ? 'Change this' : 'Add something from earlier'}</h2>
    ${id && e.by ? `<p class="muted">Logged by ${whoName(e.by)}, ${fmtDay(dayOf(e.at))} ${fmtTime(e.at)}</p>` : ''}
    <div class="chips" id="lType"></div>
    <div class="row2"><label class="field">Day <input type="date" id="lDay" value="${dayKey(d)}" max="${today()}"></label>
      <label class="field">Time <input type="time" id="lTime" value="${pad2(d.getHours())}:${pad2(d.getMinutes())}"></label></div>
    <div id="lHowRow"${WINS.has(e.t) ? '' : ' hidden'}><h3>Who started it?</h3><div class="chips" id="lHow"></div></div>
    <h3>Where</h3><div class="chips" id="lWhere"></div>
    <label class="field">Note <textarea id="lNote" maxlength="300" placeholder="Optional">${esc(e.note || '')}</textarea></label>
    <button class="btn primary big" id="lSave">Save</button>
    ${id ? '<button class="btn danger big" id="lDel">Remove</button>' : ''}
    <button class="btn big" data-close>Cancel</button>`;
  chips('lType', Object.entries(EVENT).map(([t, x]) => [t, `${x.emoji} ${x.short}`]), e.t, v => { keepLogFields(); e.t = v; renderLogSheet(); });
  chips('lHow', Object.entries(HOW), e.how || 'told', v => { keepLogFields(); e.how = v; renderLogSheet(); });
  chips('lWhere', Object.entries(WHERE), e.where || 'home', v => { keepLogFields(); e.where = v; renderLogSheet(); });
  $('lSave').onclick = saveLog;
  if (id) $('lDel').onclick = () => { removeEvent(id); save(); closeSheets(); redraw(); };
}
// What's typed, kept while the sheet is drawn again.
function keepLogFields() {
  const { e } = logEdit, [h, m] = ($('lTime').value || '00:00').split(':').map(Number), day = $('lDay').value || today();
  const d = parseDay(day);
  d.setHours(h, m);
  e.at = d.getTime();
  e.note = $('lNote').value.trim();
}
function saveLog() {
  keepLogFields();
  const { id, e } = logEdit;
  if (e.at > Date.now() + MIN) { alert("That's in the future."); return; }
  if (!WINS.has(e.t)) delete e.how; else e.how = e.how || 'told';
  if (!e.note) delete e.note;
  const key = id || uid();
  state.log[key] = e;
  reStar(key);
  if (state.timers[e.kid]) state.timers[e.kid] = timerAfter(state.timers[e.kid], e);
  save();
  closeSheets();
  redraw();
}

// ---- Home ----
function goHome() {
  if (!isSetUp()) { openSetup(); return; }
  renderHome();
  show('home');
}
function renderHome() {
  const id = curId(), k = K(), ks = kidList();
  syncPlanTimer(id);
  $('routinesBtn').hidden = !phone || !Android.routinesInstalled();
  const hour = new Date().getHours();
  $('hello').textContent = `${hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}${myName() ? ', ' + myName() : ''}`;
  $('kidChips').innerHTML = ks.length > 1 ? ks.map(x => `<button data-v="${x.id}" class="${x.id === id ? 'on' : ''}">${esc(x.name)}</button>`).join('') : '';
  $('kidChips').onclick = ev => { const b = ev.target.closest('[data-v]'); if (b) { state.priv.cur = b.dataset.v; saveLocal(); renderHome(); } };
  renderStart(k);
  renderTimer();
  $('logGrid').innerHTML = QUICK.map(t => `<button class="logBtn t-${t}" data-q="${t}"><span class="em">${EVENT[t].emoji}</span><span>${quickLabel(t, k)}</span></button>`).join('');
  chips('whereChips', Object.entries(WHERE), state.priv.where || 'home', v => { state.priv.where = v; saveLocal(); renderHome(); });
  renderToday(id);
  renderStarCard(id);
  renderPlanCard(id);
  renderInsightCard(id);
  renderLately();
  renderTools();
  renderShareCard();
}
const quickLabel = (t, k) => esc(quickWords(t, k));
$('logGrid').onclick = e => { const b = e.target.closest('[data-q]'); if (b) quickLog(b.dataset.q); };
// Before an approach is chosen: where to start. Before the start date: the countdown.
function renderStart(k) {
  const t = today();
  if (k.method && k.start && k.start <= t) { $('startCard').innerHTML = ''; return; }
  if (k.method) {
    const n = daysBetween(t, k.start);
    $('startCard').innerHTML = `<div class="card lead"><div class="eyebrow">${METHODS[k.method].emoji} ${esc(METHODS[k.method].name)}</div>
      <h2>Starting ${n === 1 ? 'tomorrow' : `in ${n} days`}</h2><p class="muted">Get ready: the plan has a list.</p><button class="btn big" data-go="plan">Getting ready ›</button></div>`;
    return;
  }
  const r = k.birth ? readiness(state.ready[curId()], ageMonths(k.birth, t)) : null, asked = Object.keys(state.ready[curId()] || {}).length;
  $('startCard').innerHTML = `<div class="card lead"><div class="eyebrow">Getting started</div><h2>Let's plan ${kname(k)}'s potty training</h2>
    <p class="muted">${asked && r ? fill(READY_WORDS[r.level], k) : 'First, a quick look at the signs of readiness, then choose the approach that suits your family. You can log and use the timer any time.'}</p>
    <div class="twoBtn"><button class="btn" data-go="ready">✅ Ready yet?</button><button class="btn primary" data-go="plan">🗺️ Choose an approach</button></div></div>`;
}
// The timer card, drawn each second on home.
const EVERY = [15, 20, 30, 45, 60, 90, 120];
const mmss = ms => { const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return h ? `${h}:${pad2(m)}:${pad2(s % 60)}` : `${m}:${pad2(s % 60)}`; };
function renderTimer() {
  const id = curId(), k = K();
  if (!k) return;
  const t = state.timers[id], now = Date.now(), due = nextTry(t, k, now), w = wordsOf(k), muted = !!state.priv.mute[id];
  const evs = kidEvents(state, id), lastPee = [...evs].reverse().find(e => PEES.has(e.t));
  const sug = suggestEvery(evs, now), every = t?.every || sug?.every || 30;
  const last = lastPee ? `<p class="muted center">Last ${esc(w.pee)} ${ago(lastPee.at)}${lastPee.t === 'wet' ? ' (an accident)' : ''}</p>` : '';
  const everyChips = `<div class="chips small center">${[...new Set([...EVERY, every])].sort((a, b) => a - b).map(n => `<button data-tm="every:${n}" class="${n === every ? 'on' : ''}">${n < 60 ? n + ' min' : n / 60 + ' hr'}${sug && sug.every === n ? ' ✨' : ''}</button>`).join('')}</div>`;
  let html;
  if (!t || !t.on) {
    html = `<div class="eyebrow">Potty timer</div><h2>Off</h2>${last}
      <p class="muted">Try every ${every < 60 ? every + ' minutes' : every / 60 + ' hour' + (every > 60 ? 's' : '')}${sug ? ` (✨ suggested from how often ${kname(k)} goes)` : ''}:</p>${everyChips}
      <button class="btn primary big" data-tm="start">${icon('timer')}Start the timer</button>`;
  } else if (due === null) {
    const paused = t.pause && t.pause > now;
    html = `<div class="eyebrow">Potty timer</div><h2>${paused ? `Paused until ${fmtTime(t.pause)}` : `${kname(k)} is asleep`}</h2>${last}
      <p class="muted">${paused ? 'It starts counting again then.' : `No reminders until ${fmtClock(k.wake || '07:00')}. The first try is on waking.`}</p>
      <div class="twoBtn">${paused ? '<button class="btn primary" data-tm="resume">Resume now</button>' : ''}<button class="btn" data-tm="stop">Turn off</button></div>`;
  } else {
    const left = due - now, frac = Math.max(0, Math.min(1, 1 - left / (t.every * MIN))), r = 52, c = 2 * Math.PI * r;
    html = `<div class="ring2${left <= 0 ? ' due' : ''}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${r}" class="bg"/><circle cx="60" cy="60" r="${r}" class="fg" style="stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${(c * (1 - frac)).toFixed(1)}"/></svg>
      <div class="in">${left > 0 ? `<b>${mmss(left)}</b><small>to the next try</small>` : `<b class="now">${icon('potty')}</b><small>Time to try!${left < -MIN ? ` ${Math.round(-left / MIN)} min over` : ''}</small>`}</div></div>
      ${left <= 0 ? `<p class="center"><b>Say "It's ${esc(w.potty)} time!"</b> and go together.</p>` : ''}${last}
      <p class="muted center">Every ${t.every} min · starts again from each ${esc(w.pee)}, accident or try</p>${everyChips}
      <div class="twoBtn"><button class="btn" data-tm="pause">Pause 1 hr</button><button class="btn" data-tm="stop">Turn off</button></div>`;
  }
  html += phone ? `<label class="check small"><input type="checkbox" data-tm="mute"${muted ? '' : ' checked'}> Remind me on this phone</label>` : '';
  if ($('timerCard').innerHTML !== html) $('timerCard').innerHTML = html;
}
const fmtClock = hm => { const d = new Date(); d.setHours(...hm.split(':').map(Number), 0, 0); return fmtTime(d.getTime()); };
$('timerCard').addEventListener('click', e => {
  const b = e.target.closest('[data-tm]');
  if (!b || b.type === 'checkbox') return;
  const id = curId(), t = state.timers[id], now = Date.now(), [act, n] = b.dataset.tm.split(':');
  if (act === 'start') state.timers[id] = { ...(t || {}), on: true, every: t?.every || Number(n) || suggestEvery(kidEvents(state, id), now)?.every || 30, from: now, pause: 0 };
  else if (act === 'stop') state.timers[id] = { ...t, on: false };
  else if (act === 'pause') state.timers[id] = { ...t, pause: now + 60 * MIN };
  else if (act === 'resume') state.timers[id] = { ...t, pause: 0, from: now };
  else if (act === 'every') state.timers[id] = { ...(t || { on: false, from: now }), every: Number(n) };
  save();
  renderTimer();
});
$('timerCard').addEventListener('change', e => {
  if (e.target.dataset.tm !== 'mute') return;
  if (e.target.checked) delete state.priv.mute[curId()]; else state.priv.mute[curId()] = true;
  saveLocal();
  syncReminders();
});
// The plan's stage sets the timer as it begins (each stage once; the grown-up can change it after).
function syncPlanTimer(id) {
  const k = state.kids[id];
  if (!k || !k.method || !k.start || today() < k.start) return;
  const st = METHODS[k.method].stages[stageIndex(k, today())], t = state.timers[id];
  if (t && t.step === st.id) return;
  const on = st.timer > 0;
  state.timers[id] = { ...(t || {}), step: st.id, on, every: on ? st.timer : t?.every || 60, from: on && !(t && t.on) ? Date.now() : t?.from || Date.now(), pause: 0 };
  save();
}
// While the page is open, a timer that comes due chimes here (the notification is for when it's closed).
const alerted = {};
setInterval(() => {
  if (!isSetUp()) return;
  const now = Date.now();
  for (const k of kidList()) {
    const due = nextTry(state.timers[k.id], k, now);
    if (due === null || now < due || alerted[k.id] === due || state.priv.mute[k.id]) continue;
    alerted[k.id] = due;
    if (now - due > 2 * MIN) continue; // came due while away: home shows it
    chime();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    const w = wordsOf(k);
    toast(`⏰ Time for ${esc(k.name)} to try the ${esc(w.potty)}!`, [{ label: 'Open', fn: () => { state.priv.cur = k.id; saveLocal(); closeSheets(); goHome(); } }]);
  }
}, 5000);

// Today: the counts, and each thing logged, newest first.
function eventRow(id, e, withDay) {
  const x = EVENT[e.t], bits = [withDay ? `${fmtDay(dayOf(e.at))} ` : '', fmtTime(e.at)];
  const sub = [bits.join(''), e.how && HOW[e.how], e.where && e.where !== 'home' && WHERE[e.where], e.by && whoName(e.by)].filter(Boolean).join(' · ');
  return `<button class="next" data-log="${id}"><span class="em">${x.emoji}</span><span><b>${esc(x.label)}${state.stars[e.kid]?.[id] ? ' ' + state.stars[e.kid][id].e : ''}</b>
    <small>${sub}</small>${e.note ? `<small class="noteLine">“${esc(e.note)}”</small>` : ''}</span></button>`;
}
function renderToday(id) {
  const evs = kidEvents(state, id), t = today(), s = dayStats(evs, t), mine = evs.filter(e => dayOf(e.at) === t).reverse(), w = wordsOf(K());
  $('todayCard').innerHTML = `<h2>Today</h2>
    <div class="stats"><div><b>${s.wins}</b><small>in the ${esc(w.potty)}</small></div><div><b>${s.acc}</b><small>accident${s.acc === 1 ? '' : 's'}</small></div><div><b>${s.asked}</b><small>asked to go</small></div></div>
    ${mine.slice(0, 8).map(e => eventRow(e.id, e)).join('') || `<p class="muted">Nothing logged yet today. Tap a button above when ${kname()} goes.</p>`}
    ${mine.length > 8 || evs.length > mine.length ? `<button class="btn" data-go="history">The whole log ›</button>` : ''}`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-log]'); if (b) openLog(b.dataset.log); });
// Stickers toward the prize.
function renderStarCard(id) {
  const k = K(), n = starCount(state, id), goal = k.goal?.n || 10, prize = k.goal?.prize || 'a prize';
  const recent = Object.values(state.stars[id] || {}).sort((a, b) => a.at - b.at).slice(-Math.min(n, goal));
  $('starCard').innerHTML = `<h2>${icon('star')}Stickers</h2>
    ${n >= goal ? `<p class="good">🎁 ${kname(k)} has earned <b>${esc(prize)}</b>!</p><button class="btn primary big" data-prize>Prize given ✓</button>`
      : `<div class="bar"><i style="width:${Math.round(n / goal * 100)}%"></i></div><p class="muted">${n} of ${goal} toward <b>${esc(prize)}</b></p>`}
    <p class="stickRow">${recent.map(s => `<span>${s.e}</span>`).join('')}</p>
    <div class="twoBtn"><button class="btn" data-givestar>⭐ Give a sticker</button><button class="btn" data-go="kidmode">✨ Show ${kname(k)}</button></div>`;
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-prize],[data-givestar]');
  if (!t) return;
  const id = curId(), k = K();
  if ('prize' in t.dataset) {
    (state.prizes[id] ||= {})[uid()] = { at: Date.now(), prize: k.goal?.prize || 'a prize', n: k.goal?.n || 10, by: state.me || '' };
    save();
    party('🎁', true);
  } else {
    const why = prompt(`A sticker for ${k.name}, for… (optional)`, 'trying hard');
    if (why === null) return;
    const e2 = pickSticker();
    (state.stars[id] ||= {})[uid()] = { at: Date.now(), e: e2, by: state.me || '', why: 'hand', note: why.trim().slice(0, 60) };
    save();
    party(e2);
  }
  redraw();
});
// The plan's stage today: its goal, its tasks to tick, and its tip.
function renderPlanCard(id) {
  const k = K(), t = today();
  if (!k.method || !k.start || k.start > t) { $('planCard').hidden = true; return; }
  const m = METHODS[k.method], st = m.stages[stageIndex(k, t)];
  $('planCard').hidden = false;
  $('planCard').innerHTML = `<div class="eyebrow">${m.emoji} ${esc(m.name)}${m.byDay ? ` · day ${planDay(k, t)}` : ''}</div><h2>${fill(st.title, k)}</h2>
    <p class="muted">${fill(st.goal, k)}</p>${stageCount(id, st)}${taskList(id, st.id, st.tasks)}
    <p class="note">💡 ${fill(st.tip, k)}</p><div class="twoBtn"><button class="btn" data-learn="${st.id}">📖 Learn more</button><button class="btn" data-go="plan">The whole plan ›</button></div>`;
}
// The tasks to tick: 'day' ones count for today only, and 'refill' ones until an accident away from home.
const taskList = (kid, stageId, tasks) => {
  const ticks = state.tasks[kid] || {}, evs = kidEvents(state, kid), t = today();
  return `<div class="tasks">${tasks.map(task => {
    const key = `${stageId}.${task[0]}`, on = taskDone(task, ticks[key], evs, t);
    return `<button class="task${on ? ' on' : ''}" data-task="${key}" data-kid="${kid}" data-on="${on ? 1 : ''}"><span class="tick">${on ? icon('check') : ''}</span><span>${fill(task[1], state.kids[kid])}${task[2] === 'day' ? ' <small class="muted">· today</small>' : ''}</span></button>`;
  }).join('')}</div>`;
};
// How the week counts toward the stage's goal, for the stages that have a check.
function stageCount(kid, st) {
  const p = stageProgress(kidEvents(state, kid), state.kids[kid], st, today());
  if (!p) return '';
  const w = wordsOf(state.kids[kid]), what = { sat: 'with a sit', win: `with a ${esc(w.pee)} or ${esc(w.poop)} in the ${esc(w.potty)}`, dry: 'dry' }[st.check.by];
  const days = p.of === 7 ? 'the last 7 days' : `${p.of} day${p.of === 1 ? '' : 's'} so far`;
  return `<p class="stageCount${p.met ? ' met' : ''}">📅 ${p.n} of ${days} ${what}.${p.met ? ' Looks ready for the next step.' : ''}</p>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-task]');
  if (!b) return;
  const kid = b.dataset.kid, key = b.dataset.task, ticks = state.tasks[kid] ||= {};
  if (b.dataset.on) delete ticks[key]; else ticks[key] = { at: Date.now(), by: state.me || '' };
  save();
  redraw();
});
// What the patterns say, and the tip of the day.
function renderInsightCard(id) {
  const ins = insights(kidEvents(state, id), K(), Date.now()).slice(0, 2);
  $('insightCard').hidden = false;
  $('insightCard').innerHTML = `${ins.length ? `<h2>What we're seeing</h2>${ins.map(i => `<p>${i.emoji} ${esc(i.text)}</p>`).join('')}<button class="btn" data-go="progress">Progress ›</button>` : ''}
    <div class="eyebrow tipHead">Today's tip</div><p>${fill(dayTip(today()))}</p>`;
}
// Milestones and prizes this week, for every child.
function renderLately() {
  const news = pottyNews(state, Date.now() - 7 * DAY, Date.now()).slice(0, 6);
  $('latelyCard').hidden = !news.length;
  $('latelyCard').innerHTML = `<h2>Lately</h2>${news.map(n => `<button class="next" data-go="${n.open}"><span class="em">${n.emoji}</span><span><b>${esc(n.text)}</b>
    <small>${fmtDay(dayOf(n.at))}${n.by ? ' · ' + whoName(n.by) : ''}</small></span></button>`).join('')}`;
}
// The menu's tiles.
const TOOLS = [['kidmode', 'Kid mode', 'kidmode'], ['progress', 'Progress', 'progress'], ['plan', 'Plan', 'plan'], ['history', 'Log', 'history'],
  ['stickers', 'Stickers', 'star'], ['nights', 'Naps and nights', 'night'], ['ready', 'Ready yet?', 'ready'], ['learn', 'Learn more', 'learn'], ['guides', 'Guides', 'guides'],
  ['gear', 'What helps', 'gear'], ['handoff', 'Handoff note', 'note']];
function renderTools() {
  $('tools').innerHTML = TOOLS.map(([s, l, ic]) => `<button class="tile" data-go="${s}">${scatter(ic)}<span class="sq">${icon(ic)}</span><span class="lbl">${l}</span></button>`).join('');
}
