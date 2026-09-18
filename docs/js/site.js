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
