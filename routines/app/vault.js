// Tot Routines: this phone's copy, locked (off unless the grown-up turns it on).
// With the lock on, what the app keeps on the phone is sealed (AES-GCM) with this phone's data key: the state,
// the sharing info, who this phone is and what's in the gallery (LOCKED, in localStorage), the journal's photos
// and videos (media.js), and on a phone the steps' photos and voices, the news check and the reminders (Vault.java).
// The data key itself is kept by Android's keystore, which never leaves the phone and isn't in its backups, so a
// backup (Google's included) holds only sealed data. To open that on another phone, beside the data is the data
// key sealed (META): while sharing, with a key from the family's secret, so scanning an invite from another
// family phone opens it; and with a backup key the grown-up keeps, which isn't needed (or made) while sharing,
// until they ask for one or sharing stops.
// In a browser there's no keystore: the data key is kept in localStorage, beside the data (DEV_KEY).
const vault = (() => {
  const LOCKED = ['tot-routines', 'tot-routines-sync', 'tot-routines-me', 'tot-routines-saved'];
  const META = 'tot-vault', DEV_KEY = 'tot-vault-dev-key', TAG = 'v1.';
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
    return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: enc.encode('tot-routines vault ' + what) },
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

  // Where the data key is kept: the phone's keystore (through the app), or in a browser beside the data.
  const keeper = globalThis.Android && Android.vaultKey ? {
    get: () => Android.vaultKey(),
    set: v => Android.vaultSetKey(v),
  } : {
    get: () => localStorage.getItem(DEV_KEY) || '',
    set: v => { if (v) localStorage.setItem(DEV_KEY, v); else localStorage.removeItem(DEV_KEY); },
  };

  let meta = (() => { // {code: sealed data key, family: sealed data key | null}
    try { return JSON.parse(localStorage.getItem(META) || 'null'); } catch (e) { console.error("the lock's keys couldn't be read:", e.message); return null; }
  })();
  let raw = null, key = null;           // the data key, while the vault is open
  const plain = new Map();              // LOCKED values, opened
  let writing = Promise.resolve(), familyFor = undefined;
  let leaving = false;                  // being turned off: new things are kept as they are

  async function openKey(r) {
    raw = r;
    key = await aes(r);
    for (const k of LOCKED) {
      const v = localStorage.getItem(k);
      // A value from before the lock was turned on (or while it was being turned on) reads as it is. One that
      // won't open (damaged) is kept aside, as the page keeps state it can't read, and reads as missing.
      try {
        plain.set(k, v === null ? null : v.startsWith(TAG) ? dec.decode(await openWith(key, unb64(v.slice(TAG.length)), k)) : v);
      } catch (e) {
        console.error(`${k} on this phone wouldn't open:`, e.message);
        try { localStorage.setItem(k + '-unread', v); } catch (e2) { console.error(`${k} couldn't be kept aside:`, e2.message); }
        plain.set(k, null);
      }
    }
  }
  // A write that fails (the phone's storage full, say) is told to the page (its saveFailed, if it has one) and
  // doesn't stop the ones after it: each value is written whole, so the next write of it puts it right.
  const failed = e => {
    console.error("couldn't keep what's on this phone:", e);
    if (typeof saveFailed === 'function') saveFailed(e);
  };
  const keep = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { failed(e); } };
  const store = (k, v) => {
    writing = writing.then(async () => {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, key ? TAG + b64(await sealWith(key, enc.encode(v), k)) : v);
    }).catch(failed);
    return writing;
  };

  return {
    LOCKED,
    // On: this phone's copy is locked. Locked: on, but the data key isn't on this phone (restored elsewhere).
    get on() { return !!meta; },
    get locked() { return !!meta && !key; },
    // Whether an invite from the family's other phones opens it too.
    get forFamily() { return !!(meta && meta.family); },
    // Whether a backup key opens it (none is made while sharing, until the grown-up asks or sharing stops).
    get hasBackup() { return !!(meta && meta.code); },
    // Whether new photos and videos are kept sealed.
    get sealing() { return !!key && !leaving; },
    // Turning it off: first this, then the photos, videos and files opened, then disable().
    leave() { if (!key) throw new Error('the lock is off'); leaving = true; },
    // While locked (the data key isn't here), LOCKED values can't be read: they read as missing.
    get(k) { return meta && LOCKED.includes(k) ? (key ? plain.get(k) ?? null : null) : localStorage.getItem(k); },
    set(k, v) { if (key && LOCKED.includes(k)) { plain.set(k, String(v)); store(k, String(v)); } else keep(k, v); },
    remove(k) { if (key && LOCKED.includes(k)) { plain.set(k, null); store(k, null); } else localStorage.removeItem(k); },
    // Every write sealed and kept.
    flush: () => writing,

    // At the start: open with the kept data key. False when it's on but the key isn't here.
    async open() {
      if (!meta) return true;
      const r = keeper.get();
      if (!r) return false;
      await openKey(unb64(r));
      return true;
    },

    // Turn the lock on: a new data key, kept, sealed with the family's secret while sharing (the family's phones
    // are its backup then), or else with a new backup key, and LOCKED sealed with it. Returns the backup key's
    // words, or null while sharing. The journal's photos and videos and the app's own files follow (media.js's
    // reseal, Android.vaultConvert).
    async enable(familySecret) {
      if (meta) throw new Error('the lock is already on');
      const r = crypto.getRandomValues(new Uint8Array(32)), code = familySecret ? null : crypto.getRandomValues(new Uint8Array(16));
      const values = new Map(LOCKED.map(k => [k, localStorage.getItem(k)]));
      keeper.set(b64(r));
      raw = r;
      key = await aes(r);
      for (const [k, v] of values) plain.set(k, v);
      meta = { code: code && b64(await sealWith(await wrapKey(code, 'code'), r, 'code')), family: null };
      if (familySecret) await this.family(familySecret);
      localStorage.setItem(META, JSON.stringify(meta));
      // What's there now (set() may have changed some while the keys were made), sealed.
      for (const k of LOCKED) { const v = plain.get(k); if (v !== null) store(k, v); }
      await writing;
      return code && backupWords(code);
    },
    // A new backup key in place of the old one, which then opens nothing.
    async newBackup() {
      if (!key) throw new Error('the lock is off');
      const code = crypto.getRandomValues(new Uint8Array(16));
      meta.code = b64(await sealWith(await wrapKey(code, 'code'), raw, 'code'));
      localStorage.setItem(META, JSON.stringify(meta));
      return backupWords(code);
    },
    // Turn it off: LOCKED back as it is; the caller has opened the photos, videos and files first.
    async disable() {
      if (!leaving) throw new Error('leave() comes first');
      await writing;
      leaving = false;
      const values = new Map(plain);
      key = null;
      for (const [k, v] of values) if (v !== null) localStorage.setItem(k, v);
      localStorage.removeItem(META);
      meta = null;
      raw = null;
      plain.clear();
      keeper.set('');
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
    // Start over: the locked copy goes (media.js and the app clear their own).
    erase() {
      for (const k of [...LOCKED, META]) localStorage.removeItem(k);
      meta = null;
      keeper.set('');
    },

    // A Blob sealed in pieces of a MiB, so a long video never has to be in memory whole: "TRV1", the type's
    // length (2 bytes) and the type, then each piece as its IV and sealed bytes, bound to the item's id, its
    // place and whether it's the last (so none can be swapped, moved or cut off).
    MAGIC: 'TRV1',
    async sealBlob(blob, id) {
      const type = enc.encode(blob.type), parts = [enc.encode(this.MAGIC), new Uint8Array([type.length >> 8, type.length & 255]), type];
      for (let at = 0, i = 0; at < blob.size; at += PIECE, i++) {
        const last = at + PIECE >= blob.size;
        parts.push(await sealWith(key, await blob.slice(at, at + PIECE).arrayBuffer(), `${id}/${i}/${last ? 1 : 0}`));
      }
      return new Blob(parts, { type: 'application/octet-stream' });
    },
    async isSealed(blob) {
      return blob.size >= 6 && dec.decode(await blob.slice(0, 4).arrayBuffer()) === this.MAGIC;
    },
    async openBlob(blob, id) {
      if (!key) throw new Error("this phone's copy is locked");
      const head = new Uint8Array(await blob.slice(4, 6).arrayBuffer()), n = (head[0] << 8) | head[1];
      const type = dec.decode(await blob.slice(6, 6 + n).arrayBuffer()), parts = [];
      for (let at = 6 + n, i = 0; at < blob.size; at += PIECE + 28, i++) {
        const last = at + PIECE + 28 >= blob.size;
        parts.push(await openWith(key, new Uint8Array(await blob.slice(at, at + PIECE + 28).arrayBuffer()), `${id}/${i}/${last ? 1 : 0}`));
      }
      return new Blob(parts, { type });
    },
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
const PIECE = 1 << 20;
