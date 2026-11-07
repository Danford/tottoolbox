// Tot Routines logic with no DOM: ages, building a routine for an age, the day plan, streaks.
// Plain browser script (globals), loaded after data.js; also run by test/routines.test.js.

// Whole months between a YYYY-MM-DD birthday and a Date (today). A month only counts once its day is reached.
function ageMonths(birth, today) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth);
  if (!m) throw new Error(`birthday must be YYYY-MM-DD, got ${JSON.stringify(birth)}`);
  let months = (today.getFullYear() - Number(m[1])) * 12 + (today.getMonth() + 1 - Number(m[2]));
  if (today.getDate() < Number(m[3])) months--;
  return months;
}

// "15 months" under two, then years with a half: "2 years", "2½ years".
function ageLabel(months) {
  if (months < 0) return 'not born yet';
  if (months < 24) return months === 1 ? '1 month' : `${months} months`;
  const y = Math.floor(months / 12), half = months % 12 >= 6 ? '½' : '';
  return `${y}${half} years`;
}

// The band for an age, and a note when the child is outside the ages the app is written for.
function bandFor(months) {
  if (months < MIN_MONTHS) return { band: BANDS[0], note: 'This app is written for 1 to 7 year olds. Under one, a routine is mostly you doing the same calm steps in the same order; the bedtime routine below is a good place to start.' };
  if (months >= MAX_MONTHS) return { band: BANDS[BANDS.length - 1], note: 'This app is written for 1 to 7 year olds. Older children can run these routines alone and help write their own.' };
  return { band: BANDS.find(b => months < b.to), note: null };
}

// What a step looks like for a band, or null when it isn't suggested at that age.
function expectFor(key, bandId) {
  const step = STEPS[key];
  if (!step) throw new Error(`unknown step ${key}`);
  return step.expect[bandId] || null;
}

// A step's picture and name: built-in steps from STEPS, the grown-up's own from the routine's step itself.
function stepInfo(s) {
  if (s.custom) return { emoji: s.emoji, label: s.label };
  const step = STEPS[s.key];
  if (!step) throw new Error(`unknown step ${s.key}`);
  return { emoji: step.emoji, label: step.label };
}

// A new routine from a template, with the steps that suit the band. Extras and steps for older children are
// left out; "Add a step" offers them.
function newRoutine(templateId, bandId, id) {
  const t = TEMPLATES.find(t => t.id === templateId);
  if (!t) throw new Error(`unknown routine template ${templateId}`);
  const extra = t.extra || [];
  return {
    id, template: t.id, name: t.name, emoji: t.emoji, when: t.when,
    steps: t.steps.filter(key => expectFor(key, bandId) && !extra.includes(key)).map(key => ({ key })),
  };
}

// A nap routine is called what the child has: "Nap" while they nap, "Quiet time" once they don't. Only a name
// (and emoji) the app gave it follows along; one typed in is kept. Before 1.77 it was "Nap / quiet time".
const REST_NAMES = ['Nap / quiet time', 'Nap or quiet time', 'Nap', 'Quiet time'];
function nameRest(r, naps) {
  if (r.template !== 'nap' || !REST_NAMES.includes(r.name)) return false;
  const name = naps ? 'Nap' : 'Quiet time', emoji = r.emoji === '😴' || r.emoji === '🧸' ? (naps ? '😴' : '🧸') : r.emoji;
  if (r.name === name && r.emoji === emoji) return false;
  Object.assign(r, { name, emoji });
  return true;
}

// Version 1.1 and earlier kept switched-off steps in a routine; now a step is either in it or not.
function dropOffSteps(r) {
  r.steps = r.steps.filter(s => s.on !== false).map(({ on, ...s }) => s);
  return r;
}

// Steps "Add a step" offers: ones that suit the age and aren't in the routine, its own template's first.
function stepSuggestions(r, bandId) {
  const have = new Set(r.steps.map(s => s.key));
  const t = TEMPLATES.find(t => t.id === r.template);
  const own = t ? t.steps : [];
  const keys = [...new Set([...own, ...Object.keys(STEPS)])];
  return keys.filter(k => !have.has(k) && expectFor(k, bandId));
}

const onSteps = r => r.steps;

// Advice on a routine's length for a band: null when it fits.
function lengthAdvice(r, band) {
  const n = onSteps(r).length;
  if (n === 0) return 'Switch on at least one step.';
  if (n > band.maxSteps) return `${n} steps is a lot at this age. Aim for ${band.maxSteps} or fewer: drop one, or combine two (pajamas and teeth can be one picture).`;
  return null;
}

// Day plan from a wake-up time ("07:00"), the band and whether they still nap.
// Night sleep, wake time before the nap and nap length are typical values for the band; the result is
// checked against the band's recommended total sleep.
const PLAN = {
  t1: { night: 11.5, before: 5, nap: 2 },
  t2: { night: 11, before: 5.5, nap: 1.75 },
  t3: { night: 10.5, before: 6, nap: 1.25, noNapNight: 11 },
  t4: { night: 11, before: 6, nap: 1, noNapNight: 11 },
  t5: { night: 10.5, before: 6.5, nap: 0, noNapNight: 10.5 },
};
const toMin = hhmm => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) throw new Error(`time must be HH:MM, got ${JSON.stringify(hhmm)}`);
  return Number(m[1]) * 60 + Number(m[2]);
};
const toHHMM = min => {
  min = ((Math.round(min / 5) * 5) % 1440 + 1440) % 1440;
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
};
// "19:30" -> "7:30 pm", or "19:30", as the phone shows times. The tests pin it to one language.
let clockFormat = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' });
function clock(hhmm) {
  const m = toMin(hhmm);
  return clockFormat.formatToParts(new Date(2000, 0, 1, Math.floor(m / 60) % 24, m % 60))
    .map(p => p.type === 'dayPeriod' ? p.value.toLowerCase() : p.type === 'literal' && !p.value.trim() ? ' ' : p.value).join('');
}
// The latest "asleep by": a late riser still goes to bed that evening, not after midnight.
const LATEST_BED = 23 * 60 + 30;
// 11.75 -> "11¾"
const hoursWords = h => { const q = Math.round(h * 4), w = Math.floor(q / 4), f = ['', '¼', '½', '¾'][q % 4]; return (w || !f ? String(w) : '') + f; };
// own: the times a grown-up set themselves (the child's `times`), {nap: {start, end}, quiet: {start, end},
// bed}, each kept over the typical one. The same every day, school or not: a steady rhythm is what helps.
function dayPlan(wake, band, napping, own) {
  const p = PLAN[band.id], w = toMin(wake);
  const night = napping ? p.night : (p.noNapNight || p.night);
  const bed = ((Math.round((w - night * 60) / 5) * 5) % 1440 + 1440) % 1440;
  const plan = { wake: toHHMM(w), bedtime: toHHMM(bed < 720 || bed > LATEST_BED ? LATEST_BED : bed), nap: null, quiet: null };
  if (napping) plan.nap = { start: toHHMM(w + p.before * 60), end: toHHMM(w + (p.before + p.nap) * 60) };
  else plan.quiet = { start: toHHMM(w + p.before * 60), end: toHHMM(w + p.before * 60 + 45) };
  plan.total = night + (napping ? p.nap : 0);
  plan.range = band.sleep.total;
  if (!own) return plan;
  // Evening minutes: just past midnight counts as late, not early.
  const eve = t => { const m = toMin(t); return m < 720 ? m + 1440 : m; };
  if (own.bed) plan.bedtime = own.bed;
  if (napping && own.nap) plan.nap = { ...own.nap };
  if (!napping && own.quiet) plan.quiet = { ...own.quiet };
  const napH = plan.nap ? ((toMin(plan.nap.end) - toMin(plan.nap.start) + 1440) % 1440) / 60 : 0;
  plan.total = (w + 1440 - eve(plan.bedtime) + 1440) % 1440 / 60 + napH;
  return plan;
}

// ---- A day that runs off its times ----
// Up early, a nap at another time, a sick day: the rest of today moves with it, the next nap and bedtime, and a
// second nap when the gap to bedtime is too long to stay awake. Awake time after the nap before they're
// overtired, typical for the band (sleep guides give roughly 4 to 5 hours at 1, 5 to 6 by 3); a sick child
// tires sooner and sleeps longer.
const AFTER_NAP = { t1: 4.5, t2: 5, t3: 5.5, t4: 6, t5: 6.5 };
const SHIFT_AT = 30;              // minutes off the usual before the day moves
const EARLIEST_BED = 18 * 60;     // an early bedtime, but not before 6 pm
const LATEST_NAP2 = 16 * 60 + 30; // a second nap after this eats into the night
// Sleep short of the usual by this much, a night or a nap, and the day makes up for it: tired sooner, a longer
// nap, a second one, bed sooner. Up to an hour sooner, half of what was missed: a sooner bedtime is how a young
// child catches up (a later morning upsets the next day).
const SHORT_BY = 45;
const catchUp = less => Math.min(60, Math.round(less / 10) * 5);
// usual: their dayPlan. got: today so far, as put in, {up (minutes), night (minutes asleep last night, when
// both ends were put in), nap and nap2 ({start, end}, minutes, end null while still asleep), noNap (marked
// missed), sick, fixed (a school or daycare day: only bedtime moves, for a short night)}. The day's times as dayPlan's,
// with nap2 ({start, end} or null), restNap (no nap any more, but today one would help), short ({night,
// nightLess, nap, napLess}, minutes, when sleep was short) and why: what moved it ('early', 'late', 'nap',
// 'noNap', 'sick', 'shortNight', 'shortNap'); none, and it's the usual day.
function dayShift(usual, band, napping, got) {
  const sick = !!got.sick, why = [];
  const out = { ...usual, nap: usual.nap && { ...usual.nap }, quiet: usual.quiet && { ...usual.quiet }, nap2: null, restNap: false, short: null, why };
  const eve = m => m < 720 ? m + 1440 : m, span = r => ({ start: toHHMM(r.start), end: toHHMM(r.end) });
  const w0 = toMin(usual.wake), up = got.up ?? w0, off = up - w0, bed0 = eve(toMin(usual.bedtime));
  const fit = b => toHHMM(Math.max(Math.min(EARLIEST_BED, bed0), Math.min(LATEST_BED, b)));
  // Last night against their usual night.
  const nightLess = got.night != null && w0 + 1440 - bed0 - got.night >= SHORT_BY ? w0 + 1440 - bed0 - got.night : 0;
  if (nightLess) out.short = { night: got.night, nightLess };
  if (got.fixed) {
    if (nightLess) { why.push('shortNight'); out.bedtime = fit(bed0 - catchUp(nightLess)); }
    return out;
  }
  if (off <= -SHIFT_AT) why.push('early'); else if (off >= SHIFT_AT) why.push('late');
  if (sick) why.push('sick');
  if (nightLess) why.push('shortNight');
  // Sick or short of sleep: tired sooner, and sleeping longer.
  const tired = sick || nightLess > 0;
  if (!napping) {
    // Quiet time: a nap, if they're tired, after an early start, a short night or on a sick day; bed up to an hour sooner.
    out.restNap = tired || off <= -60;
    if (off <= -SHIFT_AT || nightLess) out.bedtime = fit(bed0 - Math.max(Math.min(60, -off), catchUp(nightLess)));
    return out;
  }
  const p = PLAN[band.id], u = { start: toMin(usual.nap.start), end: toMin(usual.nap.end) }, usualLen = (u.end - u.start + 1440) % 1440;
  const len = usualLen + (tired ? 30 : 0);
  // A full nap put in, about as long as the usual one or longer, makes up for it: after it they're awake as long
  // as on any day (a sick child's second nap is still the longer one).
  const rested = !!got.nap && got.nap.end != null && got.nap.end - got.nap.start > usualLen - SHIFT_AT;
  const maxAfter = AFTER_NAP[band.id] * 60 * (tired && !rested ? 0.85 : 1);
  let n1;
  if (got.nap) {
    n1 = { start: got.nap.start, end: got.nap.end ?? got.nap.start + len };
    if (Math.abs(n1.start - u.start) >= SHIFT_AT || got.nap.end != null && Math.abs(n1.end - n1.start - len) >= SHIFT_AT) why.push('nap');
    // Woke from it well short of their usual nap.
    if (got.nap.end != null && usualLen - (n1.end - n1.start) >= SHORT_BY) {
      why.push('shortNap');
      out.short = { ...out.short, nap: n1.end - n1.start, napLess: usualLen - (n1.end - n1.start) };
    }
  } else if (got.noNap) { n1 = null; why.push('noNap'); }
  else if (why.length) {
    // From when they got up, but a late riser's nap no more than an hour later, to keep bedtime.
    const s = Math.min(up + p.before * 60 * (tired ? 0.85 : 1), u.start + 60);
    n1 = { start: s, end: s + len };
  } else n1 = u;
  if (!why.length) return out;
  if (n1) out.nap = span(n1); // a nap marked missed keeps its usual time, to show as missed
  // Short of sleep: bed sooner by half of it, less what a second nap makes up.
  const owed = out.short ? (out.short.nightLess || 0) + (out.short.napLess || 0) : 0, bedBy = less => less > 0 ? bed0 - catchUp(less) : bed0;
  if (got.nap2) out.nap2 = { start: got.nap2.start, end: got.nap2.end ?? got.nap2.start + (tired ? 60 : 45) };
  else if (n1 && bedBy(owed) - n1.end > maxAfter + 30) {
    // Halfway between the nap and bedtime, short, and not so late it spoils the night.
    const l2 = tired ? 60 : 45, win = Math.min(maxAfter, (bedBy(owed) - n1.end - l2) / 2), s = n1.end + win;
    if (win >= (tired ? 120 : 150) && s <= LATEST_NAP2) out.nap2 = { start: s, end: s + l2 };
  }
  if (!n1 && !out.nap2) out.bedtime = fit(Math.min(bed0 - 60, bedBy(owed))); // no nap: an hour sooner
  else {
    // Awake no longer than they manage after the last nap; after a late one, up to an hour later (not on a day
    // short of sleep).
    // Rested by a full nap, awake before bed at least as long as on their usual day after its nap (an older
    // toddler's usual stretch is longer than the band's), so a short second nap doesn't pull bed well sooner.
    const lastAfter = rested ? Math.max(maxAfter, bed0 - u.end) : maxAfter;
    const from = (out.nap2 || n1).end, bed = bedBy(owed - (out.nap2 ? out.nap2.end - out.nap2.start : 0));
    out.bedtime = bed - from > lastAfter ? fit(from + lastAfter) : bed - from < 180 && !owed ? fit(Math.min(bed0 + 60, from + 180))
      : bed === bed0 ? usual.bedtime : fit(bed);
  }
  if (out.nap2) out.nap2 = span(out.nap2);
  return out;
}

// A nap or bedtime routine leads into the sleep, so on a day that's moved (dayShift's `why`), it moves with it:
// as long before the nap or asleep-by as it usually is (up to an hour and a half; one set after it, half an
// hour before). Once the nap is put in, the nap routine is for a second nap; with none to come (none planned, or
// it's put in too) it has no time today, as there's no sleep left for it to lead into.
// r: the routine; usual: dayPlan's times; t: dayShift's; napDone, nap2Done: the nap, the second nap is put in.
// HH:MM, r.when unmoved, or null.
const LEAD_MAX = 90;
function routineTime(r, usual, t, napDone, nap2Done) {
  if (r.when && r.template === 'nap' && napDone && (!t.nap2 || nap2Done)) return null;
  if (!r.when || !t.why.length || (r.template !== 'nap' && r.template !== 'bedtime')) return r.when;
  const eve = m => m < 720 ? m + 1440 : m, w = toMin(r.when);
  let from, to;
  if (r.template === 'bedtime') { from = eve(toMin(usual.bedtime)); to = eve(toMin(t.bedtime)); }
  else {
    const rest = usual.nap || usual.quiet, now = napDone ? t.nap2 : t.nap || t.quiet;
    if (!rest || !now) return r.when;
    from = toMin(rest.start); to = toMin(now.start);
  }
  const gap = from - (r.template === 'bedtime' ? eve(w) : w), lead = gap >= 0 && gap <= LEAD_MAX ? gap : gap > LEAD_MAX ? LEAD_MAX : 30;
  return toHHMM(Math.max(toMin(t.wake), to - lead));
}

// The family page's day by time: every child's rows in parts of the day, in order. A row's time is `min`
// (minutes from midnight); one without a time of its own (a planned activity) has `about`, roughly when, to
// sort by but not show; one with neither (a routine with no time) is any time today.
const DAY_PARTS = [['morning', '🌅 Morning'], ['afternoon', '🌤️ Afternoon'], ['evening', '🌙 Evening'], ['any', '🕐 Any time today']];
const partOf = min => min < 720 ? 'morning' : min < 1020 ? 'afternoon' : 'evening';
function familyTimeline(rows) {
  const at = r => r.min ?? r.about, key = r => at(r) == null ? 'any' : partOf(at(r));
  return DAY_PARTS.map(([part, title]) => ({ part, title, rows: rows.filter(r => key(r) === part)
    .sort((a, b) => (at(a) ?? 0) - (at(b) ?? 0)) })).filter(p => p.rows.length);
}

// Local date as YYYY-MM-DD.
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Days in a row a routine was finished, ending today, or yesterday if today isn't done yet.
// `counts(date)`: whether a day is one the routine is for (a School morning, school days); the others neither
// add to the streak nor break it. Looks back at most a year.
function streak(done, childId, routineId, today, counts = () => true) {
  const isDone = d => !!(done[dayKey(d)] && done[dayKey(d)][childId] && done[dayKey(d)][childId][routineId]);
  const d = new Date(today);
  if (!isDone(d)) d.setDate(d.getDate() - 1);
  let n = 0;
  for (let i = 0; i < 366; i++, d.setDate(d.getDate() - 1)) {
    if (isDone(d)) n++;
    else if (counts(d)) break;
  }
  return n;
}

// A step's photo and recording are named for the child and the step, so a photo of Sam's toothbrush shows in
// every routine of Sam's that brushes teeth. The phone keeps them as files under this name.
function mediaName(childId, key) {
  const name = `${childId}-${key}`;
  if (!/^[A-Za-z0-9-]+$/.test(name)) throw new Error(`bad media name ${JSON.stringify(name)}`);
  return name;
}

// How many minutes before a routine's usual time its reminder goes off.
const REMIND_BEFORE = 10;
// "00:05" minus 10 -> "23:55". Exact to the minute, unlike the day plan's rounded times.
function minusMinutes(hhmm, n) {
  const m = ((toMin(hhmm) - n) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// ---- School days ----
// A child's school: { kind, days: [weekday], leave: 'HH:MM', home: 'HH:MM', to: way, toWhere, from: way, fromWhere,
// byDay: { weekday: { home, amWho, pmWho } }, off: [{ from, to, name }], remind }. Ways are SCHOOL.to / SCHOOL.from
// keys; byDay holds what changes on one weekday (early release, a different driver). kind 'home' is homeschool:
// leave and home are when lessons start and finish, with no way there or back. off: the days with no school,
// YYYY-MM-DD to YYYY-MM-DD inclusive (summer, holidays, a year-round school's track-outs, a snow day).

// The break `day` (YYYY-MM-DD) falls in, or null.
const schoolOff = (school, day) => (school.off || []).find(b => b.from <= day && day <= b.to) || null;

// One day (a Date) at school: when they leave and get home, how, where and with whom. null if not a school day.
function schoolDay(school, date) {
  if (!date || typeof date.getDay !== 'function') throw new Error(`schoolDay wants a Date, not ${JSON.stringify(date)}`);
  const weekday = date.getDay(), k = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (!school || !school.days.includes(weekday) || schoolOff(school, k)) return null;
  const day = (school.byDay || {})[weekday] || {};
  if (school.kind === 'home') return { kind: 'home', leave: school.leave, home: day.home || school.home, to: null, from: null };
  const to = SCHOOL.to[school.to], from = SCHOOL.from[school.from];
  if (!to || !from) throw new Error(`unknown way to or from school: ${school.to}, ${school.from}`);
  return {
    kind: 'out', leave: school.leave, home: day.home || school.home,
    to: { way: school.to, where: school.toWhere || null, who: to.who && day.amWho || null },
    from: { way: school.from, where: school.fromWhere || null, who: from.who && day.pmWho || null },
  };
}

// Up at least an hour before leaving on a school day; half an hour before homeschool lessons start.
const SCHOOL_WAKE_BEFORE = 60, HOMESCHOOL_WAKE_BEFORE = 30;

// What might not work in a child's times, in words, for their setup page: too little or too much sleep for
// their age, too little time between getting up and leaving for school, a bedtime routine that starts too
// late to be asleep in time or long before. The times are the same every day, so a school morning that
// doesn't fit moves the whole day earlier, bedtime with it. plan: their dayPlan; typical: the one with none of
// their own times; school: { leave, kind, way } or null; routine: the Bedtime routine's time, or null.
const WAY_WORDS = { bus: 'leaving for the bus', carpool: 'leaving for carpool', drive: 'leaving for school',
  walk: 'walking to school', home: 'lessons start' };
function timeWarnings(name, band, plan, typical, school, routine) {
  const out = [], [lo, hi] = band.sleep.total, eve = t => { const m = toMin(t); return m < 720 ? m + 1440 : m; };
  if (plan.total < lo) out.push(`${name} gets about ${hoursWords(plan.total)} hours of sleep, less than the ${lo}–${hi} recommended at this age.`
    + (eve(typical.bedtime) < eve(plan.bedtime) ? ` Asleep by ${clock(typical.bedtime)} would give about ${hoursWords(typical.total)}.` : ''));
  else if (plan.total > hi) out.push(`${name} gets about ${hoursWords(plan.total)} hours of sleep, more than the ${lo}–${hi} recommended at this age. Too much can mean a long fight at bedtime.`);
  const sw = school && schoolWarning(plan, school);
  if (sw) out.push(sw.join(' '));
  if (routine) {
    const r = eve(routine), b = eve(plan.bedtime);
    if (r > b - 15) out.push(`The Bedtime routine at ${clock(routine)} is too late to be asleep by ${clock(plan.bedtime)}. Start it 20–30 minutes before.`);
    else if (b - r > 60) out.push(`The Bedtime routine at ${clock(routine)} starts ${hoursWords((b - r) / 60)} hours before asleep by ${clock(plan.bedtime)}. 20–30 minutes before is usually enough, with time for an evening activity before it.`);
  }
  return out;
}
// Too little time between up and leaving for school: what's wrong, then what would fit, as sentences (the
// child's page shows only the first); null when there's time.
function schoolWarning(plan, school) {
  const before = school.kind === 'home' ? HOMESCHOOL_WAKE_BEFORE : SCHOOL_WAKE_BEFORE;
  const gap = toMin(school.leave) - toMin(plan.wake), what = WAY_WORDS[school.kind === 'home' ? 'home' : school.way];
  if (!what) throw new Error(`unknown way to school: ${school.way}`);
  if (gap >= before) return null;
  const upBy = minusMinutes(school.leave, before), bed = minusMinutes(plan.bedtime, before - gap);
  return [`Up at ${clock(plan.wake)} is ${gap <= 0 ? 'no time' : `only ${gap} minutes`} before ${what} at ${clock(school.leave)}.`,
    `Getting up, dressed, fed and out the door usually takes ${before === 60 ? 'about an hour' : 'half an hour'}.`,
    `To keep the same times every day: up by ${clock(upBy)} and asleep by ${clock(bed)}, school or not.`];
}

// A school day in words: rows for the day list and picture board ({ emoji, label, sub }), and what to tell
// the child in the morning.
function schoolWords(sd) {
  const w = (s, pre) => s ? `${pre}${s}` : '';
  if (sd.kind === 'home') {
    const S = clock(sd.leave), E = clock(sd.home);
    return { leave: { emoji: '📚', label: 'Homeschool', sub: `${S} · Lessons start` }, home: { emoji: '✅', label: 'Lessons done', sub: `${E} · Free time` },
      say: `It's a school day at home. Lessons start at ${S} and finish at ${E}.` };
  }
  const { to, from } = sd, L = clock(sd.leave), H = clock(sd.home);
  const toLabel = {
    bus: `Bus${w(to.where, ' at ')}`, carpool: `Carpool${w(to.who, ' with ')}`,
    drive: to.who ? `${to.who} drives to school` : 'Drive to school', walk: `Walk to school${w(to.who, ' with ')}`,
  }[to.way];
  const fromLabel = {
    bus: 'Bus home', carpool: `Carpool home${w(from.who, ' with ')}`, pickup: from.who ? `${from.who} picks up` : 'Pick-up',
    aftercare: from.who ? `After-school program, ${from.who} picks up` : 'After-school program', walk: `Walk home${w(from.who, ' with ')}`,
  }[from.way];
  const toSay = {
    bus: `We leave for the bus at ${L}.`, carpool: `We leave at ${L} for carpool${w(to.who, ' with ')}.`,
    drive: `We leave for school at ${L}${w(to.who, ', and ')}${to.who ? ' drives you' : ''}.`, walk: `We walk to school at ${L}${w(to.who, ' with ')}.`,
  }[to.way];
  const fromSay = {
    bus: `After school, the bus brings you home${w(from.where, ' to ')}.`,
    carpool: `After school, ${from.who ? `${from.who} drives you home` : 'carpool brings you home'}.`,
    pickup: `After school, ${from.who ? `${from.who} will` : 'we\'ll'} pick you up${w(from.where, ' at ')}.`,
    aftercare: `After school, you go to your after-school program${from.who ? `, and ${from.who} picks you up there` : ''}.`,
    walk: `After school, you walk home${w(from.who, ' with ')}.`,
  }[from.way];
  return {
    leave: { emoji: SCHOOL.to[to.way].emoji, label: toLabel, sub: `${L} · Leave for school${w(to.where && to.way !== 'bus' ? to.where : '', ' · ')}` },
    home: { emoji: SCHOOL.from[from.way].emoji, label: fromLabel, sub: `${H} · ${from.way === 'pickup' || from.way === 'aftercare' ? 'Pick-up' : 'Home'}${w(from.where, ' · ')}` },
    say: `It's a school day. ${toSay} ${fromSay}`,
  };
}

// ---- Another home ----
// A child who lives part of the time at another home, a parent's (custody): `away` { who, start, weeks, stays,
// dates, remind }. `who`: whose home it is ("Dad"). `stays`: the usual schedule, [{ wk, from, fromAt, to, toAt }],
// weekdays (0 Sunday) and 'HH:MM', so Friday 15:15 to Sunday 18:00; with `weeks` 2 it's every other week, `wk` 0
// the week of `start` (YYYY-MM-DD) and every second one after, 1 the others. `dates`: holidays and swaps, in the
// order they were put in, each [{ name, from, to, here, every }] with 'YYYY-MM-DDTHH:MM': there (or, with `here`,
// with us though the usual schedule says there), just that once (`every` 0) or the same dates every year (1) or
// every other year from that one (2), as holidays that switch each year do. A later one wins over an earlier.
// Nothing of a day's plan is shown, reminded or counted in a streak while they're away.

const stamp = (s) => { const [d, t = '00:00'] = s.split('T'), [y, m, dd] = d.split('-').map(Number), [h, mi] = t.split(':').map(Number); return new Date(y, m - 1, dd, h, mi).getTime(); };
const midnight = (d, add = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + add);
const atTime = (day, hhmm) => { const [h, m] = hhmm.split(':').map(Number); return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).getTime(); };
// Ranges [from, to) in ms: joined, and one taken out of the rest.
function joinRanges(rs) {
  const out = [];
  for (const r of [...rs].sort((a, b) => a[0] - b[0])) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else out.push([r[0], r[1]]);
  }
  return out;
}
const cutRange = (rs, [a, b]) => rs.flatMap(([x, y]) => y <= a || x >= b ? [[x, y]] : [...x < a ? [[x, a]] : [], ...y > b ? [[b, y]] : []]);

// The times away overlapping [from, to) (ms), joined and in order: [[start, end]], each whole, not cut to the range.
function awayStays(away, from, to) {
  if (!away) return [];
  const weeks = away.weeks === 2 ? 2 : 1, base = midnight(new Date(stamp(away.start || '2026-01-05')));
  const baseMon = midnight(base, -((base.getDay() + 6) % 7));
  let rs = [];
  // The usual schedule, from the Monday two weeks before (a stay that started then may still be going on).
  const f = new Date(from);
  for (let mon = midnight(f, -((f.getDay() + 6) % 7) - 14); mon.getTime() < to; mon = midnight(mon, 7)) {
    const w = Math.round((Date.UTC(mon.getFullYear(), mon.getMonth(), mon.getDate()) - Date.UTC(baseMon.getFullYear(), baseMon.getMonth(), baseMon.getDate())) / 6048e5);
    for (const s of away.stays || []) {
      if (((w - (s.wk || 0)) % weeks + weeks) % weeks) continue;
      const a = (s.from + 6) % 7;
      let b = (s.to + 6) % 7;
      if (b < a || (b === a && s.toAt <= s.fromAt)) b += 7;
      rs.push([atTime(midnight(mon, a), s.fromAt), atTime(midnight(mon, b), s.toAt)]);
    }
  }
  rs = joinRanges(rs);
  // Holidays and swaps, in order, each over what came before; one that repeats, in the years around the range.
  const y0 = new Date(from).getFullYear() - 1, y1 = new Date(to).getFullYear() + 1;
  for (const d of away.dates || []) {
    const fy = Number(d.from.slice(0, 4)), shifts = [];
    if (!d.every) shifts.push(0);
    else for (let y = y0; y <= y1; y++) if (y >= fy && (y - fy) % d.every === 0) shifts.push(y - fy);
    for (const k of shifts) {
      const shift = s => String(Number(s.slice(0, 4)) + k) + s.slice(4);
      const r = [stamp(shift(d.from)), stamp(shift(d.to))];
      if (r[1] <= r[0]) continue;
      rs = d.here ? cutRange(rs, r) : joinRanges([...rs, r]);
    }
  }
  return rs.filter(([a, b]) => b > from && a < to);
}

// One day (a Date) of it: `spans`, the minutes from midnight away ([[from, to]], to up to 1440); `go`, when they
// leave for the other home and `back`, when they're back, as minutes, each with when the stay ends or began
// (ms). null when they're home all day.
function awayDay(away, date) {
  const d0 = midnight(date).getTime(), d1 = midnight(date, 1).getTime(), rs = awayStays(away, d0, d1);
  if (!rs.length) return null;
  const min = t => t >= d1 ? 1440 : (d => d.getHours() * 60 + d.getMinutes())(new Date(t));
  return { spans: rs.map(([a, b]) => [Math.max(a, d0) === d0 ? 0 : min(a), min(Math.min(b, d1))]),
    go: rs.filter(([a]) => a >= d0).map(([a, b]) => ({ min: min(a), until: b })),
    back: rs.filter(([, b]) => b < d1).map(([a, b]) => ({ min: min(b), since: a })) };
}
// Whether a time of the day (minutes) is while they're away.
const awayAt = (ad, min) => !!ad && min != null && ad.spans.some(([a, b]) => min >= a && min < b);
// Away the whole of their waking day, from up to asleep (minutes).
const awayAllDay = (ad, up, bed) => !!ad && ad.spans.some(([a, b]) => a <= up && b > bed);
// The stay they're on at `now` (ms), or else the next one in the coming two weeks: [start, end], or null.
function awayStay(away, now) {
  const rs = awayStays(away, now, now + 14 * 864e5);
  return rs.find(([a, b]) => a <= now && now < b) || rs.find(([a]) => a > now) || null;
}
// "Dad's", or "the other home" when it doesn't say whose.
const awayPlace = away => away && (away.who || '').trim() ? `${away.who.trim()}'s` : 'the other home';
// "Today 3:15 PM", "Tomorrow 6:00 PM", "Sunday 6:00 PM", or "Dec 24, 6:00 PM" over a week off.
function awayWhen(t, now) {
  const d = new Date(t), n = new Date(now), days = Math.round((midnight(d) - midnight(n)) / 864e5), c = clock(hhmmOf(d));
  if (days === 0) return `today ${c}`;
  if (days === 1) return `tomorrow ${c}`;
  if (days === -1) return `yesterday ${c}`;
  if (days > 1 && days < 7) return `${DAY_NAMES[d.getDay()]} ${c}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${c}`;
}

// ---- Reminders ----
// A reminder a few minutes before each thing in a child's day, saying to do it and to tick it off: getting up,
// the planned activities, the nap or quiet time, daycare, bedtime, each routine with a time (unless its reminders
// are switched off), and on school days leaving and coming home or pick-up (sooner, to allow for the drive).
// ✓ Done on the notification records it; tapping it opens it (an activity, to say how it went; a routine, its
// chart). The day plan changes day by day, so every reminder is for a set day (`on`), a week ahead, and the phone
// has them again each time the app is opened. What's done or missed has none.
const REMIND_DAYS = 7;
const PICKUP_BEFORE = 20;
// Going to the other home: reminded this long before, to pack their bag.
const PACK_BEFORE = 30;
// How long after its time a reminder can still go off (the phone may be a little late, as Reminders.java allows).
const REMIND_LATE = 10;
const hhmmOf = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// One child's reminders for one day (YYYY-MM-DD), from kidTimeRows' rows (each with its plan `slot`, or a
// routine's `rid` and whether it `remind`s), at `now` (ms). Each: {key, child, day, slot or routine, open (what
// tapping it opens, as the app's launch: "child act day slot", "child routine" or "child day"), on, at (when it
// goes off), name (the child's), what (the thing, without the name), title, text}.
function dayReminders(c, day, rows, now) {
  const out = [], [y, m, d] = day.split('-').map(Number), n = c.name;
  const sd = c.school && c.school.remind ? schoolDay(c.school, new Date(y, m - 1, d)) : null;
  for (const r of rows) {
    if (r.done || r.missed || (r.rid ? !r.remind : !r.slot)) continue;
    const min = r.min ?? r.about;
    if (min == null) continue;
    const when = new Date(y, m - 1, d, 0, min), t = clock(hhmmOf(when));
    let lead = REMIND_BEFORE, w;
    // Going to the other home: in time to pack their bag; back: a few minutes before.
    if (r.away) {
      if (!c.away || c.away.remind === false) continue;
      const p = awayPlace(c.away);
      if (r.away === 'go') { lead = PACK_BEFORE; w = [`🎒 Off to ${p} at ${t}`, `🎒 ${n} goes to ${p} at ${t}`, `In ${PACK_BEFORE} minutes. Time to pack ${n}'s bag: a favorite toy, anything for school, any medicine.`]; }
      else w = [`🏡 Back from ${p} at ${t}`, `🏡 ${n} is back from ${p} at ${t}`, 'A snack and some quiet time together help after a handover.'];
    }
    else if (r.rid) w = [`${r.emoji} ${r.label} at ${t}`, `${r.emoji} ${r.label} for ${n} at ${t}`, `Starts in ${REMIND_BEFORE} minutes. Tap to open the picture chart, or ✓ Done once it's finished.`];
    else if (r.slot === 'leave' || r.slot === 'home') {
      if (!sd) continue;
      const words = schoolWords(sd), { where, who, way } = sd.from || {};
      if (sd.kind === 'home') w = r.slot === 'leave' ? [`📚 Lessons at ${t}`, `📚 ${n}'s lessons start at ${t}`, 'Homeschool. ✓ Done once you\'ve started.']
        : [`✅ Lessons done at ${t}`, `✅ ${n}'s lessons finish at ${t}`, 'Time for a snack and free play.'];
      else if (r.slot === 'leave') w = [`🎒 Leaves for school at ${t}`, `🎒 ${n} leaves for school at ${t}`, `${words.leave.label}. Shoes on and bag by the door.`];
      else if (way === 'pickup' || way === 'aftercare') {
        lead = PICKUP_BEFORE;
        w = [`🚙 Pick up at ${t}`, `🚙 Pick up ${n} at ${t}`, [where, who && `${who} is picking up`].filter(Boolean).join(' · ') || `In ${PICKUP_BEFORE} minutes.`];
      } else if (way === 'bus') w = [`🚌 Bus gets in at ${t}`, `🚌 ${n}'s bus gets in at ${t}`, where ? `Meet them at ${where}.` : 'Meet them at the stop.'];
      else w = [`${SCHOOL.from[way].emoji} Home at ${t}`, `${SCHOOL.from[way].emoji} ${n} is home at ${t}`, words.home.label + '.'];
    }
    else if (r.slot === 'wake') w = ['☀️ Time to get up', `☀️ Time for ${n} to get up`, `At ${t}. ✓ Done once ${n} is up.`];
    else if (r.slot === 'care') w = ['🏫 Daycare, nursery or preschool', `🏫 Daycare, nursery or preschool for ${n}`, `About ${t}. ✓ Done once ${n} is dropped off.`];
    else if (r.slot === 'nap' || r.slot === 'nap2') w =[`${r.emoji} ${r.label}`, `${r.emoji} ${r.label} · ${n}`, `From ${t}. ✓ Done once it's happened.`];
    else if (r.slot === 'bed') w = [`🌙 Asleep by ${t}`, `🌙 ${n} asleep by ${t}`, `Bedtime routine now. ✓ Done once ${n} is asleep.`];
    else w = [`${r.emoji} ${r.label}`, `${r.emoji} ${r.label} with ${n}`, `About ${t}. ✓ Done to tick it off, or tap to say how it went and add a photo.`];
    const fire = new Date(when.getTime() - lead * 60e3);
    if (fire.getTime() < now - REMIND_LATE * 60e3) continue;
    const act = !r.rid && !r.away && !['leave', 'home', 'wake', 'care', 'nap', 'nap2', 'bed'].includes(r.slot);
    out.push({ key: `${c.id} ${day} ${r.rid ? 'r ' + r.rid : r.slot}`, child: c.id, day, ...(r.rid ? { routine: r.rid } : { slot: r.slot }),
      open: r.rid ? `${c.id} ${r.rid}` : act ? `${c.id} act ${day} ${r.slot}` : `${c.id} day`,
      on: dayKey(fire), at: hhmmOf(fire), name: n, what: w[0], title: w[1], text: w[2] });
  }
  return out;
}

// "Sam", "Sam and Ada", "Sam, Ada and Lu".
const andList = xs => xs.length > 1 ? xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1] : xs[0] || '';

// The notifications: reminders going off at the same minute are one, with each child in it, so a family with
// several children isn't sent one each for the same moment (bedtime for both, the day's first activities).
// Each: {key, on, at, title, text, lines (one per child's thing, when there's more than one), open, done
// ([{child, day, slot or routine}], what ✓ Done ticks off)}. The key is the minute's, so it stays the same
// when one of them is ticked off before it goes off.
function groupReminders(items) {
  const groups = new Map();
  for (const r of items) {
    const k = `${r.on} ${r.at}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  return [...groups].sort(([a], [b]) => a < b ? -1 : 1).map(([k, g]) => {
    const done = g.map(r => ({ child: r.child, day: r.day, ...(r.routine ? { routine: r.routine } : r.med ? { med: r.med } : { slot: r.slot }) }));
    if (g.length === 1) return { key: k, on: g[0].on, at: g[0].at, title: g[0].title, text: g[0].text, open: g[0].open, done };
    const names = andList([...new Set(g.map(r => r.name))]), same = g.every(r => r.what === g[0].what);
    return { key: k, on: g[0].on, at: g[0].at, open: 'family', done,
      title: same ? `${g[0].what} · ${names}` : `For ${names}`,
      text: `✓ Done ticks off ${g.length === 2 ? 'both' : `all ${g.length}`}. Tap to see everyone's day.`,
      lines: g.map(r => `${r.name}: ${same ? r.text : r.what}`) };
  });
}

// ---- The day planner ----
// A day has a few planned things, never a full timetable: the AAP stresses that free, child-led play matters
// most. Every day: something outside and book time. Most days also a morning and an afternoon "focus", taking
// the FOCUS areas in turn so each comes up two or three times a week. Busy days (daycare, preschool) keep
// just the outside time and book time.
const SLOTS = {
  morning:   { emoji: '🌅', name: 'Morning' },
  outside:   { emoji: '🌳', name: 'Outside & active' },
  afternoon: { emoji: '🌤️', name: 'Afternoon' },
  books:     { emoji: '📚', name: 'Book time' },
};

// Days since 1970 for a local date, so a plan belongs to the calendar day wherever the clock is.
const dayIndex = d => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);

// A repeatable random sequence from a string (mulberry32 on a string hash): the same child and day always get
// the same plan until the grown-up changes it.
function seeded(str) {
  let h = 1779033703;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 3432918353), h = h << 13 | h >>> 19;
  return () => {
    h = h + 0x6D2B79F5 | 0;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const fitsAge = (a, bandId) => { const n = Number(bandId.slice(1)); return n >= a.min && n <= (a.max || 5); };
const themed = a => /\{(things|topic)\}/.test(a.title + a.how);
const activity = id => { const a = ACTIVITIES.find(a => a.id === id); if (!a) throw new Error(`unknown activity ${id}`); return a; };
// A plan's item is one of ACTIVITIES, or (from 1.59) something the family did instead, in their own words:
// { slot, id, own: { title, d } }, `d` the area it counts towards. Its `id` stays the suggestion it took the
// place of, so a family phone on 1.58 or before, which doesn't know `own`, shows that rather than breaking.
const itemArea = it => it.own ? it.own.d : easyOf(it) ? easyIdea(it.easy.id).d : activity(it.id).d;
// What a plan item is, for likes and nos: an easier day's idea, or else the activity.
const itemKey = it => easyOf(it) ? it.easy.id : it.id;

// ---- Easier days ----
// A day made easier (see EASY) keeps its slots; each one not yet done, missed or put in by hand becomes one of
// EASY_IDEAS: { slot, id, interest, easy: { id, mode, interest } }. `id` and `interest` stay the suggestion it
// took the place of, so a family phone on 1.68 or before, which doesn't know `easy`, shows that rather than
// breaking. The day's mode is on each item, so it travels with them in the one document.
// The item's easier-day idea, or null. One from a newer version, with a mode or idea this phone doesn't know, is
// null too, so the suggestion under it shows (1.69 and before throw on it).
const easyOf = it => it.easy && EASY[it.easy.mode] && EASY_IDEAS.some(x => x.id === it.easy.id) ? it.easy : null;
const easyIdea = id => { const x = EASY_IDEAS.find(x => x.id === id); if (!x) throw new Error(`unknown easy idea ${id}`); return x; };
const easyPool = (kind, mode, bandId) => EASY_IDEAS.filter(x => x.kind === kind && x.modes.includes(mode) && fitsAge(x, bandId));
// An idea for a slot (easySlot's { kind, mode }), as pickActivity picks: their interests and loved ones more
// often, "not for us" never, recent ones only when nothing else is left.
function pickEasy(spec, ctx, rng, exclude) {
  const all = easyPool(spec.kind, spec.mode, ctx.bandId).filter(x => ctx.likes[x.id] !== -1 && !exclude.has(x.id));
  const fresh = all.filter(x => !ctx.recent.has(x.id)), pool = fresh.length ? fresh : all;
  if (!pool.length) return null;
  const weight = x => 1 + ((x.tags || []).some(t => ctx.interests.includes(t)) ? 3 : 0) + (ctx.likes[x.id] === 1 ? 3 : 0);
  let r = rng() * pool.reduce((s, x) => s + weight(x), 0);
  for (const x of pool) if ((r -= weight(x)) < 0) return x;
  return pool[pool.length - 1];
}
// The mode a day was made easier with, while something from it is still to do; null otherwise.
function dayEasy(plan) {
  const it = plan.items.find(i => easyOf(i) && !(plan.done && plan.done[i.slot]) && !(plan.missed && plan.missed[i.slot]));
  return it ? it.easy.mode : null;
}
// The day's items made easier with `mode` (a key of EASY): what's done, missed or their own stays.
function easyItems(ctx, date, plan, mode) {
  if (!EASY[mode]) throw new Error(`unknown easier day ${mode}`);
  const k = dayIndex(date), rng = seeded(`${ctx.childId}|${k}|easy|${mode}`), slots = plan.items.map(i => i.slot);
  const kept = it => it.own || (plan.done && plan.done[it.slot]) || (plan.missed && plan.missed[it.slot]);
  const used = new Set(plan.items.filter(kept).map(itemKey));
  return plan.items.map((it, n) => {
    if (kept(it)) return it;
    const x = pickEasy(easySlot(mode, it.slot, slots), ctx, rng, used);
    if (!x) return it; // nothing at this age that isn't "not for us": the usual one stays
    used.add(x.id);
    const { easy, ...usual } = it;
    return { ...usual, easy: { id: x.id, mode, interest: themed(x) ? interestFor(ctx.interests, k, n) : null } };
  });
}
// Back to the usual plan: what's still to do is the suggestion it took the place of again.
const usualItems = plan => plan.items.map(it => {
  if (!it.easy || (plan.done && plan.done[it.slot]) || (plan.missed && plan.missed[it.slot])) return it;
  const { easy, ...usual } = it;
  return usual;
});
// Something else from the same easier day for one slot.
function swapEasy(ctx, date, plan, item, tries) {
  const spec = easySlot(item.easy.mode, item.slot, plan.items.map(i => i.slot));
  const x = pickEasy(spec, ctx, seeded(`${ctx.childId}|${dayIndex(date)}|${item.slot}|easy|${tries}`), new Set(plan.items.map(itemKey)));
  if (!x) return null;
  return { ...item, easy: { id: x.id, mode: item.easy.mode, interest: themed(x) ? interestFor(ctx.interests, dayIndex(date), tries + 1) : null } };
}
// Two days or more with something ticked but nothing outside: a nudge to get out. plans: the days before
// today, newest first (null for a day with no plan). A day with nothing ticked says nothing either way.
function stuckIn(plans) {
  // A daycare or school day was a day out.
  const outside = p => p.busy || (p.done.outside && p.items.some(i => i.slot === 'outside')) ||
    extrasOf(p).some(({ slot, t }) => ['nature', 'move'].includes(itemArea(extraItem(slot, t))));
  let n = 0;
  for (const p of plans) {
    if (!p || !Object.keys(p.done || {}).length) break;
    if (outside(p)) return false;
    n++;
  }
  return n >= 2;
}

// Something done on top of the day's plan (from 1.60) is a tick in the plan's `done` under a slot of its own,
// 'x' and a few letters, with the area it counts towards (`d`) and, when it's one of ACTIVITIES, its id (`act`)
// and interest: so it syncs as any tick does, and a phone on 1.59 or before shows it in Lately and leaves it be.
const isExtra = slot => /^x[0-9a-z]{1,20}$/.test(slot);
const extrasOf = plan => Object.entries(plan.done || {}).filter(([s, t]) => isExtra(s) && isTick(t))
  .map(([slot, t]) => ({ slot, t })).sort((a, b) => a.t.at - b.t.at);
// An extra as a plan item, for itemText and the rest.
const extraItem = (slot, t) => t.act ? { slot, id: t.act, interest: t.interest || null, extra: true }
  : { slot, id: null, own: { title: t.what, d: t.d }, extra: true };

// The area something in their own words most likely counts towards, from the first word that says ("Zoo with
// Grandma": Outdoors); null when none does. The same areas as the activities like it (Playground is Moving,
// Cook something together Thinking & exploring).
const AREA_WORDS = {
  read: ['book', 'read', 'library', 'story', 'stories', 'letter', 'poem', 'rhym'],
  move: ['swim', 'pool', 'gym', 'dance', 'danci', 'ballet', 'bike', 'biking', 'scooter', 'trike', 'trampoline', 'playground', 'soccer', 'football',
    'ball', 'run', 'jump', 'climb', 'tumbl', 'karate', 'skat', 'sport', 'tag', 'yoga', 'bounce', 'sled'],
  nature: ['zoo', 'farm', 'park', 'walk', 'hike', 'hiking', 'beach', 'garden', 'outside', 'outdoor', 'splash', 'lake', 'pond', 'river', 'wood',
    'forest', 'trail', 'nature', 'bug', 'snow', 'camp', 'picking', 'orchard', 'aquarium', 'water'],
  make: ['paint', 'draw', 'craft', 'colo', 'clay', 'playdough', 'play-doh', 'dough', 'sticker', 'chalk', 'glue', 'collage', 'art'],
  music: ['music', 'sing', 'song', 'drum', 'piano', 'guitar', 'concert', 'band'],
  explore: ['museum', 'puzzle', 'lego', 'block', 'science', 'count', 'sort', 'cook', 'bak', 'build', 'magnet', 'experiment', 'game'],
  pretend: ['pretend', 'dress', 'doll', 'tea', 'playdate', 'play date', 'friend', 'puppet', 'costume', 'party'],
  help: ['clean', 'tidy', 'laundry', 'grocer', 'shopping', 'chore', 'dish', 'wash', 'sweep', 'vacuum', 'errand', 'feed', 'plant'],
};
function guessArea(title) {
  const words = title.toLowerCase().split(/[^a-z-]+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const two = words.slice(i, i + 2).join(' ');
    for (const [d, ks] of Object.entries(AREA_WORDS))
      if (ks.some(k => k.includes(' ') ? two === k : words[i].startsWith(k))) return d;
  }
  return null;
}

// The two focus areas for a day: the ones this week has had least so far (`weekCounts`, from the days before
// it), ties broken by turning through FOCUS day by day. Busy days and swaps can't unbalance a week for long.
function focusFor(k, weekCounts) {
  const turn = d => ((FOCUS.indexOf(d) - 2 * k) % FOCUS.length + FOCUS.length) % FOCUS.length;
  return [...FOCUS].sort((a, b) => ((weekCounts[a] || 0) - (weekCounts[b] || 0)) || turn(a) - turn(b)).slice(0, 2);
}

// The area each slot of a day draws from. `k` is the dayIndex. Helping goes in the afternoon: a chore as the
// first thing of the day sets the tone for the rest, and tidying fits best before dinner anyway.
function slotDomain(slot, k, weekCounts) {
  const f = focusFor(k, weekCounts);
  if (f[0] === 'help') f.reverse();
  if (slot === 'morning') return f[0];
  if (slot === 'afternoon') return f[1];
  if (slot === 'outside') return 'out';
  if (slot === 'books') return 'read';
  throw new Error(`unknown slot ${slot}`);
}
// The outside slot also takes indoor moving games, for rainy days; outdoor ones are picked more often.
function slotCandidates(domain, bandId) {
  const ok = domain === 'out' ? a => a.out || a.d === 'move' : a => a.d === domain && !a.out;
  return ACTIVITIES.filter(a => ok(a) && fitsAge(a, bandId));
}

// Pick an activity for a slot. ctx: { bandId, interests: [id], likes: {id: 1 | -1}, recent: Set of ids done
// or planned in the last few days }. Activities that match an interest, or were loved, are picked more often;
// ones marked "not for us" never; recent ones only when nothing else is left.
function pickActivity(domain, ctx, rng, exclude) {
  const all = slotCandidates(domain, ctx.bandId).filter(a => ctx.likes[a.id] !== -1 && !exclude.has(a.id));
  const fresh = all.filter(a => !ctx.recent.has(a.id));
  const pool = fresh.length ? fresh : all;
  if (!pool.length) return null;
  const weight = a => 1 + ((a.tags || []).some(t => ctx.interests.includes(t)) ? 3 : 0) +
    (themed(a) && ctx.interests.length ? 1 : 0) + (ctx.likes[a.id] === 1 ? 3 : 0) + (domain === 'out' && a.out ? 2 : 0);
  let r = rng() * pool.reduce((s, a) => s + weight(a), 0);
  for (const a of pool) if ((r -= weight(a)) < 0) return a;
  return pool[pool.length - 1];
}

// Which of the child's interests a themed activity takes on, turning through them day by day.
const interestFor = (interests, k, n) => interests.length ? interests[(k + n) % interests.length] : null;

// A day's plan: { busy, items: [{ slot, id, interest }] }. ctx.weekCounts: focus areas planned earlier this week.
function planDay(ctx, date) {
  const k = dayIndex(date), rng = seeded(`${ctx.childId}|${k}`);
  const busy = (ctx.busyDays || []).includes(date.getDay());
  const slots = busy ? ['outside', 'books'] : ['morning', 'outside', 'afternoon', 'books'];
  const used = new Set(), items = [];
  slots.forEach((slot, n) => {
    const a = pickActivity(slotDomain(slot, k, ctx.weekCounts || {}), ctx, rng, used);
    if (!a) return; // nothing left at this age that isn't "not for us"
    used.add(a.id);
    items.push({ slot, id: a.id, interest: themed(a) ? interestFor(ctx.interests, k, n) : null });
  });
  return { busy, items };
}

// Focus areas in a set of days' plans: { make: 2, … }.
function focusCounts(plans) {
  const out = {};
  for (const p of plans) for (const it of p.items) {
    const d = itemArea(it);
    if (FOCUS.includes(d) && (it.slot === 'morning' || it.slot === 'afternoon')) out[d] = (out[d] || 0) + 1;
  }
  return out;
}

// Something else for one slot of a day, from the same area, never what's already planned that day.
function swapItem(ctx, date, plan, slot, tries) {
  const k = dayIndex(date), item = plan.items.find(i => i.slot === slot);
  if (!item) throw new Error(`no ${slot} in this day's plan`);
  if (easyOf(item)) return swapEasy(ctx, date, plan, item, tries);
  const exclude = new Set(plan.items.map(i => i.id));
  // One of their own goes back to what the slot is for.
  const domain = slot === 'outside' ? 'out' : item.own ? slotDomain(slot, k, ctx.weekCounts || {}) : activity(item.id).d;
  const a = pickActivity(domain, ctx, seeded(`${ctx.childId}|${k}|${slot}|${tries}`), exclude);
  if (!a) return null;
  return { slot, id: a.id, interest: themed(a) ? interestFor(ctx.interests, k, tries + 1) : null };
}

// On how many days an activity got a "no". plans: [{ items, no: {slot: true} }]. One no is just a day; a
// few on different days means it isn't for them right now.
const timesRefused = (plans, id) => plans.filter(p => p.items.some(it => itemKey(it) === id && p.no && p.no[it.slot])).length;
const REFUSED_ENOUGH = 3;

// An activity's words with the interest filled in.
function activityText(id, interestId) {
  const a = activity(id), i = interestId ? INTERESTS[interestId] : ANY_INTEREST;
  if (!i) throw new Error(`unknown interest ${interestId}`);
  const fill = s => s.replace(/\{things\}/g, i.things).replace(/\{topic\}/g, i.topic);
  return { emoji: a.emoji, title: fill(a.title), how: fill(a.how), domain: DOMAINS[a.d], mins: a.mins };
}
// An easier day's idea's words, with the grown-up's part (`you`) and the easier day it's from (`easy`).
function easyText(e) {
  const x = easyIdea(e.id), i = e.interest ? INTERESTS[e.interest] : ANY_INTEREST, mode = EASY[e.mode];
  if (!i) throw new Error(`unknown interest ${e.interest}`);
  if (!mode) throw new Error(`unknown easier day ${e.mode}`);
  const fill = s => s.replace(/\{things\}/g, i.things).replace(/\{topic\}/g, i.topic);
  return { emoji: x.emoji, title: fill(x.title), how: fill(x.how), you: x.you, domain: DOMAINS[x.d], mins: x.mins, easy: mode };
}
// A plan item's words: one of their own has its title and its area's emoji, and no how or length.
function itemText(it) {
  if (easyOf(it)) return easyText(it.easy);
  if (!it.own) return activityText(it.id, it.interest);
  const d = DOMAINS[it.own.d];
  if (!d) throw new Error(`unknown area ${it.own.d}`);
  return { emoji: d.emoji, title: it.own.title, how: '', domain: d, mins: null, own: true };
}

// Everything that could go in a slot instead, for the age, from every area: what the family did. Each with
// its words (their first interest filled in) and area `d`. With a search `q`, only titles with it in, those
// starting with it first; either way the slot's areas (`areas`) before the rest.
function otherChoices(bandId, interests, q, areas) {
  const words = q.trim().toLowerCase(), interest = interests[0] || null;
  const rank = t => { const at = t.toLowerCase().indexOf(words); return at < 0 ? -1 : at === 0 ? 0 : 1; };
  return ACTIVITIES.filter(a => fitsAge(a, bandId)).map(a => {
    const i = themed(a) ? interest : null;
    return { id: a.id, interest: i, d: a.d, ...activityText(a.id, i) };
  }).map(x => ({ x, r: rank(x.title) })).filter(o => o.r >= 0)
    .sort((a, b) => a.r - b.r || areas.includes(b.x.d) - areas.includes(a.x.d)).map(o => o.x);
}

// How a week's plans cover each area: planned and done counts per domain. plans: [{ items, done }]. Something
// done on top of the plan counts as planned and done.
function weekBalance(plans) {
  const out = Object.fromEntries(Object.keys(DOMAINS).map(d => [d, { planned: 0, done: 0 }]));
  for (const p of plans) {
    for (const it of p.items) {
      const d = itemArea(it);
      out[d].planned++;
      if (p.done && p.done[it.slot]) out[d].done++;
    }
    for (const { slot, t } of extrasOf(p)) { const d = itemArea(extraItem(slot, t)); out[d].planned++; out[d].done++; }
  }
  return out;
}

// Monday to Sunday of the week a date is in.
function weekOf(date) {
  const mon = new Date(date.getFullYear(), date.getMonth(), date.getDate() - (date.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i));
}

// Columns for a printed chart: two big pictures across, three when there are a lot of steps.
const printColumns = n => n <= 3 ? 1 : n <= 8 ? 2 : 3;

// The last `days` days, oldest first, each marked done or not.
function recent(done, childId, routineId, today, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    out.push({ day: k, done: !!(done[k] && done[k][childId] && done[k][childId][routineId]) });
  }
  return out;
}

// ---- What's been done, and news from the other phones ----
// A tick (a routine finished, a day's activity done) is {at, by, dev, what, emoji} from 1.17: when, the grown-up's
// name, the phone's id, and what it was, as it was called then. Before 1.17 a tick was just `true`, and says
// neither when nor who. From 1.24 an activity's tick can say how the child liked it, `rate` (RATINGS), and have
// a few words, `note`; an activity that didn't happen has a tick in the day's `missed` instead.
const isTick = t => t !== null && typeof t === 'object' && Number.isFinite(t.at);
const RATINGS = { 4: ['😍', 'Loved it'], 3: ['🙂', 'Liked it'], 2: ['😐', 'So-so'], 1: ['🙁', "Didn't like it"] };
// "😍 Loved it", or '' for a tick without a rating.
const rateWords = t => isTick(t) && RATINGS[t.rate] ? RATINGS[t.rate].join(' ') : '';
// From 1.48 a tick can say when it really happened, `t` ('HH:MM'), and for a nap or quiet time when it ended,
// `end`: a grown-up puts them in for up, the nap, asleep, leaving for school and the rest. A tick without `t`
// happened when it was ticked.
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const tickMin = t => !isTick(t) ? null : HHMM.test(t.t || '') ? toMin(t.t) : (d => d.getHours() * 60 + d.getMinutes())(new Date(t.at));
const tickEnd = t => isTick(t) && HHMM.test(t.end || '') ? toMin(t.end) : null;
const minHHMM = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// A child's sleep over the `n` days up to `today`, from what was logged in their plans ({day: plan}). Each day:
// up, the nap's start and end (noNap when it was marked missed), asleep (minutes from midnight; past midnight
// as 1440 and over) and the night's sleep after it in minutes, when the next morning's up was logged too.
// avg: the average of each over the days that have it.
function sleepLog(plans, today, n = 7) {
  const key = (d, i) => dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + i));
  const eve = m => m == null ? null : m < 720 ? m + 1440 : m;
  const days = [];
  for (let i = 1 - n; i <= 0; i++) {
    const day = key(today, i), p = plans[day] || {}, done = p.done || {}, next = (plans[key(today, i + 1)] || {}).done || {};
    const up = tickMin(done.wake), asleep = eve(tickMin(done.bed)), nextUp = tickMin(next.wake);
    const nap = isTick(done.nap) ? { start: tickMin(done.nap), end: tickEnd(done.nap) } : null;
    if (nap && nap.end != null && nap.end <= nap.start) nap.end = null;
    // A second nap, on a day that needed one, counts in the day's nap time.
    const n2 = isTick(done.nap2) && tickEnd(done.nap2) > tickMin(done.nap2) ? tickEnd(done.nap2) - tickMin(done.nap2) : 0;
    days.push({ day, up, asleep, nap, noNap: !nap && isTick((p.missed || {}).nap),
      napMins: nap && nap.end != null ? nap.end - nap.start + n2 : null,
      night: asleep != null && nextUp != null && i < 0 ? nextUp + 1440 - asleep : null });
  }
  const mean = k => { const xs = days.map(d => d[k]).filter(x => x != null); return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null; };
  return { days, avg: { up: mean('up'), asleep: mean('asleep'), napMins: mean('napMins'), night: mean('night') } };
}
// The time up or asleep that was furthest from their plan this week, when over an hour off, in words for their
// page: a gentle nudge back to the same times every day; null when every day was within an hour. days: a
// sleepLog's; plan: their dayPlan.
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function driftWords(name, days, plan, today) {
  const eve = m => m < 720 ? m + 1440 : m, off = [];
  for (const d of days) {
    if (d.up != null) off.push({ d, what: 'up', at: d.up, by: d.up - toMin(plan.wake), planned: plan.wake });
    if (d.asleep != null) off.push({ d, what: 'asleep', at: d.asleep, by: d.asleep - eve(toMin(plan.bedtime)), planned: plan.bedtime });
  }
  const far = off.filter(o => Math.abs(o.by) > 60).sort((a, b) => Math.abs(b.by) - Math.abs(a.by));
  if (!far.length) return null;
  const { d, what, at, by, planned } = far[0], h = hoursWords(Math.abs(by) / 60);
  const t = dayKey(today), y = dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
  const [Y, M, D] = d.day.split('-').map(Number);
  const when = what === 'up' ? (d.day === t ? 'this morning' : d.day === y ? 'yesterday morning' : `on ${DAY_NAMES[new Date(Y, M - 1, D).getDay()]} morning`)
    : d.day === t ? 'tonight' : d.day === y ? 'last night' : `on ${DAY_NAMES[new Date(Y, M - 1, D).getDay()]} night`;
  const more = far.length - 1;
  return `${name} was ${what} at ${clock(minHHMM(at % 1440))} ${when}, ${h} hour${h === '1' ? '' : 's'} ${by > 0 ? 'after' : 'before'} ${clock(planned)}`
    + `${more ? `, and over an hour off ${more === 1 ? 'one other time' : `${more} other times`} this week` : ''}.`
    + ` Keeping within about an hour of the same times, weekends too, keeps the body clock steady.`;
}
// The days in the `n` up to `today` with `slot` marked missed (the bus, a nap).
function missedDays(plans, slot, today, n = 30) {
  const from = dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1 - n)), to = dayKey(today);
  return Object.keys(plans).filter(k => k >= from && k <= to && isTick((plans[k].missed || {})[slot])).sort();
}

// ---- Medicine ----
// Each dose a child was given, so every grown-up knows when the next can be: {id: {name, amount, every (hours
// between doses), max (doses in any 24 hours, or null), at (ms), by, dev, remind}}. How much and how often is
// the grown-up's, from the label or their doctor; this keeps count.
const MED_EVERY = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 24, 48, 72];
// "Every 5 hours", "Every hour", "Every 2 days".
const medEveryWords = h => h === 1 ? 'Every hour' : h >= 48 && h % 24 === 0 ? `Every ${h / 24} days` : `Every ${h} hours`;
const medKey = name => String(name).trim().toLowerCase();
const isDose = d => d !== null && typeof d === 'object' && typeof d.name === 'string' && d.name.trim() && Number.isFinite(d.at) && d.every > 0;
// Each medicine given lately (in the last day, or since its last dose's `every` if longer), newest first: {key,
// name, last (its dose, with id), next (ms: when the next can be given, after `every` and within `max`), count
// (doses in the 24 hours to `now`), max, due (it can be now)}.
function medStatus(doses, now) {
  const by = new Map();
  for (const [id, d] of Object.entries(doses || {})) if (isDose(d) && d.at <= now) {
    const k = medKey(d.name);
    if (!by.has(k)) by.set(k, []);
    by.get(k).push({ ...d, id });
  }
  const out = [];
  for (const [key, ds] of by) {
    ds.sort((a, b) => a.at - b.at);
    const last = ds.at(-1), max = last.max > 0 ? last.max : null;
    if (now - last.at >= Math.max(24, last.every) * 36e5) continue;
    let next = last.at + last.every * 36e5;
    // No more than `max` in any 24 hours: then not until the oldest that would make one too many is a day old.
    const recent = ds.filter(d => d.at > next - 864e5);
    if (max && recent.length >= max) next = Math.max(next, recent[recent.length - max].at + 864e5);
    out.push({ key, name: last.name, last, next, count: ds.filter(d => d.at > now - 864e5).length, max, due: now >= next });
  }
  return out.sort((a, b) => b.last.at - a.last.at);
}
// Giving `name` at `at` (ms): why it's too soon, in words, or null. clockAt: ms -> "2:15 pm".
function medTooSoon(doses, name, at, clockAt) {
  const before = Object.fromEntries(Object.entries(doses || {}).filter(([, d]) => isDose(d) && d.at < at));
  const s = medStatus(before, at).find(x => x.key === medKey(name));
  if (!s || at >= s.next) return null;
  const tooMany = s.max && s.count >= s.max;
  return tooMany ? `That would be more than ${s.max} doses of ${s.name} in 24 hours. The next can be from ${clockAt(s.next)}.`
    : `The last ${s.name} was at ${clockAt(s.last.at)}, and the next can be from ${clockAt(s.next)}.`;
}
// "Sam had Tylenol, 5 ml", for the family's news.
const medNews = (name, d) => `${name} had ${d.name.trim()}${String(d.amount || '').trim() ? ', ' + String(d.amount).trim() : ''}`;
// A reminder (as dayReminders') when each medicine's next dose can be given, for the ones given with "remind me".
// ✓ Done on it puts in the same dose again, given then.
function medReminders(c, doses, now) {
  const out = [];
  for (const s of medStatus(doses, now)) {
    if (s.last.remind === false || s.next < now - REMIND_LATE * 60e3) continue;
    const when = new Date(s.next), t = clock(hhmmOf(when)), last = new Date(s.last.at), amount = String(s.last.amount || '').trim();
    out.push({ key: `${c.id} med ${s.last.id}`, child: c.id, day: dayKey(when), med: s.last.id, open: `${c.id} day`, on: dayKey(when), at: hhmmOf(when),
      name: c.name, what: `💊 ${s.name}`, title: `💊 ${s.name} for ${c.name} from ${t}`,
      text: `The next dose can be given now, if it's still needed${amount ? `: ${amount}` : ''}. The last was at ${clock(hhmmOf(last))}. ✓ Done once it's given.` });
  }
  return out;
}

// "2 photos, a video and a note", or '' for none (a mediaTally).
function addedWords(t) {
  const n = (k, one, many) => !t[k] ? '' : t[k] === 1 ? one : `${t[k]} ${many}`;
  const w = [n('photos', 'a photo', 'photos'), n('videos', 'a video', 'videos'), n('notes', 'a note', 'notes')].filter(Boolean);
  return w.length > 1 ? w.slice(0, -1).join(', ') + ' and ' + w[w.length - 1] : w[0] || '';
}
// The news of photos, videos and a note added to a child's journal: {emoji, text}, e.g.
// "📷 Added 2 photos and a note for Sam · Bedtime". Watch.java says the same, in the same words.
function addedNews(kid, title, t) {
  const w = addedWords(t);
  return { emoji: t.photos ? '📷' : t.videos ? '🎬' : t.notes ? '📝' : '📓', text: w ? `Added ${w} for ${kid} · ${title}` : `Journal: ${kid} · ${title}` };
}

// What's happened in the family since `since` (ms), newest first, for the family page: routines finished,
// activities done, photos, videos and notes added, routines added. Each {at, emoji, text, by, dev}; what's added to
// the journal also has `jid`, the entry, and `media`, its photos and videos added then.
function familyNews(st, since) {
  const kids = Object.fromEntries(st.children.map(c => [c.id, c.name])), out = [];
  const add = (at, emoji, text, x, more) => { if (at >= since) out.push({ at, emoji, text, by: x.by || '', dev: x.dev || '', ...more }); };
  for (const day of Object.values(st.done || {})) for (const [cid, rs] of Object.entries(day)) {
    if (!kids[cid]) continue;
    for (const [rid, t] of Object.entries(rs)) {
      if (!isTick(t)) continue;
      const r = (st.routines[cid] || []).find(r => r.id === rid);
      add(t.at, r ? r.emoji : t.emoji || '✅', `${kids[cid]} finished ${r ? r.name : t.what}`, t);
    }
  }
  for (const [cid, ds] of Object.entries(st.meds || {})) if (kids[cid]) for (const d of Object.values(ds || {})) if (isDose(d)) add(d.at, '💊', medNews(kids[cid], d), d);
  for (const [cid, ps] of Object.entries(st.plans || {})) if (kids[cid]) for (const p of Object.values(ps)) {
    for (const t of Object.values(p.done || {})) if (isTick(t)) {
      const r = rateWords(t), note = typeof t.note === 'string' && t.note.trim();
      add(t.at, t.emoji || '✅', `${kids[cid]}: ${t.what}, done${r ? ' · ' + r : ''}${note ? ` · “${note}”` : ''}`, t);
    }
    for (const t of Object.values(p.missed || {})) if (isTick(t)) add(t.at, '🚫', `${kids[cid]}: ${t.what}, missed`, t);
  }
  // An entry, with what it had when written; photos and videos added to it later (their `from.at`, from 1.18.1)
  // are news of their own, by who added them.
  for (const [jid, e] of Object.entries(st.journal || {})) if (kids[e.child]) {
    const later = new Map(), first = [];
    for (const it of e.media || []) {
      if (it.from && it.from.at > e.at) { if (!later.has(it.from.at)) later.set(it.from.at, []); later.get(it.from.at).push(it); }
      else first.push(it);
    }
    const n = addedNews(kids[e.child], e.title, { ...mediaTally([{ media: first }]), notes: e.text ? 1 : 0 });
    add(e.at, n.emoji, n.text, e, { jid, media: first });
    for (const [at, media] of later) {
      const m = addedNews(kids[e.child], e.title, mediaTally([{ media }]));
      add(at, m.emoji, m.text, media[0].from, { jid, media });
    }
  }
  for (const [cid, rs] of Object.entries(st.routines)) if (kids[cid]) for (const r of rs)
    if (r.added) add(r.added.at, '🆕', `New routine for ${kids[cid]}: ${r.name}`, r.added);
  return out.sort((a, b) => b.at - a.at);
}

// What a phone knew before the other phone's changes came: the children's and routines' names, and which
// journal entries it had. Also what the phone app's news check (Watch.java) is given, to tell the same news.
function newsKnown(st) {
  const routines = {};
  for (const rs of Object.values(st.routines)) for (const r of rs) routines[r.id] = r.name;
  return { kids: Object.fromEntries(st.children.map(c => [c.id, c.name])), routines,
    journal: Object.fromEntries(Object.keys(st.journal || {}).map(id => [id, 1])),
    phones: Object.fromEntries(Object.keys(st.phones || {}).map(d => [d, 1])) };
}

// The news in the other phones' changes (sync.js documents: {path: JSON text, or null when removed}), given what
// this phone knew (newsKnown): [{emoji, text, by}]. Ticks and entries this phone made itself (its `dev`) aren't
// news; nor is anything taken away or merely edited. Watch.java tells the same, in the same words.
function newsOf(docs, known, dev) {
  const val = {};
  for (const [p, v] of Object.entries(docs)) if (v !== null) val[p] = JSON.parse(v);
  const kids = { ...known.kids }, out = [];
  // Each child is a document of its own (kids/<id>, from 1.43).
  for (const [p, c] of Object.entries(val)) {
    const s = p.split('/').map(decodeURIComponent);
    if (s[0] === 'kids' && s.length === 2 && c && typeof c === 'object' && !known.kids[s[1]]) {
      kids[s[1]] = c.name;
      out.push({ emoji: '👶', text: `${c.name} joined the family`, by: '' });
    }
  }
  for (const [p, v] of Object.entries(val)) {
    const s = p.split('/').map(decodeURIComponent);
    if (s[0] === 'done' && s.length === 4 && isTick(v) && v.dev !== dev && kids[s[2]])
      out.push({ emoji: v.emoji || '✅', text: `${kids[s[2]]} finished ${known.routines[s[3]] || v.what}`, by: v.by || '' });
    else if (s[0] === 'plans' && s.length === 5 && s[3] === 'done' && isTick(v) && v.dev !== dev && kids[s[1]])
      out.push({ emoji: v.emoji || '✅', text: `${kids[s[1]]}: ${v.what}, done`, by: v.by || '' });
    else if (s[0] === 'meds' && s.length === 3 && isDose(v) && v.dev !== dev && kids[s[1]])
      out.push({ emoji: '💊', text: medNews(kids[s[1]], v), by: v.by || '' });
    else if (s[0] === 'journal' && s.length === 2 && v && !known.journal[s[1]] && v.dev !== dev && kids[v.child])
      out.push({ ...addedNews(kids[v.child], v.title, mediaTally([v])), by: v.by || '' });
    // A new child's first routines come with it: "joined the family" says enough.
    else if (s[0] === 'lists' && s.length === 3 && v && typeof v === 'object' && known.kids[s[1]] && !(s[2] in known.routines))
      out.push({ emoji: '🆕', text: `New routine for ${kids[s[1]]}: ${v.name}`, by: (v.added && v.added.by) || '' });
  }
  return out;
}

// ---- Where the journal's photos, videos and notes come from ----
// An entry is about a routine ('r:<routine id>'), a day's planned activity ('a:<slot>', with `act`, the activity's
// id, from 1.18) or something else (''). From 1.18 each photo and video says it too: `from` {about, act, title,
// emoji, by}, as it was when it was taken, and who took it. An activity's entries are those about its slot that day; one made for an
// activity that was swapped out since stays with that one, not the one in its place.
function entriesFrom(journal, child, day, about, act) {
  return Object.entries(journal || {})
    .filter(([, e]) => e.child === child && e.day === day && e.about === about && (!act || !e.act || e.act === act))
    .map(([id, e]) => ({ id, ...e })).sort((a, b) => a.at - b.at);
}
// How many photos, videos and written notes some entries have, counted apart.
function mediaTally(entries) {
  const t = { photos: 0, videos: 0, notes: 0 };
  for (const e of entries) {
    for (const it of e.media || []) if (it.type === 'video') t.videos++; else if (it.type === 'photo') t.photos++;
    if (e.text) t.notes++;
  }
  return t;
}
// "📷 2 photos · 🎬 1 video · 📝 1 note", or '' when there's none of any.
function tallyWords(t) {
  const n = (k, emoji, one, many) => t[k] ? `${emoji} ${t[k]} ${t[k] === 1 ? one : many}` : '';
  return [n('photos', '📷', 'photo', 'photos'), n('videos', '🎬', 'video', 'videos'), n('notes', '📝', 'note', 'notes')].filter(Boolean).join(' · ');
}
// What an entry's photo or video was taken with: its own tag, or the entry's for one from before 1.18.
const mediaFrom = (it, e) => it.from || { about: e.about, act: e.act, title: e.title, emoji: e.emoji };
// "Activity", "Routine" or "Moment": what kind of thing `about` is.
const aboutKind = about => about.startsWith('a:') ? 'Activity' : about.startsWith('r:') ? 'Routine' : 'Moment';

// Who has looked at the journal. state.seen is {entry: {phone: look}}, each phone writing only its own look
// at each entry (so two looking at once both count): {by, n, at, m: {media id: n}}, `n` the times it looked at
// the entry and `m` at each of its photos and videos, `at` the last time. A look within SEEN_GAP of the one
// before is the same look (going back and forth through the photos isn't ten views).
const SEEN_GAP = 30 * 60e3;
// The look after one more at the entry (and, with `media`, at that photo or video), or null when it's too soon.
// `last` is when this phone last counted each ({entry or entry/media: time}), kept by the page; for the entry,
// until it has counted it, the look's own `at`.
function seenAdd(look, entry, media, by, now, last) {
  const k = entry + '/' + media, was = look || { n: 0, m: {} };
  const out = { ...was, m: { ...was.m || {} }, by, at: now };
  let more = false;
  if (!(now - (last[entry] ?? was.at ?? 0) < SEEN_GAP)) { out.n = (was.n || 0) + 1; last[entry] = now; more = true; }
  if (media && !(now - (last[k] || 0) < SEEN_GAP)) { out.m[media] = (out.m[media] || 0) + 1; last[k] = now; more = true; }
  return more ? out : null;
}
// Who looked at an entry (or, with `media`, at that one of its photos and videos), not counting the phone that
// wrote it: [{dev, by, n, at}], the latest first, and all their views together. A count that isn't a whole
// number (not one this app writes) counts nothing.
function seenOf(seen, entryId, e, media) {
  const count = x => Number.isInteger(x) && x > 0 ? x : 0;
  const who = Object.entries((seen || {})[entryId] || {}).filter(([dev, l]) => dev !== e.dev && l && typeof l === 'object')
    .map(([dev, l]) => ({ dev, by: String(l.by || ''), n: count(media ? (l.m || {})[media] : l.n), at: Number(l.at) || 0 }))
    .filter(w => w.n > 0).sort((a, b) => b.at - a.at);
  return { who, views: who.reduce((s, w) => s + w.n, 0) };
}
// "Seen by Nikki and Koen · 5 views", or '' when nobody else has. `name(w)` says who each is.
function seenWords(s, name = w => w.by || 'someone') {
  if (!s.views) return '';
  const names = [...new Set(s.who.map(name))];
  const list = names.length > 3 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
  return `Seen by ${list} · ${s.views} ${s.views === 1 ? 'view' : 'views'}`;
}

// The baby on the way, from what Bumplings shares ({baby, due, born}, dates YYYY-MM-DD): its name, the week of
// the pregnancy (counted like Bumplings, from 40 weeks before the due date) and, once it's here, its birthday.
// Null with no pregnancy, or once the baby is one of the children (a child with that birthday).
function expecting(sum, children, today) {
  if (!sum || !/^\d{4}-\d{2}-\d{2}$/.test(sum.due || '')) return null;
  if (sum.born && children.some(c => c.birth === sum.born)) return null;
  const [y, m, d] = sum.due.split('-').map(Number);
  const left = Math.round((new Date(y, m - 1, d) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 864e5);
  return { name: sum.baby || 'Baby', due: sum.due, born: sum.born || null, week: Math.max(0, Math.floor((280 - left) / 7)) };
}

// Bumplings' appointments from an hour before `now` (ms) on, soonest first: {at: 'YYYY-MM-DDTHH:MM', title,
// where, emoji, asks (questions saved to ask)}. On the family page, and on each day they fall on.
const APPT_EMOJI = { checkup: '🩺', scan: '🖥️', test: '🧪', class: '🎓', other: '📌' };
function bumpAppts(sum, now) {
  const appts = (sum && sum.state && sum.state.appts) || {};
  return Object.values(appts).filter(a => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(a.at || '') && new Date(a.at).getTime() > now - 3600e3)
    .sort((x, y) => x.at < y.at ? -1 : 1)
    .map(a => ({ at: a.at, title: a.title, where: a.where || '', emoji: APPT_EMOJI[a.kind] || '📅', asks: a.asks || 0 }));
}

// How things are going, from Bumplings' gentle mood summary (Bumplings 1.6 on), for the family page on `tk`
// (YYYY-MM-DD), or null. `mine`: the journal is this phone's grown-up's own (they're the one pregnant). `days`:
// the journal's feelings over the last 7 days; `hard`: how many of those were low or struggling. `check`: this
// phone's latest mood check, with how many days ago it was. `people` (Bumplings 1.11 on): each grown-up's mood
// checks, {who, name, me (this phone's grown-up), last (the day of the latest, or null), due (one is due now)},
// in Bumplings' own words (its moodDue). `due`: one is due for someone (before 1.11: none of this phone's in
// the last four weeks). `recent` (Bumplings 1.13 on, else null): both grown-ups' latest feelings, {mood, label,
// at, day (just its day is known), me, name}.
function moodView(m, preg, tk) {
  if (!m) return null;
  const utc = k => { const [y, mo, d] = k.split('-').map(Number); return Date.UTC(y, mo - 1, d) / 864e5; };
  const days = (m.days || []).filter(d => utc(tk) - utc(d.day) < 7 && d.day <= tk);
  const hard = days.filter(d => d.mood === '😟' || d.mood === '😢').length;
  const check = m.check ? { ...m.check, ago: utc(tk) - utc(m.check.day) } : null;
  const day = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) ? k : null;
  const people = ['mom', 'partner'].filter(w => m.due && w in m.due).map(w => ({ who: w, me: w === (m.me || 'mom'),
    name: preg[w] || (w === 'mom' ? 'Mom' : 'Partner'), last: day((m.last || {})[w]), at: Number.isFinite((m.at || {})[w]) ? m.at[w] : null, due: !!day(m.due[w]) && m.due[w] <= tk }));
  // Bumplings 1.13 on: each grown-up's last two feelings, newest first, with when.
  const recent = Array.isArray(m.recent) ? m.recent.filter(f => f && typeof f.mood === 'string' && Number.isFinite(f.at)
    && (f.who === 'mom' || f.who === 'partner' || f.who === '')).map(f => ({ mood: f.mood, label: typeof f.label === 'string' ? f.label : '',
    at: f.at, day: f.day === true, who: f.who, me: f.who === (m.me || 'mom'), name: f.who ? preg[f.who] || (f.who === 'mom' ? 'Mom' : 'Partner') : '' })) : null;
  // Who had at least two harder days (😟 or 😢) in the last 7, {who, me, name}: who '' for journal entries from
  // before Bumplings 1.11, which say no one. Before Bumplings 1.13.1, the journal's days, whoever wrote them.
  const hb = m.hard && typeof m.hard === 'object' ? m.hard : null;
  const hardFor = hb ? ['mom', 'partner', ''].filter(w => Number.isFinite(hb[w]) && hb[w] >= 2).map(w => ({ who: w, me: w === (m.me || 'mom'),
    name: w ? preg[w] || (w === 'mom' ? 'Mom' : 'Partner') : '' })) : hard >= 2 ? [{ who: '', me: false, name: '' }] : [];
  return { mine: m.me === 'mom', who: preg.mom || 'Mom', days, hard, hardFor, check, people, recent,
    due: m.due ? people.some(p => p.due) : !check || check.ago >= 28 };
}

// How long ago `at` (ms) was at `now`: "just now", "20 min ago", "3 hours ago", "yesterday", "4 days ago".
// `day`: only its day is known, so "today" rather than a time.
function agoWords(at, now, day) {
  const days = Math.round((new Date(dayKey(new Date(now))) - new Date(dayKey(new Date(at)))) / 864e5);
  if (day || now - at >= 864e5 || days > 1) return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
  const min = Math.max(0, Math.floor((now - at) / 60e3));
  return min < 1 ? 'just now' : min < 60 ? `${min} min ago` : `${Math.floor(min / 60)} hour${min < 120 ? '' : 's'} ago`;
}

// What's happened in Bumplings since `since` (ms), for the family page's Lately (Bumplings 1.11 on: its news,
// the last week's, with who by name): {at, emoji, text, by, open (the Bumplings screen it's on)}.
function bumpNewsSince(sum, since) {
  const ok = n => n && Number.isFinite(n.at) && n.at >= since && typeof n.text === 'string' && typeof n.emoji === 'string';
  return (Array.isArray(sum && sum.news) ? sum.news : []).filter(ok)
    .map(n => ({ at: n.at, day: n.day === true, emoji: n.emoji, text: n.text, by: typeof n.by === 'string' ? n.by : '', open: /^[a-z]+$/.test(n.open || '') ? n.open : '' }));
}

// ---- Potty training, from Tot Potty ----
// Tot Potty's child for a child here (from its familySummary, {v: 1, kids: [...]}): the one Tot Potty linked to
// this child's id, else one with the same name not linked to anyone; or null.
function pottyFor(sum, child) {
  const kids = sum && Array.isArray(sum.kids) ? sum.kids.filter(k => k && typeof k.name === 'string') : [];
  const low = s => String(s).trim().toLowerCase();
  return kids.find(k => k.rid === child.id) || kids.find(k => !k.rid && low(k.name) === low(child.name)) || null;
}
// What a child's day shows of potty training at `now` (ms): today's counts (a day with nothing logged reads as
// zeros), the last pee or accident, when the next try is due (null with the timer off, paused, or the child
// asleep, by Tot Potty's own rule), stickers toward the prize, the dry streak, and whether they're trained.
function pottyView(p, now) {
  if (!p) return null;
  const tk = dayKey(new Date(now)), d = (p.days && p.days[tk]) || {}, num = v => Number.isFinite(v) ? v : 0;
  const t = p.timer, mins = s => { const m = /^(\d{2}):(\d{2})$/.exec(s || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  let next = null;
  if (t && t.on && Number.isFinite(t.from) && t.every > 0 && !(t.pause > now)) {
    const due = Math.max(t.from + t.every * 60e3, t.pause || 0), at = new Date(due), m = at.getHours() * 60 + at.getMinutes();
    const bed = mins(p.bed) ?? 1170, wake = mins(p.wake) ?? 420;
    if (!(bed > wake ? m >= bed || m < wake : m >= bed && m < wake)) next = due;
  }
  const s = p.stars || {};
  return { name: p.name, words: p.words || { pee: 'pee', poop: 'poop', potty: 'potty' }, stage: typeof p.stage === 'string' ? p.stage : '',
    wins: num(d.wins), acc: num(d.acc), asked: num(d.asked), lastPee: Number.isFinite(p.lastPee) ? p.lastPee : null, next,
    stars: num(s.n), goal: num(s.goal), prize: typeof s.prize === 'string' ? s.prize : '', streak: num(p.streak), trained: p.trained === true };
}
// Whether to suggest Tot Potty for a child: from 18 months to 4 years.
const pottyAge = months => months >= 18 && months < 48;

// The family page's view of what Bumplings shares (its familySummary: the pregnancy's `state`, the checklist
// with its dates, the hospital bag's count and each week's size), worked out for `today` (a Date) and `now`
// (ms), since Bumplings may have saved it days ago. Bumplings 1.3 shares only {baby, due, born}: then only
// the dates are known. Null as for expecting().
function babyView(sum, children, today, now) {
  const b = expecting(sum, children, today);
  if (!b) return null;
  const st = sum.state || {}, p = st.preg || {}, tk = dayKey(today);
  const utc = k => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
  const days = 280 - (utc(b.due) - utc(tk));
  const v = { ...b, day: ((days % 7) + 7) % 7, left: utc(b.due) - utc(tk), trimester: days < 98 ? 1 : days < 196 ? 2 : 3,
    full: !!sum.state, mom: p.mom || '', partner: p.partner || '', doc: p.doc || {}, hosp: p.hosp || {} };
  const sizes = sum.sizes || {};
  v.size = b.born || b.week < 4 ? null : sizes[Math.min(b.week, 42)] || null;
  v.appts = bumpAppts(sum, now).slice(0, 5);
  v.mood = moodView(sum.mood, p, tk);
  // Bumplings 1.7 on: how many journal entries there are ({total, week, priv}: in the last 7 days, and kept just
  // on this phone), and the newest bump photo ({week, day, url}, a JPEG data URL).
  v.journal = sum.journal && sum.journal.total > 0 ? sum.journal : null;
  v.photo = sum.photo && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(sum.photo.url || '') ? sum.photo : null;
  // Checklist items open now or opening in the next two weeks, not ticked (as on Bumplings' home).
  const checks = st.checks || {};
  v.care = (sum.care || []).filter(c => !checks[c.id] && tk <= c.end && utc(c.start) - utc(tk) <= 14)
    .map(c => ({ ...c, now: tk >= c.start })).slice(0, 4);
  v.bag = b.born ? null : sum.bag || null;
  const kicks = Object.values(st.kicks || {}).sort((x, y) => y.start - x.start);
  v.kicks = kicks[0] || null;
  v.contracting = Object.values(st.contractions || {}).some(c => !c.end);
  v.names = Object.values(st.names || {}).map(n => {
    const vt = n.votes || {};
    return { name: n.name, both: vt.mom === 1 && vt.partner === 1, score: (vt.mom || 0) + (vt.partner || 0) };
  }).filter(n => n.score > 0).sort((x, y) => y.both - x.both || y.score - x.score || x.name.localeCompare(y.name)).slice(0, 3);
  // After the birth: the last 24 hours of the baby log.
  if (b.born) {
    const log = Object.values(st.babylog || {}), since = now - 864e5, recent = log.filter(e => e.at > since);
    const feeds = log.filter(e => e.t === 'feed').sort((x, y) => y.at - x.at), breast = feeds.find(f => f.side === 'L' || f.side === 'R');
    v.newborn = { day: utc(tk) - utc(b.born) + 1, feeds: recent.filter(e => e.t === 'feed').length,
      wet: recent.filter(e => e.t === 'diaper' && e.wet).length, dirty: recent.filter(e => e.t === 'diaper' && e.dirty).length,
      sleepMs: recent.filter(e => e.t === 'sleep').reduce((n, e) => n + ((e.end || now) - Math.max(e.at, since)), 0),
      last: feeds[0] || null, nextSide: breast ? (breast.side === 'L' ? 'R' : 'L') : null };
  }
  return v;
}
