// Bumplings: the bump photos' pictures, kept in IndexedDB (localStorage is too small for them). Each is a
// JPEG data URL under the photo's id; the state holds only which week has which id (state.photos). All of
// them are read into memory at the start, so the page can draw them straight away: at a few dozen small
// JPEGs, that's a couple of megabytes. A 🔒 private photo's picture is kept sealed (vault.js), and opened as
// it's read; one that can't be opened any more (what was locked went, see vault.erase) goes.
const pixStore = (() => {
  const cache = new Map(), sealed = new Set(); // sealed: the ids kept sealed
  let db = null;
  const req = r => new Promise((ok, bad) => { r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error); });
  const tx = mode => db.transaction('pix', mode).objectStore('pix');
  const ready = (async () => {
    if (!window.indexedDB) throw new Error('This browser has no IndexedDB, so it cannot keep photos.');
    const open = indexedDB.open('bumplings', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('pix');
    db = await req(open);
    const s = tx('readonly'), [keys, vals] = await Promise.all([req(s.getAllKeys()), req(s.getAll())]);
    const opens = vault.sealing; // as it was at the start (the page makes a new lock only once these are read)
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i], v = vals[i];
      if (!vault.isSealed(v)) { cache.set(k, v); continue; }
      if (!opens) { await req(tx('readwrite').delete(k)); continue; }
      cache.set(k, await vault.openPic(k, v));
      sealed.add(k);
    }
  })();
  const keep = async (id, data, priv) => {
    const seal = priv && vault.sealing;
    await req(tx('readwrite').put(seal ? await vault.sealPic(id, data) : data, id));
    if (seal) sealed.add(id); else sealed.delete(id);
  };
  return {
    ready,
    url: id => cache.get(id) || null,
    async get(id) { await ready; return cache.get(id) || null; },
    // `priv`: a 🔒 private photo's, kept sealed. The whole of it is checked (JPEG_URL is in sync.js), since it's
    // drawn as it is.
    async put(id, data, priv = false) {
      if (typeof data !== 'string' || !JPEG_URL.test(data)) throw new Error('a photo must be a JPEG data URL');
      await ready;
      await keep(id, data, priv);
      cache.set(id, data);
    },
    async del(id) { await ready; await req(tx('readwrite').delete(id)); cache.delete(id); sealed.delete(id); },
    // Drop pictures no photo uses any more (the other phone replaced or removed them).
    async prune(keep) {
      await ready;
      for (const id of [...cache.keys()]) if (!keep.has(id)) await this.del(id);
    },
    // Each picture kept the way it should be: sealed if it's in `priv` (the private photos' ids), as it is if
    // not. After the lock goes on, and as a photo moves between shared and private.
    async reseal(priv) {
      await ready;
      for (const [id, data] of cache) if ((priv.has(id) && vault.sealing) !== sealed.has(id)) await keep(id, data, priv.has(id));
    },
    isSealed: id => sealed.has(id),
  };
})();

// A photo picked or taken, made small: the longest side at most `max` pixels, as a JPEG data URL. The
// browser turns it the right way up from its EXIF orientation.
// 600 pixels keeps a pregnancy's worth of weekly photos (about 50 KB each) well inside what the sync server
// keeps for a family.
async function shrinkPhoto(file, max = 600, quality = 0.7) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c.toDataURL('image/jpeg', quality);
}
