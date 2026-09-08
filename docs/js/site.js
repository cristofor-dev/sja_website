/* Shared chrome: the navigation drawer and the footer link row.
   Navigation tree copied verbatim from the design source (NAV). */
(function () {
  'use strict';

  var NAV = [
    { label: 'Home', children: [] },
    { label: 'Who we are', children: ['Congregation', 'The Foundress St. Emilie', 'Charism and Spirituality'] },
    { label: 'Where we are', children: ['Generalate', 'Europe/Africa', 'Asia/Oceania', 'Middle East', 'Latin America'] },
    { label: 'What we do', children: ['Education', 'Health Care', 'Pastoral Care', 'Social Work', 'Retreat Houses', 'Guest Houses', 'Hostels', 'Orphanages', 'Media Ministry'] },
    { label: 'Formation', children: ['Aim', 'Stages', 'Ongoing Formation', 'Lay Associates', 'Professional Formation'] },
    { label: 'News', children: ['News', 'Bulletins', 'General Chapter 2025', 'Hymn of the General Chapter 2025', 'Other useful weblinks'] },
    { label: 'Contact', children: [] },
    { label: 'Members', children: ['Archives', 'Obituaries', 'Letters', 'Documents', 'Voices of the Sisters'] }
  ];

  /* Only these pages exist so far; every other entry is shown but not linked. */
  var PAGES = {
    'Home': 'index.html',
    'Congregation': 'congregation.html',
    'Where we are': 'where-we-are.html'
  };

  var FOOTER_LINKS = ['Who we are', 'Where we are', 'What we do', 'Formation', 'News', 'Contact', 'Members'];

  var CHEVRON = '<svg viewBox="57 35.171 26 16.043" width="15" height="10" aria-hidden="true">' +
    '<path d="M57.5,38.193l12.5,12.5l12.5-12.5l-2.5-2.5l-10,10l-10-10L57.5,38.193z"></path></svg>';

  var PENDING_TITLE = 'This page has not been built yet';

  var current = document.body.getAttribute('data-page') || '';

  function labelNode(label, cls) {
    var href = PAGES[label];
    var el;
    if (href) {
      el = document.createElement('a');
      el.className = cls;
      el.href = href;
      if (label === current) {
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
      if (item.label === current || (item.label === 'Who we are' && current === 'Congregation')) {
        row.classList.add('is-current');
      }
      row.appendChild(labelNode(item.label, 'nav-link'));

      var kids = null;
      if (item.children.length) {
        kids = document.createElement('div');
        kids.className = 'nav-children';
        kids.id = 'nav-children-' + i;
        kids.hidden = true;
        item.children.forEach(function (child) {
          kids.appendChild(labelNode(child, 'nav-child'));
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
        if (item.children.indexOf(current) > -1) {
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
    FOOTER_LINKS.forEach(function (label) {
      var href = PAGES[label] || (label === 'Who we are' ? PAGES.Congregation : null);
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
