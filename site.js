// Runs on tottoolbox.com's own pages, never in the apps or their web versions.
(function () {
  // Which install choices to lead with. With no script, a visitor sees them all.
  var ua = navigator.userAgent;
  var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  document.documentElement.dataset.os = ios ? 'ios' : /Android/.test(ua) ? 'android' : 'other';

  // The daily page count: a page and where the visit came from, nothing about the visitor (see /privacy.html#website).
  // Only on the live site, so a local build never counts.
  var host = location.hostname;
  function count(path, ref) {
    if ((host === 'tottoolbox.com' || host === 'www.tottoolbox.com') && navigator.sendBeacon) {
      navigator.sendBeacon('https://sync.tottoolbox.com/v1/hit', JSON.stringify({ site: 'tottoolbox', path: path, ref: ref }));
    }
  }
  count(location.pathname, document.referrer);

  // A tap on a button that matters is counted the same way, under the button's name, and nothing more.
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-goal], [data-print]');
    if (!el) return;
    if (el.dataset.goal) count('/_goal/' + el.dataset.goal, '');
    if ('print' in el.dataset) window.print();
  });

  // The rows of screens (carousel() in scripts/toolbox-site.js): arrows that move a few screens, and a dot for each
  // screen, filled while it's in view. Swiping and the keyboard's arrow keys scroll the row as they always did.
  var smooth = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function carousel(c) {
    var track = c.querySelector('.track'), ctl = c.querySelector('.ctl');
    var shots = track.children, dots = ctl.querySelector('.dots');
    var prev = ctl.querySelector('.prev'), next = ctl.querySelector('.next');
    for (var i = 0; i < shots.length; i++) {
      var d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('aria-label', 'Screen ' + (i + 1) + ' of ' + shots.length);
      d.dataset.i = i;
      dots.appendChild(d);
    }
    // Where shot i sits when it's in the middle, and which shot is nearest the middle now.
    var middle = function (i) { return shots[i].offsetLeft + shots[i].offsetWidth / 2 - track.clientWidth / 2; };
    var at = function () {
      var best = 0;
      for (var i = 1; i < shots.length; i++) if (Math.abs(middle(i) - track.scrollLeft) < Math.abs(middle(best) - track.scrollLeft)) best = i;
      return best;
    };
    var go = function (i) {
      i = Math.max(0, Math.min(shots.length - 1, i));
      track.scrollTo({ left: middle(i), behavior: smooth ? 'smooth' : 'auto' });
    };
    // Shots wholly or mostly in view, by index.
    var seen = function () {
      var from = track.scrollLeft, to = from + track.clientWidth, out = [];
      for (var i = 0; i < shots.length; i++) {
        var mid = shots[i].offsetLeft + shots[i].offsetWidth / 2;
        if (mid >= from && mid <= to) out.push(i);
      }
      return out;
    };
    var show = function () {
      var on = seen();
      ctl.hidden = shots.length < 2;
      var max = track.scrollWidth - track.clientWidth;
      prev.disabled = track.scrollLeft < 4;
      next.disabled = track.scrollLeft > max - 4;
      for (var i = 0; i < dots.children.length; i++) dots.children[i].classList.toggle('on', on.indexOf(i) >= 0);
    };
    // A few screens at a time: as many as are in view, so the next ones come into the middle.
    var step = function () { return Math.max(1, seen().length); };
    prev.addEventListener('click', function () { go(at() - step()); });
    next.addEventListener('click', function () { go(at() + step()); });
    dots.addEventListener('click', function (e) { if (e.target.dataset.i) go(Number(e.target.dataset.i)); });
    track.addEventListener('scroll', show, { passive: true });
    window.addEventListener('resize', show);
    show();
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.carousel').forEach(carousel);
  });
})();
