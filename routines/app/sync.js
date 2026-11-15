// Family sharing: the same children, routines, ticks and plans on every grown-up's phone.
// The app's state is cut into small documents (SYNC_SPEC says how finely), so two grown-ups changing
// different things at once both keep their change; the same thing changed on both, the later one wins.
// The server is apps/routines/sync/server.js, and it can't read any of it: everything is sealed on the phone
// with the family's secret, which only the family's phones hold. Steps' photos and recorded voices stay on the
// phone that made them; the journal's photos and videos go from phone to phone (see "Journal photos and videos").
const SYNC_URL = 'https://sync.tottoolbox.com';
const SYNC_KEY = 'tot-routines-sync'; // { secret, rev, base: {path: json}, at }

// How deep each part of the state is cut. A number is how many levels of keys below it are documents'
// paths; an object names the depth for each key ('*' for any other). `current` is this phone's own.
//   kids:     {child: child}, the children (state.children, a list) by id, each with `pos`, its place in the list
//   lists:    {child: {routine: routine}}, each child's routines (state.routines, {child: [routine]}) the same way
//   done:     {day: {child: {routine: true}}}
//   wake:     {child: 'HH:MM'}              likes: {child: {activity: 1 | -1}}
//   plans:    {child: {day: {items, swaps, busy, edited, done: {slot: tick}, missed: {slot: tick}}}}
//   journal:  {entry id: entry}, an entry being {child, day, about, title, text, by, dev, at, media: [item]}
//   phones:   {phone: {name, pub, at, proof}}, the family's phones (see "The family's phones")
//   vouch:    {phone: {by, sig}}, the phone that let each one in, signed by it (see "The family's phones")
//   plan:     {key}, the family's video plan's key (see "The family's video plan"), one document
//   meds:     {child: {dose: dose}}, the medicine each child was given (from 1.73), each dose a document of its own
//   outings:  {plan id: plan}, days planned on triangletots.com and carried here (see "Plans from Triangle Tots")
//   seen:     {entry: {phone: look}}, who has looked at each journal entry and its photos and videos (from 1.83),
//             each phone's look a document of its own (logic.js seenAdd). Phones before 1.83 pass them over.
// Each child and each routine is a document of its own (from 1.43), so a child added on one phone and another
// child changed on the other both stay. Before, the whole list was one document (`children`, `routines/<child>`);
// those are left on the server as they are, and what comes under them is passed over.
const SYNC_SPEC = { kids: 1, lists: 2, done: 3, wake: 1, likes: 2, plans: { '*': { '*': { done: 1, missed: 1 } } }, journal: 1, phones: 1, vouch: 1, plan: 0, meds: 2, seen: 2, outings: 1 };
const SYNC_OLD = new Set(['children', 'routines']);

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const specChild = (s, k) => typeof s === 'number' ? s - 1 : k in s ? s[k] : '*' in s ? s['*'] : 0;
const isBranch = s => typeof s === 'object' || s > 0;
const pathOf = segs => segs.map(encodeURIComponent).join('/');
const segsOf = p => p.split('/').map(decodeURIComponent);
const oldPath = p => SYNC_OLD.has(segsOf(p)[0]);

// A list of things with ids as {id: thing with its place}, and back.
const byId = xs => Object.fromEntries((Array.isArray(xs) ? xs : []).filter(x => x && x.id).map((x, pos) => [x.id, { ...x, pos }]));
const fromId = o => Object.entries(isObj(o) ? o : {}).filter(([, x]) => isObj(x))
  .map(([id, x]) => ({ ...x, id })).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0) || (a.id < b.id ? -1 : 1))
  .map(({ pos, ...x }) => x);
// The state as it's cut up: the children and routines by id; the rest is the state's own.
function syncView(st) {
  const v = {};
  for (const k of Object.keys(SYNC_SPEC)) v[k] = st[k];
  v.kids = byId(st.children);
  v.lists = Object.fromEntries(Object.entries(st.routines || {}).map(([c, rs]) => [c, byId(rs)]));
  return v;
}

// The state as {path: JSON text}. Empty branches have no documents.
function flattenState(st) {
  const out = {}, view = syncView(st);
  const walk = (v, s, segs) => {
    if (v === undefined) return;
    if (isBranch(s) && isObj(v)) for (const k of Object.keys(v)) walk(v[k], specChild(s, k), [...segs, k]);
    else out[pathOf(segs)] = JSON.stringify(v);
  };
  for (const k of Object.keys(SYNC_SPEC)) walk(view[k], SYNC_SPEC[k], [k]);
  return out;
}

// What changed from `base` to `now`: {path: JSON text, or null when it's gone}. What was kept under the paths
// before 1.43 isn't taken away (a phone not yet updated still reads it).
function syncDiff(now, base) {
  const ch = {};
  for (const p of Object.keys(now)) if (now[p] !== base[p]) ch[p] = now[p];
  for (const p of Object.keys(base)) if (!(p in now) && !oldPath(p)) ch[p] = null;
  return ch;
}

// A branch with no values anywhere in it (a plan day's empty `done` counts as nothing).
const hollow = o => isObj(o) && Object.values(o).every(hollow);
// Write documents into the state: removals first, then values, making branches as needed. A branch left
// hollow by a removal goes too (an empty day would look planned). The top-level parts always stay.
function applyDocs(st, docs) {
  normalizeState(st);
  const view = syncView(st);
  const ps = Object.keys(docs).filter(p => !oldPath(p)).sort((a, b) => (docs[a] === null ? 0 : 1) - (docs[b] === null ? 0 : 1));
  for (const p of ps) {
    const segs = segsOf(p);
    if (!Object.hasOwn(SYNC_SPEC, segs[0]) || !segs.every(safeKey)) throw new Error(`not a synced path: ${p}`);
    if (docs[p] === null) {
      const chain = [view];
      for (const k of segs.slice(0, -1)) { const o = chain.at(-1)[k]; if (!isObj(o)) break; chain.push(o); }
      if (chain.length !== segs.length) continue; // already gone
      delete chain.at(-1)[segs.at(-1)];
      for (let i = chain.length - 1; i >= 2 && hollow(chain[i]); i--) delete chain[i - 1][segs[i - 1]];
    } else {
      let o = view;
      for (const k of segs.slice(0, -1)) { if (!isObj(o[k])) o[k] = {}; o = o[k]; }
      o[segs.at(-1)] = JSON.parse(docs[p]);
    }
  }
  for (const k of Object.keys(SYNC_SPEC)) if (k !== 'kids' && k !== 'lists') st[k] = view[k];
  // The children and routines are made again only when they changed (the page may be holding on to them).
  const top = new Set(ps.map(p => segsOf(p)[0]));
  if (top.has('kids')) st.children = fromId(view.kids);
  // (A child with no routines has no list: the page makes one when it's wanted.)
  if (top.has('lists')) st.routines = Object.fromEntries(Object.entries(view.lists).filter(([, rs]) => isObj(rs) && Object.keys(rs).length).map(([c, rs]) => [c, fromId(rs)]));
  normalizeState(st);
}
// The shape the rest of the app relies on.
function normalizeState(st) {
  if (!Array.isArray(st.children)) st.children = [];
  for (const k of ['routines', 'done', 'wake', 'likes', 'plans', 'journal', 'phones', 'vouch', 'meds', 'seen', 'outings']) if (!isObj(st[k])) st[k] = {};
  for (const days of Object.values(st.plans)) for (const d of Object.values(days)) if (!isObj(d.done)) d.done = {};
}

// ---- What the other phones send is checked before it's used ----
// Only the family's phones can write to the family, but one could be lost, or an invite scanned by someone it
// wasn't meant for. So a document is taken only in the shape this app writes: its keys plain ids (never one
// that reaches into JavaScript's own objects, like __proto__), the values the page draws as they are (ids,
// emoji, days, times) with nothing in them that could be read as part of the page, numbers as numbers, and a
// photo's or video's type an image or video one. One that isn't is dropped, and this phone's own copy, if it
// has one, stays. (Bumplings' sync.js has the same, for its own documents.)
const SAFE_KEY = /^[A-Za-z0-9_.:-]{1,64}$/, SAFE_TOKEN = /^[^<>&"'`\\]{0,200}$/, MEDIA_MIME = /^(image|video)\/[a-z0-9.+-]{1,40}(;[A-Za-z0-9.=,+ -]{0,80})?$/;
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const safeKey = k => SAFE_KEY.test(k) && !BAD_KEYS.has(k);
// Drawn as they are, so checked. The rest (names, titles, notes) is escaped as it's drawn.
const TOKENS = new Set(['id', 'key', 'emoji', 'when', 'leave', 'home', 'day', 'birth', 'days', 'busy', 'slot', 'interest',
  'interests', 'child', 'dev', 'about', 'act', 'type', 'template', 'at', 'to', 'from', 'pub', 'bed', 'start', 'end', 'd', 'mode']);
const NUMBERS = new Set(['secs', 'size', 'w', 'h', 'swaps', 'pos', 'every', 'max']);
const LEAF_AS = { wake: 'when' }; // a document that is just a value: the key it's checked as
function safeValue(v, key, depth = 0) {
  if (key === 'mime') return typeof v === 'string' && MEDIA_MIME.test(v);
  if (v === null || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (NUMBERS.has(key) || depth > 8) return false;
  if (typeof v === 'string') return v.length <= 1e5 && (!TOKENS.has(key) || SAFE_TOKEN.test(v));
  if (Array.isArray(v)) return v.length <= 1000 && v.every(x => safeValue(x, key, depth + 1));
  return isObj(v) && Object.keys(v).every(k => safeKey(k) && safeValue(v[k], k, depth + 1));
}
// `v`: the document as it came, JSON text, or null for a removal.
function syncValid(p, v) {
  if (typeof p !== 'string' || (v !== null && typeof v !== 'string')) return false;
  let segs, val;
  try { segs = segsOf(p); val = v === null ? null : JSON.parse(v); } catch { return false; } // not a path this app makes, or not JSON
  return Object.hasOwn(SYNC_SPEC, segs[0]) && segs.every(safeKey) && !tooDeep(segs) && safeValue(val, segs.length > 1 && LEAF_AS[segs[0]] || segs.at(-1));
}
// A path below where this app cuts its documents (a newer app cutting something finer): passed over. Taken, it
// would go into the state inside a bigger document, look removed at the next round, and be removed from every phone.
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
const hkdf = what => ({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8.encode('tot-routines ' + what) });

let syncKeyCache = null;
async function familyKeys(secret) {
  if (syncKeyCache && syncKeyCache.secret === secret) return syncKeyCache;
  const root = await crypto.subtle.importKey('raw', unb64(secret), 'HKDF', false, ['deriveBits', 'deriveKey']);
  syncKeyCache = {
    secret,
    key: b64(await crypto.subtle.deriveBits(hkdf('server'), root, 256)),
    seal: await crypto.subtle.deriveKey(hkdf('seal'), root, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']),
    namer: await crypto.subtle.deriveKey(hkdf('name'), root, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']),
    plan: b64(await crypto.subtle.deriveBits(hkdf('plan'), root, 256)), // the video plan's key, for a family with none yet
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
// The same, as bytes rather than text, for the journal's photos and videos.
async function sealBytes(key, bytes, bound) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return joinBytes(iv, await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: utf8.encode(bound) }, key, bytes));
}
async function unsealBytes(key, all, bound) {
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12), additionalData: utf8.encode(bound) }, key, all.slice(12)));
}
const sealDoc = async (k, name, p, v) => v === null ? null : seal(k.seal, utf8.encode(JSON.stringify([p, v])), name);
async function openDoc(k, name, text) {
  const [p, v] = JSON.parse(new TextDecoder().decode(await unseal(k.seal, text, name)));
  if (await docName(k, p) !== name) throw new Error('a document came back under the wrong name');
  return [p, v];
}

// An invite: 32 random bytes (256 bits, too many to ever guess), shown on one phone as a QR code that the
// other phone scans. The id the server files the invite under, the key that seals what it holds and the key
// the joining phone proves it scanned the code with all come from the code; the code itself never leaves the
// two phones. From 1.67 (TOTROUTINES2) it holds the secret and the phones the inviting phone trusts (see "The
// family's phones"); before, just the secret. An app before 1.67 doesn't take the new ones.
const INVITE_TAG = 'TOTROUTINES2:';
const INVITE_RE = /^TOTROUTINES([12]):([A-Za-z0-9_-]{43})$/;
const inviteCode = text => (INVITE_RE.exec(String(text).trim()) || [])[2] || null;
const INVITE_KEEP = 7 * 86400e3; // how long an inviting phone waits to see the phone that scanned its invite
async function inviteKeys(code) {
  const root = await crypto.subtle.importKey('raw', unb64(code), 'HKDF', false, ['deriveBits', 'deriveKey']);
  return {
    id: b64(await crypto.subtle.deriveBits(hkdf('invite id'), root, 128)),
    seal: await crypto.subtle.deriveKey(hkdf('invite seal'), root, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']),
    proof: await crypto.subtle.deriveKey(hkdf('invite proof'), root, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']),
  };
}

// ---- The family's phones ----
// Each phone that shares has a key pair of its own (ECDH P-256), kept with the sharing info (so the lock seals
// it), and puts its public half in the family's `phones`, with its grown-up's name. Removing a phone moves the
// family to a new secret: the phone removing it puts everything there, and leaves the server a note for each
// phone that stays, the new secret sealed with a key only that phone can work out (from its own pair and a
// one-off pair made for the note). The removed phone gets no note, so it can't read anything after that.
// Every phone can write the family's list, so a phone is sent a note only if this phone trusts it (`pins`, its
// public half as first trusted; one changed later is passed over). Otherwise someone in the family could list a
// made-up phone with their own key, and still be sent the new secret after their phone was removed. A phone is
// trusted when:
// - it was here when this phone joined, as the inviting phone said (the invite holds the phones it trusts), or,
//   joining with an invite from an app before 1.67, as the family was then;
// - it scanned one of this phone's invites: it lists itself with a proof made from the code (`proof`), which
//   only a phone that scanned it has. This phone then vouches for it (`vouch`), signing its id and public half;
// - a phone trusted here vouched for it (the signature is checked with the voucher's public half, the same key
//   pair signing as ECDSA).
// So each trusted phone was let in by another (`pinBy`), and the page shows by which; removing a phone offers
// to remove the ones it let in too. A phone from before 1.67 kept the phones it already had.
const ECDH = { name: 'ECDH', namedCurve: 'P-256' }, ECDSA = { name: 'ECDSA', namedCurve: 'P-256' }, SIGNED = { name: 'ECDSA', hash: 'SHA-256' };
const DEV = /^[A-Za-z0-9_-]{22}$/;
const vouchText = (dev, pub) => utf8.encode(`tot-routines vouch ${dev} ${pub}`);
async function signVouch(me, dev, pub) {
  const { key_ops, ...jwk } = me.priv; // the ECDH pair's private half, as an ECDSA one
  const key = await crypto.subtle.importKey('jwk', jwk, ECDSA, false, ['sign']);
  return b64(await crypto.subtle.sign(SIGNED, key, vouchText(dev, pub)));
}
async function vouchHolds(byPub, dev, pub, sig) {
  try {
    const key = await crypto.subtle.importKey('raw', unb64(byPub), ECDSA, false, ['verify']);
    return await crypto.subtle.verify(SIGNED, key, unb64(sig), vouchText(dev, pub));
  } catch { return false; } // not a key or a signature at all
}
const joinProof = async (inv, dev, pub) => b64(await crypto.subtle.sign('HMAC', inv.proof, utf8.encode(`tot-routines joined ${dev} ${pub}`)));
async function phoneKeys() {
  const kp = await crypto.subtle.generateKey(ECDH, true, ['deriveBits']);
  return { pub: b64(await crypto.subtle.exportKey('raw', kp.publicKey)), priv: await crypto.subtle.exportKey('jwk', kp.privateKey) };
}
async function noteKey(priv, pub, dev) {
  const other = await crypto.subtle.importKey('raw', unb64(pub), ECDH, false, []);
  const root = await crypto.subtle.importKey('raw', await crypto.subtle.deriveBits({ name: 'ECDH', public: other }, priv, 256), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(hkdf('note ' + dev), root, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
// The new secret for phone `dev`, whose public half is `pub`: the one-off public half (65 bytes), then the seal.
async function sealNote(pub, dev, secret) {
  const once = await crypto.subtle.generateKey(ECDH, true, ['deriveBits']);
  const box = await sealBytes(await noteKey(once.privateKey, pub, dev), unb64(secret), 'note ' + dev);
  return 'e1.' + b64(joinBytes(await crypto.subtle.exportKey('raw', once.publicKey), box));
}
async function openNote(me, dev, note) {
  const all = unb64(note.slice(3)), priv = await crypto.subtle.importKey('jwk', me.priv, ECDH, false, ['deriveBits']);
  return b64(await unsealBytes(await noteKey(priv, b64(all.slice(0, 65)), dev), all.slice(65), 'note ' + dev));
}
// This phone's name in the family's list: its grown-up's, as the page says (syncPhoneName), if it has one.
const phoneName = () => (typeof syncPhoneName === 'function' && String(syncPhoneName() || '').slice(0, 40)) || '';
// The longest side of the HEVC videos this phone plays (0 for none): the app's video chips (Bridge.hevcSide), if
// the page's player takes HEVC too. A paid plan's videos are made as HEVC only when every phone plays it.
const HEVC_SIDE = (() => {
  try {
    if (typeof Android === 'undefined' || !Android.hevcSide) return 0;
    return document.createElement('video').canPlayType('video/mp4; codecs="hvc1.1.6.L150.B0"') ? Android.hevcSide() : 0;
  } catch { return 0; }
})();
// This phone in the family's phones, as it is now (and its key pair, made the first time).
let syncLeaving = false; // stopping: this phone is taking itself off the list, not putting itself back
async function syncMePhone(info) {
  if (!info.me) info.me = await phoneKeys();
  if (syncLeaving) return;
  normalizeState(state);
  const was = state.phones[syncDev], name = phoneName();
  if (!was || was.pub !== info.me.pub || was.name !== name || was.hevc !== HEVC_SIDE || was.proof !== info.proof) {
    state.phones[syncDev] = { name, pub: info.me.pub, at: (was && was.at) || Date.now(), hevc: HEVC_SIDE, ...(info.proof ? { proof: info.proof } : {}) };
    saveLocal();
  }
}
// Whether every phone in the family (this one too) plays HEVC videos `side` pixels on their longest side. A
// phone that hasn't said (an older app) doesn't.
function familyPlaysHevc(side) {
  if (HEVC_SIDE < side) return false;
  return Object.entries(isObj(state.phones) ? state.phones : {}).every(([d, p]) => d === syncDev || (isObj(p) && typeof p.hevc === 'number' && p.hevc >= side));
}
// The family's phones this phone trusts (`pins`, see above), as the list is now; those gone are let go. Returns
// the names of the phones that joined since the last round (none when the family arrived whole: `fresh`), and
// whether this phone vouched for one (a change to send).
async function syncPins(info, fresh) {
  const pins = info.pins || (info.pins = {}), by = info.pinBy || (info.pinBy = {}), phones = state.phones || {}, joined = [];
  for (const d of Object.keys(pins)) if (!phones[d] && d !== syncDev) { delete pins[d]; delete by[d]; }
  if (info.me) pins[syncDev] = info.me.pub;
  const take = (d, p, from) => {
    pins[d] = p.pub;
    if (from) by[d] = from;
    if (!fresh && d !== syncDev) joined.push(typeof p.name === 'string' ? p.name : '');
  };
  const waiting = () => Object.entries(phones).filter(([d, p]) => !pins[d] && DEV.test(d) && isObj(p) && typeof p.pub === 'string');
  // Joined with an older app's invite: the phones there at the first round.
  if (info.tofu) { for (const [d, p] of waiting()) take(d, p); delete info.tofu; }
  // A phone that scanned one of this phone's invites: vouched for, for the others.
  let vouched = false;
  const invites = (info.invites || []).filter(i => Date.now() - i.at < INVITE_KEEP);
  for (const [d, p] of waiting()) {
    if (typeof p.proof !== 'string' || !info.me) continue;
    for (const i of invites) {
      if (await joinProof(await inviteKeys(i.code), d, p.pub) !== p.proof) continue;
      take(d, p, syncDev);
      state.vouch = isObj(state.vouch) ? state.vouch : {};
      state.vouch[d] = { by: syncDev, sig: await signVouch(info.me, d, p.pub) };
      invites.splice(invites.indexOf(i), 1); // each works once
      vouched = true;
      break;
    }
  }
  info.invites = invites;
  // One a trusted phone vouched for (and so on: the one that phone vouched for, ...).
  for (let more = true; more;) {
    more = false;
    for (const [d, p] of waiting()) {
      const v = isObj(state.vouch) ? state.vouch[d] : null;
      if (!isObj(v) || typeof v.by !== 'string' || v.by === d || !pins[v.by] || typeof v.sig !== 'string') continue;
      if (await vouchHolds(pins[v.by], d, p.pub, v.sig)) { take(d, p, v.by); more = true; }
    }
  }
  return { joined, vouched };
}
// The family's other phones, for the page: [{dev, name, at, keyed, by}]. `keyed`: trusted, so it can be sent a new
// secret; `by`: the phone that let it in, if this phone knows (this one's own id when it was this one).
function syncPhones() {
  const pins = (syncInfo && syncInfo.pins) || {}, by = (syncInfo && syncInfo.pinBy) || {};
  return Object.entries(state.phones || {}).filter(([d, p]) => d !== syncDev && isObj(p))
    .map(([dev, p]) => ({ dev, name: typeof p.name === 'string' ? p.name : '', at: Number(p.at) || 0, keyed: !!pins[dev], by: (pins[dev] && by[dev]) || null }))
    .sort((a, b) => a.at - b.at);
}
// The phones `dev` let in, and the ones they let in, and so on.
function syncLetInBy(dev) {
  const by = (syncInfo && syncInfo.pinBy) || {}, out = new Set([dev]);
  for (let more = true; more;) {
    more = false;
    for (const [d, f] of Object.entries(by)) if (out.has(f) && !out.has(d) && d !== syncDev && state.phones && state.phones[d]) { out.add(d); more = true; }
  }
  out.delete(dev);
  return [...out];
}

// ---- The page's side: talking to the server ----
// The page provides `state`, saveLocal(), syncChanged(remote, docs, known) (re-draw after the other phone's
// changes, and tell their news: the documents that came and what this phone knew before, see newsOf), mediaStore
// (media.js), mediaArrived(id) (a journal photo or video came, or couldn't: re-draw it) and syncWatch(info)
// (told at each round, and with null when sharing stops: the phone app checks for the other phones' news while
// it's closed, see Watch.java).
let syncInfo = (() => {
  try { return JSON.parse(vault.get(SYNC_KEY) || 'null'); } catch (e) { console.error("the sharing info couldn't be read:", e.message); return null; }
})();
// Sharing in 1.5 kept the family on the server as it was. It can't be carried over sealed (the other phone
// has to get the new secret), so it's switched off and the page asks the grown-ups to share again.
let syncRedo = !!localStorage.getItem(SYNC_KEY + '-redo');
if (syncInfo && !syncInfo.secret) {
  syncInfo = null;
  syncRedo = true;
  vault.remove(SYNC_KEY);
  localStorage.setItem(SYNC_KEY + '-redo', '1');
}
let syncBusy = false, syncAgain = false, syncTimer = null, syncWait = 0, syncStream = null;
const syncSave = () => { vault.set(SYNC_KEY, JSON.stringify(syncInfo)); syncWatch(syncInfo); };
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
// full, or the app stopped between the two writes) or gone (it couldn't be read, and the app started fresh),
// everything missing from it would be sent as removed, and every phone in the family would lose it. Each round
// that changes either leaves the same stamp in both (state.syncStamp, info.stamp), and the page says what it read
// when it starts (syncBoot). When they don't match, the next round is a recovering one (syncRecover): it sends
// nothing and asks for the whole family; the family's copy is taken where the two differ, what's only on this
// phone stays and is sent after as new, and nothing is removed anywhere.
let syncRecover = false;
const syncStampNew = () => b64(crypto.getRandomValues(new Uint8Array(9)));
// Called by the page once it has read its state. `saved`: whether there was a saved one to read.
function syncBoot(saved) {
  if (!syncInfo) return;
  const had = syncInfo.rev > 0 || Object.keys(syncInfo.base || {}).length > 0;
  if (saved ? state.syncStamp !== syncInfo.stamp : had) { syncRecover = true; console.warn("this phone's saved copy isn't the one it last shared: taking the family's, removing nothing"); }
}
const syncOn = () => !!syncInfo;

async function syncCall(method, url, body, key) {
  const r = await fetch(SYNC_URL + url, {
    method, headers: { 'content-type': 'application/json', ...(key ? { authorization: 'Bearer ' + key } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw Object.assign(new Error(j.error || `sync ${r.status}`), { status: r.status, body: j });
  return j;
}
// How much one round sends at most (the server takes 2 MB a request): the rest goes in the rounds after.
const SYNC_BATCH = 1.5e6;

// ---- Journal photos and videos ----
// An entry's media are items {id, type: 'photo' | 'video', mime, size, ...}, a video with a still from it as
// its `poster` (an item too, a JPEG, so the journal can show it before the video comes). The page keeps their
// bytes in mediaStore (media.js).
// Delivery is asynchronous with zero permanent server storage:
// 1. When a phone adds an entry, it puts its parts into the server's transit buffer (PUT /transit/<name>?dev=<id>).
// 2. When another family phone fetches them (GET /transit/<name>?dev=<id>), the server deletes the file from disk
//    the moment it has been delivered to all known family phones (with a 48h TTL sweep for uncollected files).
// 3. If a part is no longer in transit (already collected or expired), phones fall back to live relay (/relay/)
//    while both have Tot Routines open.
const MEDIA_PART = 2 << 20;
const mediaParts = size => Math.max(1, Math.ceil(size / MEDIA_PART));
const syncDev = (() => {
  try {
    let d = localStorage.getItem('tot-sync-dev');
    if (!d || !/^[A-Za-z0-9_-]{22}$/.test(d)) {
      d = b64(crypto.getRandomValues(new Uint8Array(16)));
      localStorage.setItem('tot-sync-dev', d);
    }
    return d;
  } catch {
    return b64(crypto.getRandomValues(new Uint8Array(16)));
  }
})();
// An entry's media items, posters included.
const entryMedia = e => (e.media || []).flatMap(it => it.poster ? [it, it.poster] : [it]);
// Every media item in the journal, by id.
function journalMedia(st) {
  const m = new Map();
  for (const e of Object.values(st.journal || {})) for (const it of entryMedia(e)) m.set(it.id, it);
  return m;
}
// Every photo and video the family shares: the journal's, and each child's own photo at the top of their page.
function sharedMedia(st) {
  const m = journalMedia(st);
  for (const c of st.children || []) if (c.photo && c.photo.id) m.set(c.photo.id, c.photo);
  return m;
}
const partName = (k, id, i) => docName(k, `media/${id}/${i}`);
const relayUrl = tail => `${SYNC_URL}/relay/${tail}`;
const transitUrl = tail => `${SYNC_URL}/transit/${tail}?dev=${syncDev}`;

// The most the server keeps waiting for a family (server.js's MAX_TRANSIT): a photo or video bigger than that
// (a very long video) never waits there, and goes only over the relay, while both phones are open.
// With the Supporter plan (its tier is '4k') the server keeps more (plans.js's TRANSIT).
const TRANSIT_CAP = { free: 200 << 20, '4k': 3 * 2 ** 30 };
// Put a photo's or video's parts in transit. Each part put there is counted (info.upto[id]), so a round that
// stops partway (no signal, say) picks up where it left off rather than sending it all again. False when the
// server is full for now (the family's other phones haven't collected what's waiting): the rest waits for a
// later round, and nothing is sent again.
async function transitUpload(k, it, info) {
  const blob = await mediaStore.get(it.id), n = mediaParts(blob.size);
  info.upto = info.upto || {};
  for (let i = info.upto[it.id] || 0; i < n; i++) {
    const name = await partName(k, it.id, i);
    const bytes = new Uint8Array(await blob.slice(i * MEDIA_PART, (i + 1) * MEDIA_PART).arrayBuffer());
    const r = await fetch(transitUrl(name), {
      method: 'PUT',
      headers: { authorization: 'Bearer ' + k.key, 'content-type': 'application/octet-stream', ...(planKey() ? { 'x-plan': planKey() } : {}) },
      body: await sealBytes(k.seal, bytes, name),
    });
    if (r.status === 413 || r.status === 507) return false;
    if (!r.ok) throw Object.assign(new Error(`transit ${r.status}`), { status: r.status, body: await r.json().catch(() => ({})) });
    info.upto[it.id] = i + 1;
    syncSave();
  }
  return true;
}

// Another phone asked for a part: send it if this phone has it (any phone that has it may answer; the first
// one the server takes wins, and the rest are told nobody's waiting).
async function mediaServe(name, ticket) {
  const info = syncInfo;
  if (!info) return;
  await mediaStore.ready;
  const k = await familyKeys(info.secret);
  for (const it of sharedMedia(state).values()) {
    if (!mediaStore.has(it.id)) continue;
    for (let i = 0; i < mediaParts(it.size); i++) {
      if (await partName(k, it.id, i) !== name) continue;
      const blob = await mediaStore.get(it.id);
      const bytes = new Uint8Array(await blob.slice(i * MEDIA_PART, (i + 1) * MEDIA_PART).arrayBuffer());
      const r = await fetch(relayUrl(ticket), { method: 'PUT', body: await sealBytes(k.seal, bytes, name), headers: { authorization: 'Bearer ' + k.key, 'content-type': 'application/octet-stream' } });
      // 410: another phone answered first, or the one that asked went away; it asks again if it still needs it.
      if (!r.ok && r.status !== 410) console.warn(`sending a part of a ${it.type}: ${r.status} ${(await r.json().catch(() => ({}))).error || ''}`);
      return;
    }
  }
}

// Fetch the photos and videos the other phones' entries have and this phone doesn't, one at a time, after each
// sync and whenever another phone opens the app. The page's mediaArrived(id) draws each as it comes. A part
// that no open phone has (the phone that took it isn't open) leaves its item in mediaMissing until another
// phone opens the app; with no other phone open it stops there. What's come of a video so far is kept in
// mediaGot, so it picks up where it left off. mediaError says why some haven't come.
const mediaMissing = new Set(), mediaGot = new Map(); // mediaGot: id → [Blob of each part come so far]
let mediaBusy = false, mediaAgain = false, mediaError = null, syncPeers = 0;
const MEDIA_WAITING = 'waiting for the phone that has them to open Tot Routines';
async function relayGet(k, name) {
  const r = await fetch(`${relayUrl(name)}?dev=${syncDev}`, { headers: { authorization: 'Bearer ' + k.key } });
  if (r.ok) return new Uint8Array(await r.arrayBuffer());
  if (r.status === 409) return 'nobody';  // no other phone open
  if (r.status === 504) return 'missing'; // no open phone has it
  const j = await r.json().catch(() => { throw Object.assign(new Error("the sharing server isn't answering right now"), { status: r.status }); });
  throw Object.assign(new Error(j.error || `relay ${r.status}`), { status: r.status });
}
async function partGet(k, name) {
  // 1. Try transit buffer (delivered asynchronously even if sender is closed; deleted from server once fetched)
  try {
    const tr = await fetch(transitUrl(name), { headers: { authorization: 'Bearer ' + k.key } });
    if (tr.ok) return new Uint8Array(await tr.arrayBuffer());
  } catch {}
  // 2. If not in transit (e.g. already delivered to other phones or TTL expired), fall back to live relay
  return relayGet(k, name);
}
async function mediaFetch() {
  if (!syncInfo) return;
  if (mediaBusy) { mediaAgain = true; return; }
  mediaBusy = true;
  const info = syncInfo;
  try {
    await mediaStore.ready;
    const k = await familyKeys(info.secret);
    // Photos and posters first: they're small, and they're what the journal shows.
    for (const it of [...sharedMedia(state).values()].sort((a, b) => (a.type === 'video') - (b.type === 'video'))) {
      if (syncInfo !== info) return;
      if (mediaStore.has(it.id) || mediaMissing.has(it.id)) continue;
      const got = mediaGot.get(it.id) || [], n = mediaParts(it.size);
      mediaGot.set(it.id, got);
      while (got.length < n) {
        const name = await partName(k, it.id, got.length), r = await partGet(k, name);
        if (r === 'nobody') { mediaError = MEDIA_WAITING; return; }
        if (r === 'missing') break;
        // Each part as a Blob, which the browser keeps outside the page's memory.
        got.push(new Blob([await unsealBytes(k.seal, r, name)]));
      }
      if (got.length < n) { mediaMissing.add(it.id); continue; }
      mediaGot.delete(it.id);
      if (!sharedMedia(state).has(it.id)) continue; // its entry (or the child's photo) went while it was coming
      const blob = new Blob(got, { type: it.mime });
      if (blob.size !== it.size) throw new Error(`a ${it.type} came ${blob.size} bytes, not ${it.size}`);
      await mediaStore.put(it.id, blob);
      mediaArrived(it.id);
    }
    mediaError = mediaMissing.size ? MEDIA_WAITING : null;
  } catch (e) {
    mediaError = navigator.onLine === false ? 'offline' : e.message;
  } finally {
    mediaBusy = false;
    mediaArrived(null);
    if (mediaAgain) { mediaAgain = false; mediaFetch(); }
  }
}
// Another phone opened the app: what no phone had before may be on it.
function mediaPeers(n) {
  const more = n > syncPeers;
  syncPeers = n;
  if (more) { mediaMissing.clear(); mediaFetch(); }
}

// Sync soon (changes come in bursts: a tick, a re-plan, a save).
function syncSoon(ms = 800) {
  if (!syncInfo) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, ms);
}
// A day's plan the app made by itself, as it does the first time a day is looked at (never changed by hand,
// nothing ticked): another phone may have made, and changed, the same day already.
function madePlan(p) {
  const s = segsOf(p);
  if (s[0] !== 'plans' || s.length !== 4) return false;
  const d = state.plans && state.plans[s[1]] && state.plans[s[1]][s[2]];
  return !!d && !d.edited && !d.swaps && !Object.keys(d.done || {}).length && !Object.keys(d.missed || {}).length;
}
let syncHeld = new Set(); // made plans held back a round, to be sent the next if no other phone had them
async function syncNow() {
  if (!syncInfo) return;
  if (syncBusy) { syncAgain = true; return; }
  syncBusy = true;
  clearTimeout(syncTimer);
  const info = syncInfo, recover = syncRecover;
  try {
    await mediaStore.ready;
    delete info.up; // 1.13–1.15: which photos and videos this phone had put on the server
    await syncMePhone(info);
    const k = await familyKeys(info.secret), changes = {};
    // `sent` is the base with what this round sends. A plan the app made by itself that no other phone has
    // sent yet is held back a round (`held`): if another phone has one for that day, theirs is taken, since they
    // may have changed it, rather than this one put over it.
    const sent = { ...info.base }, flat = flattenState(state), held = new Set();
    let size = 0;
    // (A recovering round sends nothing: see syncBoot.)
    for (const [p, v] of recover ? [] : Object.entries(syncDiff(flat, info.base))) {
      if (syncStuck.has(p)) continue;
      // (Not in a family's first round: there's no other phone yet.)
      if (info.rev && v !== null && !(p in info.base) && !syncHeld.has(p) && madePlan(p)) { held.add(p); continue; }
      const n = await docName(k, p), s = await sealDoc(k, n, p, v);
      if (size && size + (s ? s.length : 0) > SYNC_BATCH) break; // the rest next round
      size += s ? s.length : 0;
      changes[n] = s;
      if (v === null) delete sent[p]; else sent[p] = v;
    }
    const reply = await syncCall('POST', '/sync', { since: recover ? 0 : info.rev, changes, dev: syncDev, guard: true, ...(pushToken() && !syncLeaving ? { push: pushToken() } : {}) }, k.key); // (not while leaving: its last round would put back the token just taken off)
    if (syncInfo !== info) return; // sharing was stopped meanwhile
    // Open what came back. A removal comes as just a name: it can only be something this phone has.
    const known = new Map(), opened = {};
    for (const p of new Set([...Object.keys(sent), ...Object.keys(info.base), ...held])) known.set(await docName(k, p), p);
    for (const [n, text] of Object.entries(reply.docs)) {
      if (text === null) { if (known.has(n)) opened[known.get(n)] = null; continue; }
      // One that won't open, or isn't in this app's shape, is dropped rather than stopping every round after.
      const doc = await openDoc(k, n, text).catch(e => { console.warn(`a shared document wouldn't open: ${e.message}`); return null; });
      if (!doc || oldPath(doc[0])) continue; // (what phones before 1.43 kept is passed over)
      if (syncValid(...doc)) opened[doc[0]] = doc[1]; else console.warn(`a shared document isn't in this app's shape: ${String(doc[0]).slice(0, 80)}`);
    }
    const refused = (reply.kept || []).map(n => known.get(n)).filter(p => p !== undefined);
    unsend(sent, info.base, refused);
    // The server answering with everything for a phone that had synced means it lost what it had (or was put
    // back to an older copy): nothing here is taken away for that. What this phone hasn't got is taken, and
    // all it has is sent again next round. A recovering round (syncBoot) is the same, but the family's copy is
    // taken where the two differ: this phone's may be the older.
    const lost = recover || (!!reply.all && info.rev > 0);
    let merged;
    if (lost) {
      merged = { base: Object.fromEntries(Object.entries(opened).filter(([, v]) => v !== null)), docs: {} };
      for (const [p, v] of Object.entries(merged.base)) if (recover ? flat[p] !== v : !(p in flat)) merged.docs[p] = v;
      syncAgain = true;
    } else merged = mergeReply(sent, { ...reply, docs: opened });
    const { base, docs } = merged;
    // Anything changed here while the reply was on its way is sent next round, not overwritten. A held plan the
    // other phone also had is theirs; one it hadn't is sent next round.
    const nowFlat = flattenState(state), mine = {};
    for (const [p, v] of Object.entries(docs)) {
      const was = held.has(p) || lost ? flat[p] : sent[p];
      if (nowFlat[p] === was && nowFlat[p] !== (v === null ? undefined : v)) mine[p] = v;
    }
    mergeRefused(refused, opened, info.base, nowFlat, mine);
    syncHeld = new Set([...held].filter(p => !(p in docs)));
    const fresh = !info.rev || !!reply.all;
    // What came goes into the state, and the state is saved, before the round counts as done; and the two are
    // stamped as belonging together (see syncBoot). Counted first, something that then wasn't saved would look
    // removed here, and the next round would remove it from every phone.
    const took = Object.keys(mine).length > 0, knownBefore = took ? newsKnown(state) : null;
    if (took) applyDocs(state, mine);
    const moved = took || lost || Object.keys(changes).length > 0 || Object.keys(opened).length > 0;
    const stamp = moved ? syncStampNew() : info.stamp;
    if (moved) { state.syncStamp = stamp; saveLocal(); }
    Object.assign(info, { rev: reply.rev, base, at: Date.now(), error: null, stamp });
    if (recover) syncRecover = false;
    syncSave();
    syncWait = 0;
    // News is what changed since this phone last synced; the whole family arriving (joining, a reset) isn't.
    if (took) syncChanged(true, fresh ? null : mine, knownBefore);
    else syncChanged(false);
    // Anything here the server hasn't got (changed meanwhile, held, or more than one round takes) goes next.
    const after = flattenState(state);
    if (Object.keys(after).some(p => after[p] !== base[p] && !syncStuck.has(p)) || Object.keys(base).some(p => !(p in after) && !oldPath(p) && !syncStuck.has(p))) syncAgain = true;
    const { joined, vouched } = await syncPins(info, fresh);
    if (syncInfo !== info) return;
    if (vouched) { saveLocal(); syncAgain = true; } // the vouch goes to the other phones next round
    if (joined.length && typeof syncPhoneJoined === 'function') syncPhoneJoined(joined);
    syncSave();
    // Fetch the photos and videos this phone hasn't got, from transit or open phones, while this phone's own go.
    mediaFetch();
    // This phone's new photos and videos go into transit, for the other phones to collect when they open.
    info.transit = info.transit || {};
    for (const it of sharedMedia(state).values()) {
      if (info.transit[it.id] || !mediaStore.has(it.id)) continue;
      if (it.size <= TRANSIT_CAP[planTier] && !await transitUpload(k, it, info)) break;
      info.transit[it.id] = Date.now();
      if (info.upto) delete info.upto[it.id];
      syncSave();
    }
    const keep = sharedMedia(state);
    for (const m of [info.transit, info.upto || {}]) for (const id of Object.keys(m)) if (!keep.has(id)) delete m[id];
    syncSave();
  } catch (e) {
    if (syncInfo !== info) return;
    if (e.status === 401) { syncOff('Sharing was turned off: the server no longer knows this family.'); return; }
    if (e.status === 410) { await syncEnded(info, e.body || {}); return; }
    info.error = navigator.onLine === false ? 'offline' : e.message;
    syncChanged(false);
    // Try again, waiting longer each time, up to two minutes.
    syncWait = Math.min(120e3, (syncWait || 2500) * 2);
    syncTimer = setTimeout(syncNow, syncWait);
  } finally {
    syncBusy = false;
    if (syncAgain && syncInfo) { syncAgain = false; syncSoon(200); }
  }
}

// While the app is open, the server says when the family changes, how many of its other phones are open, and
// what they ask this phone for. Stopped while the app is in the background, so this phone is only asked, and
// only asks, while it's open.
function syncListen() {
  if (!syncInfo || syncStream) return;
  const ctl = new AbortController(), info = syncInfo;
  syncStream = ctl;
  (async () => {
    try {
      const { key } = await familyKeys(info.secret);
      const r = await fetch(`${SYNC_URL}/events?dev=${syncDev}`, { headers: { authorization: 'Bearer ' + key }, signal: ctl.signal });
      if (!r.ok) throw Object.assign(new Error(`events ${r.status}`), { status: r.status });
      const rd = r.body.getReader(), dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await rd.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const msg = buf.slice(0, i), ev = (/^event: (\w+)$/m.exec(msg) || [])[1], data = (/^data: (.*)$/m.exec(msg) || [])[1];
          buf = buf.slice(i + 2);
          if (data === undefined || syncStream !== ctl) continue;
          if (ev === 'peers') mediaPeers(Number(data));
          else if (ev === 'want') { const [name, ticket] = data.split(' '); mediaServe(name, ticket).catch(e => console.warn('sending a part:', e.message)); }
          else if (ev === 'moved' || ev === 'gone') { syncNow(); return; } // the round hears how, and what next
          else if (!ev && /^\d+$/.test(data) && Number(data) !== syncInfo?.rev) syncNow();
        }
      }
    } catch (e) {
      if (ctl.signal.aborted) return;
      // The family ended (a phone was removed, or the shared copy deleted): a round hears how, and what next.
      if (e.status === 410) { if (syncStream === ctl) syncStream = null; syncNow(); return; }
    }
    // Dropped (network change, server restart): listen again shortly.
    if (syncStream === ctl) { syncStream = null; mediaPeers(0); setTimeout(syncListen, 5000); }
  })();
}
function syncStop() {
  if (syncStream) { const s = syncStream; syncStream = null; s.abort(); }
  clearTimeout(syncTimer);
  syncPeers = 0;
}

// Start sharing this phone's children and routines: a new family, then an invite for the other phone.
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
// A new invite for the other phone: { text, minutes }, text being what its QR code holds. It holds the family's
// secret and the phones this one trusts; this phone keeps the code, to know the phone that scans it.
async function syncInvite() {
  const info = syncInfo, code = b64(crypto.getRandomValues(new Uint8Array(32)));
  if (!info.me) await syncMePhone(info);
  const inv = await inviteKeys(code), k = await familyKeys(info.secret);
  const box = { s: info.secret, from: syncDev, pins: { ...info.pins, [syncDev]: info.me.pub }, by: info.pinBy || {} };
  const { minutes } = await syncCall('POST', '/invite', { id: inv.id, box: await seal(inv.seal, utf8.encode(JSON.stringify(box))) }, k.key);
  info.invites = [...(info.invites || []).filter(i => Date.now() - i.at < INVITE_KEEP), { code, at: Date.now() }].slice(-5);
  syncSave();
  return { text: INVITE_TAG + code, minutes };
}
// Join with the invite scanned from the other phone: this phone takes the family's children and routines in
// place of its own (counted as already sent, so the family's copy replaces them rather than adding to them).
async function syncJoin(text) {
  const opened = await inviteOpen(text);
  syncStop();
  state.phones = {}; // a family this phone was in before isn't this one's
  state.vouch = {};
  syncInfo = await joinInfo(opened, flattenState(state));
  syncInfo.stamp = state.syncStamp = syncStampNew();
  syncRecover = false;
  saveLocal();
  syncDone();
  await syncNow();
  syncListen();
}
// What an invite holds (it works once; its secret also opens a locked copy of this phone, vault.js): { secret,
// and from 1.67 the invite's keys, the inviting phone (`from`),
// the phones it trusts (`pins`) and which let each in (`by`) }.
async function inviteOpen(text) {
  const m = INVITE_RE.exec(String(text).trim());
  if (!m) throw Object.assign(new Error("That QR code isn't a Tot Routines invite."), { status: 400 });
  const bad = () => Object.assign(new Error("That invite didn't work. Make a new one on the other phone."), { status: 404 });
  const inv = await inviteKeys(m[2]), { box } = await syncCall('POST', '/join', { id: inv.id });
  let bytes;
  try { bytes = await unseal(inv.seal, box); } catch { throw bad(); }
  if (m[1] === '1') return { secret: b64(bytes) };
  let b;
  try { b = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw bad(); }
  const keys = o => Object.fromEntries(Object.entries(isObj(o) ? o : {}).filter(([d, v]) => DEV.test(d) && typeof v === 'string' && v.length <= 200));
  if (!isObj(b) || typeof b.s !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(b.s) || typeof b.from !== 'string' || !DEV.test(b.from)) throw bad();
  return { secret: b.s, inv, from: b.from, pins: keys(b.pins), by: keys(b.by) };
}
// The sharing info for a phone joining with an opened invite (`base`: what it counts as already sent): its key
// pair, the phones it trusts, and the proof that it scanned the invite, which it lists itself with.
async function joinInfo(opened, base = {}) {
  const me = await phoneKeys(), info = { secret: opened.secret, rev: 0, base, at: 0, me };
  if (!opened.inv) return { ...info, tofu: true }; // an older app's invite
  return { ...info, pins: { ...opened.pins, [syncDev]: me.pub }, pinBy: { ...opened.by, [syncDev]: opened.from }, proof: await joinProof(opened.inv, syncDev, me.pub) };
}
function syncDone() { syncSave(); syncRedo = false; localStorage.removeItem(SYNC_KEY + '-redo'); }

// Sharing stops on this phone, which keeps its own copy of everything. `why`: told to the grown-up.
function syncOff(why) {
  syncStop();
  syncInfo = null;
  syncHeld = new Set();
  vault.remove(SYNC_KEY);
  if ([state.phones, state.vouch].some(o => o && Object.keys(o).length)) { state.phones = {}; state.vouch = {}; saveLocal(); }
  syncWatch(null);
  syncChanged(false);
  if (why) alert(why);
}
// Stop sharing on this phone. It takes itself off the family's phones first; when it's the last phone (or
// `everywhere`: the grown-up asked for the shared copy to be deleted), the family's copy on the server is
// deleted, and any other phone hears so and stops sharing too.
async function syncLeave(everywhere = false) {
  const info = syncInfo;
  if (!info) return;
  const last = !syncPhones().length;
  pushOff(info);
  syncLeaving = true;
  try {
    const k = await familyKeys(info.secret);
    if (everywhere || last) await syncCall('DELETE', '/family', undefined, k.key);
    else if (state.phones && state.phones[syncDev]) {
      delete state.phones[syncDev];
      if (isObj(state.vouch)) delete state.vouch[syncDev];
      saveLocal();
      await syncSettle();
    }
  } catch (e) {
    // Deleting the copy has to happen (the grown-up asked); taking this phone off the list is a courtesy.
    if (everywhere && e.status !== 410 && e.status !== 401) throw e;
  } finally {
    syncLeaving = false;
  }
  if (syncInfo === info) syncOff();
}
// Wait for a round on its way to finish, then run one more, so what this phone has is on the server.
async function syncSettle() {
  for (let i = 0; syncBusy && i < 300; i++) await new Promise(r => setTimeout(r, 100));
  syncAgain = false;
  await syncNow();
}

// Remove phones (`devs`, one or a list) from the family: the family moves to a new secret, which every other
// phone this one trusts is sent in a note only it can open (see "The family's phones"); a phone it doesn't trust
// is taken off the list too. A removed phone keeps what it had, but can't read anything after this, or write to
// the family.
async function syncRemove(devs) {
  const info = syncInfo, gone = new Set([devs].flat().filter(d => d !== syncDev));
  if (!info || !gone.size) return;
  await syncSettle();
  if (syncInfo !== info) return;
  // The new family, with everything this phone has (less the removed phone), in rounds the server takes.
  const secret = b64(crypto.getRandomValues(new Uint8Array(32))), k = await familyKeys(secret);
  // The family's video plan moves to a new key too, which the removed phone never sees (first: should the
  // server not take it, the phone isn't removed, and can be tried again).
  if (planKey()) {
    const key = k.plan;
    await planAsk('POST', '/plan/move', { key });
    state.plan = { key };
    saveLocal();
  }
  await syncCall('POST', '/family', {}, k.key);
  const pins = info.pins || {};
  for (const d of Object.keys(state.phones)) if (d !== syncDev && (gone.has(d) || !pins[d])) delete state.phones[d];
  if (isObj(state.vouch)) for (const d of Object.keys(state.vouch)) if (!state.phones[d]) delete state.vouch[d];
  saveLocal();
  const flat = flattenState(state);
  for (const p of Object.keys(flat)) if (oldPath(p)) delete flat[p];
  const next = { secret, rev: 0, base: {}, at: 0, stamp: info.stamp, me: info.me, pins: { ...pins }, pinBy: { ...(info.pinBy || {}) }, transit: { ...(info.transit || {}) } };
  for (const d of gone) { delete next.pins[d]; delete next.pinBy[d]; }
  let batch = {}, size = 0;
  const push = async () => { next.rev = (await syncCall('POST', '/sync', { since: next.rev, changes: batch, dev: syncDev }, k.key)).rev; batch = {}; size = 0; };
  for (const [p, v] of Object.entries(flat)) {
    const n = await docName(k, p), s = await sealDoc(k, n, p, v);
    if (size && size + s.length > SYNC_BATCH) await push();
    batch[n] = s;
    size += s.length;
  }
  await push();
  next.base = flat;
  // A note for each phone that stays, by the public half first seen for it.
  const notes = {};
  for (const d of Object.keys(state.phones)) {
    const pub = info.pins && info.pins[d];
    if (d !== syncDev && pub) notes[d] = await sealNote(pub, d, secret);
  }
  await syncCall('POST', '/move', { notes }, (await familyKeys(info.secret)).key);
  if (syncInfo !== info) return;
  syncStop();
  syncInfo = next;
  syncSave();
  syncChanged(false);
  syncListen();
}
// The family ended (server.js answers 410): moved to a new secret, with a note for this phone if it stays, or
// its shared copy deleted. A note is opened, and sharing carries on with the new secret, as if nothing happened
// (what this phone changed since its last round is sent then). Without one, sharing stops here.
async function syncEnded(info, { moved }) {
  const note = moved && typeof moved[syncDev] === 'string' ? moved[syncDev] : null;
  if (note && info.me) {
    try {
      const secret = await openNote(info.me, syncDev, note);
      if (syncInfo !== info) return;
      syncStop();
      syncInfo = { ...info, secret, rev: 0, error: null };
      syncSave();
      syncAgain = true;
      syncListen();
      return;
    } catch (e) {
      console.warn("the family's note for this phone wouldn't open:", e.message);
    }
  }
  if (syncInfo !== info) return;
  syncOff(moved ? "This phone was taken off your family's sharing on another phone. It keeps its own copy of everything; to share again, scan a new invite."
    : "Sharing has stopped: the family's shared copy was deleted on another phone. This phone keeps its own copy of everything.");
}

// ---- Plans from Triangle Tots ----
// Saved days come from the website sealed, the way an invite is: a code of 32 random bytes shown as a QR code or
// pasted, an id and a key made from it, and a box the server holds for 15 minutes and hands out once (POST
// /link/open). The server sees neither the code nor what's inside, and the family's secret isn't involved: the
// plans are taken into the state here and sealed with it like everything else. src/family/link.js is the other
// end. A code can also bring the family's plan key, for a family pass bought on the website.
// The code alone, or inside the link the QR code holds from 1.91 (tottoolbox.com/routines/plans.html#TOTPLANS1:…).
const PLANS_RE = /(?:^|[#\s/])TOTPLANS1:([A-Za-z0-9_-]{43})$/;
const plansCode = text => (PLANS_RE.exec(String(text).trim()) || [])[1] || null;
// A day from a public page on the website carries its whole plan in the code (TOTDAY1:, src/family/day.js): the plan
// deflated, nothing sealed and no server. Anyone can make one, so only the plans are taken from it: never the family's
// plan key or a pair token, which a box from the server may bring.
const DAY_RE = /(?:^|[#\s/])TOTDAY1:([A-Za-z0-9_-]{8,4000})$/;
const DAY_MAX = 16 << 10, DAY_PLANS = 10;
const plansDay = text => (DAY_RE.exec(String(text).trim()) || [])[1] || null;
async function plansDayOpen(code) {
  const bad = () => Object.assign(new Error("That code didn't work. Make a new one on the website."), { status: 400 });
  if (typeof DecompressionStream !== 'function') throw Object.assign(new Error("This phone's web view is too old to open that code. Update Android System WebView in Google Play."), { status: 400 });
  let content;
  try {
    const bytes = new Uint8Array(await new Response(new Blob([unb64(code)]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    if (bytes.length > DAY_MAX) throw bad();
    content = JSON.parse(new TextDecoder().decode(bytes));
  } catch { throw bad(); }
  if (!isObj(content) || !Array.isArray(content.plans) || content.plans.length > DAY_PLANS) throw bad();
  return { v: 2, plans: content.plans };
}
async function plansOpen(text) {
  const day = plansDay(text);
  if (day) return plansDayOpen(day);
  const code = plansCode(text);
  if (!code) throw Object.assign(new Error("That isn't a code from Triangle Tots."), { status: 400 });
  const root = await crypto.subtle.importKey('raw', unb64(code), 'HKDF', false, ['deriveBits', 'deriveKey']);
  const id = b64(await crypto.subtle.deriveBits(hkdf('plans link id'), root, 128));
  const key = await crypto.subtle.deriveKey(hkdf('plans link seal'), root, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const { box } = await syncCall('POST', '/link/open', { id });
  try {
    return JSON.parse(new TextDecoder().decode(await unseal(key, box, id)));
  } catch { throw Object.assign(new Error("That code didn't work. Make a new one on the website."), { status: 400 }); }
}
// What a box holds goes in only in the shape this app writes, as anything another phone sends does. Returns how many
// plans came, their days (YYYY-MM-DD, soonest first), how many weren't in shape, and whether the pass was taken (a
// family with a plan of its own keeps it).
function plansTake(content) {
  const plans = isObj(content) && Array.isArray(content.plans) ? content.plans : [];
  let took = 0, bad = 0;
  const days = [];
  for (const p of plans) {
    if (!isObj(p) || typeof p.id !== 'string' || !safeKey(p.id) || !syncValid(`outings/${p.id}`, JSON.stringify(p))) { console.warn('a plan from Triangle Tots was not in shape'); bad++; continue; }
    state.outings[p.id] = p;
    took++;
    if (typeof p.date === 'string' && /^\d{4}-\d\d-\d\d$/.test(p.date)) days.push(p.date);
  }
  const pass = isObj(content) && typeof content.planKey === 'string' && PLAN_KEY.test(content.planKey) && !planKey();
  if (pass) state.plan = { key: content.planKey };
  const linked = isObj(content) && typeof content.pair === 'string' && PAIR_RE.test(content.pair);
  if (linked) { localStorage.setItem(LINK_KEY, content.pair); linkAt = Date.now(); }
  return { took, days: days.sort(), bad, pass, linked };
}

// ---- Linked to Triangle Tots (1.93) ----
// A box from the website can carry a pair token, which links this phone to the family's Triangle Tots account. From
// then on the phone asks for the account's plans (POST /link/plans, apps/routines/sync/family.js) when it opens, and
// they replace the plans here from today on: a day saved or removed on the website comes or goes by itself. The token
// is this phone's own, kept on it and not shared: the family's other phones get the plans by sharing, like everything
// else. The server knows the token only by a hash, and either end can unlink.
const LINK_KEY = 'tot-tt-link';
const PAIR_RE = /^[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/;
const linkPair = () => { const p = localStorage.getItem(LINK_KEY); return p && PAIR_RE.test(p) ? p : null; };
let linkAt = 0;
// The account's plans, taken in: { changed, added (their days), removed, bad, pass }; { ended } when the family plan
// has; { unlinked: why } when the server no longer knows this phone; null when not linked, or asked under a minute ago.
async function linkPull(force = false) {
  const pair = linkPair();
  if (!pair || (!force && Date.now() - linkAt < 60e3)) return null;
  linkAt = Date.now();
  let r;
  try { r = await syncCall('POST', '/link/plans', { pair }); } catch (e) {
    if (e.status !== 401) throw e;
    localStorage.removeItem(LINK_KEY);
    return { unlinked: e.message };
  }
  if (!r.live) return { ended: true };
  const out = plansReplace(r.plans);
  out.pass = typeof r.planKey === 'string' && PLAN_KEY.test(r.planKey) && !planKey();
  if (out.pass) { state.plan = { key: r.planKey }; out.changed = true; }
  return out;
}
// The plans from today on become the account's; days gone by stay, as they would have.
function plansReplace(list) {
  const today = dayKey(new Date()), next = {};
  let bad = 0, removed = 0, changed = false;
  const added = [];
  for (const p of Array.isArray(list) ? list : []) {
    if (!isObj(p) || typeof p.id !== 'string' || !safeKey(p.id) || !syncValid(`outings/${p.id}`, JSON.stringify(p))) { bad++; continue; }
    next[p.id] = p;
  }
  for (const [id, p] of Object.entries(state.outings)) {
    if (!(id in next) && isObj(p) && typeof p.date === 'string' && p.date >= today) { delete state.outings[id]; removed++; changed = true; }
  }
  for (const [id, p] of Object.entries(next)) {
    const was = state.outings[id];
    if (was && JSON.stringify(was) === JSON.stringify(p)) continue;
    if (!was && typeof p.date === 'string' && p.date >= today) added.push(p.date);
    state.outings[id] = p;
    changed = true;
  }
  return { changed, added: added.sort(), removed, bad };
}
// This phone unlinked, here and on the server (which may not be reachable: then the website's Unlink ends it there).
async function linkForget() {
  const pair = linkPair();
  localStorage.removeItem(LINK_KEY);
  if (pair) await syncCall('POST', '/link/plans', { pair, gone: true }).catch(e => console.warn(`unlinking on the server: ${e.message}`));
}

// ---- The family's video plan ----
// Journal videos are shared at 720p, or at the best quality (tier '4k') with a Supporter plan (sync/plans.js), which covers every phone
// in the family. Its key is kept in the shared state (state.plan.key), so the family's other phones have it too;
// the server knows the plan only by a hash of it. A sharing family's key is made from its secret, so two phones
// buying at once buy the same plan (the server lets only one pay); a phone on its own makes a random one. planTier
// is what the server last said (kept on the phone, so it holds offline).
// The phone that pays keeps a manage key of its own (never shared): only it can open Stripe's page, which shows the
// payer's address, card and invoices.
const PLAN_KEY = /^[A-Za-z0-9_-]{43}$/;
const planKey = () => isObj(state.plan) && typeof state.plan.key === 'string' && PLAN_KEY.test(state.plan.key) ? state.plan.key : null;
const planManageKey = () => { const m = localStorage.getItem('tot-plan-manage'); return m && PLAN_KEY.test(m) ? m : null; };
let planTier = (() => { try { const t = localStorage.getItem('tot-plan-tier'); return t in TRANSIT_CAP ? t : 'free'; } catch { return 'free'; } })();
async function planAsk(method, p, body, key = planKey()) {
  const m = planManageKey();
  const r = await fetch(SYNC_URL + p, { method, headers: { ...(key ? { authorization: 'Bearer ' + key } : {}), ...(m ? { 'x-manage': m } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `the server answered ${r.status}`);
  return j;
}
// The plan as the server has it now: { tier, plan, phones, period, until, renews, manage, selling }.
async function planCheck() {
  const p = await planAsk('GET', '/plan');
  if (!(p.tier in TRANSIT_CAP)) throw new Error(`the server said an unknown plan, ${p.tier}`);
  planTier = p.tier;
  localStorage.setItem('tot-plan-tier', p.tier);
  return p;
}
// Stripe's page to become a supporter with `plan` ('supporter', up to 4 phones, or 'big', 5 or more), by the month
// or year, made with the family's plan key (the one made from its secret, or a new one, if the family has none yet;
// it's kept once the server has taken it). This phone's manage key goes with it.
const newPlanKey = () => b64(crypto.getRandomValues(new Uint8Array(32)));
async function planCheckout(plan, period) {
  const key = planKey() || (syncInfo ? (await familyKeys(syncInfo.secret)).plan : newPlanKey());
  if (!planManageKey()) localStorage.setItem('tot-plan-manage', newPlanKey());
  const { url } = await planAsk('POST', '/plan/checkout', { plan, period, manage: planManageKey() }, key);
  if (planKey() !== key) { state.plan = { key }; saveLocal(); }
  return url;
}
// Stripe's page to cancel the plan, change between monthly and yearly, or change the card.
async function planManage() {
  return (await planAsk('POST', '/plan/manage')).url;
}
