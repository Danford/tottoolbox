// Bumplings: the lock on what's 🔒 just on this phone (a copy of Tot Routines' vault.js, apps/routines/www,
// always on in the app). The private journal entries, the private photos' list and the mood checks (PRIV, in
// localStorage), the
// private photos' pictures (pix.js) and the sharing info (SYNC_KEY, which holds the family's secret) are
// sealed (AES-GCM) with this phone's data key. The data key itself is kept by Android's keystore, which never
// leaves the phone and isn't in its backups, so a backup (Google's included) holds only sealed data. To open
// that on another phone, beside the data is the data key sealed (META): while sharing, with a key from the
// family's secret, so scanning an invite from the other phone opens it; and with a backup key, once the
// grown-up makes one. What's shared stays as it is: the other phone has it, and the family's copy brings it back.
// In a browser (Bumplings on the web) there's no keystore, so there's no lock: everything is kept as it is.
const PRIV_KEY = 'tot-bump-priv'; // {log, photos, moods}: the private journal entries and photos, and the mood checks (app.js)
const vault = (() => {
  const LOCKED = ['tot-bump-sync', PRIV_KEY];
  const META = 'tot-bump-vault', TAG = 'v1.';
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = bytes => { let s = ''; for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const join = (...parts) => { const o = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0)); let at = 0; for (const p of parts) { o.set(new Uint8Array(p), at); at += p.byteLength; } return o; };
  const aes = raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  async function sealWith(key, bytes, bound) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    return join(iv, await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(bound) }, key, bytes));
  }
  async function openWith(key, all, bound) {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12), additionalData: enc.encode(bound) }, key, all.slice(12)));
  }
  // A key for sealing the data key, from a backup key's bytes or the family's secret.
  async function wrapKey(root, what) {
    const k = await crypto.subtle.importKey('raw', root, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: enc.encode('tot-bump vault ' + what) },
      k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  const familyRoot = secret => Uint8Array.from(atob(secret.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

  // The backup key: 16 random bytes as 26 letters and digits (Crockford's base 32: no I, L, O or U), in
  // groups of four. Typed back, case, spaces and dashes don't matter, and O, I and L read as 0, 1 and 1.
  const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  function backupWords(bytes) {
    let bits = 0, n = 0, out = '';
    for (const b of bytes) { n = (n << 8) | b; bits += 8; while (bits >= 5) { out += B32[(n >> (bits - 5)) & 31]; bits -= 5; } }
    if (bits) out += B32[(n << (5 - bits)) & 31];
    return out.match(/.{1,4}/g).join('-');
  }
  function backupBytes(text) {
    const s = String(text).toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[^0-9A-Z]/g, '');
    if (s.length !== 26 || [...s].some(c => !B32.includes(c))) return null;
    const out = [];
    let bits = 0, n = 0;
    for (const c of s) { n = (n << 5) | B32.indexOf(c); bits += 5; if (bits >= 8) { out.push((n >> (bits - 8)) & 255); bits -= 8; } }
    return new Uint8Array(out.slice(0, 16));
  }

  // The phone's keystore, through the app. None in a browser.
  const keeper = globalThis.Android && Android.vaultKey ? { get: () => Android.vaultKey(), set: v => Android.vaultSetKey(v) } : null;

  let meta = JSON.parse(localStorage.getItem(META) || 'null'); // {code: sealed data key | null, family: sealed data key | null}
  let raw = null, key = null;           // the data key, while it's open
  const plain = new Map();              // LOCKED values, opened
  let writing = Promise.resolve(), familyFor = undefined;

  async function openKey(r) {
    raw = r;
    key = await aes(r);
    for (const k of LOCKED) {
      const v = localStorage.getItem(k);
      // A value from before the lock (or while it was being set up) reads as it is.
      plain.set(k, v === null ? null : v.startsWith(TAG) ? dec.decode(await openWith(key, unb64(v.slice(TAG.length)), k)) : v);
    }
  }
  const store = (k, v) => {
    writing = writing.then(async () => {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, key ? TAG + b64(await sealWith(key, enc.encode(v), k)) : v);
    });
    return writing;
  };

  return {
    LOCKED,
    // Whether there's a lock here at all (the app, not a browser).
    get here() { return !!keeper; },
    // On: what's private is locked. Locked: on, but the data key isn't on this phone (restored from another).
    get on() { return !!meta; },
    get locked() { return !!meta && !key; },
    // Whether an invite from the other phone opens it too (while sharing).
    get forFamily() { return !!(meta && meta.family); },
    // Whether a backup key opens it (none until the grown-up makes one).
    get hasBackup() { return !!(meta && meta.code); },
    // Whether something sealed is kept under `k`, opened or not.
    kept: k => localStorage.getItem(k) !== null,
    // While locked, LOCKED values can't be read: they read as missing, and can't be written (the page doesn't
    // run then: boot.js asks to unlock first).
    get(k) { return meta && LOCKED.includes(k) ? (key ? plain.get(k) ?? null : null) : localStorage.getItem(k); },
    set(k, v) {
      if (!LOCKED.includes(k) || !meta) { localStorage.setItem(k, v); return; }
      if (!key) throw new Error("what's private here is locked");
      plain.set(k, String(v));
      store(k, String(v));
    },
    remove(k) {
      if (!LOCKED.includes(k) || !meta) { localStorage.removeItem(k); return; }
      if (!key) throw new Error("what's private here is locked");
      plain.set(k, null);
      store(k, null);
    },
    // Every write sealed and kept.
    flush: () => writing,

    // At the start: open with the kept data key. False when it's on but the key isn't here.
    async open() {
      if (!meta) return true;
      const r = keeper && keeper.get();
      if (!r) return false;
      await openKey(unb64(r));
      return true;
    },

    // Turn the lock on (the first time the app starts with it): a new data key, kept, sealed with the family's
    // secret while sharing, and LOCKED sealed with it. No backup key yet: the page asks for one to be made
    // (newBackup) while there's something private nothing else could open. The private photos' pictures follow
    // (pixStore.reseal).
    async enable(familySecret) {
      if (meta) throw new Error('the lock is already on');
      if (!keeper) throw new Error('there is no keystore here');
      const r = crypto.getRandomValues(new Uint8Array(32));
      const values = new Map(LOCKED.map(k => [k, localStorage.getItem(k)]));
      keeper.set(b64(r));
      raw = r;
      key = await aes(r);
      for (const [k, v] of values) plain.set(k, v);
      meta = { code: null, family: null };
      if (familySecret) await this.family(familySecret);
      localStorage.setItem(META, JSON.stringify(meta));
      // What's there now (set() may have changed some while the key was made), sealed.
      for (const k of LOCKED) { const v = plain.get(k); if (v !== null) store(k, v); }
      await writing;
    },
    // A new backup key in place of the old one (if any), which then opens nothing. Its words, to show once.
    async newBackup() {
      if (!key) throw new Error('the lock is off');
      const code = crypto.getRandomValues(new Uint8Array(16));
      meta.code = b64(await sealWith(await wrapKey(code, 'code'), raw, 'code'));
      localStorage.setItem(META, JSON.stringify(meta));
      return backupWords(code);
    },
    // The family the data key is also sealed for: its secret while sharing, null when not.
    async family(secret) {
      if (!key || secret === familyFor) return;
      familyFor = secret;
      meta.family = secret ? b64(await sealWith(await wrapKey(familyRoot(secret), 'family'), raw, 'family')) : null;
      localStorage.setItem(META, JSON.stringify(meta));
    },

    // Locked (restored onto another phone): open with the backup key's words or the family's secret. Keeps
    // the data key here again. False when it doesn't open this copy.
    async unlockWithBackup(words) {
      const code = backupBytes(words);
      if (!code || !meta.code) return false;
      return unlockBy(await wrapKey(code, 'code'), meta.code, 'code');
    },
    async unlockWithFamily(secret) {
      if (!meta.family) return false;
      return unlockBy(await wrapKey(familyRoot(secret), 'family'), meta.family, 'family');
    },
    // Go on without what's locked: it goes, with the lock (made again, new, as the page starts). The private
    // photos' pictures, which can't be opened now, go as pix.js reads them.
    erase() {
      for (const k of [...LOCKED, META]) localStorage.removeItem(k);
      meta = null;
      key = raw = null;
      plain.clear();
      if (keeper) keeper.set('');
    },

    // A private photo's picture (a JPEG data URL) as it's kept: sealed, bound to its id. Kept pictures that
    // aren't sealed (shared ones, and private ones from before the lock) read as they are.
    async sealPic(id, data) { return TAG + b64(await sealWith(key, enc.encode(data), 'pix/' + id)); },
    isSealed: text => text.startsWith(TAG),
    async openPic(id, text) {
      if (!key) throw new Error("what's private here is locked");
      return dec.decode(await openWith(key, unb64(text.slice(TAG.length)), 'pix/' + id));
    },
    get sealing() { return !!key; },
    backupWords, backupBytes,
  };
  async function unlockBy(wk, box, bound) {
    let r;
    // AES-GCM refuses (OperationError) when it's the wrong key: that's the "doesn't open" answer.
    try { r = await openWith(wk, unb64(box), bound); } catch (e) { if (e.name === 'OperationError') return false; throw e; }
    keeper.set(b64(r));
    await openKey(r);
    return true;
  }
})();
