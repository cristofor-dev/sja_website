/* Shared chrome: the navigation drawer and the footer link row.
   Navigation tree copied verbatim from the design source (NAV). */
(function () {
  'use strict';

  /* Every entry is [label, href]. An href of null means the page does not
     exist yet; an absolute URL is an outside site (the Archives). */
  var NAV = [
    { label: 'Home', href: 'index.html', children: [] },
    { label: 'Who we are', href: 'who-we-are.html', children: [
      ['Congregation', 'congregation.html'],
      ['The Foundress St. Emilie', 'the-foundress-st-emilie.html'],
      ['Charism and Spirituality', 'charism.html']
    ] },
    { label: 'Where we are', href: 'where-we-are.html', children: [
      ['Generalate', 'generalate.html'],
      ['Europe/Africa', 'europe-africa.html'],
      ['Asia/Oceania', 'asia-oceania.html'],
      ['Middle East', 'middle-east.html'],
      ['Latin America', 'latin-america.html']
    ] },
    { label: 'What we do', href: 'what-we-do.html', children: [
      ['Education', 'education.html'],
      ['Health Care', 'health-care.html'],
      ['Pastoral Care', 'pastoral-care.html'],
      ['Social Work', 'social-work.html'],
      ['Retreat Houses', 'retreat-houses.html'],
      ['Guest Houses', 'guest-houses.html'],
      ['Hostels', 'hostels.html'],
      ['Orphanages', 'orphanages.html'],
      ['Media Ministry', 'media-ministry.html']
    ] },
    { label: 'Formation', href: 'formation.html', children: [
      ['Aim', 'aim.html'],
      ['Stages', 'stages.html'],
      ['Ongoing Formation', 'ongoing-formation.html'],
      ['Lay Associates', 'lay-associates.html'],
      ['Professional Formation', 'professional-formation.html'],
      ['Safeguarding', 'safeguarding.html']
    ] },
    { label: 'News', href: 'news.html', children: [
      ['Current news', 'current-news.html'],
      ['Bulletins', 'bulletins.html'],
      ['General Chapter 2025', 'general-chapter-2025.html'],
      ['Hymn of the General Chapter 2025', 'hymn-of-the-general-chapter-2025.html'],
      ['Other useful weblinks', 'other-useful-weblinks.html']
    ] },
    { label: 'Contact', href: 'contact.html', children: [] },
    { label: 'Members', href: 'members.html', children: [
      ['Archives', 'http://gilse.emiliedevialar.org:8090/SJA/edv_en.html'],
      ['Obituaries', 'obituaries.html'],
      ['Letters', 'letters.html'],
      ['Documents', 'documents.html'],
      ['Voices of the Sisters', 'voices-of-the-sisters.html']
    ] }
  ];

  var FOOTER_LINKS = [
    ['Who we are', 'who-we-are.html'],
    ['Where we are', 'where-we-are.html'],
    ['What we do', 'what-we-do.html'],
    ['Formation', 'formation.html'],
    ['News', 'news.html'],
    ['Contact', 'contact.html'],
    ['Members', 'members.html']
  ];

  /* Education's own sub-pages live under it in the site, not in the drawer */
  var PARENT_OF = {
    'SJA schools': 'Education',
    'Sisters working in collaboration with others': 'Education'
  };

  var CHEVRON = '<svg viewBox="57 35.171 26 16.043" width="15" height="10" aria-hidden="true">' +
    '<path d="M57.5,38.193l12.5,12.5l12.5-12.5l-2.5-2.5l-10,10l-10-10L57.5,38.193z"></path></svg>';

  var PENDING_TITLE = 'This page has not been built yet';

  var current = document.body.getAttribute('data-page') || '';

  function labelNode(label, href, cls) {
    var el;
    if (href) {
      el = document.createElement('a');
      el.className = cls;
      el.href = href;
      if (/^https?:/.test(href)) el.rel = 'noopener';
      if (label === current || PARENT_OF[current] === label) {
        el.classList.add('is-current');
        el.setAttribute('aria-current', 'page');
      }
    } else {
      el = document.createElement('span');
      el.className = cls + ' is-pending';
      el.title = PENDING_TITLE;
    }
    el.textContent = label;
    return el;
  }

  function buildDrawer(drawer) {
    NAV.forEach(function (item, i) {
      var wrap = document.createElement('div');
      wrap.className = 'nav-item';

      var row = document.createElement('div');
      row.className = 'nav-row';
      var childLabels = item.children.map(function (c) { return c[0]; });
      var holdsCurrent = childLabels.indexOf(current) > -1 || childLabels.indexOf(PARENT_OF[current]) > -1;
      if (item.label === current || holdsCurrent) {
        row.classList.add('is-current');
      }
      row.appendChild(labelNode(item.label, item.href, 'nav-link'));

      var kids = null;
      if (item.children.length) {
        kids = document.createElement('div');
        kids.className = 'nav-children';
        kids.id = 'nav-children-' + i;
        kids.hidden = true;
        item.children.forEach(function (child) {
          kids.appendChild(labelNode(child[0], child[1], 'nav-child'));
        });

        var arrow = document.createElement('button');
        arrow.type = 'button';
        arrow.className = 'nav-arrow';
        arrow.setAttribute('aria-label', 'Open section: ' + item.label);
        arrow.setAttribute('aria-expanded', 'false');
        arrow.setAttribute('aria-controls', kids.id);
        arrow.innerHTML = CHEVRON;
        arrow.addEventListener('click', function () {
          var open = arrow.getAttribute('aria-expanded') === 'true';
          arrow.setAttribute('aria-expanded', open ? 'false' : 'true');
          kids.hidden = open;
        });
        row.appendChild(arrow);

        /* the section holding the current page starts open, as in the design */
        if (holdsCurrent) {
          arrow.setAttribute('aria-expanded', 'true');
          kids.hidden = false;
        }
      }

      wrap.appendChild(row);
      if (kids) wrap.appendChild(kids);
      drawer.appendChild(wrap);
    });

    var lang = document.createElement('div');
    lang.className = 'drawer__lang';
    lang.innerHTML = '<span>Language:</span><span class="on">English</span>' +
      '<span class="off" title="French pages are not yet available">Français</span>';
    drawer.appendChild(lang);
  }

  function buildFooter(host) {
    FOOTER_LINKS.forEach(function (pair) {
      var label = pair[0], href = pair[1];
      var el;
      if (href) {
        el = document.createElement('a');
        el.href = href;
      } else {
        el = document.createElement('span');
        el.className = 'is-pending';
        el.title = PENDING_TITLE;
      }
      el.textContent = label;
      host.appendChild(el);
    });
  }

  function init() {
    var drawer = document.getElementById('siteNav');
    var toggle = document.getElementById('navToggle');
    if (drawer && toggle) {
      buildDrawer(drawer);
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
        drawer.hidden = open;
      });
    }

    var footers = document.querySelectorAll('[data-footer-links]');
    Array.prototype.forEach.call(footers, buildFooter);

    var form = document.querySelector('form[data-mailto]');
    if (form) bindMailForm(form);

    var lazy = document.querySelector('.lazy[data-part]');
    if (lazy) bindLazyParts(lazy);

    var search = document.querySelector('form[data-site-search]');
    if (search) bindSearch(search);
  }

  /* ── long pages: the rest of the page is fetched as the reader scrolls ──
     The generator keeps the first blocks in the page and writes the rest as
     parts/<page>-N.html. The sentinel carries a real link, so without
     JavaScript the reader can still open the next part. */
  function bindLazyParts(sentinel) {
    var status = sentinel.querySelector('.lazy__status');
    var link = sentinel.querySelector('a');
    var busy = false;

    function loadNext() {
      if (busy) return;
      var next = parseInt(sentinel.getAttribute('data-next'), 10);
      var last = parseInt(sentinel.getAttribute('data-last'), 10);
      if (!next || next > last) { sentinel.remove(); return; }
      busy = true;
      sentinel.classList.add('is-loading');
      status.textContent = 'Loading more…';
      fetch(sentinel.getAttribute('data-stem') + '-' + next + '.html', { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function (htmlText) {
          var tmp = document.createElement('div');
          tmp.innerHTML = htmlText;
          while (tmp.firstChild) sentinel.parentNode.insertBefore(tmp.firstChild, sentinel);
          next += 1;
          sentinel.setAttribute('data-next', String(next));
          busy = false;
          sentinel.classList.remove('is-loading');
          if (next > last) {
            if (observer) observer.disconnect();
            sentinel.remove();
          } else {
            link.href = sentinel.getAttribute('data-stem') + '-' + next + '.html';
            status.textContent = '';
            /* if the sentinel is still on screen (short part), keep going */
            if (observer) { observer.unobserve(sentinel); observer.observe(sentinel); }
          }
        })
        .catch(function () {
          busy = false;
          sentinel.classList.remove('is-loading');
          status.textContent = 'Could not load the rest of the page. ';
          link.textContent = 'Open the next part';
        });
    }

    link.addEventListener('click', function (ev) { ev.preventDefault(); loadNext(); });

    var observer = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) loadNext(); });
      }, { rootMargin: '900px 0px' });
      observer.observe(sentinel);
    }
  }

  /* ── search suggestions from the site's own content ──
     search-index.json (built with the pages) holds one entry per heading of
     every page. Typing shows the best matches; Enter opens the first; with no
     match the form falls through to a Google search of the live site. */
  function bindSearch(form) {
    var input = form.querySelector('input[type="search"]');
    var box = form.querySelector('.suggest');
    if (!input || !box) return;
    var index = null, loading = null, items = [], active = -1;

    function load() {
      if (index) return Promise.resolve(index);
      if (!loading) {
        loading = fetch('search-index.json', { credentials: 'same-origin' })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            index = data.map(function (e) {
              e.hay = (e.t + ' ' + e.h + ' ' + e.x).toLowerCase();
              return e;
            });
            return index;
          });
      }
      return loading;
    }

    function fold(s) {
      return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : s.toLowerCase();
    }

    function score(entry, terms) {
      var s = 0;
      var title = fold(entry.t), head = fold(entry.h), hay = fold(entry.hay);
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        if (hay.indexOf(t) < 0) return 0;
        if (title.indexOf(t) > -1) s += 6;
        if (head.indexOf(t) > -1) s += 4;
        if (title === t || head === t) s += 6;
        s += 1;
      }
      return s;
    }

    function snippet(entry, terms) {
      var text = entry.x || '';
      var low = fold(text);
      var pos = -1;
      for (var i = 0; i < terms.length && pos < 0; i++) pos = low.indexOf(terms[i]);
      if (pos < 0) return text.slice(0, 110);
      var start = Math.max(0, pos - 45);
      var piece = text.slice(start, start + 120);
      return (start > 0 ? '…' : '') + piece + (start + 120 < text.length ? '…' : '');
    }

    function mark(text, terms) {
      var out = escapeHtml(text);
      terms.forEach(function (t) {
        if (t.length < 2) return;
        out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
      });
      return out;
    }

    function escapeHtml(s) {
      return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }

    function render(q) {
      var terms = fold(q).split(/\s+/).filter(Boolean);
      if (!terms.length) { hide(); return; }
      items = index.map(function (e) { return { e: e, s: score(e, terms) }; })
        .filter(function (r) { return r.s > 0; })
        .sort(function (a, b) { return b.s - a.s; })
        .slice(0, 8);
      active = -1;
      if (!items.length) {
        box.innerHTML = '<div class="suggest__empty">Nothing on this site matches “' + escapeHtml(q) +
          '”. Press Enter to search the Congregation’s main site.</div>';
      } else {
        box.innerHTML = items.map(function (r, i) {
          var e = r.e;
          var where = e.s === e.t ? e.s : e.s + ' › ' + e.t;
          return '<a class="suggest__item" role="option" id="sg-' + i + '" href="' + e.u + '">' +
            '<span class="suggest__title">' + mark(e.h || e.t, terms) + '</span>' +
            '<span class="suggest__where">' + escapeHtml(where) + '</span>' +
            (e.x ? '<span class="suggest__text">' + mark(snippet(e, terms), terms) + '</span>' : '') +
            '</a>';
        }).join('');
      }
      box.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function hide() {
      box.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }

    function setActive(n) {
      var links = box.querySelectorAll('.suggest__item');
      if (!links.length) return;
      active = (n + links.length) % links.length;
      Array.prototype.forEach.call(links, function (l, i) {
        l.classList.toggle('is-active', i === active);
      });
      input.setAttribute('aria-activedescendant', 'sg-' + active);
    }

    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var q = input.value.trim();
      if (q.length < 2) { hide(); return; }
      timer = setTimeout(function () { load().then(function () { render(q); }); }, 120);
    });
    input.addEventListener('focus', function () { load(); if (input.value.trim().length >= 2 && items.length) box.hidden = false; });
    input.addEventListener('keydown', function (ev) {
      if (box.hidden) return;
      if (ev.key === 'ArrowDown') { ev.preventDefault(); setActive(active + 1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); setActive(active - 1); }
      else if (ev.key === 'Escape') { hide(); }
    });
    form.addEventListener('submit', function (ev) {
      if (!items.length) return;                 /* fall through to Google */
      ev.preventDefault();
      window.location.href = items[active > -1 ? active : 0].e.u;
    });
    document.addEventListener('click', function (ev) {
      if (!form.contains(ev.target)) hide();
    });
  }

  /* The static site has no mail server: the contact form composes a message
     in the visitor's own e-mail app instead. */
  function bindMailForm(form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.reportValidity()) return;
      var f = form.elements;
      var name = f.name.value.trim();
      var lines = [
        'Name: ' + name,
        'E-mail: ' + f.email.value.trim(),
        'Phone: ' + (f.phone.value.trim() || '\u2014'),
        '',
        f.message.value.trim()
      ];
      var href = 'mailto:' + form.getAttribute('data-mailto') +
        '?subject=' + encodeURIComponent('Message from the website' + (name ? ' \u2014 ' + name : '')) +
        '&body=' + encodeURIComponent(lines.join('\n'));
      window.location.href = href;
      var sent = form.querySelector('.form__sent');
      if (!sent) {
        sent = document.createElement('p');
        sent.className = 'form__sent';
        form.appendChild(sent);
      }
      sent.textContent = 'Your e-mail app should now open with the message ready to send. If it did not, write to ' +
        form.getAttribute('data-mailto') + ' directly.';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
