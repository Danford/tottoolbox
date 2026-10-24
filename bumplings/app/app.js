// Bumplings page: the pregnancy week by week, checkups, appointments, kicks, contractions, journal, names,
// the hospital bag and when to call. Everything is kept in localStorage under KEY. With family sharing on
// (sync.js) it also goes to the family's sealed copy on the sync server, and the other phone's changes come
// back. `me` (whose phone this is) stays on this phone.
const KEY = 'tot-bump';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const phone = !!window.Android;

// { preg: {due, how, from, embryo, mom, partner, baby, first, rhneg, doc: {name, phone}, hosp: {name, phone},
//   height, prewt, rule: {every, long, hours}, born}, appts: {id: {at, kind, title, where, ask, notes}},
//   checks: {item: day}, bag: {item: true}, own: {id: {list, label}}, kicks: {id: {start, end, n}},
//   contractions: {id: {start, end}}, log: {day: {mood, symptoms, weight, sys, dia, note}},
//   names: {id: {name, votes: {mom, partner}}}, photos: {week: {id, day}}, me: 'mom' | 'partner',
//   priv: {log, photos (as above, kept just on this phone and never shared), hidePhoto (not in Tot Routines),
//     gallery: {shared, priv} (bump photos saved to the phone's gallery by themselves), saved: {id: ms | 0}} }
// The private journal entries and photos (state.priv.log and .photos) and the mood checks (state.moods) are kept
// apart, under PRIV_KEY, locked (vault.js); before 1.10 (the mood checks, 1.10.1) they were in KEY with the rest,
// and they move at the first save.
let state = JSON.parse(localStorage.getItem(KEY) || 'null') || { me: null };
normalizeState(state);
let privMoved = !Object.keys(state.priv.log).length && !Object.keys(state.priv.photos).length && !state.moods;
{
  const { moods, ...priv } = JSON.parse(vault.get(PRIV_KEY) || 'null') || {};
  Object.assign(state.priv, priv);
  if (moods) state.moods = { ...state.moods, ...moods };
}
const hasPriv = () => Object.keys(state.priv.log).length + Object.keys(state.priv.photos).length > 0;
// Every save (here or from the other phone) also tells the app what Tot Routines may show, when that changed:
// the birth plan and the journal's notes and readings don't change it.
function saveLocal() {
  const { log, photos, ...rest } = state.priv, { moods, ...shared } = state;
  if (hasPriv() || moods) vault.set(PRIV_KEY, JSON.stringify({ log, photos, moods }));
  else if (vault.kept(PRIV_KEY)) vault.remove(PRIV_KEY);
  // Moving them out of KEY: only once they're kept (sealed) under PRIV_KEY.
  localStorage.setItem(KEY, JSON.stringify(privMoved ? { ...shared, priv: rest } : state));
  if (!privMoved) vault.flush().then(() => { privMoved = true; saveLocal(); });
  tellFamily();
}
let toldFamily = null;
function tellFamily() {
  if (!phone) return;
  const s = familySummary(state, Date.now());
  // The newest bump photo with its picture loaded, private or shared (Tot Routines is on this phone too), unless
  // Settings says not to.
  const pic = s && !state.priv.hidePhoto && photoList(state).reverse().find(x => pixStore.url(x.id));
  if (pic) s.photo = { week: pic.wk, day: pic.day, url: pixStore.url(pic.id) };
  const json = s ? JSON.stringify(s) : '';
  if (json === toldFamily) return;
  Android.setFamily(json);
  toldFamily = json;
}
const save = () => { saveLocal(); syncSoon(300); syncReminders(); };

const today = () => dayKey(new Date());
const P = () => state.preg;
const me = () => state.me || 'mom';
const other = () => me() === 'mom' ? 'partner' : 'mom';
// When and by whom, on what's added (bumpNews in logic.js tells it in Lately).
const stamp = () => ({ at: Date.now(), by: me() });
const nm = who => esc(P()?.[who] || (who === 'mom' ? 'Mom' : 'Partner'));
const babyNm = () => esc(P()?.baby || 'Baby');
// The other grown-up's name as plain text (chips() escapes it).
// A grown-up's name ('mom' or 'partner'), as HTML.
const whoName = w => esc(w === 'mom' ? (P()?.mom || 'Mom') : (P()?.partner || 'Partner'));
const otherName = () => me() === 'mom' ? (P()?.partner || 'your partner') : (P()?.mom || 'Mom');
const fmtDay = (k, opts = { month: 'short', day: 'numeric' }) => parseDay(k).toLocaleDateString([], opts);
const fmtTime = ms => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const weeksDays = g => `${g.week} week${g.week === 1 ? '' : 's'}${g.day ? `, ${g.day} day${g.day === 1 ? '' : 's'}` : ''}`;

let clock = null; // ticks once a second on the kick, contraction and baby log screens
function show(screen) {
  clearInterval(clock);
  document.body.dataset.screen = screen;
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === screen));
  window.scrollTo(0, 0);
  // The timers keep the screen on: hands are busy in labor, and with a baby.
  keepAwake(['timer', 'kicks', 'babylog'].includes(screen));
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
  if (!number) { alert('Add the number in ⚙️ Settings first.'); return; }
  if (phone) Android.dial(number); else location.href = 'tel:' + number.replace(/[^\d+]/g, '');
}
// Text to send somewhere else (a message, an email, notes): the phone's share sheet, or the clipboard.
async function shareText(title, text) {
  if (phone) { Android.share(title, text); return; }
  if (navigator.share) { try { await navigator.share({ title, text }); } catch (e) { if (e.name !== 'AbortError') throw e; } return; }
  await navigator.clipboard.writeText(text);
  alert('Copied. Paste it into a message or email.');
}

// ---- Setup and settings ----
let pick = {};
const ME = [['mom', "I'm the one who's pregnant"], ['partner', "I'm the partner"]];
const HOW = [['due', 'I know the due date'], ['lmp', 'First day of last period'], ['ivf', 'IVF transfer']];
const FROM_LBL = { due: 'Due date', lmp: 'First day of the last period', ivf: 'Transfer date' };
function chips(id, opts, on, set) {
  $(id).innerHTML = opts.map(([v, l]) => `<button data-v="${v}" class="${v === on ? 'on' : ''}">${esc(l)}</button>`).join('');
  $(id).onclick = e => { const b = e.target.closest('[data-v]'); if (b) set(b.dataset.v); };
}
function openSetup() {
  const p = P() || {};
  pick = { me: state.me, how: p.how || 'due', embryo: p.embryo || 5, gluAfter: p.gluAfter || 1 };
  $('gdm').checked = !!p.gdm;
  $('setupTitle').textContent = p.due ? 'Settings' : 'Welcome to Bumplings';
  $('setupIntro').hidden = $('setupJoin').hidden = !!p.due;
  $('setupTop').hidden = $('setupMore').hidden = !p.due;
  $('momName').value = p.mom || '';
  $('partnerName').value = p.partner || '';
  $('babyName').value = p.baby || '';
  $('from').value = p.from || '';
  $('first').checked = p.first !== false;
  $('rhneg').checked = !!p.rhneg;
  $('docName').value = p.doc?.name || '';
  $('docPhone').value = p.doc?.phone || '';
  $('hospName').value = p.hosp?.name || '';
  $('ldPhone').value = p.hosp?.phone || '';
  $('height').value = p.height || '';
  $('prewt').value = p.prewt || '';
  const r = p.rule || { every: 5, long: 1, hours: 1 };
  $('ruleEvery').value = r.every; $('ruleLong').value = r.long; $('ruleHours').value = r.hours;
  $('setupErr').hidden = true;
  $('bornBtn').textContent = p.born ? `👶 Born ${fmtDay(p.born, { month: 'long', day: 'numeric' })} (tap if that's wrong)` : '👶 The baby is here!';
  $('ver').textContent = phone ? `Bumplings ${Android.version()}`
    : 'Bumplings on the web. Reminders come with the Android app: here, add each appointment to your calendar from 📅 Appointments.';
  renderNotifyRow();
  $('privRow').hidden = !phone;
  if (phone) {
    $('backupOn').checked = Android.backupOn();
    $('routinesPhoto').checked = !state.priv.hidePhoto;
    $('galleryShared').checked = !!state.priv.gallery.shared;
    $('galleryPriv').checked = !!state.priv.gallery.priv;
    renderKeyRow();
  }
  renderSetupChips();
  show('setup');
}
// Settings offers to turn notifications on when they're off: the app asks only once by itself.
const renderNotifyRow = () => { $('notifyRow').hidden = !phone || Android.notifyAllowed(); };
$('notifyBtn').onclick = () => Android.askNotify();
// These two take effect straight away, without Save.
$('backupOn').onchange = e => Android.setBackup(e.target.checked);
$('routinesPhoto').onchange = e => { if (e.target.checked) delete state.priv.hidePhoto; else state.priv.hidePhoto = true; saveLocal(); };
$('galleryShared').onchange = e => galleryAuto('shared', e.target.checked);
$('galleryPriv').onchange = e => galleryAuto('priv', e.target.checked);
function renderSetupChips() {
  chips('me', ME, pick.me, v => { pick.me = v; renderSetupChips(); });
  chips('how', HOW, pick.how, v => { pick.how = v; renderSetupChips(); });
  chips('embryo', [['5', '5-day embryo'], ['3', '3-day embryo']], String(pick.embryo), v => { pick.embryo = Number(v); renderSetupChips(); });
  $('embryo').hidden = pick.how !== 'ivf';
  chips('gluAfter', [['1', 'Checked 1 hour after meals'], ['2', '2 hours after']], String(pick.gluAfter), v => { pick.gluAfter = Number(v); renderSetupChips(); });
  $('gluAfter').hidden = !$('gdm').checked;
  $('fromLbl').textContent = FROM_LBL[pick.how];
  showDue();
}
function showDue() {
  const v = $('from').value;
  $('dueNote').hidden = !v;
  if (!v) return;
  const due = dueFrom(pick.how, v, pick.embryo), g = gestation(due, today());
  $('dueNote').textContent = `Due ${fmtDay(due, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. ` +
    (g.days < 0 ? 'Before the pregnancy began.' : g.days > 44 * 7 ? 'More than 44 weeks ago.' : `Today: ${weeksDays(g)}.`);
}
$('from').oninput = showDue;
$('gdm').onchange = renderSetupChips;
$('saveSetup').onclick = () => {
  const err = m => { $('setupErr').textContent = m; $('setupErr').hidden = false; };
  if (!pick.me) return err("Choose whose phone this is: it decides whose tips you see.");
  const mom = $('momName').value.trim();
  if (!mom) return err("Add the name of the one who's pregnant.");
  if (!$('from').value) return err(`Add the ${FROM_LBL[pick.how].toLowerCase()}.`);
  const due = dueFrom(pick.how, $('from').value, pick.embryo), g = gestation(due, today());
  if (!P()?.born && (g.days < 0 || g.days > 44 * 7)) return err('That date gives a pregnancy that hasn\'t started or ended months ago. Check the date.');
  const num = id => { const n = parseFloat($(id).value); return Number.isFinite(n) && n > 0 ? n : null; };
  state.me = pick.me;
  state.preg = { ...(P() || {}), mom, partner: $('partnerName').value.trim(), baby: $('babyName').value.trim(),
    how: pick.how, from: $('from').value, embryo: pick.how === 'ivf' ? pick.embryo : null, due,
    first: $('first').checked, rhneg: $('rhneg').checked, gdm: $('gdm').checked, gluAfter: pick.gluAfter,
    doc: { name: $('docName').value.trim(), phone: $('docPhone').value.trim() },
    hosp: { name: $('hospName').value.trim(), phone: $('ldPhone').value.trim() },
    height: num('height'), prewt: num('prewt'),
    rule: { every: num('ruleEvery') || 5, long: num('ruleLong') || 1, hours: num('ruleHours') || 1 } };
  save();
  goHome();
};
$('bornBtn').onclick = () => {
  const p = P();
  if (p.born) {
    if (!confirm('Mark the baby as not born yet?')) return;
    delete p.born;
  } else {
    const d = prompt('Congratulations! What day was the baby born? (YYYY-MM-DD)', today());
    if (!d) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(parseDay(d))) { alert('Write the date like ' + today() + '.'); return; }
    p.born = d;
  }
  save();
  goHome();
};

// ---- Home ----
function goHome() { renderHome(); show('home'); }
function renderHome() {
  const p = P(), t = today();
  if (p.born) {
    const age = daysBetween(p.born, t);
    $('hero').innerHTML = `<div class="wk">👶 ${babyNm()} is here!</div><div class="sub">Born ${fmtDay(p.born, { weekday: 'long', month: 'long', day: 'numeric' })} · ${age} day${age === 1 ? '' : 's'} old</div>`;
  } else {
    const g = gestation(p.due, t), left = daysBetween(t, p.due);
    $('hero').innerHTML = `<div class="wk">${weeksDays(g)}</div>
      <div class="sub">Trimester ${trimesterOf(g.days)} · ${left > 0 ? `${left} days to go` : left === 0 ? 'Due today!' : `${-left} days past the due date`}</div>
      <div class="bar"><i style="width:${Math.max(2, Math.min(100, g.days / 2.8))}%"></i></div>
      <div class="ends"><span>${nm('mom')}${p.partner ? ' & ' + nm('partner') : ''}</span><span>Due ${fmtDay(p.due, { month: 'long', day: 'numeric' })}</span></div>`;
  }
  renderLive();
  renderBabyCard();
  renderNext();
  renderLately();
  const items = p.born ? afterFor(p.born) : careFor(p);
  const nowCare = items.filter(c => careStatus(c, t, state.checks) === 'now').length;
  const going = Object.values(state.contractions).some(c => !c.end), feeding = babyNow('feed') || babyNow('sleep');
  const checklist = ['care', '✅', `${p.born ? 'Checkups' : 'Checklist'}${nowCare ? ` (${nowCare})` : ''}`];
  const tools = p.born
    ? [['babylog', '🍼', 'Baby log', feeding ? 'on' : ''], checklist, ['appts', '📅', 'Appointments'],
      ['photos', '📸', 'Photos'], ['journal', '📓', 'Journal'], ['mood', '💛', 'Mood check'],
      ['safe', '🍽️', 'Is it safe?'], ['names', '💕', 'Names'], ['urgent', '🚨', 'When to call', 'hot'],
      ['week', '📖', 'Pregnancy'], ['setup', '⚙️', 'Settings'], ['about', 'ℹ️', 'About']]
    : [['week', '📖', 'Week by week'], checklist, ['appts', '📅', 'Appointments'],
      ['photos', '📸', 'Bump photos'], ['safe', '🍽️', 'Is it safe?'], ['journal', '📓', 'Journal'],
      ['kicks', '👣', 'Kick counter'], ['timer', '⏱', 'Contractions', going ? 'on' : ''], ['plan', '📝', 'Birth plan'],
      ['names', '💕', 'Names'], ['bag', '🎒', 'Hospital bag'], ['mood', '💛', 'Mood check'],
      ['urgent', '🚨', 'When to call', 'hot'], ['setup', '⚙️', 'Settings'], ['about', 'ℹ️', 'About']];
  $('tools').innerHTML = tools.map(([s, e, l, c]) => `<button class="tile ${c || ''}" data-go="${s}"><span class="em">${e}</span>${l}</button>`).join('');
  renderShareCard();
}
// A contraction going on either phone, or the go-in rule met: shown at the top of home.
function renderLive() {
  const going = Object.values(state.contractions).find(c => !c.end);
  const chk = laborCheck(Object.values(state.contractions), Date.now(), P().rule);
  $('liveCard').hidden = !going && !chk.met;
  $('liveCard').className = 'card' + (chk.met ? ' advice' : '');
  $('liveCard').innerHTML = chk.met ? `<b>⏱ Contractions have met your go-in rule.</b> Call now. <button class="link" data-go="timer">Open the timer ›</button>`
    : going ? `<b>⏱ A contraction is going now</b> (started ${fmtTime(going.start)}). <button class="link" data-go="timer">Open the timer ›</button>` : '';
}
function weekParts(w, mine) {
  const x = weekInfo(w), p = P(), f = t => esc(fill(t, p));
  const forMom = `<div class="part"><b class="lbl">${mine && me() === 'mom' ? 'For you' : 'For ' + nm('mom')}</b>${f(x.mom)}</div>`;
  const forPartner = `<div class="part"><b class="lbl">${mine && me() === 'partner' ? 'For you' : 'For ' + (p.partner ? nm('partner') : 'the partner')}</b>${f(x.partner)}</div>`;
  return `<div class="head">${x.size ? `<span class="em">${x.size[0]}</span>` : ''}<div>
      ${x.size ? `<div class="size">The size of ${esc(x.size[1])}</div><div class="muted">${sizeText(x)}</div>` : `<div class="size">Getting started</div>`}</div></div>
    <div class="part"><b class="lbl">${babyNm()}</b>${f(x.baby)}</div>
    <div class="part"><b class="lbl">In the body</b>${f(x.body)}</div>
    ${!mine ? forMom + forPartner : me() === 'mom' ? forMom : forPartner}`;
}
function renderBabyCard() {
  const p = P();
  if (p.born) {
    $('babyCard').innerHTML = `<h2>Today with ${babyNm()}</h2>${babyStats()}
      <button class="btn primary big" data-go="babylog">🍼 Log a feed, diaper or sleep</button>
      <p class="muted">Always put ${babyNm()} to sleep on their back in an empty crib or bassinet, and rest whenever you can. Recovery takes weeks; 🚨 When to call has the warning signs for you both.</p>`;
    return;
  }
  const g = gestation(p.due, today());
  $('babyCard').innerHTML = `<div class="art">${babyArt(g.week)}</div>` + weekParts(g.week, true)
    + `<button class="btn big" data-week="${g.week}">Read all of week ${Math.max(g.week, 1)}</button>`;
}
// What's next: the next appointment, and checklist items open now or opening soon.
function renderNext() {
  const p = P(), t = today(), rows = [];
  const appt = upcomingAppts()[0];
  if (appt) rows.push(`<button class="next" data-go="appts"><span class="em">📅</span><span><b>${esc(appt.title)}</b><small>${apptWhen(appt)}${appt.where ? ' · ' + esc(appt.where) : ''}</small></span></button>`);
  const items = p.born ? afterFor(p.born) : careFor(p);
  for (const c of items) {
    const s = careStatus(c, t, state.checks);
    if (s !== 'now' && s !== 'soon' || c.id === 'covid' || c.id === 'flu') continue;
    rows.push(`<button class="next" data-go="care"><span class="em">${c.emoji}</span><span><b>${esc(c.title)}</b><small>${windowText(c, t)}</small></span></button>`);
    if (rows.length >= 5) break;
  }
  // Mood checks due in the next week, both grown-ups'.
  for (const who of moodPeople(state)) {
    const due = moodDue(state, who, t);
    if (!due || daysBetween(t, due) > 7) continue;
    rows.unshift(`<button class="next" data-go="mood"><span class="em">💛</span><span><b>${who === me() ? 'Your mood check' : `${nm(who)}'s mood check`}</b><small>${esc(moodStatus(who))}</small></span></button>`);
  }
  $('nextCard').innerHTML = `<h2>Coming up</h2>${rows.join('') || '<p class="muted">Nothing due in the next two weeks. Add appointments in 📅 Appointments.</p>'}`;
}
// What's happened in the last week, on both phones (bumpNews): what was added and done, and by whom; all of it
// is a tap away, in History.
const newsRow = (n, when) => `<button class="next" data-go="${n.open}"><span class="em">${n.emoji}</span><span><b>${esc(n.text)}</b>
    <small>${when}${n.by ? (when ? ' · ' : '') + whoName(n.by) : ''}</small></span></button>`;
function renderLately() {
  const all = bumpNews(state, 0), week = Date.now() - 7 * DAY, news = all.filter(n => n.at >= week).slice(0, 8), t = today();
  $('latelyCard').hidden = !all.length;
  const when = n => {
    const k = dayKey(new Date(n.at)), d = daysBetween(k, t);
    if (n.day) return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : fmtDay(k, { weekday: 'short' });
    return `${d === 0 ? '' : d === 1 ? 'Yesterday ' : fmtDay(k, { weekday: 'short' }) + ' '}${fmtTime(n.at)}`;
  };
  $('latelyCard').innerHTML = `<h2>🕒 Lately</h2>${news.map(n => newsRow(n, when(n))).join('') || '<p class="muted">Nothing new this week.</p>'}
    ${all.length > news.length ? `<button class="btn" data-go="history">See everything (${all.length})</button>` : ''}`;
}
// History: everything in Lately from the start, by day.
function openHistory() { renderHistory(); show('history'); }
function renderHistory() {
  const t = today(), days = new Map();
  for (const n of bumpNews(state, 0)) {
    const k = dayKey(new Date(n.at));
    days.set(k, [...(days.get(k) || []), n]);
  }
  $('historyBody').innerHTML = [...days].map(([k, ns]) => {
    const d = daysBetween(k, t);
    const head = d === 0 ? 'Today' : d === 1 ? 'Yesterday' : fmtDay(k, { weekday: 'long', month: 'long', day: 'numeric', ...(k.slice(0, 4) !== t.slice(0, 4) && { year: 'numeric' }) });
    return `<h3>${head}</h3>${ns.map(n => newsRow(n, n.day ? '' : fmtTime(n.at))).join('')}`;
  }).join('') || '<p class="muted">Nothing yet.</p>';
}
function windowText(c, t) {
  const range = c.start === c.end ? fmtDay(c.start) : `${fmtDay(c.start)} – ${fmtDay(c.end)}`;
  const n = daysBetween(t, c.start);
  if (t < c.start) return `Opens in ${n} day${n === 1 ? '' : 's'} · ${range}`;
  return `Now, until ${fmtDay(c.end)}`;
}

// ---- Week by week ----
let viewWeek = 4;
function openWeek(w) { viewWeek = Math.max(MIN_WEEK, Math.min(MAX_WEEK, w)); renderWeek(); show('week'); }
function renderWeek() {
  const p = P(), w = viewWeek, start = weekStart(p.due, w), end = addDays(start, 6);
  const starting = careFor(p).filter(c => c.from === w && c.id !== 'flu' && c.id !== 'covid');
  const shot = photoList(state).find(x => x.wk === w && pixStore.url(x.id)), photo = shot && pixStore.url(shot.id);
  $('weekBody').innerHTML = `<h1>Week ${w}</h1><p class="muted">${fmtDay(start)} – ${fmtDay(end)} · trimester ${trimesterOf(w * 7)}</p>
    <div class="card baby"><div class="art">${babyArt(w)}</div><p class="muted center">An illustration, not an ultrasound.</p>${weekParts(w, false)}</div>
    ${growthCard(w)}
    ${photo ? `<div class="card"><h2>📸 Your bump in week ${w}</h2><img class="bumpPic" src="${photo}" alt="Bump photo, week ${w}"></div>` : ''}
    ${starting.length ? `<div class="card"><h2>Starting this week</h2>${starting.map(c => `<p><b>${c.emoji} ${esc(c.title)}</b><br><span class="muted">${esc(c.what)}</span></p>`).join('')}</div>` : ''}`;
  $('weekPrev').disabled = w <= MIN_WEEK;
  $('weekNext').disabled = w >= MAX_WEEK;
}
// What is forming this week, with the scientific names (growth.js).
function growthCard(w) {
  const g = GROWTH.find(x => x.w === Math.min(w, MAX_WEEK)), p = P();
  if (!g) return '';
  return `<div class="card growth"><h2>🔬 How ${babyNm()} is forming</h2><p class="muted">${esc(g.age)}</p>
    ${g.parts.map(([e, name, text]) => `<p><b>${e} ${esc(name)}</b><br>${esc(fill(text, p))}</p>`).join('')}
    <p class="muted">Timings are averages from embryology references (the Carnegie stages; Moore, The Developing Human). Every baby varies by days to a week or two.</p></div>`;
}
$('weekPrev').onclick = () => { viewWeek--; renderWeek(); window.scrollTo(0, 0); };
$('weekNext').onclick = () => { viewWeek++; renderWeek(); window.scrollTo(0, 0); };

// Navigation: [data-go] buttons open a screen, [data-week] a week, [data-back] goes home, [data-close] a sheet.
const OPEN = { setup: openSetup, week: () => openWeek(P().born ? 40 : gestation(P().due, today()).week), care: openCare, appts: openAppts,
  kicks: openKicks, timer: openTimer, journal: openJournal, names: openNames, bag: openBag, urgent: openUrgent, about: openAbout, home: goHome,
  photos: openPhotos, safe: openSafe, plan: openPlan, mood: openMood, babylog: openBabyLog, history: openHistory };
document.addEventListener('click', e => {
  const t = e.target.closest('[data-go],[data-week],[data-back],[data-close]');
  if (!t) return;
  if (t.dataset.go) { closeSheets(); OPEN[t.dataset.go](); }
  else if (t.dataset.week) openWeek(Number(t.dataset.week));
  else if ('back' in t.dataset) goBack();
  else closeSheets();
});
const closeSheets = () => { scanStop(); document.querySelectorAll('.sheet.open').forEach(s => s.classList.remove('open')); };

// ---- Checklist ----
let careTab = 'now';
const CARE_TABS = [['now', 'Now and next'], ['all', 'Everything'], ['done', 'Done']];
function openCare() { renderCare(); show('care'); }
function renderCare() {
  const p = P(), t = today();
  chips('careTabs', CARE_TABS, careTab, v => { careTab = v; renderCare(); });
  const items = (p.born ? afterFor(p.born) : careFor(p)).map(c => ({ ...c, status: careStatus(c, t, state.checks) }))
    .sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
  // Now and next shows a window that has passed only for 4 weeks, and never an optional one: it's a nudge
  // to ask about it, not a list of everything set up too late for.
  const recentMiss = c => c.status === 'missed' && !c.optional && daysBetween(c.end, t) <= 28;
  const shown = items.filter(c => careTab === 'all' || (careTab === 'done' ? c.status === 'done' : ['now', 'soon'].includes(c.status) || recentMiss(c)));
  const TAG = { now: '<span class="tag now">now</span>', missed: '<span class="tag missed">window passed</span>', soon: '<span class="tag">soon</span>' };
  $('careList').innerHTML = `<div class="card">${shown.map(c => `<div class="item${c.status === 'done' ? ' done' : ''}">
      <button class="tick" data-check="${c.id}" aria-label="Done">${c.status === 'done' ? '✓' : ''}</button>
      <div><div class="t">${c.emoji} ${esc(c.title)}${c.optional ? ' <span class="tag">optional</span>' : ''}${TAG[c.status] || ''}</div>
      <div class="when">${c.from !== undefined ? `<b>Weeks ${c.from === c.to ? c.from : c.from + '–' + c.to}</b> · ` : ''}${c.start === c.end ? fmtDay(c.start) : fmtDay(c.start) + ' – ' + fmtDay(c.end)}${c.status === 'done' ? ` · done ${fmtDay(state.checks[c.id])}` : ''}</div>
      <div class="what">${esc(c.what)}</div></div></div>`).join('') || `<p class="muted">${careTab === 'done' ? 'Nothing ticked yet.' : 'Nothing right now. See Everything for what\'s ahead.'}</p>`}</div>`;
}
$('careList').onclick = e => {
  const b = e.target.closest('[data-check]');
  if (!b) return;
  const id = b.dataset.check;
  if (state.checks[id]) { delete state.checks[id]; delete state.ticks[id]; } else { state.checks[id] = today(); state.ticks[id] = stamp(); }
  save();
  renderCare();
};

// ---- Appointments ----
const KINDS = [['checkup', '🩺 Checkup'], ['scan', '🖥️ Ultrasound'], ['test', '🧪 Test'], ['class', '🎓 Class'], ['other', '📌 Other']];
const apptWhen = a => new Date(a.at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const apptList = () => Object.entries(state.appts).map(([id, a]) => ({ id, ...a })).filter(a => a.at);
const upcomingAppts = () => apptList().filter(a => new Date(a.at).getTime() > Date.now() - 3600e3).sort((a, b) => a.at < b.at ? -1 : 1);
function openAppts() { renderAppts(); show('appts'); }
function renderAppts() {
  const up = upcomingAppts(), upIds = new Set(up.map(a => a.id));
  const past = apptList().filter(a => !upIds.has(a.id)).sort((a, b) => a.at < b.at ? 1 : -1);
  const row = a => `<button class="card appt${upIds.has(a.id) ? '' : ' past'}" data-appt="${a.id}"><div class="d">${esc(a.title)}</div>
    <div class="muted">${apptWhen(a)}${a.where ? ' · ' + esc(a.where) : ''}</div>
    ${a.ask ? `<div class="muted">❓ ${esc(a.ask.split('\n')[0])}${a.ask.includes('\n') ? '…' : ''}</div>` : ''}
    ${a.notes ? `<div class="muted">📝 ${esc(a.notes.split('\n')[0])}${a.notes.includes('\n') ? '…' : ''}</div>` : ''}</button>`;
  $('apptList').innerHTML = (up.length ? '<h3>Coming up</h3>' + up.map(row).join('') : '<p class="muted" style="margin-top:14px">No appointments coming up.</p>')
    + (past.length ? '<h3>Past</h3>' + past.map(row).join('') : '');
}
$('apptList').onclick = e => { const b = e.target.closest('[data-appt]'); if (b) openAppt(b.dataset.appt); };
$('addAppt').onclick = () => openAppt(null);
let apptKind = 'checkup';
function openAppt(id) {
  const a = id ? state.appts[id] : { at: '', kind: 'checkup', title: '', where: P()?.doc?.name || '', ask: '', notes: '' };
  apptKind = a.kind || 'other';
  $('apptBody').innerHTML = `<h2>${id ? 'Appointment' : 'New appointment'}</h2>
    <div class="chips" id="apptKind"></div>
    <label class="field">What <input type="text" id="aTitle" maxlength="50" value="${esc(a.title)}" placeholder="e.g. 20-week anatomy scan"></label>
    <div class="row2"><label class="field">Day <input type="date" id="aDay" value="${esc(a.at.slice(0, 10))}"></label>
    <label class="field">Time <input type="time" id="aTime" value="${esc(a.at.slice(11, 16))}"></label></div>
    <label class="field">Where <input type="text" id="aWhere" maxlength="60" value="${esc(a.where || '')}"></label>
    <label class="field">Questions to ask <textarea id="aAsk" placeholder="One per line">${esc(a.ask || '')}</textarea></label>
    <label class="field">Notes afterwards <textarea id="aNotes" placeholder="What they said, blood pressure, weight, heartbeat, next steps">${esc(a.notes || '')}</textarea></label>
    <p class="advice" id="aErr" hidden></p>
    <div class="twoBtn"><button class="btn" data-close>Cancel</button><button class="btn primary" id="aSave">Save</button></div>
    ${id ? '<button class="btn big" id="aCal">📅 Add to my calendar</button><button class="btn danger big" id="aDel">Delete this appointment</button>' : ''}`;
  const kinds = () => chips('apptKind', KINDS, apptKind, v => { apptKind = v; kinds(); });
  kinds();
  $('aSave').onclick = () => {
    const day = $('aDay').value, time = $('aTime').value;
    if (!day || !time) { $('aErr').textContent = 'Add the day and time.'; $('aErr').hidden = false; return; }
    const title = $('aTitle').value.trim() || KINDS.find(k => k[0] === apptKind)[1].slice(3);
    state.appts[id || uid()] = { at: `${day}T${time}`, kind: apptKind, title, where: $('aWhere').value.trim(), ask: $('aAsk').value.trim(), notes: $('aNotes').value.trim(),
      ...(id ? a.added ? { added: a.added } : {} : { added: stamp() }) };
    save();
    closeSheets();
    renderAppts();
  };
  if (id) {
    $('aDel').onclick = () => { if (!confirm('Delete this appointment?')) return; delete state.appts[id]; save(); closeSheets(); renderAppts(); };
    $('aCal').onclick = () => addToCalendar(id, state.appts[id]);
  }
  $('apptSheet').classList.add('open');
}

// The phone's calendar app, filled in; in a browser, a calendar file (an iPhone offers to add it).
function addToCalendar(id, a) {
  const desc = [a.ask && 'Questions to ask:\n' + a.ask, a.notes && 'Notes:\n' + a.notes].filter(Boolean).join('\n\n');
  const start = new Date(a.at).getTime();
  if (phone) { Android.addToCalendar(a.title, start, start + 3600e3, a.where || '', desc); return; }
  const url = URL.createObjectURL(new Blob([apptIcs(a, id, Date.now())], { type: 'text/calendar' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: 'appointment.ics' });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60e3);
}

// ---- Kick counter ----
// A session counts movements until 10 (or it's stopped). Most babies get to 10 well within two hours.
const KICK_GOAL = 10;
const kickNow = () => Object.entries(state.kicks).find(([, k]) => !k.end);
// The clock updates in place each second; redrawing the button instead could swallow a tap.
function openKicks() {
  renderKicks();
  show('kicks');
  clock = setInterval(() => { const k = kickNow(); if (k && $('kickTap')) $('kickTap').querySelector('small').textContent = mmss(Date.now() - k[1].start); }, 1000);
}
function renderKicks() {
  const cur = kickNow(), g = P()?.born ? null : (P()?.due ? gestation(P().due, today()) : null);
  const past = Object.values(state.kicks).filter(k => k.end).sort((a, b) => b.start - a.start).slice(0, 14);
  $('kickBody').innerHTML = `${g && g.week < 28 ? `<p class="note">Kick counts usually start at 28 weeks. Before then, movements come and go and are easy to miss.</p>` : ''}
    <p class="muted">Pick a time ${babyNm()} is usually active (often after a meal, lying on your side). Tap each movement: kicks, rolls, swishes and jabs all count. Hiccups don't.</p>
    <button class="bigBtn${cur ? ' going' : ''}" id="kickTap">${cur ? `<span class="n">${cur[1].n}</span>tap for each one<br><small>${mmss(Date.now() - cur[1].start)}</small>` : 'Start<br>counting'}</button>
    ${cur ? '<button class="btn big" id="kickStop">Stop this count</button>' : ''}
    <div class="card"><b>Call your provider</b> if there aren't 10 movements in 2 hours, or ${babyNm()} is moving less than usual, even before 2 hours. Don't wait until tomorrow. What matters most is what's normal for your baby.</div>
    ${past.length ? `<h3>Recent counts</h3><table class="rows"><tr><th>When</th><th>Moves</th><th>Took</th></tr>${past.map(k =>
      `<tr><td>${fmtDay(dayKey(new Date(k.start)), { weekday: 'short', month: 'short', day: 'numeric' })} ${fmtTime(k.start)}</td><td>${k.n}</td><td>${mmss(k.end - k.start)}</td></tr>`).join('')}</table>` : ''}`;
  $('kickTap').onclick = () => {
    const c = kickNow();
    if (!c) { state.kicks[uid()] = { start: Date.now(), end: null, n: 0, by: me() }; save(); renderKicks(); return; }
    c[1].n++;
    if (c[1].n >= KICK_GOAL) { c[1].end = Date.now(); alert(`${KICK_GOAL} movements in ${mmss(c[1].end - c[1].start)}. 💕`); }
    save();
    renderKicks();
  };
  if (cur) $('kickStop').onclick = () => {
    const c = kickNow();
    if (!c) return;
    if (c[1].n === 0) delete state.kicks[c[0]]; else c[1].end = Date.now();
    save();
    renderKicks();
  };
}

// ---- Contraction timer ----
// Tap when one starts, tap when it ends. Either phone can time, and the other sees it as it happens.
const going = () => Object.entries(state.contractions).find(([, c]) => !c.end);
function openTimer() { renderTimer(); show('timer'); clock = setInterval(renderTimerLive, 1000); }
function renderTimerLive() {
  const g = going();
  if (g && $('ctTap')) $('ctTap').querySelector('small').textContent = mmss(Date.now() - g[1].start);
}
function renderTimer() {
  const p = P(), cur = going(), list = Object.values(state.contractions), rows = contractionRows(list);
  const rule = p.rule || { every: 5, long: 1, hours: 1 }, chk = laborCheck(list, Date.now(), rule);
  const g = p.born ? null : gestation(p.due, today());
  const lastHour = rows.filter(r => r.start > Date.now() - 3600e3).length;
  const preterm = g && g.days < 37 * 7 && lastHour >= 4;
  const calls = `<div class="callRow">${p.hosp?.phone ? `<button class="btn call" data-call="ld">📞 Labor & delivery</button>` : ''}
    ${p.doc?.phone ? `<button class="btn call" data-call="doc">📞 ${esc(p.doc.name || 'Doctor')}</button>` : ''}
    ${!p.hosp?.phone && !p.doc?.phone ? '<button class="btn" data-go="setup">Add phone numbers in Settings</button>' : ''}</div>`;
  $('timerBody').innerHTML = `
    ${chk.met ? `<div class="advice"><b>Your go-in rule is met:</b> about every ${mmss(chk.apart)}, lasting ${mmss(chk.long)}, for ${chk.minutes} minutes. Call now.${calls}</div>` : ''}
    ${preterm ? `<div class="advice"><b>${lastHour} contractions in the last hour, before 37 weeks.</b> Call your provider or labor and delivery now: it could be preterm labor.${calls}</div>` : ''}
    <button class="bigBtn${cur ? ' going' : ''}" id="ctTap">${cur ? 'Tap when<br>it ends<br><small>' + mmss(Date.now() - cur[1].start) + '</small>' : 'Tap when<br>one starts<small></small>'}</button>
    <div class="stats"><div><b>${rows[0] ? mmss(rows[0].long) : '–'}</b><small>last one lasted</small></div>
      <div><b>${rows[0]?.apart ? mmss(rows[0].apart) : '–'}</b><small>apart (start to start)</small></div>
      <div><b>${lastHour}</b><small>in the last hour</small></div></div>
    <p class="muted">Your rule: every ${rule.every} minutes, ${rule.long} minute${rule.long === 1 ? '' : 's'} long, for ${rule.hours} hour${rule.hours === 1 ? '' : 's'} (change it in ⚙️ Settings).
      ${p.first === false ? 'Later babies often come faster: many providers want you in sooner.' : ''}
      Go in straight away, whatever the timing, if the water breaks, there's bleeding, the baby moves less, or the pain is constant.</p>
    ${!chk.met && !preterm ? calls : ''}
    ${rows.length ? `<h3>Timed</h3><table class="rows"><tr><th>Started</th><th>Lasted</th><th>Apart</th><th></th></tr>${rows.slice(0, 20).map(r =>
      `<tr><td>${fmtTime(r.start)}</td><td>${mmss(r.long)}</td><td>${r.apart ? mmss(r.apart) : ''}</td><td><button class="link" data-ctdel="${idOf(r)}" aria-label="Remove">✕</button></td></tr>`).join('')}</table>
      <button class="btn danger big" id="ctClear">Clear all</button>` : ''}`;
  $('ctTap').onclick = () => {
    const c = going();
    if (c) c[1].end = Date.now(); else state.contractions[uid()] = { start: Date.now(), end: null, by: me() };
    save();
    renderTimer();
  };
  if (rows.length) $('ctClear').onclick = () => { if (!confirm('Clear every timed contraction?')) return; state.contractions = {}; save(); renderTimer(); };
}
const idOf = r => Object.keys(state.contractions).find(k => state.contractions[k].start === r.start);
$('timerBody').addEventListener('click', e => {
  const d = e.target.closest('[data-ctdel]'), c = e.target.closest('[data-call]');
  if (d) { delete state.contractions[d.dataset.ctdel]; save(); renderTimer(); }
  if (c) call(c.dataset.call === 'ld' ? P()?.hosp?.phone : P()?.doc?.phone);
});

// ---- Journal ----
const BP_NOTE = {
  severe: '🚨 This blood pressure is in the severe range (160/110 or higher). Call your provider or labor and delivery now, or 911 with a headache, vision changes or chest pain.',
  high: '⚠️ This blood pressure is high for pregnancy (140/90 or higher). Rest 15 minutes and measure again; if it\'s still high, call your provider today.',
};
function openJournal() { renderJournal(); show('journal'); }
function renderJournal() {
  const p = P(), all = journalEntries(state);
  const withWt = all.find(e => e.l.weight);
  let gain = '';
  if (p.height && p.prewt && withWt && !p.born) {
    const bmi = bmiOf(p.height, p.prewt), band = gainBand(bmi), w = gestation(p.due, withWt.day).week;
    const [lo, hi] = gainRange(bmi, Math.max(0, w)), got = Math.round((withWt.l.weight - p.prewt) * 10) / 10;
    gain = `<div class="card"><h2>Weight gain</h2><p><b>${got >= 0 ? '+' : ''}${got} lb</b> at ${w} weeks. The usual range by then is about <b>${lo}–${hi} lb</b>
      (for a starting BMI of ${bmi.toFixed(1)}, ${band.name}: ${band.total[0]}–${band.total[1]} lb in all).</p>
      <p class="muted">A guide, not a target to hit exactly. Your provider may suggest something different.</p></div>`;
  } else if (!p.born) gain = `<p class="muted">Add height and weight before pregnancy in ⚙️ Settings to see weight gain against the usual range.</p>`;
  if (p.gdm) {
    const week = all.filter(e => daysBetween(e.day, today()) < 7), got = [], high = [];
    for (const e of week) for (const [m] of MEALS) { const v = e.l.glu?.[m]; if (v) { got.push(v); if (glucoseLevel(m, v, p.gluAfter) === 'high') high.push(v); } }
    gain += `<div class="card"><h2>🩸 Blood sugar this week</h2><p>${got.length ? `<b>${got.length - high.length} of ${got.length}</b> readings on target${high.length ? `, <b>${high.length}</b> high` : ''}.` : 'No readings yet: add them with + Today.'}</p>
      <p class="muted">Targets (ACOG): fasting under ${GLUCOSE.fast}, and under ${GLUCOSE[p.gluAfter || 1]} ${p.gluAfter === 2 ? 'two hours' : 'one hour'} after meals, in mg/dL. Your provider may give you different ones. Tell them if several readings are high in a week.</p></div>`;
  }
  $('gainCard').innerHTML = gain;
  const week = all.filter(e => daysBetween(e.day, today()) < 7).length, mine = all.filter(e => e.priv).length;
  $('logCount').textContent = all.length ? `${all.length} entr${all.length === 1 ? 'y' : 'ies'}, ${week} in the last 7 days${mine ? ` · 🔒 ${mine} just on this phone` : ''}` : '';
  $('logList').innerHTML = all.length ? `<div class="card">${all.map(({ day: d, l, priv }) => {
    const bp = bpLevel(l.sys, l.dia);
    const sugar = MEALS.filter(([m]) => l.glu?.[m]).map(([m, n]) => `${n[0]} ${l.glu[m]}${glucoseLevel(m, l.glu[m], p.gluAfter || 1) === 'high' ? '⚠️' : ''}`);
    const bits = [l.weight && `${l.weight} lb`, l.sys && `BP ${l.sys}/${l.dia}${bp !== 'ok' ? ' ⚠️' : ''}`, sugar.length && 'Sugar ' + sugar.join(', '), ...(l.symptoms || [])].filter(Boolean);
    return `<button class="logRow" data-log="${d}"${priv ? ' data-priv' : ''}><span class="em">${esc(l.mood || '📝')}</span><span><b>${fmtDay(d, { weekday: 'short', month: 'short', day: 'numeric' })}</b>
      <span class="muted">${p.born ? '' : ' · week ' + gestation(p.due, d).week}${priv ? ' · 🔒 just me' : ''}</span><br><span class="muted">${esc(bits.join(' · '))}</span>
      ${l.note ? `<br>${esc(l.note)}` : ''}</span></button>`;
  }).join('')}</div>` : '';
}
$('logList').onclick = e => { const b = e.target.closest('[data-log]'); if (b) openLog(b.dataset.log, 'priv' in b.dataset); };
// + Today opens today's entry (the private one if there are both), or a new one, shared like the last one saved.
$('addLog').onclick = () => openLog(today(), state.priv.log[today()] ? true : state.log[today()] ? false : !!state.priv.logPriv);
// The journal entry for `day`, private (kept in state.priv.log, never shared) or shared (state.log).
const logMap = priv => priv ? state.priv.log : state.log;
function openLog(day, priv) {
  const l = logMap(priv)[day] || {}, sym = new Set(l.symptoms || []);
  // How you felt: in a shared entry the other grown-up wrote, theirs is theirs (state.feels keeps each one's).
  const mine = state.feels[`${day}.${me()}`];
  let mood = priv || !l.by || l.by === me() ? l.mood || '' : mine ? mine.mood : '', keep = priv;
  $('logBody').innerHTML = `<h2>${fmtDay(day, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
    <h3>Who sees it</h3><div class="chips" id="lWho"></div><p class="muted" id="lWhoNote"></p>
    <h3>Feeling</h3><div class="chips" id="lMood"></div>
    <h3>Symptoms</h3><div class="chips" id="lSym"></div>
    <div class="row3"><label class="field">Weight (lb) <input type="number" id="lWt" step="0.1" inputmode="decimal" value="${l.weight || ''}"></label>
    <label class="field">BP top <input type="number" id="lSys" inputmode="numeric" value="${l.sys || ''}"></label>
    <label class="field">BP bottom <input type="number" id="lDia" inputmode="numeric" value="${l.dia || ''}"></label></div>
    <p class="advice" id="lBp" hidden></p>
    ${P().gdm ? `<h3>Blood sugar (mg/dL)</h3><div class="row4">${MEALS.map(([m, n]) => `<label class="field">${n} <input type="number" data-glu="${m}" inputmode="numeric" value="${l.glu?.[m] || ''}"></label>`).join('')}</div>
      <p class="muted">${MEALS.slice(1).map(([, n]) => n).join(', ')}: ${P().gluAfter === 2 ? 'two hours' : 'one hour'} after eating.</p>` : ''}
    <label class="field">Notes <textarea id="lNote">${esc(l.note || '')}</textarea></label>
    <div class="twoBtn"><button class="btn" data-close>Cancel</button><button class="btn primary" id="lSave">Save</button></div>
    ${logMap(priv)[day] ? '<button class="btn danger big" id="lDel">Delete this day</button>' : ''}`;
  const draw = () => {
    chips('lWho', [['shared', `👥 Shared with ${otherName()}`], ['priv', '🔒 Just me']], keep ? 'priv' : 'shared', v => { keep = v === 'priv'; draw(); });
    $('lWhoNote').textContent = keep ? 'Kept only on this phone, never sent anywhere.'
      : syncOn() ? 'On both phones, locked like everything else you share.' : 'Goes to the other phone once you share with it.';
    chips('lMood', MOODS.map(([e, t]) => [e, `${e} ${t}`]), mood, v => { mood = mood === v ? '' : v; draw(); });
    $('lSym').innerHTML = SYMPTOMS.map(s => `<button data-v="${esc(s)}" class="${sym.has(s) ? 'on' : ''}">${esc(s)}</button>`).join('');
  };
  $('lSym').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; const s = b.dataset.v; if (sym.has(s)) sym.delete(s); else sym.add(s); draw(); };
  draw();
  const num = id => { const n = parseFloat($(id).value); return Number.isFinite(n) && n > 0 ? n : null; };
  const bpShow = () => { const lv = bpLevel(num('lSys'), num('lDia')); $('lBp').hidden = !BP_NOTE[lv]; $('lBp').textContent = BP_NOTE[lv] || ''; return lv; };
  $('lSys').oninput = $('lDia').oninput = bpShow;
  $('lSave').onclick = () => {
    const entry = { mood, symptoms: [...sym], weight: num('lWt'), sys: num('lSys'), dia: num('lDia'), note: $('lNote').value.trim(), ...stamp() };
    const glu = {};
    document.querySelectorAll('[data-glu]').forEach(i => { const n = parseFloat(i.value); if (Number.isFinite(n) && n > 0) glu[i.dataset.glu] = n; });
    if (Object.keys(glu).length) entry.glu = glu;
    if (!entry.sys !== !entry.dia) { $('lBp').textContent = 'Add both blood pressure numbers, like 118 over 76.'; $('lBp').hidden = false; return; }
    // Moving it between private and shared: the day may already have an entry on the other side.
    if (keep !== priv && logMap(keep)[day] && !confirm(`There's already ${keep ? 'a private' : 'a shared'} entry for this day. Replace it with this one?`)) return;
    if (keep !== priv) delete logMap(priv)[day];
    logMap(keep)[day] = entry;
    // Each grown-up's feeling that day, for Tot Routines' family page; a private one stays on this phone.
    if (!keep && mood) state.feels[`${day}.${me()}`] = { mood, at: entry.at };
    else delete state.feels[`${day}.${me()}`];
    state.priv.logPriv = keep;
    save();
    closeSheets();
    renderJournal();
    const lv = bpLevel(entry.sys, entry.dia);
    if (BP_NOTE[lv]) alert(BP_NOTE[lv]);
  };
  if (logMap(priv)[day]) $('lDel').onclick = () => { if (!confirm('Delete this day?')) return; delete logMap(priv)[day]; delete state.feels[`${day}.${me()}`]; save(); closeSheets(); renderJournal(); };
  $('logSheet').classList.add('open');
}

// ---- Names ----
function openNames() { renderNames(); show('names'); }
function renderNames() {
  const rows = nameList(state.names), them = other(), themNm = them === 'mom' ? nm('mom') : (P()?.partner ? nm('partner') : 'Partner');
  const vote = v => v === 1 ? '❤️' : v === -1 ? '👎' : 'hasn\'t voted';
  $('nameList').innerHTML = rows.length ? `<div class="card">${rows.map(n => `<div class="name${n.both ? ' both' : ''}">
      <div><b>${esc(n.name)}</b><small>${n.both ? '💕 You both love it' : `${themNm}: ${vote(n.votes[them])}`}</small></div>
      <div class="votes"><button data-vote="${n.id}" data-v="1" class="${n.votes[me()] === 1 ? 'on' : ''}" aria-label="Love it">❤️</button>
      <button data-vote="${n.id}" data-v="-1" class="${n.votes[me()] === -1 ? 'on' : ''}" aria-label="Not for us">👎</button>
      <button data-delname="${n.id}" aria-label="Remove">✕</button></div></div>`).join('')}</div>` : '<p class="muted">No names yet.</p>';
}
$('addName').onclick = () => {
  const name = $('newName').value.trim();
  if (!name) { $('newName').focus(); return; }
  if (Object.values(state.names).some(n => n.name.toLowerCase() === name.toLowerCase())) { alert(`${name} is already on the list.`); return; }
  state.names[uid()] = { name, votes: { [me()]: 1 }, added: stamp() };
  $('newName').value = '';
  save();
  renderNames();
};
$('newName').onkeydown = e => { if (e.key === 'Enter') $('addName').click(); };
$('nameList').onclick = e => {
  const v = e.target.closest('[data-vote]'), d = e.target.closest('[data-delname]');
  if (v) {
    const n = state.names[v.dataset.vote], val = Number(v.dataset.v);
    if (n.votes[me()] === val) delete n.votes[me()]; else n.votes[me()] = val;
  } else if (d) {
    if (!confirm(`Take ${state.names[d.dataset.delname].name} off the list?`)) return;
    delete state.names[d.dataset.delname];
  } else return;
  save();
  renderNames();
};

// ---- Hospital bag ----
function openBag() { renderBag(); show('bag'); }
function renderBag() {
  const own = Object.entries(state.own).map(([id, o]) => ({ id, ...o, own: true }));
  $('bagList').innerHTML = BAG_LISTS.map(([list, title]) => {
    const items = [...BAG.filter(b => b.list === list), ...own.filter(o => o.list === list)];
    const n = items.filter(b => state.bag[b.id]).length;
    return `<div class="card"><h2>${title} <span class="muted">${n} of ${items.length}</span></h2>
      ${items.map(b => `<label class="check"><input type="checkbox" data-bag="${b.id}"${state.bag[b.id] ? ' checked' : ''}> <span style="flex:1">${esc(b.label)}</span>${b.own ? `<button class="link" data-delown="${b.id}">✕</button>` : ''}</label>`).join('')}
      <div class="addRow"><input type="text" maxlength="50" placeholder="Add something" data-ownin="${list}"><button class="btn" data-ownadd="${list}">Add</button></div></div>`;
  }).join('');
}
$('bagList').onchange = e => {
  const id = e.target.dataset.bag;
  if (!id) return;
  if (e.target.checked) state.bag[id] = stamp(); else delete state.bag[id];
  save();
  renderBag();
};
$('bagList').onclick = e => {
  const a = e.target.closest('[data-ownadd]'), d = e.target.closest('[data-delown]');
  if (a) {
    const input = document.querySelector(`[data-ownin="${a.dataset.ownadd}"]`), label = input.value.trim();
    if (!label) { input.focus(); return; }
    state.own['own-' + uid()] = { list: a.dataset.ownadd, label };
  } else if (d) {
    e.preventDefault();
    delete state.own[d.dataset.delown];
    delete state.bag[d.dataset.delown];
  } else return;
  save();
  renderBag();
};

// ---- When to call ----
function openUrgent() {
  const p = P(), li = xs => `<ul class="real">${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  $('urgentBody').innerHTML = `<div class="callRow"><button class="btn call" data-dial="911">📞 911</button>
      ${p.hosp?.phone ? `<button class="btn call" data-dial="${esc(p.hosp.phone)}">📞 Labor & delivery</button>` : ''}
      ${p.doc?.phone ? `<button class="btn call" data-dial="${esc(p.doc.phone)}">📞 ${esc(p.doc.name || 'Doctor')}</button>` : ''}</div>
    ${!p.hosp?.phone || !p.doc?.phone ? '<p class="muted">Add your doctor\'s and labor and delivery\'s numbers in <button class="link" data-go="setup">⚙️ Settings</button> for one-tap calls.</p>' : ''}
    ${p.born ? `<div class="card advice"><h2>👶 ${babyNm()}: call 911</h2>${li(WARN_BABY.now)}</div>
      <div class="card"><h2>👶 ${babyNm()}: call the pediatrician right away</h2>${li(WARN_BABY.call)}<p class="muted">From the American Academy of Pediatrics. Their after-hours line is there for exactly this.</p></div>
      <h3>For ${nm('mom')}</h3>` : ''}
    <div class="card advice"><h2>Call 911</h2>${li(WARN.now)}</div>
    <div class="card"><h2>Call your provider right away</h2><p class="muted">Day or night, during pregnancy and for a year after. Say "I'm pregnant" (or "I had a baby on …") first.</p>${li(WARN.call)}</div>
    <div class="card"><h2>Before 37 weeks: signs of preterm labor</h2>${li(WARN.preterm)}<p class="muted">Call if you have any of these.</p></div>
    <div class="card"><h2>Labor: when to go in</h2>${li(WARN.labor)}<p class="muted">Use ⏱ Contractions to time them. Your provider's rule comes first.</p></div>
    <div class="card"><h2>After the birth</h2>${li(WARN.after)}</div>
    <p class="muted">From the CDC's Hear Her campaign and ACOG. ${esc(ASK_DOCTOR)}</p>`;
  show('urgent');
}
$('urgentBody').addEventListener('click', e => { const b = e.target.closest('[data-dial]'); if (b) call(b.dataset.dial); });

// ---- Bump photos ----
// One photo a week. The picture is kept in pixStore; state.priv.photos and state.photos say which week has which.
// A new photo is private, kept just on this phone (state.priv.photos); shared ones (state.photos) are on both
// phones. A week can have one of each, when the other phone shares one for a week this phone kept private.
let photoPick = null; // {wk, priv}: the week a photo being picked is for, and whether it's private
const curWeek = () => !P()?.due ? MIN_WEEK : Math.max(MIN_WEEK, Math.min(MAX_WEEK, gestation(P().due, today()).week));
const photoMap = priv => priv ? state.priv.photos : state.photos;
// A new photo for week `wk` replaces the private one, else the shared one; with neither, it's private.
const privFor = wk => !!state.priv.photos[wk] || !state.photos[wk];
function openPhotos() { renderPhotos(); show('photos'); }
function renderPhotos() {
  const p = P(), shots = photoList(state), w = curWeek(), has = wk => shots.some(x => x.wk === wk);
  const pic = x => pixStore.url(x.id);
  const first = shots[0], last = shots.at(-1), mine = shots.filter(x => x.priv).length;
  const fig = x => `<figure>${pic(x) ? `<img src="${pic(x)}" alt="Week ${x.wk}">` : '<div class="coming">⏳</div>'}<figcaption>Week ${x.wk}</figcaption></figure>`;
  $('photosBody').innerHTML = `
    ${p.born ? '' : `<button class="btn primary big" data-take="${w}">📸 ${has(w) ? 'Retake' : 'Take'} this week's photo (week ${w})</button>`}
    <p class="muted">Same spot, same pose, same time of day each week, and side-on, for the best before and after.
      New photos are 🔒 just on this phone; tap one to share it with ${esc(otherName())}${syncOn() ? '' : ' once you share with the other phone'}.</p>
    ${shots.length ? `<p class="muted">${shots.length} photo${shots.length === 1 ? '' : 's'}${mine ? ` · 🔒 ${mine} just on this phone` : ''}${shots.length > mine ? ` · 👥 ${shots.length - mine} shared` : ''}</p>` : ''}
    ${shots.length > 1 ? `<div class="card"><h2>Then and now</h2><div class="pair">${fig(first)}${fig(last)}</div>
        <button class="btn big" id="picPlay">▶ Play them all</button></div>` : ''}
    <div class="grid">${shots.map(x => `<button class="thumb" data-pic="${x.wk}"${x.priv ? ' data-priv' : ''}>${pic(x) ? `<img src="${pic(x)}" alt="Week ${x.wk}">` : '<div class="coming">⏳<small>on its way</small></div>'}<span>Week ${x.wk}${x.priv ? ' 🔒' : ''}</span></button>`).join('')}</div>
    ${shots.length ? '' : '<p class="muted center">No photos yet.</p>'}
    ${p.born ? '' : `<label class="field">Add a photo for another week <select id="picWeek">${Array.from({ length: MAX_WEEK - MIN_WEEK + 1 }, (_, i) => MIN_WEEK + i).filter(x => x <= w)
      .map(x => `<option value="${x}"${x === w ? ' selected' : ''}>Week ${x}${has(x) ? ' (replace)' : ''}</option>`).join('')}</select></label>
      <button class="btn big" id="picOther">Choose a photo for that week</button>`}`;
  if ($('picPlay')) $('picPlay').onclick = playPhotos;
  if ($('picOther')) $('picOther').onclick = () => { const wk = Number($('picWeek').value); pickPhoto(wk, privFor(wk)); };
}
$('photosBody').addEventListener('click', e => {
  const t = e.target.closest('[data-take]'), b = e.target.closest('[data-pic]');
  if (t) { const wk = Number(t.dataset.take); pickPhoto(wk, privFor(wk)); }
  else if (b) openPhotoSheet(Number(b.dataset.pic), 'priv' in b.dataset);
});
function openPhotoSheet(wk, priv) {
  const id = photoMap(priv)[wk].id, url = pixStore.url(id), them = esc(otherName()), inGallery = phone && !!state.priv.saved[id];
  $('picBody').innerHTML = `<h2>Week ${wk}</h2>${url ? `<img class="bumpPic" src="${url}" alt="Week ${wk}">` : '<p class="muted">This photo is still on its way from the other phone.</p>'}
    <p class="muted">${priv ? '🔒 Just on this phone.' : `👥 Shared with ${them}${syncOn() ? '' : ' once you share with the other phone'}.`}</p>
    <button class="btn big" id="picMove">${priv ? `👥 Share with ${them}` : '🔒 Keep just on this phone'}</button>
    ${url ? `<button class="btn big" id="picSave"${inGallery ? ' disabled' : ''}>${inGallery ? '✓ In your gallery' : phone ? '⬇ Save to phone' : '⬇ Download'}</button>` : ''}
    <div class="twoBtn"><button class="btn" data-close>Close</button><button class="btn primary" id="picNew">Replace</button></div>
    <button class="btn danger big" id="picDel">Delete this photo</button>`;
  $('picNew').onclick = () => { closeSheets(); pickPhoto(wk, priv); };
  if ($('picSave')) $('picSave').onclick = () => {
    if (phone && !Android.galleryAllowed()) { alert('Allow Bumplings to save to your gallery, then tap Save again.'); return; }
    try { toGallery({ wk, id }); } catch (e) { alert(e.message); return; }
    if (phone) { $('picSave').disabled = true; $('picSave').textContent = '✓ In your gallery'; }
    if (priv) lockWarn();
  };
  $('picMove').onclick = async () => {
    const to = photoMap(!priv), old = to[wk];
    if (old && !confirm(`There's already a ${priv ? 'shared' : 'private'} week ${wk} photo. Replace it with this one?`)) return;
    if (!priv && !old && syncOn() && !confirm(`Keep this photo just on this phone? It comes off ${otherName()}'s phone.`)) return;
    to[wk] = photoMap(priv)[wk];
    delete photoMap(priv)[wk];
    save();
    if (old) await pixStore.del(old.id);
    await pixStore.reseal(new Set(privPhotoIds(state))); // locked now, or not
    closeSheets();
    renderPhotos();
    autoGallery(); // now shared, or now private: saved if that kind is
    if (!priv) privateSaved();
  };
  $('picDel').onclick = async () => {
    if (!confirm(`Delete the week ${wk} photo${!priv && syncOn() ? ' from both phones' : ''}?`)) return;
    const id = photoMap(priv)[wk].id;
    delete photoMap(priv)[wk];
    save();
    await pixStore.del(id);
    closeSheets();
    renderPhotos();
  };
  $('picSheet').classList.add('open');
}
function pickPhoto(wk, priv) {
  photoPick = { wk, priv };
  $('photoIn').value = '';
  $('photoIn').click();
}
$('photoIn').onchange = async () => {
  const f = $('photoIn').files[0], pk = photoPick;
  if (!f || !pk) return;
  let data;
  try { data = await shrinkPhoto(f); } catch (e) { alert("That photo couldn't be opened (" + e.message + ')'); return; }
  const map = photoMap(pk.priv), id = uid(), old = map[pk.wk]?.id;
  await pixStore.put(id, data, pk.priv);
  map[pk.wk] = { id, day: today(), ...stamp() };
  save();
  if (old) await pixStore.del(old);
  renderPhotos();
  autoGallery();
  if (pk.priv) privateSaved();
};

// A phone without a screen lock doesn't lock away what's kept on it: Android's encryption of the app's data,
// and of its Google backup, is locked by the screen lock. So as a 🔒 private photo is saved (here, to the
// gallery, or by turning on saving them there by themselves), that's said, with Android's screen-lock screen
// a tap away.
function lockWarn() {
  if (!phone || Android.screenLocked()) return;
  if (confirm("This phone has no screen lock, so what's on it isn't locked away: anyone who picks it up can see your 🔒 private bump photos, and its Google backup isn't encrypted with a lock only you know. Set a screen lock now?")) Android.setScreenLock();
}

// ---- The lock on what's private (vault.js) ----
// In the app, the private journal entries and photos are always locked, with a key only this phone has. On a
// new phone, an invite from the other phone opens them while sharing, and a backup key opens them always, but
// there's none until the grown-up makes one. Without one, they're lost with this phone (or with both, while
// sharing, or when sharing stops), so while there's something private and no backup key, saving a private
// photo says so, with a backup key a tap away; so does stopping sharing.
function backupWarn(then = () => {}) {
  if (!vault.on || vault.hasBackup || !hasPriv()) { then(); return; }
  const msg = vault.forFamily
    ? `Your 🔒 private photos and entries are locked with a key only this phone has. On a new phone, only an invite from ${otherName()}'s phone can unlock them, so if both phones are lost, or you stop sharing, they're gone. Make a backup key to keep somewhere safe?`
    : "Your 🔒 private photos and entries are locked with a key only this phone has, and there's no backup key, so if this phone is lost or reset, they're gone. Make a backup key to keep somewhere safe?";
  if (confirm(msg)) makeBackup(then); else then();
}
// A private photo was just saved here: first the backup key, then the screen lock.
const privateSaved = () => backupWarn(lockWarn);
async function makeBackup(then = () => {}) {
  if (vault.hasBackup && !confirm('Make a new backup key? The one you kept stops working.')) return;
  showBackup(await vault.newBackup(), then);
}
// The backup key, once: it isn't kept anywhere it could be shown again.
function showBackup(words, then) {
  $('keyBody').innerHTML = `<h2>🔑 Your backup key</h2>
    <div class="backupKey">${esc(words)}</div>
    <p class="muted">Write it down, or keep it in a password manager: somewhere other than this phone. On a new phone, it unlocks your 🔒 private photos and entries${syncOn() ? `, even without ${esc(otherName())}'s phone` : ''}. It isn't shown again; you can make a new one in ⚙️ Settings.</p>
    <button class="btn big" id="keyCopy">Copy it</button>
    <label class="check"><input type="checkbox" id="keyKept"> I've kept it somewhere safe</label>
    <button class="btn primary big" id="keyDone" disabled>Done</button>`;
  $('keyCopy').onclick = () => navigator.clipboard.writeText(words).then(() => { $('keyCopy').textContent = '✓ Copied'; },
    () => alert("It couldn't be copied here: write it down instead."));
  $('keyKept').onchange = e => { $('keyDone').disabled = !e.target.checked; };
  $('keyDone').onclick = () => { $('keySheet').classList.remove('open'); renderKeyRow(); then(); };
  $('keySheet').classList.add('open');
}
// Settings says how they're locked, and makes a backup key.
function renderKeyRow() {
  $('keyRow').hidden = !vault.on;
  if (!vault.on) return;
  const them = otherName();
  $('keyWords').textContent = `🔒 Your private photos and entries are locked with a key only this phone has, so its backup can't be read without ${
    vault.hasBackup ? (vault.forFamily ? `your backup key or an invite from ${them}'s phone` : 'your backup key')
    : vault.forFamily ? `an invite from ${them}'s phone. With no backup key, they're gone if both phones are lost, or if you stop sharing`
    : "a backup key, and you haven't made one: if this phone is lost or reset, they're gone"}.`;
  $('keyBtn').textContent = vault.hasBackup ? '🔑 Make a new backup key' : '🔑 Make a backup key';
}
$('keyBtn').onclick = () => makeBackup();
// The lock is made the first time the app starts with it (1.10), once the pictures are read: what's private
// already is locked then, and the private photos' pictures with it.
async function lockSetup() {
  if (!vault.here) return;
  await pixStore.ready;
  if (!vault.on) { await vault.enable(syncOn() ? syncInfo.secret : null); saveLocal(); }
  await pixStore.reseal(new Set(privPhotoIds(state)));
}

// ---- Into the phone's gallery ----
// A bump photo goes into the phone's gallery (its "Bumplings" album) with a tap on Save in its sheet, or by
// itself as it's taken here or comes from the other phone: shared ones and 🔒 private ones each only when
// Settings says so (state.priv.gallery, both off at first). state.priv.saved keeps which are there already
// (when), and with 0 those left out when saving by itself was turned on. In a browser, Save downloads it.
function toGallery({ wk, id }) {
  const data = pixStore.url(id), name = `Bumplings-week${wk}-${id}.jpg`;
  if (!data) throw new Error('That photo is still on its way from the other phone.');
  if (!phone) { const a = document.createElement('a'); a.href = data; a.download = name; a.click(); return; }
  Android.saveToGallery(name, data.slice(data.indexOf(',') + 1));
  state.priv.saved[id] = Date.now();
  saveLocal();
}
// Saved by themselves: said once a run if it goes wrong, not at every one.
let galleryTold = false;
function autoGallery() {
  if (!phone) return;
  const due = galleryDue(state, id => !!pixStore.url(id));
  if (!due.length || !Android.galleryAllowed()) return;
  for (const x of due) {
    try { toGallery(x); } catch (e) {
      console.error('saving to the gallery:', e.message);
      if (!galleryTold) { galleryTold = true; alert("Some bump photos couldn't be saved to your gallery: " + e.message); }
      return;
    }
  }
}
// Settings' two "save by themselves" switches. Turned on, it offers to save the ones already here too.
function galleryAuto(kind, on) {
  if (!on) { delete state.priv.gallery[kind]; saveLocal(); return; }
  state.priv.gallery[kind] = true;
  const past = galleryDue(state, () => true).filter(x => x.priv === (kind === 'priv'));
  if (past.length && !confirm(`Save the ${past.length === 1 ? `one ${kind === 'priv' ? '🔒 private' : 'shared'} bump photo` : `${past.length} ${kind === 'priv' ? '🔒 private' : 'shared'} bump photos`} already in Bumplings too?`)) {
    for (const x of past) state.priv.saved[x.id] = 0;
  }
  saveLocal();
  autoGallery();
  if (kind === 'priv') lockWarn();
}
// Every photo on this phone in order, a second each, over the whole screen. A tap (or Back) stops it.
let playing = null; // the slideshow's next-photo timer
function playPhotos() {
  const shots = photoList(state).map(x => [x.wk, pixStore.url(x.id)]).filter(([, u]) => u);
  if (!shots.length) { alert('The photos are still on their way from the other phone.'); return; }
  stopPhotos();
  let i = 0;
  const box = $('player');
  const step = () => {
    const [wk, url] = shots[i];
    box.innerHTML = `<img src="${url}" alt="Week ${wk}"><div class="lbl">Week ${wk}</div>`;
    i = (i + 1) % shots.length;
    playing = setTimeout(step, i === 0 ? 2500 : 900);
  };
  box.classList.add('open');
  step();
}
function stopPhotos() {
  clearTimeout(playing);
  playing = null;
  $('player').classList.remove('open');
}
$('player').onclick = stopPhotos;

// ---- Is it safe? ----
let safeCat = null;
function openSafe() { $('safeQ').value = ''; safeCat = null; renderSafe(); show('safe'); }
function renderSafe() {
  chips('safeCats', [['', 'All'], ...SAFE_CATS], safeCat || '', v => { safeCat = v || null; renderSafe(); });
  const hits = safeSearch($('safeQ').value, safeCat);
  $('safeList').innerHTML = hits.length ? hits.map(s => `<div class="card safe ${s.v}"><div class="t"><b>${esc(s.q)}</b><span class="verdict">${SAFE_V[s.v]}</span></div><p>${esc(s.a)}</p></div>`).join('')
    : `<p class="muted">Nothing on the list for that. Ask your provider or pharmacist, or MotherToBaby (free, 1-866-626-6847, mothertobaby.org).</p>`;
}
$('safeQ').oninput = renderSafe;

// ---- Birth plan ----
function openPlan() { renderPlan(); show('plan'); }
function renderPlan() {
  $('planBody').innerHTML = PLAN.map(s => {
    const v = state.plan[s.id] || {}, on = new Set(v.pick || []);
    return `<div class="card"><h2>${esc(s.title)}</h2>
      ${s.opts.length ? `<div class="chips multi">${s.opts.map(o => `<button data-plan="${s.id}" data-opt="${esc(o)}" class="${on.has(o) ? 'on' : ''}">${esc(o)}</button>`).join('')}</div>` : ''}
      <label class="field">${s.opts.length ? 'Anything to add' : 'Medical conditions, religious or cultural wishes, past experiences, language, anything the team should know'}
        <textarea data-plannote="${s.id}" maxlength="600">${esc(v.note || '')}</textarea></label></div>`;
  }).join('');
}
$('planBody').addEventListener('click', e => {
  const b = e.target.closest('[data-plan]');
  if (!b) return;
  const s = state.plan[b.dataset.plan] || (state.plan[b.dataset.plan] = { pick: [], note: '' }), o = b.dataset.opt;
  // Kept in the list's own order, so both phones print the same thing.
  const on = new Set(s.pick || []);
  if (on.has(o)) on.delete(o); else on.add(o);
  s.pick = PLAN.find(x => x.id === b.dataset.plan).opts.filter(x => on.has(x));
  Object.assign(s, stamp());
  save();
  b.classList.toggle('on', on.has(o));
});
$('planBody').addEventListener('change', e => {
  const id = e.target.dataset.plannote;
  if (!id) return;
  const s = state.plan[id] || (state.plan[id] = { pick: [], note: '' });
  s.note = e.target.value.trim();
  Object.assign(s, stamp());
  save();
});
$('planShare').onclick = () => shareText('Birth preferences', planText(state.plan, P()));
$('planPrint').onclick = () => {
  $('printOut').textContent = planText(state.plan, P());
  if (phone) Android.print('Birth preferences'); else window.print();
};

// ---- Mood check ----
// The Edinburgh scale, answered on this phone, by this phone's grown-up or the other one. The answers and scores
// stay on this phone: the other phone hears only the day it was done (state.checkins), so both phones know when
// each grown-up's next one is due (moodDue), and Tot Routines here sees only how this phone's grown-up's latest
// went (moodSummary).
let moodAns = [], moodWho = null;
function openMood() { moodAns = []; moodWho = me(); renderMood(); show('mood'); }
// "Due now · last one Sep 20", "Next one Oct 18", "None yet": when `who`'s mood checks are at.
function moodStatus(who) {
  const day = lastCheck(state, who), due = moodDue(state, who, today()), at = lastCheckAt(state, who);
  const last = day && fmtDay(day) + (at ? ', ' + fmtTime(at) : '');
  if (!due) return last ? `Last one ${last}` : '';
  if (due <= today()) return last ? `Due now · last one ${last}` : 'None yet: due now';
  return `Next one ${fmtDay(due)} · last one ${last}`;
}
// Mood checks from before 1.11 are this phone's grown-up's, and the other phone hasn't heard of them: it does
// once, without an `at`, as when in the day isn't known (Lately has it on its day).
function checkinsFromBefore() {
  const last = moodChecks(state).find(m => m.who === me());
  if (!last || (lastCheck(state, me()) || '') >= last.day) return false;
  state.checkins[me()] = { day: last.day };
  return true;
}
function renderMood(result) {
  const mine = moodChecks(state);
  if (result) {
    const r = result;
    $('moodBody').innerHTML = `${r.harm ? `<div class="card advice"><h2>Please talk to someone today</h2><p>You said thoughts of harming yourself have come up. You're not alone, and it can get better with help.
        Call or text <b>988</b> (Suicide & Crisis Lifeline) or the <b>National Maternal Mental Health Hotline, 1-833-852-6262</b>, any time. If you might act on it, call 911.</p>
        <div class="callRow"><button class="btn call" data-dial="988">📞 988</button><button class="btn call" data-dial="18338526262">📞 Maternal hotline</button></div></div>` : ''}
      <div class="card ${r.level === 'low' ? 'good' : 'advice'}"><h2>Score: ${r.score} of 30</h2>
      <p>${r.level === 'likely' ? 'A score of 13 or more means depression is likely. It is common, it is not your fault, and it is very treatable. Call your provider this week and tell them your score.'
        : r.level === 'possible' ? 'A score of 10 to 12 can mean depression. Mention it to your provider, and do this check again in two weeks.'
        : 'A low score. Check in again in a few weeks, or any time you feel off: moods can change, especially in the months after the birth.'}</p></div>
      <p class="muted">This is the Edinburgh Postnatal Depression Scale, a screening used by doctors in pregnancy and after, for partners too. It isn't a diagnosis. The National Maternal Mental Health Hotline (1-833-852-6262, call or text) is free and confidential, any time.</p>
      <button class="btn big" id="moodAgain">Done</button>`;
    $('moodAgain').onclick = () => openMood();
    return;
  }
  const people = moodPeople(state), two = people.length > 1;
  $('moodBody').innerHTML = `<div class="card"><h2>Both of you</h2>${people.map(w => `<div class="row"><span>${whoName(w)}</span><span class="muted">${esc(moodStatus(w))}</span></div>`).join('')}
      <p class="muted">Every 4 weeks, every 2 for the first months after the birth, and 2 weeks after one that isn't low. ${phone ? 'A reminder comes when one is due.' : ''}</p></div>
    ${two ? `<h3>Who's answering?</h3><div class="chips" id="moodWhoChips"></div>` : ''}
    <p class="muted">Ten questions about how ${moodWho === me() ? 'you have' : esc(otherName()) + ' has'} felt <b>in the past 7 days</b>, not just today. The answers stay on this phone; ${syncOn() ? `${esc(otherName())}'s phone hears only the day it was done.` : 'only the day it was done goes to the other phone, once you share.'}${phone && moodWho === me() ? ' Tot Routines on this phone shows only a gentle note on how your latest check went, never the answers or the score.' : ''}</p>
    ${EPDS.map(([q, opts], i) => `<div class="card"><b>${i + 1}. ${esc(q)}</b><div class="opts">${opts.map((o, j) => `<button data-q="${i}" data-a="${j}" class="${moodAns[i] === j ? 'on' : ''}">${esc(o)}</button>`).join('')}</div></div>`).join('')}
    <p class="advice" id="moodErr" hidden></p>
    <button class="btn primary big" id="moodDone">See the score</button>
    ${mine.length ? `<h3>Earlier checks on this phone</h3><div class="card">${mine.map(m => `<div class="row"><span>${fmtDay(m.day, { month: 'short', day: 'numeric', year: 'numeric' })}${two ? ' · ' + whoName(m.who) : ''}</span><b>${m.score}</b></div>`).join('')}</div>` : ''}`;
  if (two) chips('moodWhoChips', people.map(w => [w, w === me() ? 'Me' : otherName()]), moodWho, v => { moodWho = v; renderMood(); });
  $('moodDone').onclick = () => {
    const missing = EPDS.findIndex((_, i) => moodAns[i] === undefined);
    if (missing >= 0) { $('moodErr').textContent = `Answer question ${missing + 1} too.`; $('moodErr').hidden = false; return; }
    const r = epdsResult(moodAns), day = today();
    state.moods = state.moods || {};
    // One a day each: today's replaces one done earlier today (from before 1.11, under just the day).
    if (moodWho === me()) delete state.moods[day];
    state.moods[`${day}.${moodWho}`] = { score: r.score, harm: r.harm, day, who: moodWho };
    state.checkins[moodWho] = { day, at: Date.now() };
    save();
    renderMood(r);
    window.scrollTo(0, 0);
  };
}
$('moodBody').addEventListener('click', e => {
  const b = e.target.closest('[data-q]'), d = e.target.closest('[data-dial]');
  if (d) { call(d.dataset.dial); return; }
  if (!b) return;
  moodAns[Number(b.dataset.q)] = Number(b.dataset.a);
  b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
});

// ---- Baby log ----
// Feeds, diapers and sleep, on both phones: whoever is up with the baby logs it.
const babyEntries = () => Object.entries(state.babylog).map(([id, e]) => ({ id, ...e }));
const babyNow = t => babyEntries().find(e => e.t === t && !e.end && t !== 'diaper');
const SIDE = { L: 'Left', R: 'Right', bottle: 'Bottle' }, side = k => SIDE[k].toLowerCase();
function babyStats() {
  const p = P(), s = babySummary(babyEntries(), Date.now()), day = dayOfLife(p.born, today()), wets = wetsExpected(day);
  const last = s.last ? `${s.last.side === 'bottle' ? '🍼 Bottle' : '🤱 ' + SIDE[s.last.side]} ${Date.now() - s.last.at < 60e3 ? 'just now' : hhmm(Date.now() - s.last.at) + ' ago'}${s.last.oz ? ` · ${s.last.oz} oz` : ''}` : 'No feeds logged yet';
  return `<div class="stats"><div><b>${s.feeds}</b><small>feeds (8–12 usual)</small></div>
      <div><b>${s.wet}</b><small>wet (${wets}+ by day ${day})</small></div><div><b>${s.dirty}</b><small>dirty</small></div></div>
    <p><b>Last feed:</b> ${last}${s.nextSide ? ` · start on the <b>${side(s.nextSide)}</b>` : ''}<br><span class="muted">In the last 24 hours, with ${hhmm(s.sleepMs)} of sleep logged. Day ${day} of life.</span></p>`;
}
function openBabyLog() {
  renderBabyLog();
  show('babylog');
  clock = setInterval(() => { const g = babyNow('feed') || babyNow('sleep'); if (g && $('babyClock')) $('babyClock').textContent = mmss(Date.now() - g.at); }, 1000);
}
function renderBabyLog() {
  const feed = babyNow('feed'), sleep = babyNow('sleep');
  const today0 = parseDay(today()).getTime();
  const list = babyEntries().filter(e => e.at >= today0 - DAY).sort((a, b) => b.at - a.at);
  const what = e => e.t === 'feed' ? (e.side === 'bottle' ? `🍼 Bottle${e.oz ? ` ${e.oz} oz` : ''}` : `🤱 ${SIDE[e.side]}${e.end ? ` ${hhmm(e.end - e.at)}` : ' (going)'}`)
    : e.t === 'diaper' ? `${e.wet ? '💧' : ''}${e.dirty ? '💩' : ''} ${e.wet && e.dirty ? 'Wet and dirty' : e.wet ? 'Wet' : 'Dirty'}`
    : `😴 Sleep${e.end ? ` ${hhmm(e.end - e.at)}` : ' (going)'}`;
  $('babyBody').innerHTML = `<div class="card">${babyStats()}</div>
    ${feed ? `<button class="bigBtn going" data-baby="stop" data-id="${feed.id}">Feeding<br>${side(feed.side)}<br><small id="babyClock">${mmss(Date.now() - feed.at)}</small></button>
      <p class="center muted">Tap to stop. ${feed.side !== 'bottle' ? `<button class="link" data-baby="switch" data-id="${feed.id}">Switch to the ${side(feed.side === 'L' ? 'R' : 'L')} side</button>` : ''}</p>`
    : sleep ? `<button class="bigBtn going" data-baby="stop" data-id="${sleep.id}">Sleeping<br><small id="babyClock">${mmss(Date.now() - sleep.at)}</small></button><p class="center muted">Tap when ${babyNm()} wakes up.</p>`
    : `<h3>Feed</h3><div class="btnRow"><button class="btn" data-baby="L">🤱 Left</button><button class="btn" data-baby="R">🤱 Right</button><button class="btn" data-baby="bottle">🍼 Bottle</button></div>`}
    <h3>Diaper</h3><div class="btnRow"><button class="btn" data-baby="wet">💧 Wet</button><button class="btn" data-baby="dirty">💩 Dirty</button><button class="btn" data-baby="both">💧💩 Both</button></div>
    ${!feed && !sleep ? `<h3>Sleep</h3><div class="btnRow"><button class="btn" data-baby="sleep">😴 Fell asleep</button></div>` : ''}
    <p class="muted">Call the pediatrician if there are fewer wet diapers than expected, the baby is too sleepy to feed, or anything in 🚨 When to call.</p>
    ${list.length ? `<h3>Today and yesterday</h3><table class="rows">${list.map(e => `<tr><td>${fmtTime(e.at)}</td><td>${what(e)}</td><td><button class="link" data-babydel="${e.id}" aria-label="Remove">✕</button></td></tr>`).join('')}</table>` : ''}`;
}
$('babyBody').addEventListener('click', e => {
  const b = e.target.closest('[data-baby]'), d = e.target.closest('[data-babydel]');
  if (d) { if (!confirm('Remove this entry?')) return; delete state.babylog[d.dataset.babydel]; save(); renderBabyLog(); return; }
  if (!b) return;
  const a = b.dataset.baby, now = Date.now(), log = state.babylog;
  if (a === 'stop') log[b.dataset.id].end = now;
  else if (a === 'switch') { const f = log[b.dataset.id]; f.end = now; log[uid()] = { t: 'feed', at: now, end: null, side: f.side === 'L' ? 'R' : 'L' }; }
  else if (a === 'L' || a === 'R') log[uid()] = { t: 'feed', at: now, end: null, side: a };
  else if (a === 'bottle') {
    const oz = prompt('How many ounces? (Leave empty if you don\'t know.)', '');
    if (oz === null) return;
    const n = parseFloat(oz);
    log[uid()] = { t: 'feed', at: now, end: now, side: 'bottle', oz: Number.isFinite(n) && n > 0 ? n : null };
  } else if (a === 'sleep') log[uid()] = { t: 'sleep', at: now, end: null };
  else log[uid()] = { t: 'diaper', at: now, wet: a !== 'dirty', dirty: a !== 'wet' };
  save();
  renderBabyLog();
});

function openAbout() {
  $('doctor').textContent = ASK_DOCTOR;
  $('sources').innerHTML = SOURCES.map(s => `<li>${esc(s)}</li>`).join('');
  show('about');
}

// ---- Reminders ----
// The app keeps its own copy of reminderList() and sets the alarms; send it whenever anything changes.
function syncReminders() {
  if (!phone) return;
  // Not sharing, this is the only phone that can remind the other grown-up of their mood check.
  Android.setReminders(JSON.stringify(reminderList(state, me(), Date.now(), !syncOn())));
}
// A notification was tapped: its screen.
window.openFromReminder = screen => {
  if (!P() || !Object.hasOwn(OPEN, screen)) return;
  closeSheets();
  OPEN[screen]();
};
// Notifications were allowed or refused, or the grown-up is back from the phone's Settings.
window.permsChanged = () => { if (document.body.dataset.screen === 'setup') renderNotifyRow(); };

// ---- Sharing with the other grown-up ----
let shareCode = null, shareBusy = false, shareErr = '';
// The app checks for the other phone's news while it's closed (Watch.java): it needs the family's secret, how
// far this phone has synced, and words for the notification. Off ('') when sharing stops or the server lost
// the family.
function syncWatch(info) {
  // While sharing, the family's secret also unlocks what's private here on a new phone (vault.js); when
  // sharing stops, it doesn't, so a backup key is offered.
  vault.family(info ? info.secret : null).then(() => { if (!info) backupWarn(); })
    .catch(e => console.error("the lock couldn't follow the family:", e.message));
  if (!phone) return;
  const names = {};
  for (const [id, n] of Object.entries(state.names)) if (n.name) names[id] = n.name;
  Android.setWatch(info && info.error !== 'unknown' ? JSON.stringify({ secret: info.secret, rev: info.rev, other: otherName(),
    born: !!P()?.born, names }) : '');
}
// After a sync: the other phone's changes are in `state` when `remote`; show them.
function syncChanged(remote) {
  tellFamily(); // a photo's picture may have just arrived
  autoGallery();
  if (remote) {
    syncReminders();
    const s = document.body.dataset.screen;
    if (!P()) { if (s !== 'setup') openSetup(); }
    else if (s === 'setup' && $('shareSheet').classList.contains('open') && !$('setupJoin').hidden) { closeSheets(); openSetup(); }
    else if (s === 'home') renderHome();
    else if (s === 'care') renderCare();
    else if (s === 'appts') renderAppts();
    else if (s === 'kicks') renderKicks();
    else if (s === 'timer') renderTimer();
    else if (s === 'journal') renderJournal();
    else if (s === 'names') renderNames();
    else if (s === 'bag') renderBag();
    else if (s === 'photos') renderPhotos();
    else if (s === 'babylog') renderBabyLog();
    else if (s === 'week') renderWeek();
    // The plan isn't redrawn while it's open: it would lose what's being typed. It's fresh next time.
    // Pictures the other phone replaced or deleted go.
    pixStore.prune(new Set([...photoIds(state), ...privPhotoIds(state)])).catch(e => console.error('pruning photos', e));
  }
  renderShareCard();
  if ($('shareSheet').classList.contains('open')) renderShare();
}
const syncedAt = () => syncInfo && syncInfo.at ? new Date(syncInfo.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
function renderShareCard() {
  $('shareCard').innerHTML = !syncOn() ? '👪 Share with the other phone'
    : syncInfo.error ? `👪 Sharing: not synced (${syncInfo.error === 'offline' ? 'offline' : syncInfo.error === 'unknown' ? 'paused' : 'trying again'})`
    : `👪 Sharing is on${syncedAt() ? ' · synced ' + syncedAt() : ''}`;
}
function qrSvg(text) {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 6, margin: 4, scalable: true, alt: 'Invite QR code' });
}
function renderShare() {
  if (scanning) {
    $('shareBody').innerHTML = `
      <h2>📷 Scan the invite</h2>
      <p class="muted">On the other phone, open Bumplings, tap 👪 Share with the other phone, then Invite. Point this phone's camera at the QR code it shows.</p>
      <div class="scan" id="scanBox"></div>
      <p class="advice" id="scanNote" hidden></p>
      <button class="btn big" id="scanCancel">Cancel</button>`;
    $('scanBox').append(scanVideo);
    scanVideo.play().catch(() => {});
    $('scanCancel').onclick = () => { scanStop(); renderShare(); };
    return;
  }
  const code = shareCode ? `<div class="card code"><p class="muted">On the other phone, open Bumplings, tap 📷 Scan the invite, and point it at this code.</p>
      <div class="qr">${qrSvg(shareCode)}</div><p class="muted">Works once, for the next 15 minutes. Anyone who scans it joins, so show it only to the other grown-up.</p></div>` : '';
  const privacy = `<p class="muted">🔒 Everything is locked on your phones before it's sent. The server keeps only the locked copy, and only your two phones have the key, so no one else can read it, Tot Toolbox included.</p>`;
  const err = shareErr ? `<p class="advice">${esc(shareErr)}</p>` : '';
  $('shareBody').innerHTML = syncOn() ? `
    <h2>👪 Sharing is on</h2>
    <p class="muted">The due date, appointments, checklist, kicks, contractions, birth plan, names, bag and baby log are the same on both phones, and both get the reminders, with the bump photos and journal entries you share. Mood checks stay on each phone (the other hears only the day one was done, so you both know when the next is due), and so do photos and entries marked 🔒 just me.
      ${syncInfo.error && syncInfo.error !== 'unknown' ? 'Not synced just now: ' + esc(syncInfo.error) + '. It keeps trying.' : syncedAt() ? 'Last synced ' + syncedAt() + '.' : ''}</p>
    ${syncInfo.error === 'unknown' ? `<p class="advice">Sharing is paused: the sharing server doesn't recognize this family right now. It tries again every half hour.
      If it stays like this, tap Stop sharing on both phones, then invite again: each phone keeps everything it has.</p>` : ''}
    ${privacy}${code}${err}
    <button class="btn primary big" id="shareInvite"${shareBusy ? ' disabled' : ''}>Invite the other phone</button>
    <button class="btn big" id="shareLeave">Stop sharing on this phone</button>
    <button class="btn big" data-close>Done</button>` : `
    <h2>👪 Share with the other phone</h2>
    <p class="muted">Both phones show the same pregnancy: appointments, checklist, birth plan, names and the bag, the journal entries and bump photos you choose to share, and a contraction timed on one shows on the other as it happens. After the birth, so does the baby log. Bump photos start out 🔒 just on this phone. It works between Android phones and iPhones (Bumplings on the web).</p>
    ${privacy}${err}
    <button class="btn primary big" id="shareInvite"${shareBusy ? ' disabled' : ''}>Invite the other phone</button>
    <h3>Already set up on the other phone?</h3>
    <button class="btn big" id="shareScan"${shareBusy ? ' disabled' : ''}>📷 Scan the invite</button>
    <button class="btn big" data-close>Cancel</button>`;
  $('shareInvite').onclick = () => {
    if (!P()) { shareErr = 'Fill in the details and save first, then invite the other phone.'; renderShare(); return; }
    shareStep(async () => {
      if (!syncOn()) await syncCreate();
      shareCode = (await syncInvite()).text;
    });
  };
  if (syncOn()) {
    $('shareLeave').onclick = () => {
      if (!confirm('Stop sharing on this phone? It keeps its own copy; changes stop going to and from the other phone.')) return;
      syncLeave();
      syncReminders();
      shareCode = null;
      renderShare();
      renderShareCard();
    };
  } else {
    $('shareScan').onclick = scanStart;
  }
}

// ---- Scanning an invite ----
// The camera shows in the share sheet and a few frames a second are checked for a QR code (vendor/jsQR.js).
const scanVideo = document.createElement('video');
scanVideo.muted = true;
scanVideo.setAttribute('playsinline', '');
const scanCanvas = document.createElement('canvas');
let scanning = null; // the camera while scanning
async function scanStart() {
  shareErr = '';
  try {
    scanning = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  } catch (e) {
    shareErr = e.name === 'NotAllowedError' ? "Scanning needs the camera. Allow it for Bumplings in the phone's Settings, then try again."
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
    // Shrunk to at most 640 pixels across: plenty for a QR code filling part of the picture, and quick.
    const s = Math.min(1, 640 / Math.max(w, h)), cw = Math.round(w * s), ch = Math.round(h * s);
    scanCanvas.width = cw;
    scanCanvas.height = ch;
    const g = scanCanvas.getContext('2d', { willReadFrequently: true });
    g.drawImage(scanVideo, 0, 0, cw, ch);
    const qr = jsQR(g.getImageData(0, 0, cw, ch).data, cw, ch, { inversionAttempts: 'dontInvert' });
    if (qr && inviteCode(qr.data)) {
      scanStop();
      if (P() && !confirm("Join the other phone? This phone's details are replaced by the shared ones.")) { renderShare(); return; }
      shareStep(() => syncJoin(qr.data));
      return;
    }
    if (qr && qr.data) { $('scanNote').textContent = "That QR code isn't a Bumplings invite."; $('scanNote').hidden = false; }
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
    shareErr = e.status ? e.message
      : e instanceof TypeError ? `App error: ${e.message}`
      : (e.message && e.message !== 'Failed to fetch' ? e.message : "Couldn't reach the sharing server. Check the internet connection and try again.");
  }
  shareBusy = false;
  renderShare();
  renderShareCard();
  syncReminders(); // sharing now: the other grown-up's mood checks are their phone's to remind them of
}
const openShare = () => { shareErr = ''; shareCode = null; renderShare(); $('shareSheet').classList.add('open'); };
$('shareCard').onclick = openShare;
$('shareBtn2').onclick = openShare;
// Joining from the first screen: the details arrive from the other phone, then this phone says whose it is.
$('setupJoin').onclick = () => { openShare(); scanStart(); };
// The app tells the page when it goes into and comes back from the background; the camera isn't kept on.
// Leaving the app: a change saved in the last moment still goes, so the other phone hears of it now.
window.appPaused = () => { syncStop(); if (syncOn()) syncNow(); if (scanning) { scanStop(); renderShare(); } };
window.appResumed = () => {
  if (syncOn()) { syncNow(); syncListen(); }
  // The day may have changed while the app was away.
  const s = document.body.dataset.screen;
  if (s === 'home' && P()) renderHome();
};

// Android back: close a sheet, else go home; on home, false lets the app close.
window.goBack = () => {
  if (playing) { stopPhotos(); return true; }
  if (document.querySelector('.sheet.open')) { closeSheets(); return true; }
  const s = document.body.dataset.screen;
  if (s === 'setup' && !P()) return false;
  if (s !== 'home') { goHome(); return true; }
  return false;
};

if (P() && state.me && checkinsFromBefore()) save();
if (P() && state.me) goHome(); else openSetup();
// Opened from Tot Routines' "We're expecting": a pregnancy not set up yet starts with the baby's name filled in.
window.openFromRoutines = () => {
  const baby = Android.takeFromRoutines();
  if (baby == null) return;
  if (P() && state.me) { goHome(); return; }
  if (document.body.dataset.screen !== 'setup') openSetup();
  if (baby && !$('babyName').value) $('babyName').value = baby;
};
if (phone) { tellFamily(); openFromRoutines(); }
// Photos are read from IndexedDB in the background: draw them once they're in. If they can't be, say so.
lockSetup().catch(e => alert("Bumplings couldn't lock your private photos and entries: " + e.message));
pixStore.ready.then(() => {
  tellFamily(); // now with the newest photo
  autoGallery(); // any that arrived, or were kept, while the app was closed
  const s = document.body.dataset.screen;
  if (s === 'photos') renderPhotos(); else if (s === 'week') renderWeek();
}, e => alert("Bumplings couldn't open its photo storage, so photos won't show or share: " + e.message));
// In a browser: the same pausing and resuming the app does, a service worker so it opens offline, and asking
// the browser not to clear what's stored (Safari otherwise may after a week unused).
if (!phone) {
  document.addEventListener('visibilitychange', () => { if (document.hidden) appPaused(); else appResumed(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
  if (navigator.storage?.persist) navigator.storage.persist();
}
// Alarms are the app's copy of the reminders; refresh it in case this is the first start after an update.
syncReminders();
if (syncOn()) { syncNow(); syncListen(); }
if (phone) { const launch = Android.takeLaunch(); if (launch) openFromReminder(launch); }
