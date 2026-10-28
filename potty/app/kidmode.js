// Tot Potty: the child's own screen. Their sticker chart and prize; "Potty time!", a sit timer that counts down
// with a song; washing hands, step by step; and "I went!", which logs it and puts a sticker on the chart with
// confetti. Back doesn't leave it: a grown-up holds the lock in the corner.
const SIT_MS = 2 * 60e3;
let km = { view: 'chart' }, kmTimer = null, kmSong = null;
function openKidMode() { km = { view: 'chart' }; renderKidMode(); show('kidmode'); }
function kmStop() {
  clearInterval(kmTimer);
  kmTimer = null;
  if (kmSong) { kmSong.stop(); kmSong = null; }
}
function renderKidMode() {
  const id = curId(), k = K(), w = wordsOf(k), name = esc(k.name);
  if (km.view === 'chart') {
    const n = starCount(state, id), goal = k.goal?.n || 10, since = Object.values(state.prizes[id] || {}).reduce((m, p) => Math.max(m, p.at), 0);
    const cur = Object.values(state.stars[id] || {}).filter(s => s.at > since).sort((a, b) => a.at - b.at);
    $('kmBody').innerHTML = `<h1 class="kmTitle">${name}'s stickers</h1>
      <div class="kmChart">${Array.from({ length: goal }, (_, i) => `<span class="${cur[i] ? 'on' : ''}">${cur[i] ? cur[i].e : ''}</span>`).join('')}</div>
      <p class="kmPrize">🎁 ${n >= goal ? `You did it! <b>${esc(k.goal?.prize || 'A prize')}</b>!` : `${goal - n} more for <b>${esc(k.goal?.prize || 'a prize')}</b>`}</p>
      <div class="kmBtns"><button class="kmBtn sit" data-km="sit">🚽<span>${esc(cap(w.potty))} time!</span></button>
        <button class="kmBtn went" data-km="went">🎉<span>I went!</span></button>
        <button class="kmBtn wash" data-km="wash">🧼<span>Wash hands</span></button></div>`;
  } else if (km.view === 'sit') {
    const left = Math.max(0, km.until - Date.now()), frac = 1 - left / SIT_MS, r = 88, c = 2 * Math.PI * r;
    const line = SIT_SONG[Math.floor((Date.now() - km.from) / 5200) % SIT_SONG.length];
    $('kmBody').innerHTML = `<h1 class="kmTitle">Sitting on the ${esc(w.potty)}</h1>
      <div class="kmRing"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="${r}" class="bg"/><circle cx="100" cy="100" r="${r}" class="fg" style="stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${(c * (1 - frac)).toFixed(1)}"/></svg>
        <div class="in"><b>${mmss(left)}</b></div><div class="bubbles">${'<i></i>'.repeat(7)}</div></div>
      <p class="kmSong">🎵 ${fill(line, k)}</p><p class="kmHint">Feet on the stool. Blow some bubbles: whoo!</p>
      <button class="kmBtn small" data-km="went">Something came!</button><button class="kmLink" data-km="chart">Stop</button>`;
    if (left <= 0) { kmStop(); km = { view: 'went', after: true }; renderKidMode(); }
  } else if (km.view === 'went') {
    $('kmBody').innerHTML = `<h1 class="kmTitle">${km.after ? 'All done sitting! Did anything come?' : 'What came out?'}</h1>
      <div class="kmBtns"><button class="kmBtn" data-kmlog="pee">💧<span>${esc(cap(w.pee))}!</span></button><button class="kmBtn" data-kmlog="poop">💩<span>${esc(cap(w.poop))}!</span></button>
        <button class="kmBtn" data-kmlog="both">🌟<span>Both!</span></button><button class="kmBtn quiet" data-kmlog="try">🙂<span>Not this time</span></button></div>
      <button class="kmLink" data-km="chart">Back</button>`;
  } else if (km.view === 'yay') {
    $('kmBody').innerHTML = `<div class="kmYay"><b>${km.sticker || '🌟'}</b><h1>${km.t === 'try' ? 'Good sitting!' : `Yay, ${name}!`}</h1>
      <p>${km.t === 'try' ? "Let's try again a bit later." : `${esc(cap(km.t === 'poop' ? w.poop : w.pee))} in the ${esc(w.potty)}!${km.sticker ? ' A sticker for your chart!' : ''}`}</p>
      <button class="kmBtn small wash" data-km="wash">🧼 Now wash hands</button></div>`;
  } else if (km.view === 'wash') {
    const el = (Date.now() - km.from) / 1000;
    let acc = 0, i = 0;
    while (i < WASH.length && el >= acc + WASH[i][2]) acc += WASH[i++][2];
    if (i >= WASH.length) { kmStop(); km = { view: 'clean' }; party('✨'); renderKidMode(); return; }
    const [emoji, words, secs] = WASH[i];
    $('kmBody').innerHTML = `<h1 class="kmTitle">Washing hands</h1><div class="kmWash"><b>${emoji}</b><p>${esc(words)}</p><span class="count">${Math.ceil(acc + secs - el)}</span></div>
      <div class="kmDots">${WASH.map((_, j) => `<i class="${j < i ? 'done' : j === i ? 'on' : ''}"></i>`).join('')}</div><button class="kmLink" data-km="chart">Stop</button>`;
  } else if (km.view === 'clean') {
    $('kmBody').innerHTML = `<div class="kmYay"><b>✨</b><h1>Squeaky clean!</h1><button class="kmBtn small" data-km="chart">⭐ My stickers</button></div>`;
  }
}
$('kmBody').addEventListener('click', e => {
  const go = e.target.closest('[data-km]'), lg = e.target.closest('[data-kmlog]');
  if (go) {
    kmStop();
    const v = go.dataset.km;
    if (v === 'sit') {
      km = { view: 'sit', from: Date.now(), until: Date.now() + SIT_MS };
      const sing = () => { kmSong = tones(TUNE, 0.42, 0.12); };
      sing();
      let sung = Date.now();
      kmTimer = setInterval(() => { if (Date.now() - sung > TUNE.reduce((n, [, b]) => n + b, 0) * 420 + 600) { sung = Date.now(); sing(); } renderKidMode(); }, 250);
    } else if (v === 'wash') {
      km = { view: 'wash', from: Date.now() };
      kmTimer = setInterval(renderKidMode, 250);
    } else km = { view: v };
    renderKidMode();
  } else if (lg) {
    kmStop();
    const t = lg.dataset.kmlog, kid = curId(), id = logEvent(t, { how: km.after ? 'timer' : 'told' }), star = state.stars[kid]?.[id];
    km = { view: 'yay', t, sticker: star && star.e };
    if (t !== 'try') { party(star && star.e, true); cheer(); }
    renderKidMode();
    kmTimer = setTimeout(() => { if (km.view === 'yay') { km = { view: 'chart' }; renderKidMode(); } }, 6000);
  }
});
// Leaving: a grown-up holds the lock for a second and a half.
{
  let held = null;
  const start = e => { e.preventDefault(); $('kmExit').classList.add('holding'); held = setTimeout(() => { $('kmExit').classList.remove('holding'); kmStop(); goHome(); }, 1500); };
  const end = () => { clearTimeout(held); $('kmExit').classList.remove('holding'); };
  $('kmExit').addEventListener('pointerdown', start);
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) $('kmExit').addEventListener(ev, end);
  $('kmExit').addEventListener('click', () => toast('Grown-ups: hold the lock to leave.'));
}
