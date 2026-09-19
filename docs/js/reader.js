/* In-page PDF reader. Any link to a PDF served by this site opens in a
   full-screen sheet rendered with pdf.js (loaded on first use from cdnjs);
   the link itself still downloads the file when JavaScript is off or the
   viewer cannot load. PDFs hosted on the live site are left as downloads —
   their server does not allow cross-origin reads. */
(function () {
  'use strict';

  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
  var WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

  var lib = null;
  var sheet = null;
  var state = { doc: null, scale: 1, pages: [], observer: null };

  function isLocalPdf(a) {
    var href = a.getAttribute('href') || '';
    if (!/\.pdf(\?|#|$)/i.test(href)) return false;
    return a.origin === window.location.origin;
  }

  function loadLib() {
    if (lib) return Promise.resolve(lib);
    return import(PDFJS).then(function (m) {
      m.GlobalWorkerOptions.workerSrc = WORKER;
      lib = m;
      return m;
    });
  }

  function build() {
    sheet = document.createElement('div');
    sheet.className = 'reader';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Document reader');
    sheet.hidden = true;
    sheet.innerHTML =
      '<div class="reader__bar">' +
        '<button type="button" class="reader__close" data-close aria-label="Close reader">&times;</button>' +
        '<span class="reader__title" data-title></span>' +
        '<span class="reader__pages" data-pages></span>' +
        '<a class="reader__download" data-download download>Download</a>' +
      '</div>' +
      '<div class="reader__scroll" data-scroll>' +
        '<div class="reader__status" data-status>Loading…</div>' +
        '<div class="reader__pageslist" data-list></div>' +
      '</div>';
    document.body.appendChild(sheet);

    sheet.querySelector('[data-close]').addEventListener('click', close);
    sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });
    document.addEventListener('keydown', function (e) {
      if (!sheet.hidden && e.key === 'Escape') close();
    });
    sheet.querySelector('[data-scroll]').addEventListener('scroll', updateCounter, { passive: true });
    window.addEventListener('resize', debounce(function () { if (state.doc) layout(); }, 200));
  }

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  function open(href, title) {
    if (!sheet) build();
    var status = sheet.querySelector('[data-status]');
    sheet.querySelector('[data-title]').textContent = title;
    sheet.querySelector('[data-download]').href = href;
    sheet.querySelector('[data-list]').innerHTML = '';
    sheet.querySelector('[data-pages]').textContent = '';
    status.hidden = false;
    status.textContent = 'Loading…';
    sheet.hidden = false;
    document.body.classList.add('has-reader');
    sheet.querySelector('[data-close]').focus();

    loadLib().then(function (pdfjs) {
      return pdfjs.getDocument({ url: href }).promise;
    }).then(function (doc) {
      state.doc = doc;
      status.hidden = true;
      layout();
    }).catch(function (err) {
      status.textContent = 'The document could not be shown here. ' +
        'Use "Download" to open it in your PDF app.';
      if (window.console) console.warn('reader:', err);
    });
  }

  function close() {
    if (!sheet) return;
    sheet.hidden = true;
    document.body.classList.remove('has-reader');
    if (state.observer) state.observer.disconnect();
    if (state.doc) state.doc.destroy();
    state = { doc: null, scale: 1, pages: [], observer: null };
  }

  /* One placeholder per page sized from page 1; pages render when scrolled near. */
  function layout() {
    var doc = state.doc;
    var list = sheet.querySelector('[data-list]');
    var scroll = sheet.querySelector('[data-scroll]');
    list.innerHTML = '';
    if (state.observer) state.observer.disconnect();

    doc.getPage(1).then(function (page) {
      var vp = page.getViewport({ scale: 1 });
      var width = Math.min(scroll.clientWidth - 24, 900);
      state.scale = width / vp.width;
      state.pages = [];
      for (var i = 1; i <= doc.numPages; i++) {
        var holder = document.createElement('div');
        holder.className = 'reader__page';
        holder.style.width = width + 'px';
        holder.style.height = Math.round(vp.height * state.scale) + 'px';
        holder.setAttribute('data-page', i);
        list.appendChild(holder);
        state.pages.push(holder);
      }
      state.observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) render(parseInt(en.target.getAttribute('data-page'), 10), en.target);
        });
      }, { root: scroll, rootMargin: '600px 0px' });
      state.pages.forEach(function (h) { state.observer.observe(h); });
      updateCounter();
    });
  }

  function render(n, holder) {
    if (holder.getAttribute('data-done')) return;
    holder.setAttribute('data-done', '1');
    state.doc.getPage(n).then(function (page) {
      var dpr = window.devicePixelRatio || 1;
      var vp = page.getViewport({ scale: state.scale });
      var canvas = document.createElement('canvas');
      canvas.width = Math.floor(vp.width * dpr);
      canvas.height = Math.floor(vp.height * dpr);
      canvas.style.width = vp.width + 'px';
      canvas.style.height = vp.height + 'px';
      holder.style.height = vp.height + 'px';
      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
        holder.appendChild(canvas);
      });
    }).catch(function () { holder.removeAttribute('data-done'); });
  }

  function updateCounter() {
    if (!state.doc || !state.pages.length) return;
    var scroll = sheet.querySelector('[data-scroll]');
    var mid = scroll.scrollTop + scroll.clientHeight / 2;
    var current = 1;
    for (var i = 0; i < state.pages.length; i++) {
      if (state.pages[i].offsetTop <= mid) current = i + 1;
    }
    sheet.querySelector('[data-pages]').textContent = 'Page ' + current + ' of ' + state.doc.numPages;
  }

  /* Delegated so that links added later (lazily loaded parts) work too. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || !isLocalPdf(a) || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    var title = a.getAttribute('data-title') || nearestHeading(a) || a.textContent.replace(/\s*\(PDF\)\s*$/, '').trim();
    open(a.href, title);
  });

  function nearestHeading(a) {
    var el = a.closest('p') || a;
    while (el && (el = el.previousElementSibling)) {
      if (/^H[2-4]$/.test(el.tagName)) return el.textContent.trim();
      if (el.classList && el.classList.contains('lazy')) break;
    }
    return '';
  }
})();
