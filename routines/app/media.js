// Tot Routines: the journal's photos and videos. Their bytes are kept in IndexedDB as Blobs (localStorage is
// far too small, and the browser keeps Blobs on disk); the state's journal entries say which entry has which.
// Only the ids are read at the start; a photo or video is read when it's shown. With sharing on, sync.js
// takes them to the other phones. Each is read and written through vault.js (sealed while the lock is on).
const mediaStore = (() => {
  const ids = new Set(), urls = new Map();
  const saving = new Map(); // id → how many saves are holding it: kept by prune until the entry that has it is in the state
  let db = null;
  const req = r => new Promise((ok, bad) => { r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error); });
  const tx = mode => db.transaction('media', mode).objectStore('media');
  const ready = (async () => {
    if (!window.indexedDB) throw new Error('This browser has no IndexedDB, so it cannot keep photos.');
    const open = indexedDB.open('tot-routines', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('media');
    db = await req(open);
    for (const k of await req(tx('readonly').getAllKeys())) ids.add(k);
  })();
  return {
    ready,
    has: id => ids.has(id),
    // With the lock on (vault.js), each is kept sealed, and opened as it's read.
    async get(id) {
      await ready;
      if (!ids.has(id)) return null;
      const b = await req(tx('readonly').get(id));
      return await vault.isSealed(b) ? vault.openBlob(b, id) : b;
    },
    async put(id, blob) {
      if (!(blob instanceof Blob) || !blob.size) throw new Error(`media ${id} must be a Blob with something in it`);
      await ready;
      // Sealed before the transaction starts: one ends as soon as it's left waiting on anything else.
      const kept = vault.sealing ? await vault.sealBlob(blob, id) : blob;
      await req(tx('readwrite').put(kept, id));
      ids.add(id);
    },
    // After the lock is turned on or off: each kept the new way. onTick(done, all) says how far it's got.
    async reseal(onTick) {
      await ready;
      const all = [...ids];
      for (let i = 0; i < all.length; i++) {
        const id = all[i], b = await req(tx('readonly').get(id));
        if (b && await vault.isSealed(b) !== vault.sealing) {
          const kept = vault.sealing ? await vault.sealBlob(b, id) : await vault.openBlob(b, id);
          await req(tx('readwrite').put(kept, id));
        }
        if (onTick) onTick(i + 1, all.length);
      }
    },
    async del(id) {
      await ready;
      await req(tx('readwrite').delete(id));
      ids.delete(id);
      if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
    },
    // A URL to show it by, or null while it isn't on this phone.
    async url(id) {
      if (!urls.has(id)) { const b = await this.get(id); if (!b) return null; urls.set(id, URL.createObjectURL(b)); }
      return urls.get(id);
    },
    // Drop what no journal entry has any more (deleted here, or on another phone). One being saved isn't in an
    // entry yet (hold it first, and let go once the entry is in the state), so it stays.
    async prune(keep) {
      await ready;
      for (const id of [...ids]) if (!keep.has(id) && !saving.has(id)) await this.del(id);
    },
    hold(list) { for (const id of list) saving.set(id, (saving.get(id) || 0) + 1); },
    letGo(list) { for (const id of list) { const n = (saving.get(id) || 1) - 1; if (n) saving.set(id, n); else saving.delete(id); } },
  };
})();

const canvasBlob = (c, quality) => new Promise((ok, bad) => c.toBlob(b => b ? ok(b) : bad(new Error("The picture couldn't be made.")), 'image/jpeg', quality));
// A canvas the size of a w × h picture made to fit in `side` pixels (even numbers, which video encoders want).
function fitCanvas(w, h, side) {
  const s = Math.min(1, side / Math.max(w, h)), c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w * s / 2) * 2);
  c.height = Math.max(2, Math.round(h * s / 2) * 2);
  return c;
}

// A photo taken or picked, made small enough to share: the longest side at most PHOTO_SIDE pixels, as a JPEG
// (about 300 KB). The browser turns it the right way up from its EXIF orientation.
const PHOTO_SIDE = 1600;
async function shrinkPhoto(file) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { throw new Error("That photo couldn't be opened."); }
  const c = fitCanvas(bmp.width, bmp.height, PHOTO_SIDE);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return { blob: await canvasBlob(c, 0.82), w: c.width, h: c.height };
}

// A video taken or picked, made small enough to share, however long it is. In the app, the phone's own video
// chips do it before the page gets the file (VideoShrink.java: 720p at about 15 MB a minute, every frame
// kept), and videoReady just reads it and makes its poster.
const posterOf = async v => {
  const c = fitCanvas(v.videoWidth, v.videoHeight, 480);
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  return canvasBlob(c, 0.75);
};
async function videoReady(file) {
  // The file itself, not a copy in memory, which a long video wouldn't fit: the app gives each video a file
  // of its own, kept until the page next starts, by when it's saved (in mediaStore) or given up.
  const blob = file.slice(0, file.size, 'video/mp4');
  const v = document.createElement('video'), src = URL.createObjectURL(blob);
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = src;
  try {
    await new Promise((ok, bad) => { v.onloadeddata = ok; v.onerror = () => bad(new Error("That video couldn't be opened.")); });
    if (!v.videoWidth) throw new Error('That video has no picture.');
    return { blob, poster: await posterOf(v), w: v.videoWidth, h: v.videoHeight, secs: Math.round(v.duration) };
  } finally {
    v.removeAttribute('src');
    v.load();
    URL.revokeObjectURL(src);
  }
}

// Elsewhere (the page in a browser), it's played through once, silently, into a canvas that a MediaRecorder
// records at most VIDEO_SIDE pixels across at about 1.2 megabits a second, so it takes as long as the video
// does and drops frames when the computer falls behind; onTick(seconds done, seconds in all) says how far it's
// got. Also gives a still from its first moment as the poster the journal shows.
const VIDEO_SIDE = 960;
// It runs as long as the video does and needs the screen on, so in a browser a long one is left to the Android app.
// A phone can also just stop partway (an iPhone may refuse to play it, or pause it when the screen goes off), and
// the grown-up is told rather than left at "Wait for the video".
const VIDEO_TYPES = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/webm;codecs=vp8,opus', 'video/webm'];
const VIDEO_WEB_SECS = 300, VIDEO_STALL = 20e3;
const VIDEO_STOPPED = "The video stopped before it was done. Keep this screen open while it's made smaller, or add a shorter video, or a photo. Bigger videos need the Android app.";
async function shrinkVideo(file, onTick) {
  let last = Date.now(), watch;
  const stalled = new Promise((_, bad) => { watch = setInterval(() => { if (Date.now() - last > VIDEO_STALL) bad(new Error(VIDEO_STOPPED)); }, 2000); });
  try {
    return await Promise.race([stalled, makeSmaller(file, (secs, total) => { last = Date.now(); if (onTick) onTick(secs, total); })]);
  } finally {
    clearInterval(watch);
  }
}
async function makeSmaller(file, onTick) {
  const type = VIDEO_TYPES.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  if (!type || !HTMLVideoElement.prototype.requestVideoFrameCallback) throw new Error("This phone can't make videos small enough to share. Bigger videos need the Android app.");
  const v = document.createElement('video'), src = URL.createObjectURL(file);
  v.playsInline = true;
  v.preload = 'auto';
  v.src = src;
  let ac = null;
  try {
    await new Promise((ok, bad) => { v.onloadeddata = ok; v.onerror = () => bad(new Error("That video couldn't be opened.")); });
    if (!v.videoWidth) throw new Error('That video has no picture.');
    const total = Number.isFinite(v.duration) ? v.duration : 0;
    if (total > VIDEO_WEB_SECS) throw new Error('That video is over 5 minutes, too long to make smaller here. Bigger videos need the Android app.');
    const c = fitCanvas(v.videoWidth, v.videoHeight, VIDEO_SIDE), g = c.getContext('2d');
    g.drawImage(v, 0, 0, c.width, c.height);
    const poster = await posterOf(v);
    // The sound goes to the recording only, not the speaker.
    const stream = c.captureStream(30);
    ac = new AudioContext();
    const dest = ac.createMediaStreamDestination();
    ac.createMediaElementSource(v).connect(dest);
    dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 1.2e6, audioBitsPerSecond: 64e3 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise((ok, bad) => { rec.onstop = ok; rec.onerror = e => bad(e.error || new Error('The video recorder stopped.')); });
    const stop = () => { if (rec.state === 'recording') { v.pause(); rec.stop(); } };
    const frame = () => {
      if (rec.state !== 'recording') return;
      g.drawImage(v, 0, 0, c.width, c.height);
      if (onTick) onTick(total ? Math.min(v.currentTime, total) : v.currentTime, total);
      if (v.ended) stop(); else v.requestVideoFrameCallback(frame);
    };
    v.onended = stop;
    await ac.resume();
    rec.start(1000);
    await v.play().catch(e => { throw new Error(`${VIDEO_STOPPED} (${e.name})`); });
    v.requestVideoFrameCallback(frame);
    await done;
    const blob = new Blob(chunks, { type: type.split(';')[0] });
    if (!blob.size) throw new Error("The video couldn't be made smaller.");
    return { blob, poster, w: c.width, h: c.height, secs: Math.round(v.currentTime) };
  } finally {
    v.pause();
    v.removeAttribute('src');
    v.load();
    URL.revokeObjectURL(src);
    if (ac) ac.close();
  }
}

// A recorded video says nothing of how long it is, so the player's bar can't work until it's been to the end
// once. Sends it there and back before it's shown.
function fixDuration(v) {
  v.addEventListener('loadedmetadata', function once() {
    if (v.duration !== Infinity) return;
    v.removeEventListener('loadedmetadata', once);
    v.addEventListener('durationchange', function back() { if (v.duration !== Infinity) { v.removeEventListener('durationchange', back); v.currentTime = 0; } });
    v.currentTime = 1e9;
  });
}
