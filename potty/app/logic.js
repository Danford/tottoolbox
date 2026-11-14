// Tot Potty: the logic behind the page, with no DOM, so the tests can run it (test/potty.test.js).
// Days are 'YYYY-MM-DD' keys in local time; day arithmetic goes through UTC so a clock change can't make a
// day 23 hours long. Times are ms since 1970.
const DAY = 864e5, MIN = 60e3;
const pad2 = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseDay = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const utcDay = k => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d) / DAY; };
const addDays = (k, n) => { const d = new Date((utcDay(k) + n) * DAY); return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; };
const daysBetween = (a, b) => utcDay(b) - utcDay(a);
const dayOf = ms => dayKey(new Date(ms));
// Minutes into the local day of `ms`, and of a 'HH:MM'.
const minuteOf = ms => { const d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); };
const hhmmMin = s => { const m = /^(\d{2}):(\d{2})$/.exec(s || ''); if (!m) throw new Error(`not a time: ${s}`); return Number(m[1]) * 60 + Number(m[2]); };

// Whole months from a birthday ('YYYY-MM-DD') to the day `k`.
function ageMonths(birth, k) {
  const [by, bm, bd] = birth.split('-').map(Number), [y, m, d] = k.split('-').map(Number);
  return (y - by) * 12 + (m - bm) - (d < bd ? 1 : 0);
}
// "2 years 7 months", "20 months".
function ageWords(months) {
  if (months < 24) return `${months} month${months === 1 ? '' : 's'}`;
  const y = Math.floor(months / 12), m = months % 12;
  return `${y} year${y === 1 ? '' : 's'}${m ? ` ${m} month${m === 1 ? '' : 's'}` : ''}`;
}

// ---- What gets logged ----
// state.log[id] = {kid, t, at, by, how, where, note}: `t` one of EVENT's keys; `how` (for a pee or poop in the
// potty) 'asked' (the child said or went by themselves), 'told' (a grown-up suggested it) or 'timer'; `where`
// 'home', 'out', 'care' (daycare or a sitter's) or 'away' (someone else's home).
const EVENT = {
  pee: { emoji: '💧', label: 'Pee in the potty', short: 'Pee' },
  poop: { emoji: '💩', label: 'Poop in the potty', short: 'Poop' },
  both: { emoji: '🌟', label: 'Pee and poop in the potty', short: 'Pee + poop' },
  wet: { emoji: '💦', label: 'Pee accident', short: 'Wet' },
  dirty: { emoji: '🧻', label: 'Poop accident', short: 'Poop accident' },
  try: { emoji: '🚽', label: 'Sat on the potty, nothing yet', short: 'Tried' },
  dry: { emoji: '☀️', label: 'Dry check: still dry', short: 'Dry check' },
  napdry: { emoji: '😴', label: 'Dry after the nap', short: 'Dry nap' },
  napwet: { emoji: '🛏️', label: 'Wet after the nap', short: 'Wet nap' },
  nightdry: { emoji: '🌙', label: 'Woke up dry', short: 'Dry night' },
  nightwet: { emoji: '🌧️', label: 'Woke up wet', short: 'Wet night' },
};
// The one-tap log buttons on home; ALARM, the timer's alarm screen's: how the potty break went (no dry check, as
// the break is happening), the wins in a row, then a try, then the accidents.
const QUICK = ['pee', 'poop', 'wet', 'dirty', 'try', 'dry'];
const ALARM = ['pee', 'poop', 'both', 'try', 'wet', 'dirty'];
const WINS = new Set(['pee', 'poop', 'both']), ACCIDENTS = new Set(['wet', 'dirty']);
const PEES = new Set(['pee', 'both', 'wet']), POOPS = new Set(['poop', 'both', 'dirty']);
// What restarts the potty timer: anything that emptied the bladder or tried to.
const RESETS = new Set(['pee', 'poop', 'both', 'wet', 'dirty', 'try']);
const HOW = { asked: '🙋 Asked to go', told: '👆 We suggested it', timer: '⏰ The timer' };
const WHERE = { home: '🏠 Home', out: '🛒 Out and about', care: '🏫 Daycare or sitter', away: '👵 Another home' };

// One child's events, oldest first, each with its id.
function kidEvents(st, kid) {
  return Object.entries(st.log || {}).filter(([, e]) => e.kid === kid && Number.isFinite(e.at) && EVENT[e.t])
    .map(([id, e]) => ({ id, ...e })).sort((a, b) => a.at - b.at);
}

// One day's counts from a child's events: wins (in the potty), pees and poops in the potty, accidents, tries,
// dry checks, how many wins the child asked for, and the success rate (wins of wins and accidents, or null).
function dayStats(evs, k) {
  const s = { day: k, wins: 0, pee: 0, poop: 0, acc: 0, wet: 0, dirty: 0, tries: 0, dry: 0, asked: 0, n: 0 };
  for (const e of evs) {
    if (dayOf(e.at) !== k) continue;
    if (WINS.has(e.t)) { s.wins++; if (e.how === 'asked') s.asked++; }
    if (e.t === 'pee' || e.t === 'both') s.pee++;
    if (e.t === 'poop' || e.t === 'both') s.poop++;
    if (ACCIDENTS.has(e.t)) { s.acc++; s[e.t]++; }
    if (e.t === 'try') s.tries++;
    if (e.t === 'dry') s.dry++;
    if (WINS.has(e.t) || ACCIDENTS.has(e.t) || e.t === 'try' || e.t === 'dry') s.n++;
  }
  s.rate = s.wins + s.acc ? s.wins / (s.wins + s.acc) : null;
  return s;
}
// The `n` days up to `today`, oldest first.
const weekStats = (evs, today, n = 7) => Array.from({ length: n }, (_, i) => dayStats(evs, addDays(today, i - n + 1)));

// Days in a row with no accidents, counted back from `today`: a day counts once it has something in the potty
// and no accident. A day with nothing logged (a day at grandma's, say) doesn't break it, up to two in a row;
// today, still going, doesn't break it either.
function dryStreak(evs, today) {
  let n = 0, gap = 0;
  for (let i = 0; i < 120; i++) {
    const s = dayStats(evs, addDays(today, -i));
    if (s.acc) break;
    if (s.wins) { n++; gap = 0; continue; }
    if (i === 0) continue;
    if (++gap > 2) break;
  }
  return n;
}

const median = xs => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// The minutes between one pee and the next (in the potty or not), over the `days` before `now`: only within a
// day and up to four hours apart (longer means a nap, a night, or one that wasn't logged), and from ten minutes.
function peeGaps(evs, now, days = 7) {
  const pees = evs.filter(e => PEES.has(e.t) && e.at > now - days * DAY && e.at <= now), out = [];
  for (let i = 1; i < pees.length; i++) {
    const gap = (pees[i].at - pees[i - 1].at) / MIN;
    if (dayOf(pees[i].at) === dayOf(pees[i - 1].at) && gap >= 10 && gap <= 240) out.push(gap);
  }
  return out;
}
// How often to try, from how often the child really goes: ten minutes before the usual gap, in fives, from
// 15 minutes to 2 hours. Null until there are at least four gaps to go on.
function suggestEvery(evs, now) {
  const gaps = peeGaps(evs, now);
  if (gaps.length < 4) return null;
  const m = median(gaps);
  return { every: Math.max(15, Math.min(120, Math.round((m - 10) / 5) * 5)), median: Math.round(m), n: gaps.length };
}
// When in the day something tends to happen, from the last 14 days: the two-hour stretch with the most of
// them, if at least three happened and two in five of them fell in it. {from, to (hours), n, total} or null.
function busyHours(evs, now, set) {
  const xs = evs.filter(e => set.has(e.t) && e.at > now - 14 * DAY && e.at <= now);
  if (xs.length < 3) return null;
  const byHour = Array(24).fill(0);
  for (const e of xs) byHour[new Date(e.at).getHours()]++;
  let best = 0;
  for (let h = 1; h < 23; h++) if (byHour[h] + byHour[h + 1] > byHour[best] + byHour[best + 1]) best = h;
  const n = byHour[best] + byHour[best + 1];
  return n / xs.length >= 0.4 ? { from: best, to: best + 2, n, total: xs.length } : null;
}
const poopWindow = (evs, now) => busyHours(evs, now, POOPS);
const accidentWindow = (evs, now) => busyHours(evs, now, ACCIDENTS);
// Of the wins in the `days` before `now`, how many the child asked for: {asked, wins}.
function askedShare(evs, now, days = 7) {
  const w = evs.filter(e => WINS.has(e.t) && e.at > now - days * DAY && e.at <= now);
  return { asked: w.filter(e => e.how === 'asked').length, wins: w.length };
}

// What the patterns say, for Progress and home: short tips, each {emoji, text}, most useful first. `words`:
// the child's own words for pee and poop.
function insights(evs, kid, now) {
  const out = [], today = dayOf(now), name = kid.name;
  const hour = h => `${h % 12 || 12} ${h < 12 || h === 24 ? 'AM' : 'PM'}`;
  const week = weekStats(evs, today), last3 = week.slice(-3), prev = week.slice(0, 4);
  const sum = (ds, k) => ds.reduce((n, d) => n + d[k], 0);
  const rate = ds => { const w = sum(ds, 'wins'), a = sum(ds, 'acc'); return w + a ? w / (w + a) : null; };
  const r3 = rate(last3), r4 = rate(prev);
  if (r3 !== null && r4 !== null && r3 - r4 >= 0.15) out.push({ emoji: '📈', text: `Getting better: ${Math.round(r3 * 100)}% in the potty over the last 3 days, up from ${Math.round(r4 * 100)}%.` });
  const sug = suggestEvery(evs, now);
  if (sug) out.push({ emoji: '⏱️', text: `${name} usually goes about every ${sug.median} minutes. Trying every ${sug.every} minutes catches it before it comes.`, every: sug.every });
  const pw = poopWindow(evs, now);
  if (pw) out.push({ emoji: '💩', text: `Most poops come between ${hour(pw.from)} and ${hour(pw.to)}. A relaxed sit then, with a book and feet on a stool, helps.` });
  const aw = accidentWindow(evs, now);
  if (aw) out.push({ emoji: '💦', text: `Most accidents happen between ${hour(aw.from)} and ${hour(aw.to)}: busy play, or tiredness. Add a try just before.` });
  const a = askedShare(evs, now);
  if (a.wins >= 5 && a.asked / a.wins >= 0.5) out.push({ emoji: '🙋', text: `${name} asked for ${a.asked} of the last ${a.wins} trips. Time to stretch the timer, or let ${name} lead.` });
  else if (a.wins >= 8 && a.asked === 0) out.push({ emoji: '🙋', text: `So far the grown-ups start every trip. Now and then, wait a little and ask "What does your body say?" so ${name} learns the feeling.` });
  const lastPoop = [...evs].reverse().find(e => POOPS.has(e.t));
  if (evs.length && evs[0].at < now - 4 * DAY && (!lastPoop || lastPoop.at < now - 3 * DAY)) out.push({ emoji: '🍐', text: `No poop logged for ${lastPoop ? Math.floor((now - lastPoop.at) / DAY) : 'several'} days. Holding it in is the most common snag: see Guides › Poop worries.`, open: 'guides' });
  return out;
}

// ---- The potty timer ----
// state.timers[kid] = {on, every (minutes), from (ms: the last pee, accident or try), pause (ms: no reminders
// until then, for a nap or an outing)}. The child's sleep (kid.bed to kid.wake) has no reminders: the first sit
// is on waking.
const asleepAt = (kid, ms) => { const m = minuteOf(ms), bed = hhmmMin(kid.bed || '19:30'), wake = hhmmMin(kid.wake || '07:00'); return bed > wake ? m >= bed || m < wake : m >= bed && m < wake; };
// When the next try is due (ms), or null: off, paused, or due while the child is asleep.
function nextTry(timer, kid, now) {
  if (!timer || !timer.on || !Number.isFinite(timer.from) || !(timer.every > 0)) return null;
  if (timer.pause && timer.pause > now) return null;
  const due = Math.max(timer.from + timer.every * MIN, timer.pause || 0);
  return asleepAt(kid, due) ? null : due;
}
// The timer after an event: what resets it starts it counting again from then, and ends a pause (they're back).
const timerAfter = (timer, e) => timer && RESETS.has(e.t) && e.at >= (timer.from || 0) ? { ...timer, from: e.at, pause: 0 } : timer;

// ---- Stickers and prizes ----
// state.stars[kid][id] = {at, e (the sticker), by, why}; state.prizes[kid][id] = {at, prize, n, by}. kid.goal =
// {n, prize}: n stickers earn the prize. Stickers count from the last prize claimed.
const STICKERS = ['⭐', '🦄', '🦖', '🚒', '🌈', '🐶', '🐱', '🚀', '🍓', '🦋', '🐸', '🐳', '🎈', '🍦', '🐝', '🦁', '🐧', '🚜', '🌻', '🐢'];
function starCount(st, kid) {
  const prizes = Object.values((st.prizes || {})[kid] || {}), since = prizes.reduce((m, p) => Math.max(m, p.at || 0), 0);
  return Object.values((st.stars || {})[kid] || {}).filter(s => s.at > since).length;
}
// Whether an event earns a sticker by itself: kid.stars says for what ('wins', the default: every pee or poop
// in the potty; 'poops': poops only; 'asked': only when the child asked; 'off': stickers by hand only).
function earnsStar(kid, e) {
  const rule = kid.stars || 'wins';
  if (!WINS.has(e.t) || rule === 'off') return false;
  if (rule === 'poops') return e.t !== 'pee';
  if (rule === 'asked') return e.how === 'asked';
  return true;
}

// ---- Milestones ----
// What the child has done for the first time, in the order it happened: {id, emoji, text, at}. A dry day is a day
// before `today` with at least two in the potty and no accidents; days with nothing logged are skipped, as in
// dryStreak.
const MILESTONES = [
  ['firstPee', '💧', 'First pee in the potty'], ['firstPoop', '💩', 'First poop in the potty'],
  ['firstAsk', '🙋', 'Asked to go, all by themselves'], ['dryDay', '☀️', 'First dry day'],
  ['dryOut', '🛒', 'In the potty away from home'], ['dry3', '🌟', 'Three dry days in a row'],
  ['napDry', '😴', 'First dry nap'], ['nightDry', '🌙', 'First dry night'],
  ['dry7', '🏆', 'A whole week dry: daytime trained!'], ['nights7', '🌛', 'Seven dry nights in a row: night trained!'],
];
function milestones(evs, today) {
  const got = new Map(), hit = (id, at) => { if (!got.has(id)) got.set(id, at); };
  let nights = 0;
  for (const e of evs) {
    if (e.t === 'pee' || e.t === 'both') hit('firstPee', e.at);
    if (e.t === 'poop' || e.t === 'both') hit('firstPoop', e.at);
    if (WINS.has(e.t) && e.how === 'asked') hit('firstAsk', e.at);
    if (WINS.has(e.t) && e.where && e.where !== 'home') hit('dryOut', e.at);
    if (e.t === 'napdry') hit('napDry', e.at);
    if (e.t === 'nightdry') { hit('nightDry', e.at); if (++nights >= 7) hit('nights7', e.at); }
    if (e.t === 'nightwet') nights = 0;
  }
  // Dry days, in order: a run of them, skipping up to two days with nothing logged.
  const days = [...new Set(evs.map(e => dayOf(e.at)))].filter(k => k < today).sort();
  let run = 0, prev = null;
  for (const k of days) {
    const s = dayStats(evs, k), at = Math.max(...evs.filter(e => dayOf(e.at) === k).map(e => e.at));
    if (prev && daysBetween(prev, k) > 3) run = 0;
    prev = k;
    if (!s.n) continue;
    if (s.acc || s.wins < 2) { run = 0; continue; }
    run++;
    hit('dryDay', at);
    if (run >= 3) hit('dry3', at);
    if (run >= 7) hit('dry7', at);
  }
  return MILESTONES.filter(([id]) => got.has(id)).map(([id, emoji, text]) => ({ id, emoji, text, at: got.get(id) })).sort((a, b) => a.at - b.at);
}

// ---- Nights ----
// The last `n` mornings' results (nightdry or nightwet), newest first: {day, dry}. The night belongs to the morning.
function nights(evs, n = 14) {
  const byDay = new Map();
  for (const e of evs) if (e.t === 'nightdry' || e.t === 'nightwet') byDay.set(dayOf(e.at), e.t === 'nightdry');
  return [...byDay].sort((a, b) => a[0] < b[0] ? 1 : -1).slice(0, n).map(([day, dry]) => ({ day, dry }));
}
// Whether to try nights without a diaper: most mornings dry for two weeks (10 of the last 14 logged, the last
// 5 all dry). 'ready', 'soon' (5 or more of the last 7 dry), 'notyet', or 'unknown' (under a week logged).
function nightReady(evs) {
  const ns = nights(evs, 14);
  if (ns.length < 7) return 'unknown';
  const dry = ns.filter(x => x.dry).length;
  if (ns.length >= 14 && dry >= 10 && ns.slice(0, 5).every(x => x.dry)) return 'ready';
  return ns.slice(0, 7).filter(x => x.dry).length >= 5 ? 'soon' : 'notyet';
}

// ---- Readiness ----
// The signs (READY, guide.js) a grown-up ticked, with the child's age: 'early' under 18 months whatever the
// signs; then 'ready' with 9 or more of the 13, 'soon' with 5 or more, else 'notyet'.
function readiness(answers, months) {
  const yes = READY.filter(r => answers && answers[r.id]).length, total = READY.length;
  const level = months < 18 ? 'early' : yes >= 9 ? 'ready' : yes >= 5 ? 'soon' : 'notyet';
  return { yes, total, level };
}

// ---- The plan ----
// Each approach (METHODS, guide.js) is a list of stages. The 3-day method moves on by itself, a day at a time
// from kid.start; the others when the grown-up says so (kid.stage). Which stage the child is at on `today`,
// as its index.
function stageIndex(kid, today) {
  const m = METHODS[kid.method];
  if (!m) throw new Error(`unknown potty approach: ${kid.method}`);
  if (!m.byDay) return Math.max(0, Math.min(m.stages.length - 1, kid.stage || 0));
  if (!kid.start || today < kid.start) return 0;
  let day = daysBetween(kid.start, today) + 1;
  for (let i = 0; i < m.stages.length; i++) { day -= m.stages[i].days || 1; if (day <= 0) return i; }
  return m.stages.length - 1;
}
// Whether a ticked task (task: [id, text, kind]) still counts as done on `today`: a 'day' task only on the day it
// was ticked, a 'refill' task until an accident is logged away from home after it was ticked (the spare clothes
// got used), any other for good. `tick` is state.tasks[kid][key] ({at, by}) or undefined.
const AWAY = new Set(['out', 'care', 'away']);
function taskDone(task, tick, evs, today) {
  if (!tick) return false;
  if (task[2] === 'day') return dayOf(tick.at) === today;
  if (task[2] === 'refill') return !evs.some(e => ACCIDENTS.has(e.t) && AWAY.has(e.where) && e.at > tick.at);
  return true;
}
// How the last week counts toward a stage's goal (stage.check, guide.js): {n, of, met}, or null for a stage with
// no check. Only days since the child reached the stage (kid.stageDay, when known) count, so `of` is under 7 in
// the first week.
function stageProgress(evs, kid, stage, today) {
  const c = stage.check;
  if (!c) return null;
  const from = kid.stageDay && kid.stageDay > addDays(today, -6) ? kid.stageDay : addDays(today, -6);
  const of = Math.max(1, daysBetween(from, today) + 1);
  let n = 0;
  for (let i = 0; i < of; i++) {
    const s = dayStats(evs, addDays(from, i));
    if (c.by === 'sat' ? s.wins + s.tries > 0 : c.by === 'win' ? s.wins > 0 : s.wins > 0 && !s.acc) n++;
  }
  return { n, of, met: n >= c.need };
}
// A Learn more page's sources (LEARN, learn.js), in the order they're first cited: the page numbers them so.
function learnRefs(page) {
  const out = [];
  for (const sec of ['why', 'dos', 'donts', 'stuck']) for (const [, ...ids] of page[sec] || []) for (const id of ids) {
    if (!LEARN_SOURCES[id]) throw new Error(`unknown source: ${id}`);
    if (!out.includes(id)) out.push(id);
  }
  return out;
}
// The Learn more pages in reading order: [key, method id, stage index or -1 for the approach itself].
const learnOrder = () => Object.entries(METHODS).flatMap(([mid, m]) => [[mid, mid, -1], ...m.stages.map((s, i) => [s.id, mid, i])]);
// Day N of the plan on `today` (1 on the start day), or 0 before it starts.
const planDay = (kid, today) => kid.start && today >= kid.start ? daysBetween(kid.start, today) + 1 : 0;
// The tip for a day, the same all day and different the next.
const dayTip = (today, list = TIPS) => list[((utcDay(today) % list.length) + list.length) % list.length];

// ---- For other phones and apps ----
// The child's words, with the usual ones where none were given.
const wordsOf = kid => ({ pee: kid.words?.pee || 'pee', poop: kid.words?.poop || 'poop', potty: kid.words?.potty || 'potty' });
// Someone's name: a grown-up on one of the family's phones (state.people), or ''.
const personName = (st, id) => (st.people && st.people[id] && st.people[id].name) || '';

// What's happened from `since` to `now` (ms), for Lately and for Tot Routines: milestones reached and prizes
// earned, newest first: {at, emoji, text, by, kid, open}.
function pottyNews(st, since, now) {
  const out = [];
  for (const [id, k] of Object.entries(st.kids || {})) {
    const evs = kidEvents(st, id);
    for (const m of milestones(evs, dayOf(now))) if (m.at >= since) out.push({ at: m.at, emoji: m.emoji, text: `${k.name}: ${m.text}`, by: '', kid: id, open: 'progress' });
    for (const p of Object.values((st.prizes || {})[id] || {})) if (p.at >= since) out.push({ at: p.at, emoji: '🎁', text: `${k.name} earned ${p.prize || 'a prize'}!`, by: p.by || '', kid: id, open: 'stickers' });
  }
  return out.sort((a, b) => b.at - a.at);
}

// What Tot Routines on this phone gets (FamilyProvider), worked out at `now`, or null before there's a child.
// For each child, what its page shows: the child's name, birthday and Tot Routines id (`rid`, set when Tot
// Routines opened this app for them), the approach and stage, the last eight days' counts, the latest event, the
// timer (Tot Routines works out when the next try is, as it may read this hours later), stickers toward the
// prize, the dry streak, the last week's nights, and the newest milestone. Then the last week's news, by name.
// Notes, who logged what, and where, stay in Tot Potty.
function familySummary(st, now) {
  const kids = Object.entries(st.kids || {});
  if (!kids.length) return null;
  if (!Number.isFinite(now)) throw new Error(`familySummary needs the time, not ${now}`);
  const today = dayOf(now);
  return {
    v: 1,
    kids: kids.map(([id, k]) => {
      const evs = kidEvents(st, id), days = {}, m = METHODS[k.method], ms = milestones(evs, today);
      for (const d of weekStats(evs, today, 8)) if (d.n) days[d.day] = { wins: d.wins, pee: d.pee, poop: d.poop, acc: d.acc, tries: d.tries, dry: d.dry, asked: d.asked };
      const last = [...evs].reverse().find(e => WINS.has(e.t) || ACCIDENTS.has(e.t) || e.t === 'try');
      const lastPee = [...evs].reverse().find(e => PEES.has(e.t));
      return { id, rid: k.rid || '', name: k.name, birth: k.birth || '', words: wordsOf(k),
        method: m ? m.name : '', stage: m && k.start ? m.stages[stageIndex(k, today)].title : '', start: k.start || '',
        bed: k.bed || '19:30', wake: k.wake || '07:00', timer: (st.timers || {})[id] || null,
        days, last: last ? { t: last.t, at: last.at } : null, lastPee: lastPee ? lastPee.at : null,
        stars: { n: starCount(st, id), goal: k.goal?.n || 0, prize: k.goal?.prize || '' },
        streak: dryStreak(evs, today), nights: nights(evs, 7), milestone: ms.length ? ms.at(-1) : null,
        trained: ms.some(x => x.id === 'dry7'), nightTrained: ms.some(x => x.id === 'nights7') };
    }),
    news: pottyNews(st, now - 7 * DAY, now).slice(0, 20).map(n => ({ ...n, by: personName(st, n.by) })),
  };
}

// The notifications this phone sets (the app's Reminders): for each child it reminds about (`mine`, a set of
// kid ids), the next try while the timer runs: {when, title, text, open, kid, buttons}. `buttons`, the alarm
// screen's log buttons in the child's words: [{t, label}].
function reminderList(st, now, mine) {
  const out = [];
  for (const [id, k] of Object.entries(st.kids || {})) {
    if (!mine.has(id)) continue;
    const t = (st.timers || {})[id], due = nextTry(t, k, now);
    if (due === null || due < now - 10 * MIN) continue;
    const w = wordsOf(k);
    out.push({ when: due, title: `Time for ${k.name} to try the ${w.potty}`, text: `It's been ${t.every} minutes. Say "It's ${w.potty} time" and go together: a statement, not a question.`, open: 'home', kid: id,
      buttons: ALARM.map(t => ({ t, label: `${EVENT[t].emoji} ${quickWords(t, k)}` })) });
  }
  return out.sort((a, b) => a.when - b.when);
}
// A log button's words (plain text), in the child's words for pee and poop.
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const quickWords = (t, k) => { const w = wordsOf(k); return { pee: cap(w.pee), poop: cap(w.poop), both: `${cap(w.pee)} + ${w.poop}`, wet: 'Wet accident', dirty: `${cap(w.poop)} accident`, try: 'Sat, nothing', dry: 'Still dry' }[t]; };

// ---- Words to send ----
const clockWords = ms => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
// A note for a babysitter, grandparent or daycare: the child's words, where they are, how often to try, the
// patterns, what to do after an accident, and the rewards. Plain text, to share or print.
function handoffText(st, id, now) {
  const k = st.kids[id], w = wordsOf(k), evs = kidEvents(st, id), today = dayOf(now), m = METHODS[k.method];
  const t = (st.timers || {})[id], lines = [`Potty notes for ${k.name}${k.birth ? ` (${ageWords(ageMonths(k.birth, today))})` : ''}`, ''];
  lines.push(`Words: we say "${w.pee}" for pee, "${w.poop}" for poop, and "${w.potty}" for the potty.`);
  if (m && k.start) lines.push(`Where we are: ${m.name}, ${m.stages[stageIndex(k, today)].title.toLowerCase()}.`);
  if (k.gear) lines.push(`Wearing: ${k.gear}.`);
  lines.push(t && t.on ? `How often: take ${k.name} to try every ${t.every} minutes, and always on waking, after meals, and before going out or in the car.`
    : `How often: on waking, after meals, before going out or in the car, and whenever ${k.name} wiggles, goes quiet or hides.`);
  const lastPee = [...evs].reverse().find(e => PEES.has(e.t) && dayOf(e.at) === today);
  if (lastPee) lines.push(`Last pee today: ${clockWords(lastPee.at)}.`);
  const pw = poopWindow(evs, now), hour = h => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
  if (pw) lines.push(`${k.name} usually poops between ${hour(pw.from)} and ${hour(pw.to)}.`);
  lines.push('', `How to ask: say "It's ${w.potty} time" and go together, rather than "Do you need to go?" (the answer is nearly always no).`);
  lines.push(`Sitting: a minute or two with feet on a stool, a book or a song. If nothing comes, that's fine: "Let's try again later."`);
  lines.push(`After an accident: stay calm and matter-of-fact. "Oops, ${w.pee} goes in the ${w.potty}. Let's get changed." Then a sit on the ${w.potty}. No scolding, no shaming: it slows things down.`);
  lines.push(`Wiping and hands: front to back, then wash hands with soap, singing the ABCs.`);
  if (k.stars !== 'off') lines.push(`Rewards: a sticker for each ${k.stars === 'poops' ? w.poop : k.stars === 'asked' ? 'trip they ask for' : `${w.pee} or ${w.poop}`} in the ${w.potty}${k.goal?.n ? ` (${starCount(st, id)} of ${k.goal.n} toward ${k.goal.prize || 'a prize'})` : ''}. Lots of cheering helps too.`);
  if (k.notes) lines.push('', k.notes);
  lines.push('', 'Thank you for helping! Made with Tot Potty.');
  return lines.join('\n');
}
// The last 7 days, for the doctor, daycare or the other grown-up: a line a day, then what the patterns say.
function reportText(st, id, now) {
  const k = st.kids[id], evs = kidEvents(st, id), today = dayOf(now);
  const lines = [`${k.name}'s potty week, to ${parseDay(today).toLocaleDateString([], { month: 'long', day: 'numeric' })}`, ''];
  for (const d of weekStats(evs, today)) {
    const name = parseDay(d.day).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    lines.push(d.n ? `${name}: ${d.pee} pee, ${d.poop} poop in the potty; ${d.acc} accident${d.acc === 1 ? '' : 's'}${d.asked ? `; asked ${d.asked} time${d.asked === 1 ? '' : 's'}` : ''}${d.rate !== null ? ` (${Math.round(d.rate * 100)}%)` : ''}` : `${name}: nothing logged`);
  }
  const ns = nights(evs, 7);
  if (ns.length) lines.push('', `Nights: dry ${ns.filter(n => n.dry).length} of the last ${ns.length} logged.`);
  lines.push('', `Dry streak: ${dryStreak(evs, today)} day${dryStreak(evs, today) === 1 ? '' : 's'}.`);
  for (const i of insights(evs, k, now)) lines.push(`${i.emoji} ${i.text}`);
  return lines.join('\n');
}
