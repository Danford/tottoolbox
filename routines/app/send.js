// Tot Routines with no screen (send.html): the photos and videos another family phone is waiting for, put in
// transit while the app is closed. The phone app starts it when the sync server says a phone is waiting
// (Sender.java), and stops it when it says it's done (Android.sendDone).
//
// It reads this phone's copy and writes none of it: the state as it was last saved (to know which photos and
// videos the family shares, and how big each is), the sharing info (the family's secret) and the photos and
// videos themselves. The sending is sync.js's sendAsked, the same code the page sends with. The page's own
// scripts (app.js, boot.js) aren't loaded, so nothing is drawn, asked or set: no reminders, no notifications,
// no round of sharing. What sync.js would tell the page goes nowhere here.
globalThis.state = null;
globalThis.saveLocal = () => {};
globalThis.syncWatch = () => {};
globalThis.syncChanged = () => {};
globalThis.mediaArrived = () => {};
(async () => {
  const done = why => Android.sendDone(String(why));
  try {
    // Locked with a key that isn't on this phone (the copy was moved here and not opened yet): nothing to read.
    if (!await vault.open()) return done('locked');
    const text = vault.get('tot-routines');
    if (!text) return done('nothing saved');
    state = JSON.parse(text);
    for (const src of ['data.js', 'activities.js', 'logic.js', 'media.js', 'sync.js']) {
      await new Promise((ok, bad) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = ok;
        s.onerror = () => bad(new Error(`${src} didn't load`));
        document.body.append(s);
      });
    }
    done(await sendAsked());
  } catch (e) {
    done(`error: ${e && e.message || e}`);
  }
})();
