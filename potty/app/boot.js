// Tot Potty starts here: it opens what's locked on this phone (vault.js), then loads the page's scripts in order.
// Moved or restored here from another phone, the data key didn't come along (keys never leave a phone), so the
// sharing info, which holds the family's secret, can't be opened: it goes, and the page says how to share again.
const PAGE = ['guide.js', 'learn.js', 'logic.js', 'art.js', 'sync.js', 'vendor/qrcode.js', 'vendor/jsQR.js', 'app.js', 'screens.js', 'kidmode.js', 'start.js'];
function loadScripts(srcs) {
  return Promise.all(srcs.map(src => new Promise((ok, bad) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false; // in this order
    s.onload = ok;
    s.onerror = () => bad(new Error(`${src} didn't load`));
    document.body.append(s);
  })));
}
(async () => {
  if (await vault.open()) { await loadScripts(PAGE); return; }
  const shared = localStorage.getItem('tot-potty-sync') !== null;
  vault.erase();
  await vault.open();
  await loadScripts(PAGE);
  if (shared) alert('Everything is here, but sharing stopped on the way to this phone (its key stays on the old one). To share again, scan an invite from another phone: Sharing, in the menu.');
})();
