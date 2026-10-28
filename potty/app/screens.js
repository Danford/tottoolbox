// Tot Potty: the screens behind the menu, each for the child showing (curId): progress, the plan, the log,
// stickers, naps and nights, readiness, the guides, what helps, the handoff note, when to call, and about.

// ---- Progress ----
function openProgress() { renderProgress(); show('progress'); }
function renderProgress() {
  const id = curId(), k = K(), now = Date.now(), t = today(), evs = kidEvents(state, id), w = wordsOf(k);
  const days = weekStats(evs, t, 14), week = days.slice(-7);
  const wins = week.reduce((n, d) => n + d.wins, 0), acc = week.reduce((n, d) => n + d.acc, 0), a = askedShare(evs, now);
  const top = Math.max(4, ...days.map(d => d.wins + d.acc));
  const ms = milestones(evs, t), got = new Set(ms.map(m => m.id));
  $('progTitle').textContent = `${k.name}'s progress`;
  $('progBody').innerHTML = `<div class="stats">
      <div><b>${wins + acc ? Math.round(wins / (wins + acc) * 100) + '%' : '–'}</b><small>in the ${esc(w.potty)} this week</small></div>
      <div><b>${dryStreak(evs, t)}</b><small>dry day${dryStreak(evs, t) === 1 ? '' : 's'} in a row</small></div>
      <div><b>${a.wins ? Math.round(a.asked / a.wins * 100) + '%' : '–'}</b><small>of trips ${esc(k.name)} asked for</small></div></div>
    <div class="card"><h2>The last two weeks</h2>
      <div class="chart" role="img" aria-label="In the potty and accidents each day">${days.map(d => `<div class="col${d.day === t ? ' today' : ''}">
        <div class="stack"><i class="acc" style="height:${d.acc / top * 100}%"></i><i class="win" style="height:${d.wins / top * 100}%"></i></div>
        <small>${parseDay(d.day).toLocaleDateString([], { weekday: 'narrow' })}</small><span class="n">${d.n ? d.wins : ''}</span></div>`).join('')}</div>
      <p class="legend"><i class="win"></i> in the ${esc(w.potty)} <i class="acc"></i> accidents</p></div>
    <div class="card"><h2>What we're seeing</h2>${insights(evs, k, now).map(i => `<p>${i.emoji} ${esc(i.text)}${i.every ? ` <button class="link" data-every="${i.every}">Set the timer to ${i.every} min</button>` : ''}</p>`).join('')
      || `<p class="muted">After a few days of logging, the patterns show here: how often ${esc(k.name)} goes, when poops come, when accidents happen.</p>`}</div>
    <div class="card"><h2>Milestones</h2><ol class="steps">${MILESTONES.map(([mid, emoji, text]) => {
      const m = ms.find(x => x.id === mid);
      return `<li class="${got.has(mid) ? '' : 'todo'}"><span class="em">${emoji}</span><div><b>${esc(text)}</b><p>${m ? fmtDay(dayOf(m.at), { month: 'long', day: 'numeric' }) : 'Still to come'}</p></div></li>`;
    }).join('')}</ol></div>`;
}
$('progBody').addEventListener('click', e => {
  const b = e.target.closest('[data-every]');
  if (!b) return;
  const id = curId();
  state.timers[id] = { ...(state.timers[id] || { on: true, from: Date.now() }), every: Number(b.dataset.every) };
  save();
  toast(`The timer is every ${b.dataset.every} minutes now.`);
});
$('reportShare').onclick = () => shareText(`${K().name}'s potty week`, reportText(state, curId(), Date.now()));
$('reportPrint').onclick = () => printText(`${K().name}'s potty week`, reportText(state, curId(), Date.now()));

// ---- The plan ----
function openPlan() { renderPlan(); show('plan'); }
function renderPlan() {
  const id = curId(), k = K(), t = today();
  if (!k.method) {
    $('planBody').innerHTML = `<p class="muted">Three ways that work. Pick the one that suits ${esc(k.name)} and your family: the timer, the steps and the tips follow it.
      Not sure ${esc(k.name)} is ready? <button class="link" data-go="ready">Ready yet? ›</button></p>
      ${Object.entries(METHODS).map(([mid, m]) => `<div class="card method"><h2>${m.emoji} ${esc(m.name)}</h2><p>${fill(m.blurb, k)}</p><p class="muted">${fill(m.fits, k)}</p>
        <label class="field">Start on <input type="date" data-startday="${mid}" value="${t}" min="${t}"></label>
        <button class="btn primary big" data-method="${mid}">Choose this</button><button class="link" data-learn="${mid}" data-from="plan">📖 Learn more about this approach ›</button></div>`).join('')}`;
    return;
  }
  const m = METHODS[k.method], started = k.start && k.start <= t, cur = started ? stageIndex(k, t) : -1;
  $('planBody').innerHTML = `<div class="card lead"><div class="eyebrow">${m.emoji} ${esc(m.name)}</div>
      <h2>${started ? (m.byDay ? `Day ${planDay(k, t)}` : `Step ${cur + 1} of ${m.stages.length}`) : `Starts ${fmtDay(k.start, { weekday: 'long', month: 'long', day: 'numeric' })}`}</h2>
      <p class="muted">${fill(m.blurb, k)}</p>
      <button class="link" data-learn="${k.method}" data-from="plan">📖 Learn more about this approach ›</button>
      <button class="link" data-replan>Change the approach or start date</button></div>
    ${m.prep ? `<div class="card"><h2>Getting ready</h2>${taskList(id, 'prep', m.prep)}</div>` : ''}
    ${m.stages.map((st, i) => `<div class="card stage${i === cur ? ' cur' : i < cur ? ' past' : ''}">
      <div class="eyebrow">${i === cur ? 'Now' : i < cur ? 'Done' : 'Coming'}${st.timer ? ` · timer every ${st.timer} min` : ''}</div><h2>${fill(st.title, k)}</h2>
      <p class="muted">${fill(st.goal, k)}</p>
      ${i === cur ? stageCount(id, st) : ''}${i <= cur ? taskList(id, st.id, st.tasks) :`<ul class="real muted">${st.tasks.map(([, x]) => `<li>${fill(x, k)}</li>`).join('')}</ul>`}
      <p class="note">💡 ${fill(st.tip, k)}</p>
      <button class="link" data-learn="${st.id}" data-from="plan">📖 Learn more: what to do, and what not to ›</button>
      ${!m.byDay && i === cur ? `<div class="twoBtn">${i > 0 ? '<button class="btn" data-step="-1">‹ Back a step</button>' : ''}${i < m.stages.length - 1 ? '<button class="btn primary" data-step="1">Ready: next step ›</button>' : ''}</div>` : ''}
    </div>`).join('')}`;
}
$('planBody').addEventListener('click', e => {
  const id = curId(), k = K();
  const pickM = e.target.closest('[data-method]'), step = e.target.closest('[data-step]');
  if (pickM) {
    const mid = pickM.dataset.method, start = document.querySelector(`[data-startday="${mid}"]`).value || today();
    Object.assign(k, { method: mid, start, stage: 0, stageDay: start });
    if (state.timers[id]) delete state.timers[id].step;
    save();
    renderPlan();
    window.scrollTo(0, 0);
    toast(`${METHODS[mid].emoji} ${esc(METHODS[mid].name)}: the plan is set. The timer follows each step.`);
  } else if (step) {
    k.stage = Math.max(0, Math.min(METHODS[k.method].stages.length - 1, (k.stage || 0) + Number(step.dataset.step)));
    k.stageDay = today();
    save();
    renderPlan();
  } else if (e.target.closest('[data-replan]')) {
    if (!confirm('Choose the approach again? What\'s logged stays.')) return;
    delete k.method; delete k.start; delete k.stage; delete k.stageDay;
    save();
    renderPlan();
  }
});

// ---- The log ----
function openHistory() { renderHistory(); show('history'); }
function renderHistory() {
  const id = curId(), evs = kidEvents(state, id).reverse(), t = today(), days = new Map();
  for (const e of evs.slice(0, 600)) { const k = dayOf(e.at); days.set(k, [...(days.get(k) || []), e]); }
  const all = kidEvents(state, id);
  $('historyBody').innerHTML = [...days].map(([k, es]) => {
    const s = dayStats(all, k), d = daysBetween(k, t);
    const head = d === 0 ? 'Today' : d === 1 ? 'Yesterday' : fmtDay(k, { weekday: 'long', month: 'long', day: 'numeric' });
    return `<h3>${head} <small class="muted">${s.wins} in the potty · ${s.acc} accident${s.acc === 1 ? '' : 's'}</small></h3><div class="card list">${es.map(e => eventRow(e.id, e)).join('')}</div>`;
  }).join('') || '<p class="muted">Nothing logged yet.</p>';
}
$('addPast').onclick = () => openLog(null);

// ---- Stickers ----
function openStickers() { renderStickers(); show('stickers'); }
function renderStickers() {
  const id = curId(), k = K(), n = starCount(state, id), goal = k.goal?.n || 10, prize = k.goal?.prize || PRIZES[0];
  const since = Object.values(state.prizes[id] || {}).reduce((m, p) => Math.max(m, p.at), 0);
  const cur = Object.values(state.stars[id] || {}).filter(s => s.at > since).sort((a, b) => a.at - b.at);
  const prizes = Object.values(state.prizes[id] || {}).sort((a, b) => b.at - a.at);
  $('starsBody').innerHTML = `<div class="card"><div class="chart2">${Array.from({ length: goal }, (_, i) => `<span class="${cur[i] ? 'on' : ''}">${cur[i] ? cur[i].e : i + 1}</span>`).join('')}</div>
      <p class="center">${n >= goal ? `🎁 <b>${esc(prize)}</b> is earned!` : `${goal - n} more for <b>${esc(prize)}</b>`}</p>
      ${n >= goal ? '<button class="btn primary big" data-prize>Prize given ✓</button>' : ''}<button class="btn big" data-givestar>⭐ Give a sticker by hand</button></div>
    <div class="card"><h2>The prize</h2>
      <label class="field">Stickers needed</label><div class="chips" id="goalN"></div>
      <label class="field">Prize <input type="text" id="prizeIn" maxlength="60" value="${esc(prize)}"></label>
      <div class="chips small" id="prizeIdeas"></div>
      <p class="muted">Stickers come by themselves for ${{ wins: 'each pee or poop in the potty', poops: 'each poop in the potty', asked: 'each trip they ask for', off: 'nothing: you give them by hand' }[k.stars || 'wins']} (change it in ${esc(k.name)}'s details, in Settings). Start small, a prize after 5 or 10, so it comes while it still means something.</p></div>
    ${prizes.length ? `<div class="card"><h2>Prizes so far</h2>${prizes.map(p => `<p>🎁 ${esc(p.prize)} <small class="muted">${fmtDay(dayOf(p.at))}${p.by ? ' · ' + whoName(p.by) : ''}</small></p>`).join('')}</div>` : ''}`;
  chips('goalN', [5, 10, 15, 20, 30].map(x => [String(x), String(x)]), String(goal), v => { k.goal = { ...k.goal, n: Number(v), prize: $('prizeIn').value.trim() || prize }; save(); renderStickers(); });
  chips('prizeIdeas', PRIZES.map(p => [p, p]), '', v => { $('prizeIn').value = v; savePrize(); });
  $('prizeIn').onchange = savePrize;
}
function savePrize() {
  const k = K();
  k.goal = { n: k.goal?.n || 10, prize: $('prizeIn').value.trim() || PRIZES[0] };
  save();
  renderStickers();
}

// ---- Naps and nights ----
function openNights() { renderNights(); show('nights'); }
function renderNights() {
  const id = curId(), k = K(), evs = kidEvents(state, id), ns = nights(evs, 14), r = nightReady(evs), t = today();
  const morning = evs.find(e => (e.t === 'nightdry' || e.t === 'nightwet') && dayOf(e.at) === t);
  const verdict = { unknown: `Log a week of mornings and this says when ${esc(k.name)} may be ready for nights without a diaper.`,
    notyet: 'Most mornings are still wet: that\'s normal, and it\'s the body, not something to train. Keep the diaper or pull-up for nights.',
    soon: 'More dry mornings now. Keep going with the diaper or pull-up a little longer: two weeks of mostly dry mornings is the sign.',
    ready: `Two weeks of mostly dry mornings: ${esc(k.name)} may be ready for nights without a diaper. A mattress cover and a spare set of sheets make the odd wet night easy.` }[r];
  $('nightsBody').innerHTML = `<div class="card"><h2>This morning</h2>
      ${morning ? `<p>${EVENT[morning.t].emoji} ${esc(EVENT[morning.t].label)} <button class="link" data-log="${morning.id}">change</button></p>` : `<p class="muted">How was ${esc(k.name)}'s diaper or bed on waking?</p>`}
      <div class="twoBtn"><button class="btn" data-night="nightdry">🌙 Woke up dry</button><button class="btn" data-night="nightwet">🌧️ Woke up wet</button></div>
      <h3>After a nap</h3><div class="twoBtn"><button class="btn" data-night="napdry">😴 Dry</button><button class="btn" data-night="napwet">🛏️ Wet</button></div></div>
    <div class="card"><h2>The last two weeks of mornings</h2>
      <div class="dots">${ns.slice().reverse().map(n => `<span class="${n.dry ? 'dry' : 'wet'}" title="${fmtDay(n.day)}">${n.dry ? '🌙' : '💧'}<small>${parseDay(n.day).toLocaleDateString([], { weekday: 'narrow' })}</small></span>`).join('') || '<p class="muted">None logged yet.</p>'}</div>
      <p>${verdict}</p></div>
    <div class="card">${NIGHT_GUIDE.map(([h, x]) => `<h3>${esc(h)}</h3><p>${fill(x, k)}</p>`).join('')}</div>`;
}
$('nightsBody').addEventListener('click', e => {
  const b = e.target.closest('[data-night]');
  if (!b) return;
  const t = b.dataset.night, id = curId();
  // One morning, one result: a second tap changes it.
  if (t.startsWith('night')) for (const ev of kidEvents(state, id)) if ((ev.t === 'nightdry' || ev.t === 'nightwet') && dayOf(ev.at) === today()) removeEvent(ev.id);
  logEvent(t);
  if (t.endsWith('dry')) party('🌙');
  renderNights();
});

// ---- Ready yet? ----
function openReady() { renderReady(); show('ready'); }
function renderReady() {
  const id = curId(), k = K(), ans = state.ready[id] || {}, months = k.birth ? ageMonths(k.birth, today()) : 24, r = readiness(ans, months);
  const groups = [...new Set(READY.map(x => x.group))];
  $('readyBody').innerHTML = `<p class="muted">Tick what's true for ${esc(k.name)}${k.birth ? `, ${ageWords(months)}` : ''}. Readiness is about these signs more than age.</p>
    ${groups.map(g => `<div class="card"><h2>${esc(g)}</h2>${READY.filter(x => x.group === g).map(x => `<label class="check"><input type="checkbox" data-ready="${x.id}"${ans[x.id] ? ' checked' : ''}> ${esc(x.text)}</label>`).join('')}</div>`).join('')}
    <div class="card ${r.level === 'ready' ? 'good' : 'note'}"><h2>${r.yes} of ${r.total}</h2><p>${fill(READY_WORDS[r.level], k)}</p>
    ${r.level === 'ready' || r.level === 'soon' ? '<button class="btn primary big" data-go="plan">Choose an approach ›</button>' : ''}</div>`;
}
$('readyBody').addEventListener('change', e => {
  const s = e.target.dataset.ready;
  if (!s) return;
  const id = curId(), ans = state.ready[id] ||= {};
  if (e.target.checked) ans[s] = true; else delete ans[s];
  save();
  renderReady();
});

// ---- Guides ----
function openGuides() { renderGuides(); show('guides'); }
function renderGuides() {
  const k = K();
  $('guidesBody').innerHTML = GUIDES.map(g => `<details class="card guide" id="g-${g.id}"><summary><span class="em">${g.emoji}</span><span><b>${esc(g.title)}</b><small>${esc(g.sum)}</small></span></summary>
    ${g.parts.map(([h, ps]) => `<h3>${esc(h)}</h3>${ps.map(p => `<p>${fill(p, k)}</p>`).join('')}`).join('')}</details>`).join('')
    + '<button class="btn big" data-go="urgent">🩺 When to call the doctor</button>';
}

// ---- Learn more ----
// With no key, the list of every approach and step; with one, that page (LEARN, learn.js). Back from a page goes
// where it was opened from (learnBack, set by the click below): the list, the plan, or home.
let learnBack = null, learnKey = '';
function openLearn(key) {
  const k = K();
  learnKey = key || '';
  if (!key) {
    learnBack = null;
    const cur = k.method && k.start && k.start <= today() ? METHODS[k.method].stages[stageIndex(k, today())].id : '';
    $('learnBody').innerHTML = `<p class="muted">For each approach and each step: why it works, what to do and what not to, and what helps when it's not going well. Every point says where it comes from.</p>
      ${Object.entries(METHODS).map(([mid, m]) => `<div class="card"><h2>${m.emoji} ${esc(m.name)}</h2><button class="next" data-learn="${mid}"><span class="em">📖</span><span><b>About this approach</b><small>${fill(m.blurb, k)}</small></span></button>
        ${m.stages.map((s, i) => `<button class="next" data-learn="${s.id}"><span class="em">${i + 1}</span><span><b>${fill(s.title, k)}</b>${s.id === cur ? `<small>Where ${esc(k.name)} is now</small>` : ''}</span></button>`).join('')}</div>`).join('')}`;
    $('learnTitle').textContent = 'Learn more';
    show('learn');
    return;
  }
  const order = learnOrder(), at = order.findIndex(([x]) => x === key), page = LEARN[key];
  if (at < 0 || !page) throw new Error(`no Learn more page: ${key}`);
  const [, mid, si] = order[at], m = METHODS[mid], refs = learnRefs(page);
  const cite = ids => ids.length ? `<sup class="ref">${ids.map(id => refs.indexOf(id) + 1).sort((a, b) => a - b).join(',')}</sup>` : '';
  const para = ([t, ...ids]) => `<p>${fill(t, k)}${cite(ids)}</p>`;
  const list = (pts, cls) => `<ul class="learnList ${cls}">${pts.map(([t, ...ids]) => `<li>${fill(t, k)}${cite(ids)}</li>`).join('')}</ul>`;
  const near = d => order[at + d] && order[at + d][1] === mid ? order[at + d] : null, prev = near(-1), next = near(1);
  const name = ([x, , i]) => i < 0 ? 'About the approach' : fill(METHODS[mid].stages[i].title, k);
  $('learnTitle').innerHTML = si < 0 ? esc(m.name) : fill(m.stages[si].title, k);
  $('learnBody').innerHTML = `<div class="eyebrow">${m.emoji} ${esc(m.name)}${si < 0 ? '' : ` · step ${si + 1} of ${m.stages.length}`}</div>
    <div class="card"><h2>${si < 0 ? 'How it works' : 'Why this step'}</h2>${page.why.map(para).join('')}</div>
    <div class="card good"><h2>✅ Do</h2>${list(page.dos, 'do')}</div>
    <div class="card advice"><h2>🚫 Don't</h2>${list(page.donts, 'dont')}</div>
    <div class="card"><h2>If it's not going well</h2>${page.stuck.map(para).join('')}</div>
    <div class="card"><h2>Sources</h2><ol class="sources">${refs.map(id => { const [who, title, url] = LEARN_SOURCES[id];
      return `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(title)}</a><small>${esc(who)}</small></li>`; }).join('')}</ol>
      <p class="muted">A point with no number is everyday practice rather than a finding. ${esc(ASK_DOCTOR)}</p></div>
    <div class="twoBtn">${prev ? `<button class="btn" data-learn="${prev[0]}">‹ ${name(prev)}</button>` : ''}${next ? `<button class="btn primary" data-learn="${next[0]}">${name(next)} ›</button>` : ''}</div>`;
  show('learn');
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-learn]');
  if (!b) return;
  closeSheets();
  const here = document.body.dataset.screen === 'learn';
  // Paging from page to page keeps where Back goes; from the list, Back goes to the list.
  const back = here ? (learnKey ? learnBack : () => openLearn()) : b.dataset.from === 'plan' ? openPlan : null;
  openLearn(b.dataset.learn);
  learnBack = back;
});

// ---- What helps ----
function openGear() { renderGear(); show('gear'); }
function renderGear() {
  $('gearBody').innerHTML = `<div class="card">${GEAR.map(g => `<label class="check gearRow"><input type="checkbox" data-gear="${g.id}"${state.gear[g.id] ? ' checked' : ''}>
    <span><b>${g.emoji} ${fill(g.text)}</b><small class="muted">${esc(g.why)}</small></span></label>`).join('')}</div>`;
}
$('gearBody').addEventListener('change', e => {
  const g = e.target.dataset.gear;
  if (!g) return;
  if (e.target.checked) state.gear[g] = true; else delete state.gear[g];
  save();
});

// ---- The handoff note ----
function openHandoff() { $('handoffText').textContent = handoffText(state, curId(), Date.now()); show('handoff'); }
$('handoffShare').onclick = () => shareText(`Potty notes for ${K().name}`, handoffText(state, curId(), Date.now()));
$('handoffPrint').onclick = () => printText(`Potty notes for ${K().name}`, handoffText(state, curId(), Date.now()));
$('handoffInvite').onclick = () => openShare();

// ---- When to call the doctor ----
function openUrgent() {
  const k = K(), doc = k.doc || {};
  $('urgentBody').innerHTML = `<div class="card"><h2>Call the doctor about</h2><ul class="real">${URGENT.filter(([, now]) => !now).map(([s]) => `<li>${esc(s)}</li>`).join('')}</ul>
      <button class="btn call big" data-dial="${esc(doc.phone || '')}">📞 Call ${esc(doc.name || 'the doctor')}</button>
      ${doc.phone ? '' : `<p class="muted">Add the number in ${esc(k.name)}'s details (Settings) for a one-tap call.</p>`}</div>
    <div class="card advice"><h2>Get help now</h2><ul class="real">${URGENT.filter(([, now]) => now).map(([s]) => `<li>${esc(s)}</li>`).join('')}</ul>
      <p>Call the doctor's after-hours line, or 911 in an emergency.</p><button class="btn call big" data-dial="911">📞 911</button></div>
    <p class="muted">${esc(ASK_DOCTOR)}</p>`;
  show('urgent');
}
$('urgentBody').addEventListener('click', e => { const b = e.target.closest('[data-dial]'); if (b) call(b.dataset.dial); });

function openAbout() {
  $('doctor').textContent = ASK_DOCTOR;
  $('sources').innerHTML = SOURCES.map(s => `<li>${esc(s)}</li>`).join('');
  show('about');
}

// ---- Navigation ----
// [data-go] buttons open a screen, [data-back] goes back, [data-close] closes a sheet.
const OPEN = { setup: openSetup, home: goHome, kidmode: () => openKidMode() /* kidmode.js, loaded next */, progress: openProgress, plan: openPlan, history: openHistory,
  stickers: openStickers, nights: openNights, ready: openReady, learn: () => openLearn(), guides: openGuides, gear: openGear, handoff: openHandoff,
  urgent: openUrgent, about: openAbout };
document.addEventListener('click', e => {
  const t = e.target.closest('[data-go],[data-back],[data-close]');
  if (!t) return;
  if (t.dataset.go) { closeSheets(); OPEN[t.dataset.go](); }
  else if ('back' in t.dataset) goBack();
  else closeSheets();
});
const closeSheets = () => { scanStop(); document.querySelectorAll('.sheet.open').forEach(s => s.classList.remove('open')); };
// The screen showing, drawn again (after a change here or from another phone).
function redraw() {
  const s = document.body.dataset.screen;
  if (!isSetUp() && s !== 'setup') { openSetup(); return; }
  const R = { home: renderHome, progress: renderProgress, plan: renderPlan, history: renderHistory, stickers: renderStickers,
    nights: renderNights, ready: renderReady, kidmode: renderKidMode, gear: renderGear };
  if (R[s]) R[s]();
  else if (s === 'handoff') $('handoffText').textContent = handoffText(state, curId(), Date.now());
  else if (s === 'setup' && isSetUp()) renderKidList();
}
