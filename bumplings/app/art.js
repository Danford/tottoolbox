// Bumplings: a picture of the baby for each week, inside the womb. Watercolor illustrations (img/week-NN.jpg,
// weeks 4 to 40) drawn to scale for the womb: a ball of cells at week 4, an embryo curled like a C in its sac,
// about half the womb by 12 weeks, nearly all of it from about 20, and head down and snug from about 32.
// babyArt(week) returns the <img> as text. Weeks past 40 show week 40.
function babyArt(w) {
  const wk = Math.max(4, Math.min(40, w));
  return `<img src="img/week-${String(wk).padStart(2, '0')}.jpg" width="480" height="480" alt="A picture of the baby at week ${wk}">`;
}
// Line icons for home's shortcuts and settings, drawn on a 24 grid in the text color (a dot is a zero-length line).
const ICON = {
  week: 'M3 5.5c2.6-1.4 5.6-1.3 9 .8 3.4-2.1 6.4-2.2 9-.8v13c-2.6-1.4-5.6-1.3-9 .8-3.4-2.1-6.4-2.2-9-.8ZM12 6.3v13',
  care: 'M9 3.5h6v3H9ZM7 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1M8.5 13.5l2.5 2.5 4.5-4.5',
  appts: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2ZM4 10h16M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01',
  photos: 'M3 9a2 2 0 0 1 2-2h2.2l1.6-2.5h6.4L16.8 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM12 9.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z',
  // A screen with an ultrasound's fan on it.
  scans: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM9 21h6M12 17v4M12 6.5 8.2 12a5.5 5.5 0 0 0 7.6 0Z',
  safe: 'M6 3v6a2 2 0 0 0 4 0V3M8 3v18M17.5 21V3c-2.2 1.3-3.5 4-3.5 7.5V13h3.5',
  journal: 'M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6ZM6 3v18M4 7.5h3M4 12h3M4 16.5h3M10.5 8h5M10.5 11.5h3',
  kicks: 'M8.5 10.5c1.9 0 3 2 3 4.7S10.4 21 8.5 21s-3-3.1-3-5.8 1.1-4.7 3-4.7ZM6.3 7.6h.01M8.6 7h.01M10.8 7.6h.01M15.5 5.5c1.9 0 3 2 3 4.7S17.4 16 15.5 16s-3-3.1-3-5.8 1.1-4.7 3-4.7ZM13.3 2.6h.01M15.6 2h.01M17.8 2.6h.01',
  timer: 'M12 6.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15ZM12 14v-3.5M9.5 2.5h5M12 2.5v4M18.5 6.5 20 5',
  plan: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8ZM14 3v5h5M9 13h6M9 17h4',
  names: 'M12 20s-8-4.7-8-10.2A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 8 2.3C20 15.3 12 20 12 20Z',
  bag: 'M4.5 9a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2ZM9 7V5.5a3 3 0 0 1 6 0V7M12 11v6M9 14h6',
  mood: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM8.5 14c.9 1.4 2.1 2.1 3.5 2.1s2.6-.7 3.5-2.1M9 9.5h.01M15 9.5h.01',
  babylog: 'M9.5 7.5h5V9c1.3.8 2 2 2 3.5V19a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-6.5c0-1.5.7-2.7 2-3.5ZM10.5 7.5V5.5a1.5 1.5 0 0 1 3 0v2M7.5 13.5h3.5M7.5 16.5h3.5',
  call: 'M5.5 3.5h3l1.8 4.6-2.3 1.4a11 11 0 0 0 6.5 6.5l1.4-2.3 4.6 1.8v3a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 3.5 5.6a2 2 0 0 1 2-2.1Z',
  share: 'M9 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14c1.8.9 3 2.9 3 6',
  routines: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z',
  settings: 'M4 7h9M17 7h3M15 5v4M4 17h3M11 17h9M9 15v4',
  history: 'M12 3a9 9 0 1 1-8.5 6M3.5 4v5h5M12 7.5V12l3 2',
  chev: 'M9.5 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h11',
  close: 'M6 6l12 12M18 6 6 18',
};
const icon = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[n]}"/></svg>`;
// A home bar's drawing, strewn the length of it: tiny to big, tipped every which way, some flipped, some off the
// edges and some behind the words (in a light tint of the bar), none touching another. Placed by a generator
// (mulberry32) seeded on the name, so a bar looks the same every time; laid out on the narrowest bar (310 by 74),
// so on wider phones they only spread further apart.
function scatter(n) {
  let h = [...n].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => { h = (h + 0x6d2b79f5) >>> 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32; };
  const r = (lo, hi) => lo + rnd() * (hi - lo);
  const W = 310, H = 74, sizes = [r(62, 86), r(52, 70), r(44, 58), r(30, 42), r(28, 38), r(24, 34), r(18, 26), r(16, 22), r(14, 20), r(12, 18), r(12, 16), r(10, 14)];
  const placed = [];
  for (const s of sizes) {
    // A drawing fills about 80% of its box, turned any way: a circle of 0.42 s holds it.
    for (let tries = 0; tries < 60; tries++) {
      const cx = r(-s * .2, W + s * .2), cy = r(s * .1, H - s * .1);
      if (placed.every(p => Math.hypot(p.cx - cx, p.cy - cy) > (p.s + s) * .42 + 4)) { placed.push({ s, cx, cy }); break; }
    }
  }
  return placed.map(({ s, cx, cy }) => `<span class="ic" style="left:calc(${(cx / W * 100).toFixed(1)}% - ${(s / 2).toFixed(0)}px);top:${(cy - s / 2).toFixed(0)}px;width:${s.toFixed(0)}px;height:${s.toFixed(0)}px;--tilt:${r(-80, 80).toFixed(0)}deg;--flip:${rnd() < .35 ? -1 : 1}">${icon(n)}</span>`).join('');
}

// The picture inside a ring of the 40 weeks, clockwise from the bottom: one dot a week, a gap after each trimester
// (weeks 13 and 27) and at the bottom, where it starts and ends. Weeks before w are filled, w is the larger honey
// dot (none for week 0, before anything is set up). intro: the dots fill in. pic: another week's picture.
function weekRing(w, intro, pic = w) {
  const wk = Math.max(0, Math.min(40, w)), slots = 43, dots = [];
  for (let i = 1; i <= 40; i++) {
    const slot = i - 1 + (i > 13) + (i > 27), a = ((slot + 1) / slots) * 2 * Math.PI + Math.PI / 2;
    const x = (100 + 96 * Math.cos(a)).toFixed(2), y = (100 + 96 * Math.sin(a)).toFixed(2);
    if (i === wk) dots.push(`<circle class="halo" cx="${x}" cy="${y}" r="7.5"/><circle class="now" style="--i:${i}" cx="${x}" cy="${y}" r="4.6"/>`);
    else dots.push(`<circle class="${i < wk ? 'past' : ''}" style="--i:${i}" cx="${x}" cy="${y}" r="${i < wk ? 2.9 : 2.3}"/>`);
  }
  return `<div class="ring${intro ? ' intro' : ''}"><svg viewBox="0 0 200 200" aria-hidden="true">${dots.join('')}</svg><div class="art">${babyArt(pic)}</div></div>`;
}
