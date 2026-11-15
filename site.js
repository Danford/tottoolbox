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
    // Where the row is scrolled to when shot i is first in view, and which shot is first now.
    var start = function (i) { return shots[i].offsetLeft - shots[0].offsetLeft; };
    var at = function () {
      var best = 0;
      for (var i = 1; i < shots.length; i++) if (Math.abs(start(i) - track.scrollLeft) < Math.abs(start(best) - track.scrollLeft)) best = i;
      return best;
    };
    var go = function (i) {
      i = Math.max(0, Math.min(shots.length - 1, i));
      track.scrollTo({ left: start(i), behavior: smooth ? 'smooth' : 'auto' });
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
    // A whole set at a time: as many as are in view, so the next set replaces this one.
    var step = function () { return Math.max(1, seen().length); };
    prev.addEventListener('click', function () { go(at() - step()); });
    next.addEventListener('click', function () { go(at() + step()); });
    dots.addEventListener('click', function (e) { if (e.target.dataset.i) go(Number(e.target.dataset.i)); });
    track.addEventListener('scroll', show, { passive: true });
    window.addEventListener('resize', show);
    show();
  }
  // On an app's page, a tapped screen slides out of its place to fill most of the window. Arrows, swiping and the
  // arrow keys go through every screen on the page; a tap on it, the X or Escape slides it back.
  var ICON = function (d) { return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
  function viewer() {
    var shots = Array.prototype.slice.call(document.querySelectorAll('.app-look .shot, .fan .shot, .screens .shot'));
    if (!shots.length || !window.HTMLDialogElement) return;
    var d = document.createElement('dialog');
    d.className = 'viewer';
    d.setAttribute('aria-label', 'Screens');
    d.innerHTML = '<img class="big" alt="">' +
      '<button type="button" class="close" aria-label="Close">' + ICON('M6 6l12 12M18 6L6 18') + '</button>' +
      '<button type="button" class="prev" aria-label="Previous screen">' + ICON('M15 5l-7 7 7 7') + '</button>' +
      '<button type="button" class="next" aria-label="Next screen">' + ICON('M9 5l7 7-7 7') + '</button>' +
      '<p class="count" aria-live="polite"></p>';
    document.body.appendChild(d);
    var big = d.querySelector('.big'), count = d.querySelector('.count');
    var prevB = d.querySelector('.prev'), nextB = d.querySelector('.next');
    var at = -1, busy = false;
    big.style.transformOrigin = '0 0';
    // Where the big screen sits: as tall as fits, in the screens' own shape, in the middle.
    var place = function () {
      var room = innerWidth < 640 ? 24 : 150;
      var h = Math.min(innerHeight * 0.88, (innerWidth - room) * 960 / 540), w = h * 540 / 960;
      return { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2, width: w, height: h };
    };
    var fit = function () {
      var r = place();
      big.style.left = r.left + 'px'; big.style.top = r.top + 'px';
      big.style.width = r.width + 'px'; big.style.height = r.height + 'px';
    };
    // The transform that puts the big screen exactly over a small one.
    var over = function (el) {
      var a = el.getBoundingClientRect(), b = place();
      return 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px) scale(' + (a.width / b.width) + ')';
    };
    var inView = function (el) {
      var a = el.getBoundingClientRect();
      return a.width > 0 && a.right > 0 && a.left < innerWidth && a.bottom > 0 && a.top < innerHeight;
    };
    var show = function (i) {
      at = i;
      big.src = shots[i].currentSrc || shots[i].src;
      big.alt = shots[i].alt;
      count.textContent = (i + 1) + ' of ' + shots.length;
      prevB.hidden = i === 0;
      nextB.hidden = i === shots.length - 1;
    };
    var open = function (i) {
      show(i);
      fit();
      d.showModal();
      var from = shots[i];
      if (smooth && inView(from)) {
        from.style.visibility = 'hidden';
        big.animate([{ transform: over(from), borderRadius: '6rem' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    };
    var close = function () {
      if (busy || !d.open) return;
      var to = shots[at];
      var done = function () { to.style.visibility = ''; d.close(); busy = false; };
      if (smooth && inView(to)) {
        busy = true;
        to.style.visibility = 'hidden';
        big.animate([{ transform: 'none' }, { transform: over(to) }], { duration: 320, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = done;
      } else done();
    };
    var go = function (step) {
      var i = at + step;
      if (busy || i < 0 || i >= shots.length) return;
      shots[at].style.visibility = '';
      show(i);
      if (smooth) big.animate([{ transform: 'translateX(' + (step * 30) + 'vw) rotate(' + (step * 6) + 'deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    };
    shots.forEach(function (s, i) {
      s.tabIndex = 0;
      s.setAttribute('role', 'button');
      s.setAttribute('aria-label', 'See bigger: ' + s.alt);
      s.addEventListener('click', function () { open(i); });
      s.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
    });
    d.querySelector('.close').addEventListener('click', close);
    prevB.addEventListener('click', function () { go(-1); });
    nextB.addEventListener('click', function () { go(1); });
    big.addEventListener('click', close);
    d.addEventListener('click', function (e) { if (e.target === d) close(); });
    d.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    });
    var x0 = null;
    d.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    d.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    });
    window.addEventListener('resize', function () { if (d.open) fit(); });
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.carousel').forEach(carousel);
    viewer();
  });
})();
