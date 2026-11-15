// Tot Potty: line icons, the welcome picture, confetti, and the little tunes, all drawn or played in code (no
// files to load). Icons are on a 24 grid in the text color (a dot is a zero-length line), as in Bumplings.
const ICON = {
  kidmode: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
  progress: 'M4 20h16M7 16.5v-4M12 16.5V8M17 16.5v-7',
  plan: 'M5 21V4M5 4h11l-2.2 4L16 12H5',
  history: 'M12 3a9 9 0 1 1-8.5 6M3.5 4v5h5M12 7.5V12l3 2',
  star: 'M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.6l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8Z',
  night: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z',
  ready: 'M9 3.5h6v3H9ZM7 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1M8.5 13.5l2.5 2.5 4.5-4.5',
  guides: 'M3 5.5c2.6-1.4 5.6-1.3 9 .8 3.4-2.1 6.4-2.2 9-.8v13c-2.6-1.4-5.6-1.3-9 .8-3.4-2.1-6.4-2.2-9-.8ZM12 6.3v13',
  learn: 'M2 9l10-5 10 5-10 5ZM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6',
  gear: 'M4.5 9a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2ZM9 7V5.5a3 3 0 0 1 6 0V7M9 13h6',
  note: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8ZM14 3v5h5M9 13h6M9 17h4',
  call: 'M5.5 3.5h3l1.8 4.6-2.3 1.4a11 11 0 0 0 6.5 6.5l1.4-2.3 4.6 1.8v3a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 3.5 5.6a2 2 0 0 1 2-2.1Z',
  share: 'M9 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14c1.8.9 3 2.9 3 6',
  routines: 'M4 6.5h.01M4 12h.01M4 17.5h.01M8 6.5h12M8 12h12M8 17.5h12',
  settings: 'M4 7h9M17 7h3M15 5v4M4 17h3M11 17h9M9 15v4',
  timer: 'M12 6.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15ZM12 14v-3.5M9.5 2.5h5M12 2.5v4M18.5 6.5 20 5',
  potty: 'M7 3.5h4.5v6H7ZM4 9.5h16a8 8 0 0 1-8 8 8 8 0 0 1-8-8ZM9 17l-.8 3.5h7.6L15 17',
  drop: 'M12 3.5c3.6 4.6 6 8 6 10.5a6 6 0 0 1-12 0c0-2.5 2.4-5.9 6-10.5Z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  lock: 'M6 11a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2ZM8.5 9V7a3.5 3.5 0 0 1 7 0v2',
  edit: 'M4 20h4L19 9l-4-4L4 16ZM13.5 6.5l4 4',
  chev: 'M9.5 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h11',
  close: 'M6 6l12 12M18 6 6 18',
};
const icon = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[n]}"/></svg>`;
// A menu bar's drawing, strewn the length of it (Bumplings' scatter, art.js): tiny to big, tipped every which way,
// placed by a generator seeded on the name so a bar looks the same every time.
function scatter(n) {
  let h = [...n].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => { h = (h + 0x6d2b79f5) >>> 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32; };
  const r = (lo, hi) => lo + rnd() * (hi - lo);
  const W = 310, H = 74, sizes = [r(62, 86), r(52, 70), r(44, 58), r(30, 42), r(28, 38), r(24, 34), r(18, 26), r(16, 22), r(14, 20), r(12, 18), r(12, 16), r(10, 14)];
  const placed = [];
  for (const s of sizes) {
    for (let tries = 0; tries < 60; tries++) {
      const cx = r(-s * .2, W + s * .2), cy = r(s * .1, H - s * .1);
      if (placed.every(p => Math.hypot(p.cx - cx, p.cy - cy) > (p.s + s) * .42 + 4)) { placed.push({ s, cx, cy }); break; }
    }
  }
  return placed.map(({ s, cx, cy }) => `<span class="ic" style="left:calc(${(cx / W * 100).toFixed(1)}% - ${(s / 2).toFixed(0)}px);top:${(cy - s / 2).toFixed(0)}px;width:${s.toFixed(0)}px;height:${s.toFixed(0)}px;--tilt:${r(-80, 80).toFixed(0)}deg;--flip:${rnd() < .35 ? -1 : 1}">${icon(n)}</span>`).join('');
}

// The welcome picture: a little potty with a smile, stars around it.
function pottyArt() {
  return `<svg class="pottyArt" viewBox="0 0 200 160" aria-hidden="true">
    <circle cx="100" cy="84" r="70" class="halo"/>
    <path class="star s1" d="M38 40l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/><path class="star s2" d="M160 30l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8Z"/>
    <path class="star s3" d="M168 104l2 4 4.4.6-3.2 3.1.8 4.4-4-2.1-4 2.1.8-4.4-3.2-3.1 4.4-.6Z"/>
    <rect class="tank" x="58" y="34" width="44" height="48" rx="12"/>
    <path class="bowl" d="M44 78h112a56 46 0 0 1-56 46 56 46 0 0 1-56-46Z"/>
    <path class="base" d="M80 120l-6 22h52l-6-22Z"/>
    <ellipse class="rim" cx="100" cy="78" rx="56" ry="9"/>
    <circle class="eye" cx="86" cy="96" r="4.5"/><circle class="eye" cx="114" cy="96" r="4.5"/>
    <path class="smile" d="M88 106q12 10 24 0"/>
    <circle class="cheek" cx="76" cy="104" r="5"/><circle class="cheek" cx="124" cy="104" r="5"/>
  </svg>`;
}

// Confetti over everything for a moment, with the sticker earned (if any) popping in the middle.
function party(sticker, big) {
  const el = document.getElementById('party'), colors = ['#ff5d8f', '#ffb703', '#2ec4b6', '#5b8cff', '#9b5de5', '#06d6a0'];
  const bits = Array.from({ length: big ? 70 : 36 }, (_, i) => `<i style="left:${(Math.random() * 100).toFixed(1)}%;background:${colors[i % colors.length]};--d:${(0.9 + Math.random() * 1.3).toFixed(2)}s;--x:${(Math.random() * 160 - 80).toFixed(0)}px;--r:${(Math.random() * 720 - 360).toFixed(0)}deg;animation-delay:${(Math.random() * .25).toFixed(2)}s"></i>`).join('');
  el.innerHTML = bits + (sticker ? `<b class="pop${big ? ' big' : ''}">${sticker}</b>` : '');
  el.classList.remove('on');
  void el.offsetWidth; // start the animation again
  el.classList.add('on');
  clearTimeout(party.t);
  party.t = setTimeout(() => { el.classList.remove('on'); el.innerHTML = ''; }, 2600);
}

// ---- Sounds: a few notes from the phone's speaker, made here (Web Audio), quiet and short ----
let audio = null;
const NOTE = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, E5: 659.25, G5: 783.99 };
function tones(notes, beat = 0.32, vol = 0.18) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn('no sound here:', e.message);
    return { stop() {}, ms: 0 };
  }
  if (audio.state === 'suspended') audio.resume();
  let t = audio.currentTime + 0.05;
  const nodes = [];
  for (const [n, beats] of notes) {
    const o = audio.createOscillator(), g = audio.createGain(), len = beats * beat;
    o.type = 'triangle';
    o.frequency.value = NOTE[n];
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + len * 0.95);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + len);
    nodes.push(o);
    t += len;
  }
  return { stop: () => nodes.forEach(o => { try { o.stop(); } catch { /* already stopped */ } }), ms: (t - audio.currentTime) * 1000 };
}
const chime = () => tones([['C5', 0.5], ['E5', 0.5], ['G5', 1]], 0.22, 0.16);
const cheer = () => tones([['C5', 0.5], ['C5', 0.5], ['G5', 0.5], ['E5', 0.5], ['G5', 1.5]], 0.16, 0.18);
