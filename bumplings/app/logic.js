// Bumplings: the logic behind the page, with no DOM, so the tests can run it (test/bump.test.js).
// Days are 'YYYY-MM-DD' keys in local time; day arithmetic goes through UTC so a clock change can't make a
// day 23 hours long.
const DAY = 864e5;
const parseDay = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const pad2 = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const utcDay = k => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d) / DAY; };
const addDays = (k, n) => { const d = new Date((utcDay(k) + n) * DAY); return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; };
const daysBetween = (a, b) => utcDay(b) - utcDay(a);

// The due date from what the family knows. A pregnancy is 280 days from the first day of the last period
// (Naegele's rule); conception is about 14 days after that; an IVF transfer of a day-3 or day-5 embryo is
// that many days after conception.
function dueFrom(how, from, embryo) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '')) throw new Error(`not a date: ${from}`);
  if (how === 'due') return from;
  if (how === 'lmp') return addDays(from, 280);
  if (how === 'ivf') {
    if (embryo !== 3 && embryo !== 5) throw new Error(`embryo age must be 3 or 5 days, not ${embryo}`);
    return addDays(from, 266 - embryo);
  }
  throw new Error(`unknown way to date a pregnancy: ${how}`);
}

// How far along on `today`: days since the last period, and that as weeks and days ("20 weeks 3 days").
function gestation(due, today) {
  const days = 280 - daysBetween(today, due);
  return { days, week: Math.floor(days / 7), day: ((days % 7) + 7) % 7 };
}

// What Tot Routines on this phone gets, to show the baby beside the other children and on its family page, or
// null before there is a pregnancy, worked out at `now` (ms). {baby, due, born} first (all Tot Routines 1.9
// reads); then, in `state` and in the same shape Bumplings keeps them, only what the family page shows: the
// names and phone numbers, appointments from yesterday on (without the notes), the checklist ticks, the latest
// kick count, a contraction going now, names with a vote, and the last two days of the baby log with the last
// feeds. Then what Tot Routines can't work out without Bumplings' own lists (the checklist with its dates, the
// bag's count, each week's size), `mood`, a gentle summary of how things are going (moodSummary),
// `journal`, how many entries there are (journalCounts), and `news`, the last week's (bumpNews), with names. The journal's notes, symptoms and readings, the birth
// plan, and the mood check's answers and scores stay in Bumplings. (The page adds the newest bump photo, which
// is kept outside the state, unless that's turned off in Settings.) Anything that depends on the time (the week, what's open now, the last 24 hours) Tot Routines
// works out when it shows it, so it's right however long ago Bumplings last saved.
function familySummary(st, now) {
  const p = st.preg;
  if (!p || !p.due) return null;
  if (!Number.isFinite(now)) throw new Error(`familySummary needs the time, not ${now}`);
  const pick = (o, keep) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => keep(v)));
  const appts = {};
  for (const [id, a] of Object.entries(st.appts || {})) {
    if (!a.at || new Date(a.at).getTime() < now - DAY) continue;
    appts[id] = { at: a.at, kind: a.kind || 'other', title: a.title, where: a.where || '', asks: (a.ask || '').split('\n').filter(l => l.trim()).length };
  }
  const kicks = Object.entries(st.kicks || {}).sort((x, y) => y[1].start - x[1].start).slice(0, 1);
  const log = Object.entries(st.babylog || {}), feeds = log.filter(([, e]) => e.t === 'feed').sort((x, y) => y[1].at - x[1].at);
  const keepLog = new Set([feeds[0], feeds.find(([, e]) => e.side === 'L' || e.side === 'R')].filter(Boolean).map(([id]) => id));
  const state = {
    preg: { due: p.due, born: p.born || null, mom: p.mom || '', partner: p.partner || '', baby: p.baby || '', doc: p.doc || {}, hosp: p.hosp || {} },
    appts, checks: st.checks || {}, kicks: Object.fromEntries(kicks), contractions: pick(st.contractions, c => !c.end),
    names: pick(st.names, n => Object.values(n.votes || {}).some(v => v > 0)),
    babylog: Object.fromEntries(log.filter(([id, e]) => e.at > now - 2 * DAY || keepLog.has(id))),
  };
  const care = (p.born ? afterFor(p.born) : careFor(p)).filter(c => c.id !== 'flu' && c.id !== 'covid')
    .map(c => ({ id: c.id, emoji: c.emoji, title: c.title, start: c.start, end: c.end }));
  const bag = [...BAG, ...Object.entries(st.own || {}).map(([id, o]) => ({ id, ...o }))];
  const sizes = {};
  for (const x of WEEKS) if (x.size) sizes[x.w] = [x.size[0], x.size[1], sizeText(x)];
  // The last week's news (bumpNews), with who by name.
  const news = bumpNews(st, now - 7 * DAY).slice(0, 20).map(n => ({ ...n, by: n.by ? p[n.by] || (n.by === 'mom' ? 'Mom' : 'Partner') : '' }));
  return { baby: p.baby || '', due: p.due, born: p.born || null, v: 3, state, care,
    bag: { packed: bag.filter(b => st.bag && st.bag[b.id]).length, total: bag.length }, sizes, mood: moodSummary(st, now),
    journal: journalCounts(st, now), news };
}

// Every journal entry on this phone, newest day first: the shared ones (st.log) and the ones kept just on this
// phone (st.priv.log), each {day, l, priv}. A day can have one of each; the private one comes first.
function journalEntries(st) {
  const out = [];
  for (const [day, l] of Object.entries((st.priv && st.priv.log) || {})) out.push({ day, l, priv: true });
  for (const [day, l] of Object.entries(st.log || {})) out.push({ day, l, priv: false });
  return out.sort((a, b) => a.day < b.day ? 1 : a.day > b.day ? -1 : b.priv - a.priv);
}
// How many journal entries there are on this phone, in the last 7 days to `now` (ms), and how many of all of
// them are private. For Tot Routines; it gets the counts, never the entries.
function journalCounts(st, now) {
  const all = journalEntries(st), from = addDays(dayKey(new Date(now)), -6);
  return { total: all.length, week: all.filter(e => e.day >= from).length, priv: all.filter(e => e.priv).length };
}
// Every bump photo on this phone, by week: the shared ones (st.photos) and the private ones (st.priv.photos),
// each {wk, id, day, priv}. Private first in a week that has both.
function photoList(st) {
  const out = [];
  for (const [wk, p] of Object.entries((st.priv && st.priv.photos) || {})) out.push({ wk: Number(wk), id: p.id, day: p.day, priv: true });
  for (const [wk, p] of Object.entries(st.photos || {})) out.push({ wk: Number(wk), id: p.id, day: p.day, priv: false });
  return out.sort((a, b) => a.wk - b.wk || b.priv - a.priv);
}
// The bump photos to save to the phone's gallery by themselves now: shared ones when st.priv.gallery.shared,
// 🔒 private ones when st.priv.gallery.priv, each once (st.priv.saved has those saved, or left out), and only
// with its picture here (`has(id)`).
function galleryDue(st, has) {
  const g = st.priv.gallery || {}, saved = st.priv.saved || {};
  return photoList(st).filter(x => (x.priv ? g.priv : g.shared) && !(x.id in saved) && has(x.id));
}

// How things are going, for Tot Routines on this phone to show gently: the journal's feelings over the last
// two weeks (the journal is the pregnant parent's: shared entries and this phone's private ones, a private one
// first on a day with both), and this phone's grown-up's latest mood check in the last three months as only its
// level and whether it asked for a call today, never its answers or score. `me` says whose phone it is, so Tot
// Routines can say "your" or a name. From 1.11, for each grown-up (moodPeople): `last`, the day of their latest
// mood check on either phone, and `due`, the day the next one is due (moodDue). From 1.13, `recent`: both
// grown-ups' latest feelings (recentFeels), and `hard`: how many harder days (😟 or 😢) each had in the last 7
// days, {mom, partner, '': from before 1.11, no one's}, so Tot Routines says it about whoever had them.
function moodSummary(st, now) {
  const today = dayKey(new Date(now)), from = addDays(today, -13), seen = new Set();
  const days = journalEntries(st).filter(({ day, l }) => l.mood && day >= from && day <= today && !seen.has(day) && seen.add(day))
    .reverse().map(({ day, l }) => ({ day, mood: l.mood, label: (MOODS.find(m => m[0] === l.mood) || [, ''])[1] }));
  const me = st.me || 'mom';
  const mine = moodChecks(st).find(m => m.who === me && m.day >= addDays(today, -90) && m.day <= today);
  const check = mine ? { day: mine.day, level: epdsLevel(mine.score), call: mine.harm } : null;
  const last = {}, due = {}, at = {};
  for (const who of moodPeople(st)) {
    last[who] = lastCheck(st, who); due[who] = moodDue(st, who, today);
    at[who] = lastCheckAt(st, who);
  }
  const feels = allFeels(st, now), week = addDays(today, -6), hard = { mom: 0, partner: 0, '': 0 };
  for (const f of feels) if ((f.mood === '😟' || f.mood === '😢') && dayKey(new Date(f.at)) >= week) hard[f.who]++;
  return { me: st.me || null, days, check, last, due, at, recent: recentFeels(feels), hard };
}
// Each grown-up's last two feelings (allFeels), newest first.
const recentFeels = feels => ['mom', 'partner', ''].flatMap(w => feels.filter(f => f.who === w).slice(0, 2)).sort((a, b) => b.at - a.at);
// Each grown-up's feelings in the last 30 days to `now` (ms), newest first: {mood, label, at, who}, `day` set on
// one from before 1.11 (which says just its day; `at` is its noon, or now if that's later), and its `who` '':
// either grown-up could have written it, so it's no one's. From state.feels and the journal on this phone (its
// private entries too: Tot Routines on this phone is the same grown-up's), one a day each.
function allFeels(st, now) {
  const from = addDays(dayKey(new Date(now)), -29), got = new Map();
  const put = (day, who, mood, at, old) => {
    const k = `${day}.${who}`;
    if (day >= from && MOODS.some(m => m[0] === mood) && Number.isFinite(at) && at <= now && !got.has(k)) got.set(k, { mood, at, who, ...old });
  };
  for (const [k, f] of Object.entries(st.feels || {})) {
    const [day, who] = k.split('.');
    if (who === 'mom' || who === 'partner') put(day, who, f && f.mood, f && f.at);
  }
  for (const { day, l } of journalEntries(st)) {
    if (Number.isFinite(l.at)) put(day, l.by === 'partner' ? 'partner' : l.by === 'mom' ? 'mom' : st.me || 'mom', l.mood, l.at);
    else if (/^\d{4}-\d\d-\d\d$/.test(day)) put(day, '', l.mood, Math.min(parseDay(day).getTime() + 12 * 3600e3, now), { day: true });
  }
  return [...got.values()].sort((a, b) => b.at - a.at).map(f => ({ ...f, label: MOODS.find(m => m[0] === f.mood)[1] }));
}

// ---- Mood checks for both grown-ups ----
// state.moods: the mood checks answered on this phone, kept on it and locked (vault.js), never shared:
// {key: {score, harm, day, who}}. Before 1.11 a check was this phone's grown-up's, under its day with neither
// `day` nor `who`; from 1.11 either grown-up can answer one here (the other may not have Bumplings on a phone of
// their own), under 'day.who'. Newest first.
function moodChecks(st) {
  return Object.entries(st.moods || {})
    .map(([k, m]) => ({ key: k, day: m.day || k.slice(0, 10), who: m.who || st.me || 'mom', score: m.score, harm: !!m.harm }))
    .sort((a, b) => a.day < b.day ? 1 : a.day > b.day ? -1 : 0);
}
// state.checkins (shared): {mom: {day, at}, partner: {day, at}}, when each grown-up last did a mood check, on
// whichever phone, and never how it went. So each phone knows when both are due.
const lastCheck = (st, who) => (st.checkins && st.checkins[who] && st.checkins[who].day) || null;
// When in the day it was (ms), or null for one from before 1.11, which says just its day.
const lastCheckAt = (st, who) => { const c = st.checkins && st.checkins[who]; return c && Number.isFinite(c.at) ? c.at : null; };
// Whose mood checks to keep an eye on: the one who's pregnant, and the partner once they have a name or have
// done one.
const moodPeople = st => ['mom', ...((st.preg && st.preg.partner) || lastCheck(st, 'partner') ? ['partner'] : [])];
// The day `who`'s next mood check is due ('YYYY-MM-DD'), or null once the baby is a year old. The first is due
// straight away. Then every 4 weeks, or 2 weeks after one that wasn't low (when it was answered on this phone:
// how one on the other phone went stays there), and every 2 weeks for the first 12 weeks after the birth, the
// first of those two weeks after it (when the baby blues have usually passed).
function moodDue(st, who, today) {
  const p = st.preg || {}, last = lastCheck(st, who);
  if (p.born && daysBetween(p.born, today) > 365) return null;
  if (!last) return today;
  const here = moodChecks(st).find(m => m.who === who && m.day === last);
  if (p.born && last < addDays(p.born, 10)) return addDays(p.born, 14);
  const soon = (here && epdsLevel(here.score) !== 'low') || (p.born && daysBetween(p.born, last) < 84);
  return addDays(last, soon ? 14 : 28);
}

// ---- Lately ----
// What's happened since `since` (ms), newest first, for the home screen and Tot Routines' family page: each
// {at, emoji, text, by ('mom' | 'partner' | ''), open (the screen it's on)}. From 1.11 what's added says when
// and by whom (`at` and `by` on appointments' `added`, names' `added`, journal entries, bump photos, kick counts,
// contractions and the birth plan's sections; the bag's ticks are {at, by}; the checklist's are in `ticks`);
// what's from before says neither, and isn't news, but for the checklist's ticks and mood checks, which have their day. The baby log isn't either: there's too much of it, and the
// baby's card on home has it.
function bumpNews(st, since) {
  const out = [], by = x => x && (x.by === 'mom' || x.by === 'partner') ? x.by : '';
  const add = (x, at, emoji, text, open) => { if (Number.isFinite(at) && at >= since) out.push({ at, emoji, text, by: by(x), open }); };
  for (const a of Object.values(st.appts || {})) if (a.added) add(a.added, a.added.at, '📅', `New appointment: ${a.title}`, 'appts');
  const items = [...CARE, ...AFTER];
  // A tick from before 1.11 (or from a phone that hasn't updated) has just its day: it's news that day, by
  // no one in particular, with `day` set and `at` the day's start.
  for (const [id, d] of Object.entries(st.checks || {})) {
    const c = items.find(c => c.id === id), t = st.ticks && st.ticks[id];
    if (!c) continue;
    if (t && Number.isFinite(t.at)) add(t, t.at, '✅', `${c.title}: done`, 'care');
    else if (typeof d === 'string' && /^\d{4}-\d\d-\d\d$/.test(d) && d >= dayKey(new Date(since))) {
      out.push({ at: parseDay(d).getTime(), day: true, emoji: '✅', text: `${c.title}: done`, by: '', open: 'care' });
    }
  }
  // The bag's ticks, a grown-up's on a day together: packing is many ticks at once.
  const bag = [...BAG, ...Object.entries(st.own || {}).map(([id, o]) => ({ id, ...o }))], packed = new Map();
  for (const [id, t] of Object.entries(st.bag || {})) {
    const b = bag.find(b => b.id === id);
    if (!b || !t || !Number.isFinite(t.at) || t.at < since) continue;
    const k = by(t) + ' ' + dayKey(new Date(t.at)), g = packed.get(k) || { t, labels: [] };
    if (t.at > g.t.at) g.t = t;
    g.labels.push(b.label);
    packed.set(k, g);
  }
  for (const { t, labels } of packed.values()) add(t, t.at, '🎒', labels.length === 1 ? `Packed: ${labels[0]}` : `Packed ${labels.length} things for the hospital`, 'bag');
  for (const k of Object.values(st.kicks || {})) if (k.end) add(k, k.end, '👣', `Kick count: ${k.n} in ${mmss(k.end - k.start)}`, 'kicks');
  // Contractions: when timing started (the first after an hour without any).
  const cs = Object.values(st.contractions || {}).sort((a, b) => a.start - b.start);
  cs.forEach((c, i) => { if (!i || c.start - cs[i - 1].start > 3600e3) add(c, c.start, '⏱', 'Started timing contractions', 'timer'); });
  // A journal entry says how the day felt; one from before 1.11 (or from a phone without it) is news on its day.
  for (const { day, l, priv } of journalEntries(st)) {
    const m = MOODS.find(m => m[0] === l.mood), text = `Wrote in the journal${m ? `: ${m[0]} ${m[1]}` : ''}${priv ? ' 🔒' : ''}`;
    if (Number.isFinite(l.at)) add(l, l.at, '📓', text, 'journal');
    else if (/^\d{4}-\d\d-\d\d$/.test(day) && day >= dayKey(new Date(since))) out.push({ at: parseDay(day).getTime(), day: true, emoji: '📓', text, by: '', open: 'journal' });
  }
  for (const x of photoList(st)) {
    const p = (x.priv ? st.priv.photos : st.photos)[x.wk];
    add(p, p.at, '📸', `Bump photo, week ${x.wk}${x.priv ? ' 🔒' : ''}`, 'photos');
  }
  for (const n of Object.values(st.names || {})) if (n.added) add(n.added, n.added.at, '💡', `Name idea: ${n.name}`, 'names');
  for (const s of PLAN) { const v = st.plan && st.plan[s.id]; if (v) add(v, v.at, '📝', `Birth plan: ${s.title.replace(/^\S+ /, '')}`, 'plan'); }
  // A mood check from before 1.11 (checkinsFromBefore in app.js) has just its day, like a tick above.
  for (const [who, c] of Object.entries(st.checkins || {})) {
    if (!c) continue;
    if (Number.isFinite(c.at)) add({ by: who }, c.at, '💛', 'Did a mood check', 'mood');
    else if (typeof c.day === 'string' && /^\d{4}-\d\d-\d\d$/.test(c.day) && c.day >= dayKey(new Date(since))) {
      out.push({ at: parseDay(c.day).getTime(), day: true, emoji: '💛', text: 'Did a mood check', by: by({ by: who }), open: 'mood' });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}
// The day week `w` begins.
const weekStart = (due, w) => addDays(due, w * 7 - 280);
// First trimester to 13 weeks 6 days, second to 27 weeks 6 days (ACOG).
const trimesterOf = days => days < 98 ? 1 : days < 196 ? 2 : 3;
const MIN_WEEK = 4, MAX_WEEK = 42;
function weekInfo(w) {
  if (w < MIN_WEEK) return { w, size: null, len: null, oz: null, ...EARLY };
  return WEEKS.find(x => x.w === Math.min(w, MAX_WEEK));
}
// A week's text with the family's names in it.
function fill(text, preg) {
  return text.replace(/\{(mom|partner|baby)\}/g, (_, k) => preg[k] || { mom: 'Mom', partner: 'your partner', baby: 'Baby' }[k]);
}
// "6.5 in (17 cm) · 10.6 oz (300 g)"
function sizeText(x) {
  if (!x.len) return '';
  const len = x.len < 1 ? `${x.len} in (${Math.round(x.len * 25.4)} mm)` : `${x.len} in (${(x.len * 2.54).toFixed(1).replace(/\.0$/, '')} cm)`;
  if (!x.oz) return len;
  const g = Math.round(x.oz * 28.35);
  const wt = x.oz < 16 ? `${x.oz} oz` : `${Math.floor(x.oz / 16)} lb ${Math.round(x.oz % 16)} oz`;
  return `${len} · ${wt} (${g < 1000 ? g + ' g' : (g / 1000).toFixed(1) + ' kg'})`;
}

// ---- The care checklist ----
// Whether a part of the calendar from `a` to `b` falls in any of `months` (0 = January).
function touchesMonths(a, b, months) {
  for (let k = a; k <= b; k = addDays(k, 1)) if (months.includes(parseDay(k).getMonth())) return true;
  return false;
}
// The CARE items that apply to this pregnancy, with the dates of their window.
function careFor(preg) {
  const conception = weekStart(preg.due, 2);
  return CARE.map(c => ({ ...c, start: weekStart(preg.due, c.from), end: addDays(weekStart(preg.due, c.to + 1), -1) }))
    .filter(c => !c.when
      || c.when === 'rhneg' && preg.rhneg === true
      || c.when === 'rsv' && touchesMonths(c.start, c.end, [8, 9, 10, 11, 0])
      || c.when === 'flu' && touchesMonths(conception, preg.due, [9, 10, 11, 0, 1, 2]));
}
// done, now (window open), soon (opens within 2 weeks), later, or missed (window over, not ticked).
function careStatus(c, today, checks) {
  if (checks[c.id]) return 'done';
  if (today > c.end) return 'missed';
  if (today >= c.start) return 'now';
  return daysBetween(today, c.start) <= 14 ? 'soon' : 'later';
}
// The jobs after the birth, with their dates.
const afterFor = born => AFTER.map(a => ({ ...a, start: addDays(born, a.days[0]), end: addDays(born, a.days[1]) }));

// ---- Contractions ----
// Each contraction is { start, end } in ms (end null while it's going). Rows: newest first, with how long it
// lasted and how long since the one before started (frequency is measured start to start).
function contractionRows(list) {
  const done = list.filter(c => c.end).sort((a, b) => a.start - b.start);
  return done.map((c, i) => ({ ...c, long: c.end - c.start, apart: i ? c.start - done[i - 1].start : null })).reverse();
}
// Has the family's rule been met (by default 5-1-1: every 5 minutes or closer, each lasting a minute, for
// an hour)? Looks at the contractions in the last `hours`: there must have been contractions for that long
// (the first started at least that long ago, allowing one gap), and on average they come `every` minutes or
// closer and last `long` minutes or longer (within 10 seconds).
function laborCheck(list, now, rule = { every: 5, long: 1, hours: 1 }) {
  const span = rule.hours * 3600e3;
  const recent = contractionRows(list).filter(c => c.start >= now - span - rule.every * 60e3).reverse();
  const res = { met: false, count: recent.length, apart: null, long: null, minutes: 0 };
  if (recent.length < 2) return res;
  const gaps = recent.slice(1).map((c, i) => c.start - recent[i].start);
  res.apart = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  res.long = recent.reduce((a, c) => a + c.long, 0) / recent.length;
  res.minutes = Math.round((now - recent[0].start) / 60e3);
  res.met = now - recent[0].start >= span - rule.every * 60e3
    && res.apart <= rule.every * 60e3 + 10e3 && res.long >= rule.long * 60e3 - 10e3;
  return res;
}
// "4:05" from ms.
const mmss = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${pad2(s % 60)}`; };

// ---- Weight and blood pressure ----
const bmiOf = (heightIn, lb) => 703 * lb / (heightIn * heightIn);
const gainBand = bmi => GAIN.find(g => bmi < g.upTo);
// The usual total gain, in pounds, by week `w`: up to 1.1–4.4 lb across the first trimester (spread evenly
// over its 13 weeks), then the band's weekly rate.
function gainRange(bmi, w) {
  const g = gainBand(bmi), first = Math.min(w, 13) / 13, after = Math.max(0, w - 13);
  return [1.1 * first + g.rate[0] * after, 4.4 * first + g.rate[1] * after].map(x => Math.round(x * 10) / 10);
}
// High blood pressure in pregnancy is 140/90 or more; 160/110 or more is severe and needs care right away.
function bpLevel(sys, dia) {
  if (!sys || !dia) return null;
  if (sys >= 160 || dia >= 110) return 'severe';
  if (sys >= 140 || dia >= 90) return 'high';
  return 'ok';
}

// Blood sugar with gestational diabetes: 'high' at or over the goal for that reading, else 'ok'. `meal` is
// 'fast' or a meal ('b', 'l', 'd'), measured `after` 1 or 2 hours after eating.
function glucoseLevel(meal, mgdl, after = 1) {
  if (!mgdl) return null;
  const goal = meal === 'fast' ? GLUCOSE.fast : GLUCOSE[after];
  if (!goal) throw new Error(`blood sugar is checked 1 or 2 hours after a meal, not ${after}`);
  return mgdl >= goal ? 'high' : 'ok';
}

// ---- Mood check ----
// The EPDS score from ten answers (each the index of the answer picked). 13 or more: depression is likely;
// 10 to 12: possible; any answer but "never" to the last question needs a call today.
function epdsResult(answers) {
  if (answers.length !== EPDS.length || answers.some(a => !(a >= 0 && a <= 3))) throw new Error('the mood check needs all ten answers');
  const score = answers.reduce((n, a, i) => n + EPDS[i][2][a], 0);
  return { score, harm: EPDS[9][2][answers[9]] > 0, level: epdsLevel(score) };
}
const epdsLevel = score => score >= 13 ? 'likely' : score >= 10 ? 'possible' : 'low';

// ---- The baby log, after the birth ----
// Entries: { t: 'feed', at, end, side: 'L' | 'R' | 'bottle', oz }, { t: 'diaper', at, wet, dirty },
// { t: 'sleep', at, end }. Times in ms; end is null while it's going.
// The baby's day of life: the birth day is day 1.
const dayOfLife = (born, today) => daysBetween(born, today) + 1;
// What's usual in a day (AAP): 8 to 12 feeds; as many wet diapers as the day of life, up to 6 from day 6;
// and from day 4, at least 3 dirty ones for a breastfed baby (fewer is normal later, and with formula).
const wetsExpected = day => Math.min(6, Math.max(1, day));
// The last 24 hours, and the last feed.
function babySummary(entries, now) {
  const since = now - DAY, recent = entries.filter(e => e.at > since);
  const feeds = entries.filter(e => e.t === 'feed').sort((a, b) => b.at - a.at);
  const sleepMs = recent.filter(e => e.t === 'sleep').reduce((n, e) => n + ((e.end || now) - Math.max(e.at, since)), 0);
  const lastBreast = feeds.find(f => f.side === 'L' || f.side === 'R');
  return {
    feeds: recent.filter(e => e.t === 'feed').length,
    wet: recent.filter(e => e.t === 'diaper' && e.wet).length,
    dirty: recent.filter(e => e.t === 'diaper' && e.dirty).length,
    sleepMs,
    last: feeds[0] || null,
    // Breastfeeding usually starts on the side the last feed didn't (or ended on).
    nextSide: lastBreast ? (lastBreast.side === 'L' ? 'R' : 'L') : null,
  };
}
// "2h 05m", "45m" from ms.
const hhmm = ms => { const m = Math.max(0, Math.round(ms / 60e3)); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${pad2(m % 60)}m`; };

// ---- Appointments to a calendar ----
// An appointment as an .ics calendar file (for phones without the app's reminders, like iPhones).
function apptIcs(a, id, stamp) {
  const t = s => s.replace(/[\\;,]/g, c => '\\' + c).replace(/\n/g, '\\n');
  const local = at => at.replace(/[-:]/g, '') + '00';
  const end = new Date(new Date(a.at).getTime() + 3600e3), endAt = `${dayKey(end)}T${pad2(end.getHours())}:${pad2(end.getMinutes())}`;
  const desc = [a.ask && 'Questions to ask:\n' + a.ask, a.notes && 'Notes:\n' + a.notes].filter(Boolean).join('\n\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tot Toolbox//Bumplings//EN', 'BEGIN:VEVENT',
    `UID:${id}@bumplings.tottoolbox.com`, `DTSTAMP:${new Date(stamp).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
    `DTSTART:${local(a.at)}`, `DTEND:${local(endAt)}`, `SUMMARY:${t(a.title)}`,
    ...(a.where ? [`LOCATION:${t(a.where)}`] : []), ...(desc ? [`DESCRIPTION:${t(desc)}`] : []),
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${t(a.title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}

// ---- The birth plan as text, to share or print ----
function planText(plan, preg) {
  const lines = [`Birth preferences: ${preg.mom || 'Mom'}${preg.partner ? ' and ' + preg.partner : ''}`, `Due ${preg.due}`];
  if (preg.doc?.name) lines.push(`Provider: ${preg.doc.name}`);
  for (const s of PLAN) {
    const v = plan[s.id];
    if (!v || (!v.pick?.length && !v.note)) continue;
    lines.push('', s.title.replace(/^\S+ /, '').toUpperCase(), ...(v.pick || []).map(p => '• ' + p), ...(v.note ? [v.note] : []));
  }
  lines.push('', 'These are our preferences. We understand plans can change for the safety of the baby or mom, and we ask to be told why.');
  return lines.join('\n');
}

// ---- Names ----
// Names both grown-ups love, then the rest by total votes.
function nameList(names) {
  const rows = Object.entries(names).map(([id, n]) => {
    const v = n.votes || {};
    return { id, ...n, both: v.mom === 1 && v.partner === 1, score: (v.mom || 0) + (v.partner || 0) };
  });
  return rows.sort((a, b) => b.both - a.both || b.score - a.score || a.name.localeCompare(b.name));
}

// ---- Reminders ----
// What the phone should notify about, soonest first: { when (ms), title, text, open (a screen) }.
//   - each new week, at 9 in the morning on the day it begins
//   - a checklist window opening, if it isn't ticked yet
//   - an appointment, the evening before at 7 and two hours before
//   - after the birth, the first jobs
//   - a mood check, at 7 in the evening of the day it's due (moodDue), and again 3 days, 1 to 4 weeks, then
//     every 2 weeks after while it hasn't been done; this phone's grown-up's, and when `both` (this phone isn't
//     sharing with the other, so it's the only one that can remind them) the other grown-up's too
// Reminders due at the same moment (a week beginning the day a checkup window opens) come as one notification.
// Only the next MAX_REMINDERS: the page sends a fresh list each time it opens.
const MAX_REMINDERS = 40, REMIND_GRACE = 10 * 60e3;
const MOOD_NAGS = [0, 3, 7, 14, 21, 28, 42, 56, 70, 84];
// The weeks that mark a step, named in that week's title instead of the size (ACOG's terms).
const WEEK_MILESTONES = { 14: 'the second trimester begins', 28: 'the third trimester begins', 37: 'early term',
  39: 'full term', 40: "today's the due date" };
function reminderList(state, me, now, both = false) {
  const p = state.preg;
  if (!p || !p.due) return [];
  const at = (k, hh) => { const d = parseDay(k); d.setHours(hh, 0, 0, 0); return d.getTime(); };
  const out = [];
  // Those due in the last REMIND_GRACE stay in: the app opening just as one is due mustn't drop it (the phone
  // keeps track of which it has shown, so none shows twice).
  const add = (when, title, text, open) => { if (when > now - REMIND_GRACE) out.push({ when, title, text, open }); };
  if (!p.born) {
    for (let w = MIN_WEEK; w <= MAX_WEEK; w++) {
      const x = weekInfo(w), dk = weekStart(p.due, w), step = WEEK_MILESTONES[w];
      add(at(dk, 9), `Week ${w}${step ? ': ' + step : x.size ? ': the size of ' + x.size[1] : ''}`, fill(me === 'partner' ? x.partner : x.baby, p), 'home');
    }
    for (const c of careFor(p)) {
      if (state.checks[c.id] || c.id === 'flu' || c.id === 'covid') continue;
      add(at(c.start, 9), `${c.emoji} Now's the time: ${c.title}`, c.what, 'care');
    }
  } else {
    for (const a of afterFor(p.born)) if (!state.checks[a.id]) add(at(a.start, 9), `${a.emoji} ${a.title}`, a.what, 'care');
  }
  for (const a of Object.values(state.appts)) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(a.at || '')) continue;
    const t = new Date(a.at).getTime(), where = a.where ? ` at ${a.where}` : '';
    const time = new Date(a.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    add(at(addDays(a.at.slice(0, 10), -1), 19), `Tomorrow: ${a.title}`, `${time}${where}.${a.ask ? ' You have questions saved to ask.' : ''}`, 'appts');
    add(t - 2 * 3600e3, `${a.title} at ${time}`, `In two hours${where}.`, 'appts');
  }
  const today = dayKey(new Date(now));
  for (const who of moodPeople(state).filter(w => w === me || both)) {
    const due = moodDue(state, who, today);
    if (!due) continue;
    const name = p[who] || (who === 'mom' ? 'Mom' : 'your partner'), last = lastCheck(state, who);
    const when = (p.born ? 'The months after a birth' : 'Pregnancy') + ' are when moods most need watching';
    const text = who === me
      ? `Ten questions about the past week, two minutes, just for you. ${when}, for both of you.`
      : `Ten questions about the past week, answered on this phone: partners get depression around a baby too. ${when}.`;
    // From a fixed day, so opening the app again doesn't move them: the day it fell due, or with none done yet,
    // the start of this week of the pregnancy (or of the baby's life), so they come weekly until one is.
    const start = last ? due : p.born ? addDays(p.born, Math.floor(daysBetween(p.born, today) / 7) * 7)
      : weekStart(p.due, gestation(p.due, today).week);
    MOOD_NAGS.forEach((d, i) => add(at(addDays(start, d), 19),
      `💛 ${who === me ? (i ? 'Your mood check is waiting' : last ? 'Time for your mood check' : 'Try the mood check') : `Time for ${name}'s mood check`}`, text, 'mood'));
  }
  const merged = [];
  for (const r of out.sort((a, b) => a.when - b.when)) {
    const m = merged.at(-1);
    if (m && m.when === r.when) m.text += `\n\n${r.title}. ${r.text}`;
    else merged.push({ ...r });
  }
  return merged.slice(0, MAX_REMINDERS);
}
