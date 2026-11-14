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
// Parts a Bumplings from before 1.11 doesn't know. One of those (1.8.2 to 1.10 among them) that's sent one stops
// partway through taking the round in, having already counted the whole round as had; its next round then sends
// everything it didn't take in as removed, and the other phone loses it too (November 2026: a partner's journal
// entries). So these go only once the other grown-up's phone says it knows them: each phone from 1.22 says so in a
// bag document of its own, bag/sync.<mom | partner> = SYNC_LEVEL, which older phones keep without showing (the bag
// shows only its own items). Until then they stay on this phone, and go once the other phone's word arrives.
const SYNC_NEWER = new Set(['ticks', 'checkins', 'feels', 'scans']);
const SYNC_LEVEL = 2;
const helloPath = who => `bag/sync.${who}`;
const syncPeer = st => st.me === 'partner' ? 'mom' : 'partner';
// Whether the other grown-up's phone takes the newer parts.
function syncNewer(st) {
  const v = isObj(st.bag) ? st.bag[`sync.${syncPeer(st)}`] : undefined;
  return Number.isFinite(v) && v >= SYNC_LEVEL;
}
// The server takes 2 MB a request; a round sends about this much and leaves the rest for the next.
const SYNC_BUDGET = 1.2e6;
const PIX = 'pix/';
// The shared pictures: the bump photos', and the ultrasounds' once the other phone takes them (syncNewer).
const photoIds = st => [...Object.values(st.photos || {}), ...(syncNewer(st) ? Object.values(st.scans || {}) : [])].map(p => p.id);
const privPhotoIds = st => Object.values((st.priv && st.priv.photos) || {}).map(p => p.id);

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const specChild = (s, k) => typeof s === 'number' ? s - 1 : k in s ? s[k] : '*' in s ? s['*'] : 0;
const isBranch = s => typeof s === 'object' || s > 0;
const pathOf = segs => segs.map(encodeURIComponent).join('/');
const segsOf = p => p.split('/').map(decodeURIComponent);

// The state as {path: JSON text}, what goes to the other phone: the newer parts only once it takes them, and this
// phone's word that it does. Empty branches have no documents.
function flattenState(st) {
  const out = {}, newer = syncNewer(st);
  const walk = (v, s, segs) => {
    if (v === undefined) return;
    if (isBranch(s) && isObj(v)) for (const k of Object.keys(v)) walk(v[k], specChild(s, k), [...segs, k]);
    else out[pathOf(segs)] = JSON.stringify(v);
  };
  for (const k of Object.keys(SYNC_SPEC)) if (newer || !SYNC_NEWER.has(k)) walk(st[k], SYNC_SPEC[k], [k]);
  if (st.me === 'mom' || st.me === 'partner') out[helloPath(st.me)] = JSON.stringify(SYNC_LEVEL);
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
  return Object.hasOwn(SYNC_SPEC, segs[0]) && !tooDeep(segs) && safeValue(val, segs.length > 1 && LEAF_AS[segs[0]] || segs.at(-1));
}
// A path below where this app cuts its documents (a newer app cutting something finer): passed over. Taken, it
// would go into the state inside a bigger document, look removed at the next round, and be removed from both phones.
function tooDeep(segs) {
  let s = SYNC_SPEC[segs[0]];
  for (const k of segs.slice(1)) { if (!isBranch(s)) return true; s = specChild(s, k); }
  return false;
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

// ---- Two phones changed the same document ----
// The server keeps a phone from writing over a version it hasn't seen (server.js, `guard`), and sends that version
// back. The two are put together here, against what both started from (`was`): each field this phone changed
// is this phone's, the rest are the other phone's, so one grown-up changing a name and another a time both keep
// theirs. The same field changed on both, or a document that isn't a set of fields: this phone's, as before. One
// removed on one phone and changed on the other stays, changed. All are JSON text; undefined or null is "gone".
function mergeDoc(was, ours, theirs) {
  if (theirs == null) return ours ?? null;
  if (ours == null) return theirs;
  let o, t, b;
  try { o = JSON.parse(ours); t = JSON.parse(theirs); b = was == null ? null : JSON.parse(was); } catch { return ours; }
  if (!isObj(o) || !isObj(t)) return ours;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y), from = isObj(b) ? b : {}, out = { ...t };
  for (const k of new Set([...Object.keys(o), ...Object.keys(from)])) {
    if (same(o[k], from[k])) continue; // not changed here: the other phone's stands
    if (k in o) out[k] = o[k]; else delete out[k];
  }
  return JSON.stringify(out);
}
// The documents the server kept this phone from writing over (`refused`, their paths): they don't count as sent.
function unsend(sent, base, refused) {
  for (const p of refused) { if (p in base) sent[p] = base[p]; else delete sent[p]; }
}
// What goes into the state for them (into `mine`): the two put together. One whose other version couldn't be
// read is left as this phone has it and not sent again this run (syncStuck), rather than asked for round after round.
const syncStuck = new Set();
function mergeRefused(refused, opened, was, nowFlat, mine) {
  for (const p of refused) {
    delete mine[p];
    if (!(p in opened)) { syncStuck.add(p); continue; }
    const r = mergeDoc(was[p], nowFlat[p], opened[p]);
    if (r === null ? p in nowFlat : nowFlat[p] !== r) mine[p] = r;
  }
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

// ---- Woken by the family's other phones ----
// The phone app has an address Firebase can wake it at (its push token, Bridge.pushToken; none in a browser, or
// on a phone without Google Play). Each round says it to the sync server, which wakes the family's other phones
// when one of them changes something (sync/push.js: a message that says nothing; the phone then asks the server
// what changed, as ever). The app calls pushReady() when its token comes or changes, and pushArrived() when it's
// woken with the page still alive.
const pushToken = () => { try { return (typeof Android !== 'undefined' && Android.pushToken && Android.pushToken()) || ''; } catch { return ''; } };
globalThis.pushReady = () => { if (syncOn()) syncSoon(); };
// (Not while the app is in the background: the phone app tells the news itself then (Watch.java), and a round here
// first would leave it nothing to tell. The page takes the changes when it is next opened.)
globalThis.pushArrived = () => { if (syncOn() && !(typeof document !== 'undefined' && document.hidden)) syncNow(); };
// This phone stops being woken for the family (it's stopping sharing). Not waited for: the server lets a phone
// that no longer syncs go by itself.
function pushOff(info) {
  const token = pushToken();
  if (token) familyKeys(info.secret).then(k => syncCall('POST', '/push/off', { push: token }, k.key)).catch(e => console.warn(`stopping this phone being woken: ${e.message}`));
}

// ---- What this phone last synced has to be the state it has ----
// A round works out what was removed here as what the last round left (info.base) and the state no longer has. So
// the two must belong together: if the state were older than the base (it couldn't be saved: the phone's storage
// full, or the app stopped between the two writes) or gone (nothing saved to read, and the app started fresh),
// everything missing from it would be sent as removed, and every phone in the family would lose it. Each round
// that changes either leaves the same stamp in both (state.syncStamp, info.stamp), and the page says what it read
// when it starts (syncBoot). When they don't match, the next round is a recovering one (syncRecover): it sends
// nothing and asks for the whole family; the family's copy is taken where the two differ, what's only on this
// phone stays and is sent after as new, and nothing is removed anywhere. (Tot Routines' and Tot Potty' sync.js has the same.)
let syncRecover = false;
const syncStampNew = () => b64(crypto.getRandomValues(new Uint8Array(9)));
// Called by the page once it has read its state. `saved`: whether there was a saved one to read.
function syncBoot(saved) {
  if (!syncInfo) return;
  const had = syncInfo.rev > 0 || Object.keys(syncInfo.base || {}).length > 0;
  if (saved ? state.syncStamp !== syncInfo.stamp : had) { syncRecover = true; console.warn("this phone's saved copy isn't the one it last shared: taking the family's, removing nothing"); }
}

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
  const info = syncInfo, recover = syncRecover;
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
    // (A recovering round sends nothing: see syncBoot.) A newer part the other phone no longer takes is held
    // back, not removed from the family: this phone still has it, and it goes again once the other phone does.
    const heldBack = p => !syncNewer(state) && SYNC_NEWER.has(segsOf(p)[0]);
    for (const [p, v] of recover ? [] : Object.entries(syncDiff(flat, info.base))) {
      if (syncStuck.has(p) || (v === null && heldBack(p))) continue;
      const n = await docName(k, p), s = await sealDoc(k, n, p, v);
      if (!fits(s)) continue;
      changes[n] = s;
      if (v === null) delete sent[p]; else sent[p] = v;
    }
    // Photos' pictures: the server's set (info.pix) follows the photos in the state. A photo whose picture
    // isn't on this phone yet is still on its way from the other one.
    const want = new Set(photoIds(state)), had = new Set(info.pix || []), has = new Set(had);
    for (const id of recover ? [] : want) {
      if (has.has(id)) continue;
      const data = await pixStore.get(id);
      if (!data) continue;
      const n = await docName(k, PIX + id), s = await sealDoc(k, n, PIX + id, data);
      if (!fits(s)) continue;
      changes[n] = s;
      has.add(id);
    }
    if (!recover) for (const id of had) if (!want.has(id)) { changes[await docName(k, PIX + id)] = null; has.delete(id); }
    const reply = await syncCall('POST', '/sync', { since: recover ? 0 : info.rev, changes, guard: true, ...(pushToken() ? { push: pushToken() } : {}) }, k.key);
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
    // phone just stopped sharing comes back as a removal, and stays here, private; so do the ultrasounds' while
    // they stay on this phone (syncNewer).
    const kept = new Set([...privPhotoIds(state), ...(syncNewer(state) ? [] : Object.values(state.scans || {}).map(s => s.id))]);
    // The server lost what it had, or this is a recovering round (see below): the pictures it has are the ones
    // that just came, so the rest go to it again; a picture that didn't come is never removed here for that.
    const whole = recover || (!!reply.all && info.rev > 0);
    if (whole) has.clear();
    for (const p of Object.keys(opened).filter(p => p.startsWith(PIX))) {
      const id = p.slice(PIX.length), v = opened[p];
      delete opened[p];
      if (v === null) { has.delete(id); if (!kept.has(id) && !whole) await pixStore.del(id); }
      else { has.add(id); if (!(await pixStore.get(id))) await pixStore.put(id, v); }
    }
    info.pix = [...has];
    const refused = (reply.kept || []).map(n => known.get(n)).filter(p => p !== undefined && !p.startsWith(PIX));
    unsend(sent, info.base, refused);
    // The server answering with everything for a phone that had synced means it lost what it had (or was put
    // back to an older copy): nothing here is taken away for that. What this phone hasn't got is taken, and all
    // it has is sent again next round. A recovering round (syncBoot) is the same, but the family's copy is taken
    // where the two differ: this phone's may be the older.
    const lost = recover || (!!reply.all && info.rev > 0);
    let merged;
    if (lost) {
      merged = { base: Object.fromEntries(Object.entries(opened).filter(([p, v]) => v !== null && !heldBack(p))), docs: {} };
      for (const [p, v] of Object.entries(merged.base)) if (recover ? flat[p] !== v : !(p in flat)) merged.docs[p] = v;
      syncAgain = true;
    } else merged = mergeReply(sent, { ...reply, docs: opened });
    const { base, docs } = merged;
    // Anything changed here while the reply was on its way is sent next round, not overwritten.
    const nowFlat = flattenState(state), mine = {};
    for (const [p, v] of Object.entries(docs)) if (nowFlat[p] === (lost ? flat[p] : sent[p]) && nowFlat[p] !== (v === null ? undefined : v)) mine[p] = v;
    mergeRefused(refused, opened, info.base, nowFlat, mine);
    if (Object.keys(nowFlat).some(p => nowFlat[p] !== sent[p] && !syncStuck.has(p)) || Object.keys(sent).some(p => !(p in nowFlat) && !syncStuck.has(p))) syncAgain = true;
    // What came goes into the state before the round counts as done. Counted first, a document that then didn't
    // go in would look removed here, and the next round would remove it from the other phone too.
    const newer = syncNewer(state), took = Object.keys(mine).length > 0;
    if (took) {
      applyDocs(state, mine);
      const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!reply.all) stampArrived(state, mine, d.getTime(), today);
      saveLocal();
    }
    // The other phone's word that it takes the newer parts just came (or went): what's held back goes now.
    if (syncNewer(state) !== newer) syncAgain = true;
    // The state and what was synced are stamped as belonging together, and the state saved first (see syncBoot).
    const moved = took || lost || Object.keys(changes).length > 0 || Object.keys(reply.docs).length > 0;
    const stamp = moved ? syncStampNew() : info.stamp;
    if (moved) { state.syncStamp = stamp; saveLocal(); }
    Object.assign(info, { rev: reply.rev, base, at: Date.now(), error: null, stamp });
    if (recover) syncRecover = false;
    syncSave();
    syncWait = 0;
    syncChanged(took);
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
  syncInfo = { secret, rev: 0, base: {}, at: 0, stamp: state.syncStamp = syncStampNew() };
  syncRecover = false;
  saveLocal();
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
  // Not this phone's word that it takes the newer parts (flattenState): that still has to go.
  const base = flattenState(state);
  delete base[helloPath(state.me)];
  syncInfo = { secret, rev: 0, base, at: 0, stamp: state.syncStamp = syncStampNew() };
  syncRecover = false;
  saveLocal();
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
  if (syncInfo) pushOff(syncInfo);
  syncStop();
  syncInfo = null;
  vault.remove(SYNC_KEY);
  syncWatch(null);
}
