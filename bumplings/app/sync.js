// Family sharing: the same pregnancy, appointments, checklist, kicks, contractions, journal and names on
// both grown-ups' phones. A copy of Tot Routines' sync.js (apps/routines/www/sync.js) with Bumplings' own
// documents and keys; it uses the same server, which keeps each family apart by its secret.
// The app's state is cut into small documents (SYNC_SPEC says how finely), so two grown-ups changing
// different things at once both keep their change; the same thing changed on both, the later one wins.
// The server is apps/routines/sync/server.js, and it can't read any of it: everything is sealed on the phone
// with the family's secret, which only the family's phones hold.
const SYNC_URL = 'https://sync.tottoolbox.com';
const SYNC_KEY = 'tot-bump-sync'; // { secret, rev, base: {path: json}, at }

// How deep each part of the state is cut. A number is how many levels of keys below it are documents'
// paths; an object names the depth for each key ('*' for any other). `me` is this phone's own.
//   preg: the details (one document)     appts, kicks, contractions, own: {id: thing}
//   checks: {item: 'YYYY-MM-DD'}         bag: {item: true}      log: {day: entry}
//   names: {id: {name, sex, votes: {mom: 1 | -1, partner: 1 | -1}}}, each grown-up's vote its own document
//   photos: {week: {id, day}}             plan: {section: {pick, note}}     babylog: {id: entry}
//   scans: {key: {id, wk, day, note, at, by}} (ultrasound pictures, from 1.20; always shared)
//   ticks: {item: {at, by}} (who ticked a checklist item, when)    checkins: {mom | partner: {day, at}}
//   feels: {'YYYY-MM-DD.mom' | 'YYYY-MM-DD.partner': {mood, at}} (each grown-up's feeling in a shared journal entry)
// From 1.11 what's added says when and by whom ('mom' or 'partner'): see bumpNews in logic.js.
// A photo's picture itself isn't in the state (it's too big for localStorage): the page keeps it in
// pixStore, and it travels as its own document, pix/<id>, beside the state's documents.
// What's kept just for this phone (state.priv: private journal entries and photos, see app.js) isn't in
// SYNC_SPEC, so it's never sent; marking something private moves it there, which removes it from the other phone.
const SYNC_SPEC = { preg: 0, appts: 1, checks: 1, bag: 1, own: 1, kicks: 1, contractions: 1, log: 1, names: { '*': { votes: 1 } },
  photos: 1, plan: 1, babylog: 1, ticks: 1, checkins: 1, feels: 1, scans: 1 };
// The server takes 2 MB a request; a round sends about this much and leaves the rest for the next.
const SYNC_BUDGET = 1.2e6;
const PIX = 'pix/';
// The shared pictures: the bump photos' and the ultrasounds'.
const photoIds = st => [...Object.values(st.photos || {}), ...Object.values(st.scans || {})].map(p => p.id);
const privPhotoIds = st => Object.values((st.priv && st.priv.photos) || {}).map(p => p.id);

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const specChild = (s, k) => typeof s === 'number' ? s - 1 : k in s ? s[k] : '*' in s ? s['*'] : 0;
const isBranch = s => typeof s === 'object' || s > 0;
const pathOf = segs => segs.map(encodeURIComponent).join('/');
const segsOf = p => p.split('/').map(decodeURIComponent);

// The state as {path: JSON text}. Empty branches have no documents.
function flattenState(st) {
  const out = {};
  const walk = (v, s, segs) => {
    if (v === undefined) return;
    if (isBranch(s) && isObj(v)) for (const k of Object.keys(v)) walk(v[k], specChild(s, k), [...segs, k]);
    else out[pathOf(segs)] = JSON.stringify(v);
  };
  for (const k of Object.keys(SYNC_SPEC)) walk(st[k], SYNC_SPEC[k], [k]);
  return out;
}

// What changed from `base` to `now`: {path: JSON text, or null when it's gone}.
function syncDiff(now, base) {
  const ch = {};
  for (const p of Object.keys(now)) if (now[p] !== base[p]) ch[p] = now[p];
  for (const p of Object.keys(base)) if (!(p in now)) ch[p] = null;
  return ch;
}

// A checklist item the other phone ticked today and sent without saying when or by whom (a Bumplings from
// before 1.11): this phone notes it as the other grown-up's, now, so it's in Lately with their name.
function stampArrived(st, docs, now, today) {
  const other = st.me === 'mom' ? 'partner' : st.me === 'partner' ? 'mom' : '';
  if (!other) return;
  for (const [p, v] of Object.entries(docs)) {
    const segs = segsOf(p);
    if (segs[0] !== 'checks' || segs.length !== 2 || v === null || JSON.parse(v) !== today) continue;
    if (!isObj(st.ticks)) st.ticks = {};
    if (!st.ticks[segs[1]] && !(pathOf(['ticks', segs[1]]) in docs)) st.ticks[segs[1]] = { at: now, by: other };
  }
}

// A branch with no values anywhere in it.
const hollow = o => isObj(o) && Object.values(o).every(hollow);
// Write documents into the state: removals first, then values, making branches as needed. A branch left
// hollow by a removal goes too (a name with no fields left). The top-level parts always stay.
function applyDocs(st, docs) {
  const ps = Object.keys(docs).sort((a, b) => (docs[a] === null ? 0 : 1) - (docs[b] === null ? 0 : 1));
  for (const p of ps) {
    const segs = segsOf(p);
    if (!Object.hasOwn(SYNC_SPEC, segs[0]) || !segs.every(safeKey)) throw new Error(`not a synced path: ${p}`);
    if (docs[p] === null) {
      const chain = [st];
      for (const k of segs.slice(0, -1)) { const o = chain.at(-1)[k]; if (!isObj(o)) break; chain.push(o); }
      if (chain.length !== segs.length) continue; // already gone
      delete chain.at(-1)[segs.at(-1)];
      for (let i = chain.length - 1; i >= 2 && hollow(chain[i]); i--) delete chain[i - 1][segs[i - 1]];
    } else {
      let o = st;
      for (const k of segs.slice(0, -1)) { if (!isObj(o[k])) o[k] = {}; o = o[k]; }
      o[segs.at(-1)] = JSON.parse(docs[p]);
    }
  }
  normalizeState(st);
}
// The shape the rest of the app relies on.
function normalizeState(st) {
  if (!isObj(st.preg)) st.preg = null;
  for (const k of ['appts', 'checks', 'bag', 'own', 'kicks', 'contractions', 'log', 'names', 'photos', 'plan', 'babylog', 'ticks', 'checkins', 'feels', 'scans']) if (!isObj(st[k])) st[k] = {};
  for (const n of Object.values(st.names)) if (!isObj(n.votes)) n.votes = {};
  if (!isObj(st.priv)) st.priv = {};
  for (const k of ['log', 'photos', 'gallery', 'saved']) if (!isObj(st.priv[k])) st.priv[k] = {};
}

// ---- What the other phone sends is checked before it's used ----
// Only the family's phones can write to the family, but one could be lost, or an invite scanned by someone it
// wasn't meant for. So a document is taken only in the shape this app writes: its keys plain ids (never one
// that reaches into JavaScript's own objects, like __proto__), the values the page draws as they are (ids,
// emoji, dates, times) with nothing in them that could be read as part of the page, numbers as numbers, and a
// photo's picture a JPEG. One that isn't is dropped, and this phone's own copy, if it has one, stays.
const SAFE_KEY = /^[A-Za-z0-9_.:-]{1,64}$/, SAFE_TOKEN = /^[^<>&"'`\\]{0,200}$/;
const JPEG_URL = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const safeKey = k => SAFE_KEY.test(k) && !BAD_KEYS.has(k);
// Drawn as they are, so checked. The rest (names, titles, notes) is escaped as it's drawn.
const TOKENS = new Set(['id', 'mood', 'day', 'due', 'born', 'from', 'how', 'at', 'kind', 'list', 'side', 't', 'by']);
const NUMBERS = new Set(['n', 'weight', 'sys', 'dia', 'oz', 'start', 'end', 'every', 'long', 'hours', 'height', 'prewt',
  'embryo', 'gluAfter', '#num']);
const NUMBERS_IN = new Set(['glu']); // {meal: reading}
const LEAF_AS = { checks: 'day' }; // a document that is just a value: the key it's checked as
function safeValue(v, key, depth = 0) {
  if (v === null || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (NUMBERS.has(key) || depth > 8) return false;
  if (typeof v === 'string') return v.length <= 1e5 && (!TOKENS.has(key) || SAFE_TOKEN.test(v));
  if (Array.isArray(v)) return v.length <= 1000 && v.every(x => safeValue(x, key, depth + 1));
  return isObj(v) && Object.keys(v).every(k => safeKey(k) && safeValue(v[k], NUMBERS_IN.has(key) ? '#num' : k, depth + 1));
}
// `v`: the document as it came, JSON text (a picture's is its data URL), or null for a removal.
function syncValid(p, v) {
  if (typeof p !== 'string' || (v !== null && typeof v !== 'string')) return false;
  let segs, val;
  try { segs = segsOf(p); } catch { return false; } // not a path this app makes
  if (!segs.every(safeKey)) return false;
  if (segs[0] + '/' === PIX) return segs.length === 2 && (v === null || JPEG_URL.test(v));
  try { val = v === null ? null : JSON.parse(v); } catch { return false; } // not JSON
  return Object.hasOwn(SYNC_SPEC, segs[0]) && safeValue(val, segs.length > 1 && LEAF_AS[segs[0]] || segs.at(-1));
}

// One round with the server, given what this phone has now and what it had at the last round.
// Returns what to keep as the new base and the documents to write into the state. `all` (a new or reset
// phone) means the server sent the whole family, so anything not in it is gone.
function mergeReply(sent, reply) {
  const docs = { ...reply.docs };
  if (reply.all) for (const p of Object.keys(sent)) if (!(p in docs)) docs[p] = null;
  const base = { ...sent };
  for (const [p, v] of Object.entries(docs)) { if (v === null) delete base[p]; else base[p] = v; }
  return { base, docs };
}

// ---- Sealing: what the server holds, it can't read ----
// The family's secret is 32 random bytes made on the first phone. From it come three unrelated keys: the
// one the server knows the family by, one that seals each document (AES-GCM), and one that names it (HMAC),
// so the server sees neither what's stored nor what it's about. A document's name is bound into its seal,
// so the server can't swap one for another either.
const b64 = bytes => {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const utf8 = new TextEncoder();
const joinBytes = (a, b) => { const o = new Uint8Array(a.byteLength + b.byteLength); o.set(new Uint8Array(a)); o.set(new Uint8Array(b), a.byteLength); return o; };
const hkdf = what => ({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8.encode('tot-bump ' + what) });

let syncKeyCache = null;
async function familyKeys(secret) {
  if (syncKeyCache && syncKeyCache.secret === secret) return syncKeyCache;
  const root = await crypto.subtle.importKey('raw', unb64(secret), 'HKDF', false, ['deriveBits', 'deriveKey']);
  syncKeyCache = {
    secret,
    key: b64(await crypto.subtle.deriveBits(hkdf('server'), root, 256)),
    seal: await crypto.subtle.deriveKey(hkdf('seal'), root, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']),
    namer: await crypto.subtle.deriveKey(hkdf('name'), root, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']),
    names: new Map(), // path → sealed name
  };
  return syncKeyCache;
}
async function docName(k, p) {
  if (!k.names.has(p)) k.names.set(p, b64((await crypto.subtle.sign('HMAC', k.namer, utf8.encode(p))).slice(0, 16)));
  return k.names.get(p);
}
async function seal(key, bytes, bound = '') {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return 'e1.' + b64(joinBytes(iv, await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: utf8.encode(bound) }, key, bytes)));
}
async function unseal(key, text, bound = '') {
  const all = unb64(text.slice(3));
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12), additionalData: utf8.encode(bound) }, key, all.slice(12)));
}
const sealDoc = async (k, name, p, v) => v === null ? null : seal(k.seal, utf8.encode(JSON.stringify([p, v])), name);
async function openDoc(k, name, text) {
  const [p, v] = JSON.parse(new TextDecoder().decode(await unseal(k.seal, text, name)));
  if (await docName(k, p) !== name) throw new Error('a document came back under the wrong name');
  return [p, v];
}

// An invite: 32 random bytes (256 bits, too many to ever guess), shown on one phone as a QR code that the
// other phone scans. The id the server files the invite under and the key that seals the secret both come
// from the code; the code itself never leaves the two phones.
const INVITE_TAG = 'TOTBUMP1:';
const inviteCode = text => (/^TOTBUMP1:([A-Za-z0-9_-]{43})$/.exec(String(text).trim()) || [])[1] || null;
async function inviteKeys(code) {
  const root = await crypto.subtle.importKey('raw', unb64(code), 'HKDF', false, ['deriveBits', 'deriveKey']);
  return {
    id: b64(await crypto.subtle.deriveBits(hkdf('invite id'), root, 128)),
    seal: await crypto.subtle.deriveKey(hkdf('invite seal'), root, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']),
  };
}

// ---- The page's side: talking to the server ----
// The page provides `state`, saveLocal(), syncChanged(remote) (re-draw after the other phone's changes) and
// syncWatch(info) (told at each round and each save, and with null when sharing stops: the phone app checks
// for the other phone's news while it's closed, see Watch.java).
// Kept through vault.js: sealed, as it holds the family's secret.
let syncInfo = JSON.parse(vault.get(SYNC_KEY) || 'null');
if (syncInfo && !syncInfo.secret) {
  syncInfo = null;
  vault.remove(SYNC_KEY);
}
let syncBusy = false, syncAgain = false, syncTimer = null, syncWait = 0, syncStream = null;
const syncSave = () => { vault.set(SYNC_KEY, JSON.stringify(syncInfo)); syncWatch(syncInfo); };
const syncOn = () => !!syncInfo;

async function syncCall(method, url, body, key) {
  const r = await fetch(SYNC_URL + url, {
    method, headers: { 'content-type': 'application/json', ...(key ? { authorization: 'Bearer ' + key } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // A proxy or captive portal in the way answers with a web page, not the server's JSON.
  const j = await r.json().catch(() => { throw Object.assign(new Error("the sharing server isn't answering right now"), { status: r.ok ? 502 : r.status }); });
  if (!r.ok) throw Object.assign(new Error(j.error || `sync ${r.status}`), { status: r.status });
  return j;
}

// Sync soon (changes come in bursts: a tick, a re-plan, a save).
function syncSoon(ms = 800) {
  if (!syncInfo) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, ms);
}
async function syncNow() {
  if (!syncInfo) return;
  if (syncBusy) { syncAgain = true; return; }
  syncBusy = true;
  clearTimeout(syncTimer);
  const info = syncInfo;
  // While this round is on its way, what it sends is on the server but not yet counted here as sent.
  syncWatch(info);
  try {
    // Photos load before the first round, or they'd look deleted.
    await pixStore.ready;
    const k = await familyKeys(info.secret), changes = {}, flat = flattenState(state);
    // `sent` is the base with what this round sends: everything changed, up to SYNC_BUDGET.
    const sent = { ...info.base };
    let size = 0;
    const fits = s => { const n = s ? s.length : 0; if (size && size + n > SYNC_BUDGET) { syncAgain = true; return false; } size += n; return true; };
    for (const [p, v] of Object.entries(syncDiff(flat, info.base))) {
      const n = await docName(k, p), s = await sealDoc(k, n, p, v);
      if (!fits(s)) continue;
      changes[n] = s;
      if (v === null) delete sent[p]; else sent[p] = v;
    }
    // Photos' pictures: the server's set (info.pix) follows the photos in the state. A photo whose picture
    // isn't on this phone yet is still on its way from the other one.
    const want = new Set(photoIds(state)), had = new Set(info.pix || []), has = new Set(had);
    for (const id of want) {
      if (has.has(id)) continue;
      const data = await pixStore.get(id);
      if (!data) continue;
      const n = await docName(k, PIX + id), s = await sealDoc(k, n, PIX + id, data);
      if (!fits(s)) continue;
      changes[n] = s;
      has.add(id);
    }
    for (const id of had) if (!want.has(id)) { changes[await docName(k, PIX + id)] = null; has.delete(id); }
    const reply = await syncCall('POST', '/sync', { since: info.rev, changes }, k.key);
    if (syncInfo !== info) return; // sharing was stopped meanwhile
    // Open what came back. A removal comes as just a name: it can only be something this phone has.
    const known = new Map(), opened = {};
    for (const p of new Set([...Object.keys(sent), ...Object.keys(info.base)])) known.set(await docName(k, p), p);
    for (const id of new Set([...want, ...had])) known.set(await docName(k, PIX + id), PIX + id);
    for (const [n, text] of Object.entries(reply.docs)) {
      if (text === null) { if (known.has(n)) opened[known.get(n)] = null; continue; }
      // One that won't open, or isn't in this app's shape, is dropped rather than stopping every round after.
      const doc = await openDoc(k, n, text).catch(e => { console.warn(`a shared document wouldn't open: ${e.message}`); return null; });
      if (!doc) continue;
      if (syncValid(...doc)) opened[doc[0]] = doc[1]; else console.warn(`a shared document isn't in this app's shape: ${String(doc[0]).slice(0, 80)}`);
    }
    // Pictures go straight to pixStore (this phone's own come back too: they're already there). One this
    // phone just stopped sharing comes back as a removal, and stays here, private.
    const kept = new Set(privPhotoIds(state));
    for (const p of Object.keys(opened).filter(p => p.startsWith(PIX))) {
      const id = p.slice(PIX.length), v = opened[p];
      delete opened[p];
      if (v === null) { has.delete(id); if (!kept.has(id)) await pixStore.del(id); }
      else { has.add(id); if (!(await pixStore.get(id))) await pixStore.put(id, v); }
    }
    info.pix = [...has];
    const { base, docs } = mergeReply(sent, { ...reply, docs: opened });
    // Anything changed here while the reply was on its way is sent next round, not overwritten.
    const nowFlat = flattenState(state), mine = {};
    for (const [p, v] of Object.entries(docs)) if (nowFlat[p] === sent[p] && nowFlat[p] !== (v === null ? undefined : v)) mine[p] = v;
    if (Object.keys(nowFlat).some(p => nowFlat[p] !== sent[p]) || Object.keys(sent).some(p => !(p in nowFlat))) syncAgain = true;
    Object.assign(info, { rev: reply.rev, base, at: Date.now(), error: null });
    syncSave();
    syncWait = 0;
    if (Object.keys(mine).length) {
      applyDocs(state, mine);
      const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!reply.all) stampArrived(state, mine, d.getTime(), today);
      saveLocal(); syncChanged(true);
    }
    else syncChanged(false);
  } catch (e) {
    if (syncInfo !== info) return;
    // The server doesn't know the family's key. That should never happen, so the key is kept (a server
    // mistake can be put right) and sharing is paused, trying again every half hour; the share sheet says
    // how to start again if it stays that way.
    const lost = e.status === 401;
    info.error = lost ? 'unknown' : navigator.onLine === false ? 'offline' : e.message;
    syncSave();
    if (lost) syncStop();
    syncChanged(false);
    // Try again, waiting longer each time, up to two minutes.
    syncWait = lost ? 30 * 60e3 : Math.min(120e3, (syncWait || 2500) * 2);
    syncTimer = setTimeout(syncNow, syncWait);
  } finally {
    syncBusy = false;
    if (syncAgain && syncInfo) { syncAgain = false; syncSoon(200); }
  }
}

// While the app is open, the server says when the family changes. Stopped while the app is in the background.
function syncListen() {
  if (!syncInfo || syncStream || syncInfo.error === 'unknown') return;
  const ctl = new AbortController(), info = syncInfo;
  syncStream = ctl;
  (async () => {
    try {
      const { key } = await familyKeys(info.secret);
      const r = await fetch(SYNC_URL + '/events', { headers: { authorization: 'Bearer ' + key }, signal: ctl.signal });
      if (!r.ok) throw new Error(`events ${r.status}`);
      const rd = r.body.getReader(), dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await rd.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const m = /^data: (\d+)$/m.exec(buf.slice(0, i));
          buf = buf.slice(i + 2);
          if (m && Number(m[1]) !== syncInfo?.rev) syncNow();
        }
      }
    } catch (e) {
      if (ctl.signal.aborted) return;
    }
    // Dropped (network change, server restart): listen again shortly.
    if (syncStream === ctl) { syncStream = null; setTimeout(syncListen, 5000); }
  })();
}
function syncStop() {
  if (syncStream) { const s = syncStream; syncStream = null; s.abort(); }
  clearTimeout(syncTimer);
}

// Start sharing this phone's pregnancy: a new family, then an invite for the other phone.
async function syncCreate() {
  const secret = b64(crypto.getRandomValues(new Uint8Array(32)));
  await syncCall('POST', '/family', {}, (await familyKeys(secret)).key);
  syncInfo = { secret, rev: 0, base: {}, at: 0 };
  syncDone();
  await syncNow();
  syncListen();
}
// A new invite for the other phone: { text, minutes }, text being what its QR code holds.
async function syncInvite() {
  const code = b64(crypto.getRandomValues(new Uint8Array(32)));
  const inv = await inviteKeys(code), k = await familyKeys(syncInfo.secret);
  const { minutes } = await syncCall('POST', '/invite', { id: inv.id, box: await seal(inv.seal, unb64(syncInfo.secret)) }, k.key);
  return { text: INVITE_TAG + code, minutes };
}
// Join with the invite scanned from the other phone: this phone takes the family's pregnancy in place of
// its own (counted as already sent, so the family's copy replaces them rather than adding to them).
async function syncJoin(text) {
  const secret = await inviteSecret(text);
  syncStop();
  syncInfo = { secret, rev: 0, base: flattenState(state), at: 0 };
  syncDone();
  await syncNow();
  syncListen();
}
// The family's secret from an invite (it works once). Also opens what's locked on a phone restored from
// another (vault.js, boot.js).
async function inviteSecret(text) {
  const code = inviteCode(text);
  if (!code) throw Object.assign(new Error("That QR code isn't a Bumplings invite."), { status: 400 });
  const bad = () => Object.assign(new Error("That invite didn't work. Make a new one on the other phone."), { status: 404 });
  const inv = await inviteKeys(code), { box } = await syncCall('POST', '/join', { id: inv.id });
  try { return b64(await unseal(inv.seal, box)); } catch { throw bad(); }
}
const syncDone = syncSave;
function syncLeave() {
  syncStop();
  syncInfo = null;
  vault.remove(SYNC_KEY);
  syncWatch(null);
}
