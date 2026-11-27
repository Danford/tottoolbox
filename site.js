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

  // Google Analytics hears the same taps (the tag in <head>; nothing when it's blocked). Beacon, so a tap that leaves
  // the page, such as Google Play or a download, still arrives.
  function tell(name, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params); } catch (e) { /* the page must not depend on it */ }
  }

  // The email sign-up (signup() in scripts/toolbox-site.js). It posts as text/plain, so the browser needs no
  // preflight, and never loses what was typed. Once it's in, Google Analytics hears sign_up, with the address as
  // Google's "user-provided data": the Google tag scrambles it (SHA-256) before it leaves the browser.
  function failure(status) {
    if (status === 400) return 'That email address doesn’t look right. Check it, tick at least one kind of email, and try again.';
    if (status === 429) return 'Too many tries from here. Wait a little while and try again.';
    return 'That didn’t go through. Check your connection and try again, or email support@tottoolbox.com.';
  }
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.dataset || form.dataset.signup !== 'toolbox') return;
    e.preventDefault();
    var button = form.querySelector('button'), result = form.querySelector('.result');
    var email = form.email.value.trim(), stage = form.stage.value, status = 0;
    var ticked = form.querySelectorAll('input[name="topic"]:checked'), topics = [];
    for (var t = 0; t < ticked.length; t++) topics.push(ticked[t].value);
    function show(text, cls) { result.textContent = text; result.className = 'result ' + cls; result.hidden = false; }
    if (!topics.length) return show('Tick at least one kind of email you’d like.', 'bad');
    button.disabled = true;
    result.hidden = true;
    var stop = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (stop) stop.abort(); }, 15000);
    fetch(form.dataset.api + '/v1/list/join', {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, signal: stop ? stop.signal : undefined,
      body: JSON.stringify({ email: email, list: 'toolbox', stage: stage, topics: topics, website: form.website.value }),
    }).then(function (res) {
      status = res.status;
      return res.json();
    }).then(function (j) {
      if (!j.ok) throw new Error('join answered ' + status);
      form.classList.add('joined');
      show('You’re on the list. The first email is on its way soon.', 'ok');
      count('/_goal/joined-toolbox', '');
      try { if (typeof window.gtag === 'function') window.gtag('set', 'user_data', { email: email }); } catch (err) { /* the page must not depend on it */ }
      // The age chosen stays with us: Analytics gets the sign-up and the scrambled address, nothing about the child.
      tell('sign_up', { method: 'email', list: 'toolbox', topics: topics.join(',') });
    }).catch(function (err) {
      console.error('sign-up failed:', err.message);
      tell('sign_up_failed', { reason: status ? String(status) : 'network' });
      show(failure(status), 'bad');
    }).then(function () {
      clearTimeout(timer);
      button.disabled = false;
    });
  });

  // A tap on a button that matters is counted the same way, under the button's name, and nothing more. An install
  // button is get_app in Analytics, with which app and which store; any other is its own name, dashes as underscores.
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-goal], [data-print]');
    if (!el) return;
    if (el.dataset.goal) {
      count('/_goal/' + el.dataset.goal, '');
      if (el.dataset.store) tell('get_app', { app: el.dataset.app, store: el.dataset.store, goal: el.dataset.goal, transport_type: 'beacon' });
      else if (el.dataset.chart) printed(el);
      else tell(el.dataset.goal.replace(/-/g, '_'), { transport_type: 'beacon' });
    }
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
    var opened = false;
    var open = function (i) {
      // Once a page, for Analytics: someone looked closer at the screens.
      if (!opened) { opened = true; tell('view_screens', { screen: i + 1 }); }
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
  // A chart's maker (routineChart() and stickerChart() in scripts/toolbox-site.js): what's picked changes the chart
  // beside it, which is what prints. Nothing picked or typed leaves the page.
  function each(list, fn) { for (var i = 0; i < list.length; i++) fn(list[i], i); }
  function maker(m) {
    var wrap = m.parentNode, sheet = wrap.querySelector('[data-sheet]');
    // Once a page, for Analytics: the chart was changed, not just looked at. Which chart only, never what was typed.
    var touched = false, chartName = (wrap.querySelector('[data-chart]') || m).dataset.chart || m.dataset.maker;
    var mark = function () { if (!touched) { touched = true; tell('customize_chart', { chart: chartName }); } };
    m.addEventListener('change', mark);
    m.addEventListener('input', mark);
    // The chart is laid out at its printed width; on a narrow screen the whole preview is zoomed down to fit.
    var preview = wrap.querySelector('.preview');
    var fit = function () {
      preview.style.zoom = '';
      var z = Math.min(1, preview.clientWidth / sheet.offsetWidth);
      if (z < 1) preview.style.zoom = z;
    };
    window.addEventListener('resize', fit);
    fit();
    var whoIn = m.querySelector('[name="who"]'), who = sheet.querySelector('[data-who]');
    function setWho() {
      var v = whoIn.value.trim();
      who.textContent = v || 'Name: ______________';
      who.classList.toggle('named', !!v);
    }
    whoIn.addEventListener('input', setWho);
    setWho();
    if (m.dataset.maker === 'stickers') {
      var prizeIn = m.querySelector('[name="prize"]'), prize = sheet.querySelector('[data-prize]'), count = m.querySelector('[name="count"]');
      var setPrize = function () { prize.textContent = prizeIn.value.trim() || '______________________'; };
      // Six across past 20, so 30 squares still fit on one page.
      var setCount = function () {
        var n = Number(count.value), stars = sheet.querySelector('.sheet-stars');
        stars.style.setProperty('--cols', n > 20 ? 6 : 5);
        each(stars.children, function (li, i) { li.hidden = i >= n; });
      };
      prizeIn.addEventListener('input', setPrize);
      count.addEventListener('change', setCount);
      setPrize(); setCount();
      return;
    }
    var notes = wrap.querySelector('[data-notes]'), band = m.querySelector('[name="band"]'), withNotes = m.querySelector('[name="notes"]');
    var showStep = function (i, on) { each(wrap.querySelectorAll('[data-i="' + i + '"]'), function (el) { el.hidden = !on; }); };
    var setBand = function () { each(notes.querySelectorAll('[data-band]'), function (el) { el.hidden = el.dataset.band !== band.value; }); };
    var setLayout = function () { var r = m.querySelector('[name="layout"]:checked'); sheet.className = 'sheet ' + (r ? r.value : 'week'); };
    var setNotes = function () { notes.hidden = !withNotes.checked; };
    var steps = m.querySelectorAll('input[name="step"]');
    each(steps, function (b) { b.addEventListener('change', function () { showStep(b.value, b.checked); }); });
    // A new age ticks the steps usual at that age, as Tot Routines would start them. Steps of your own stay.
    band.addEventListener('change', function () {
      each(steps, function (b) {
        b.checked = (' ' + b.dataset.on + ' ').indexOf(' ' + band.value + ' ') >= 0;
        showStep(b.value, b.checked);
      });
      setBand();
    });
    each(m.querySelectorAll('[name="layout"]'), function (r) { r.addEventListener('change', setLayout); });
    withNotes.addEventListener('change', setNotes);
    // A step of their own: a box to draw in where the picture goes.
    var own = m.querySelector('[name="own"]'), made = 0;
    var add = function () {
      var word = own.value.trim();
      if (!word) { own.focus(); return; }
      var i = 'own' + (++made);
      var label = document.createElement('label'), box = document.createElement('input');
      box.type = 'checkbox'; box.name = 'mine'; box.value = i; box.checked = true;
      box.addEventListener('change', function () { showStep(i, box.checked); });
      label.appendChild(box);
      label.appendChild(document.createTextNode(' ✏️ ' + word));
      var row = own.closest('.own');
      row.parentNode.insertBefore(label, row);
      var li = document.createElement('li');
      li.dataset.i = i;
      li.innerHTML = '<span class="pic draw" aria-hidden="true"></span><span class="word"></span><span class="days" aria-hidden="true">' + new Array(8).join('<i></i>') + '</span><span class="tickbox" aria-hidden="true"></span>';
      li.querySelector('.word').textContent = word;
      sheet.querySelector('.sheet-steps').appendChild(li);
      own.value = '';
    };
    m.querySelector('[data-add]').addEventListener('click', add);
    own.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    // A page come back to keeps what was ticked, so the chart catches up with it.
    each(steps, function (b) { showStep(b.value, b.checked); });
    setBand(); setLayout(); setNotes();
  }
  // What was printed, for Analytics: the chart, the layout and how many steps. Never the name, the prize or the age.
  function printed(el) {
    var m = el.closest('[data-maker]');
    var p = { chart: el.dataset.chart, transport_type: 'beacon' };
    if (m && m.dataset.maker === 'routine') {
      var r = m.querySelector('[name="layout"]:checked');
      p.layout = r ? r.value : 'week';
      p.steps = m.parentNode.querySelectorAll('.sheet-steps li:not([hidden])').length;
      p.notes = m.querySelector('[name="notes"]').checked ? 'yes' : 'no';
    }
    tell('print_chart', p);
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.carousel').forEach(carousel);
    document.querySelectorAll('[data-maker]').forEach(maker);
    viewer();
  });
})();
