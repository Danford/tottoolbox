// Tot Potty: the lock on the family's secret (a slimmer copy of Bumplings' vault.js, apps/bump/www). The sharing
// info (SYNC_KEY, which holds the secret every phone in the family seals with) is sealed (AES-GCM) with this
// phone's data key, which Android's keystore keeps: it never leaves the phone and isn't in its backups, so a
// backup (Google's included) can't be used to read the family's shared copy. Restored onto another phone, the
// sealed info can't be opened there: it's let go (boot.js), and an invite from another phone starts sharing
// again. Everything else is in the shared copy and on the other phones anyway.
// In a browser (Tot Potty on the web) there's no keystore, so there's no lock: it's kept as it is.
const vault = (() => {
  const LOCKED = ['tot-potty-sync'];
  const META = 'tot-potty-vault', TAG = 'v1.';
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = bytes => { let s = ''; for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const join = (a, b) => { const o = new Uint8Array(a.byteLength + b.byteLength); o.set(new Uint8Array(a)); o.set(new Uint8Array(b), a.byteLength); return o; };

  // The phone's keystore, through the app. None in a browser.
  const keeper = globalThis.Android && Android.vaultKey ? { get: () => Android.vaultKey(), set: v => Android.vaultSetKey(v) } : null;
  let on = localStorage.getItem(META) === '1', key = null, writing = Promise.resolve();
  const plain = new Map(); // LOCKED values, opened

  const store = (k, v) => {
    writing = writing.then(async () => {
      if (v === null) { localStorage.removeItem(k); return; }
      if (!key) { localStorage.setItem(k, v); return; }
      const iv = crypto.getRandomValues(new Uint8Array(12));
      localStorage.setItem(k, TAG + b64(join(iv, await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(k) }, key, enc.encode(v)))));
    });
    return writing;
  };

  return {
    // At the start: open with the kept data key, or make one (the first start in the app). False when what's
    // locked came from another phone, whose key isn't here.
    async open() {
      if (!keeper) return true;
      let r = keeper.get();
      if (!r) {
        if (on) return false;
        r = b64(crypto.getRandomValues(new Uint8Array(32)));
        keeper.set(r);
      }
      key = await crypto.subtle.importKey('raw', unb64(r), 'AES-GCM', false, ['encrypt', 'decrypt']);
      for (const k of LOCKED) {
        const v = localStorage.getItem(k);
        if (v === null || !v.startsWith(TAG)) { plain.set(k, v); continue; }
        const all = unb64(v.slice(TAG.length));
        plain.set(k, dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12), additionalData: enc.encode(k) }, key, all.slice(12))));
      }
      if (!on) {
        localStorage.setItem(META, '1');
        on = true;
        // Anything kept before the lock, sealed now.
        for (const k of LOCKED) if (plain.get(k) !== null) store(k, plain.get(k));
      }
      return true;
    },
    // What was locked on another phone goes, with the lock (made again, new, as the page starts).
    erase() {
      for (const k of [...LOCKED, META]) localStorage.removeItem(k);
      on = false;
      key = null;
      plain.clear();
      if (keeper) keeper.set('');
    },
    get: k => key && LOCKED.includes(k) ? plain.get(k) ?? null : localStorage.getItem(k),
    set(k, v) { if (key && LOCKED.includes(k)) { plain.set(k, String(v)); store(k, String(v)); } else localStorage.setItem(k, v); },
    remove(k) { if (key && LOCKED.includes(k)) { plain.set(k, null); store(k, null); } else localStorage.removeItem(k); },
    // Every write sealed and kept.
    flush: () => writing,
  };
})();
