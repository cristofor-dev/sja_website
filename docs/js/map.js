/* "Where we are" — interactive layer over the blue world map (assets/world-map-blue.svg).
   Ported from the design source (SJA Mobile.dc.html): the same coordinates,
   zoom scales, clustering, hit-size rules, nudges and panels. */
(function () {
  'use strict';

  var EUROPE = '#004a9b', AFRICA = '#0a5ba8', MIDEAST = '#004aad',
      ASIA = '#046bd2', LATAM = '#4a9fdd', OCEANIA = '#75c2ec';

  var REGIONS = [
    { label: 'Europe', color: EUROPE, items: ['France', 'United Kingdom', 'Ireland', 'Italy', 'Malta', 'Greece', 'Cyprus', 'Romania'] },
    { label: 'Africa', color: AFRICA, items: ['Tunisia', 'Ethiopia'] },
    { label: 'Middle East', color: MIDEAST, items: ['Israel', 'Palestinian Territories', 'Syria', 'Lebanon', 'Jordan'] },
    { label: 'Asia', color: ASIA, items: ['India', 'Myanmar', 'Thailand', 'Philippines', 'Singapore'] },
    { label: 'Latin America', color: LATAM, items: ['Guatemala', 'Panama', 'Peru'] },
    { label: 'Oceania', color: OCEANIA, items: ['Australia'] }
  ];

  var LOCATIONS = {
    'France': ['Champigny', 'Gaillac', 'Marseille', 'Paris', 'Plouguenast', 'St Affrique', 'St Brieuc', 'Vanves'],
    'United Kingdom': ['Bowdon Vale', 'Manchester'],
    'Ireland': ['Ballymote (Sligo)'],
    'Italy': ['Castiglioncello, LI', 'Firenze', 'Marlia, LU', 'Montecatini Terme, PT', 'Rome', 'Policoro, MT'],
    'Malta': ['Blata l’Bajda', 'Rabat', 'Sliema', 'Zabbar'],
    'Greece': ['Heraclion', 'Athens'],
    'Cyprus': ['Larnaca', 'Nicosia'],
    'Romania': ['Negresti Oas'],
    'Tunisia': ['Tunis', 'Monastir'],
    'Ethiopia': ['Addis Ababa'],
    'Israel': ['Jerusalem', 'Kiriat Yearim', 'Nazareth', 'Ramla'],
    'Palestinian Territories': ['Bethlehem', 'Jerusalem', 'Ramallah'],
    'Jordan': ['Amman'],
    'Lebanon': ['Beyrouth', 'Jeita', 'Kleat'],
    'Syria': ['Aleppo'],
    'India': ['Ranchi, JH', 'Gadalodma, JH', 'Tundtoli, JH', 'Mosaboni, JH', 'Kasidha, JH', 'Chembur, Mumbai, MH', 'Ghodegoan, MH', 'Weston Street, Kolkata, WB', 'Basinda, WB', 'Assisi Nagar, Chennai, TN', 'Thirumanthurai, TN', 'Vikkiramangalam, TN', 'Manali, Chennai, TN', 'Virapandian Patnam, TN', 'Rothak, HR', 'Port Blair, Andaman Islands'],
    'Myanmar': ['Myitkyina, Kachin State', 'Waimaw, Kachin State', 'Panwa, Kachin State', 'Falam, N Chin State', 'Hakha, N Chin State', 'Lumbang, N Chin State', 'Saizang, N Chin State', 'Loikaw, Kayah State', 'Loilenlay, Kayah State', 'Doungarou, Kayah State', 'Lashio, N Shan State', 'Momeik, N Shan State', 'Panpauk, N Shan State', 'Mawlamyine, Mon State', 'Kyaikkhamee, Mon State', 'Ahlon, Yangon Region', 'Hmawbi, Yangon Region', 'Sanchaung, Yangon Region', 'Chack, Magwe Region', 'Amarapura, Mandalay Region', 'Mandalay, Mandalay Region', 'Mogok, Mandalay Region', 'Pyin Oo Lwin, Mandalay Region', 'Sinkkaing, Mandalay Region', 'Zawgyi, Mandalay Region', 'Chaung-Yoe, Sagaing Region', 'Nabet, Sagaing Region', 'Ywadaw, Sagaing Region', 'Ye-U, Sagaing Region', 'Kalay, Sagaing Region', 'Ingin-khon, Sagaing Region', 'Tamu, Sagaing Region', 'Kawthaung, Taninthayi Region'],
    'Thailand': ['Bangkok', 'Khlong Lan', 'Ubon Ratchathani', 'Chiang Mai', 'Surin', 'Phrae', 'Mahasarakham', 'Phayakaphoom Phisai', 'Saraphi'],
    'Philippines': ['Las Pinas City', 'Novaliches', 'Bohol', 'Bani'],
    'Singapore': ['Singapore'],
    'Australia': ['Canning Vale W.A.', 'Samson W.A.', 'Kardinya W.A.', 'Willeton W.A.', 'Rossmoyne W.A.'],
    'Guatemala': ['Guatemala Zona 18', 'Petén', 'Chicamán Quiché', 'El Tejar Chimaltenango', 'San Juan Sacatepequez'],
    'Peru': ['Lima'],
    'Panama': ['Chepo 17']
  };

  /* [x%, y%, zoomScale] — lon/lat projected onto assets/world-map-blue.svg
     (Mercator, lon -130..180, lat -47..72, 1600x820.4), so every marker sits on its own country */
  var COUNTRY_POINTS = {
    'France': [42.74, 33.21, 4], 'United Kingdom': [41.42, 27.37, 4.4], 'Ireland': [39.35, 26.75, 5],
    'Italy': [46.0, 36.49, 4], 'Malta': [46.59, 42.19, 4], 'Greece': [49.03, 39.41, 4.5],
    'Cyprus': [52.61, 42.93, 6], 'Romania': [49.97, 33.84, 4.2],
    'Tunisia': [44.97, 43.42, 4.5], 'Ethiopia': [54.68, 60.93, 3.6],
    'Israel': [53.18, 45.67, 6], 'Palestinian Territories': [53.31, 45.19, 6],
    'Syria': [54.39, 42.81, 5], 'Lebanon': [53.5, 43.69, 6], 'Jordan': [53.74, 45.96, 6],
    'India': [67.35, 51.89, 2.8], 'Myanmar': [72.9, 52.57, 3.4], 'Thailand': [74.52, 56.48, 3.6],
    'Singapore': [75.43, 65.57, 6], 'Philippines': [81.35, 58.62, 4],
    'Australia': [85.16, 83.02, 2.4],
    'Guatemala': [12.81, 56.48, 5], 'Panama': [16.06, 60.99, 5.5], 'Peru': [17.74, 72.49, 3.6]
  };

  /* year of the Congregation's first foundation, as printed on the map */
  var COUNTRY_YEARS = {
    'France': '1832', 'United Kingdom': '1854', 'Ireland': '1957', 'Italy': '1840',
    'Greece': '1846', 'Cyprus': '1844', 'Romania': '1992', 'Tunisia': '1840',
    'Ethiopia': '2008', 'Israel': '1956', 'Syria': '1854', 'Lebanon': '1847',
    'Jordan': '1998', 'India': '1966', 'Myanmar': '1847', 'Thailand': '1961',
    'Singapore': '2012', 'Philippines': '1995', 'Australia': '1855',
    'Guatemala': '1970', 'Panama': '1995', 'Peru': '1969'
  };

  /* countries too close together to tap apart at world zoom: one marker stands
     for the group and opens a chooser */
  var CLUSTERS = [
    { key: 'med', label: 'Mediterranean & Holy Land', x: 50.65, y: 43.27, scale: 4.6,
      members: ['Greece', 'Malta', 'Cyprus', 'Syria', 'Lebanon', 'Israel', 'Palestinian Territories', 'Jordan'] },
    { key: 'brit', label: 'Britain & Ireland', x: 37.42, y: 22.57, scale: 4.4,
      members: ['United Kingdom', 'Ireland'] },
    { key: 'sea', label: 'South-East Asia', x: 72.26, y: 59.46, scale: 3.4,
      members: ['Myanmar', 'Thailand', 'Singapore'] },
    { key: 'camerica', label: 'Central America', x: 11.94, y: 60.73, scale: 5,
      members: ['Guatemala', 'Panama'] }
  ];

  var CLUSTER_OF = {};
  CLUSTERS.forEach(function (c) {
    c.members.forEach(function (m) { CLUSTER_OF[m] = c.key; });
  });

  /* the smallest territories get a name label beside their marker */
  var UNLABELLED = { 'Malta': 'Malta', 'Palestinian Territories': 'Palestine' };

  /* marker offset in screen px, drawn with a leader line back to the true point.
     Palestine sits 3px from Israel at world zoom, so once its group is open it
     is pulled west into the sea, clear of Israel, Jordan and Lebanon. */
  var NUDGE = { 'Palestinian Territories': [-30, -8] };

  var MAP_RATIO = 820.43 / 1600;

  /* A country carries its own marker once its nearest neighbour is at least
     this far away in screen pixels. 26px is the smallest hit box worth calling
     individually clickable — below it the group badge stands in, and the region
     chips under the map remain the 44px path to every country at every width. */
  var UNGROUP_MIN_PX = 26;

  function has(name) { return (LOCATIONS[name] || []).length > 0; }

  /* Which countries sit too close to a neighbour to carry their own marker.
     Measured at world zoom, so the answer depends only on how wide the map is
     drawn — not on what is currently selected, open or panned. That keeps the
     set stable while a group is open, and makes it recompute on resize. */
  function crowded() {
    var w = state.mapW, h = w * MAP_RATIO;
    var live = Object.keys(COUNTRY_POINTS).filter(has);
    /* true positions, not nudged ones: a nudge separates a marker from its
       neighbour inside an open group, it must not lift it out of the group */
    var pos = {};
    live.forEach(function (name) { pos[name] = COUNTRY_POINTS[name]; });
    var tight = {};
    live.forEach(function (a) {
      var nearest = Infinity;
      live.forEach(function (b) {
        if (a === b) return;
        nearest = Math.min(nearest, Math.hypot((pos[a][0] - pos[b][0]) / 100 * w,
                                               (pos[a][1] - pos[b][1]) / 100 * h));
      });
      if (nearest < UNGROUP_MIN_PX) tight[a] = true;
    });
    return tight;
  }

  /* the members a group's badge actually stands for: those still too crowded
     to show a marker of their own */
  function groupedMembers(c, tight) {
    return c.members.filter(function (m) { return has(m) && tight[m]; });
  }

  function regionOf(name) {
    for (var i = 0; i < REGIONS.length; i++) {
      if (REGIONS[i].items.indexOf(name) > -1) return REGIONS[i];
    }
    return null;
  }

  var CHEVRON = '<svg class="chev" viewBox="57 35.171 26 16.043" width="14" height="9" aria-hidden="true">' +
    '<path d="M57.5,38.193l12.5,12.5l12.5-12.5l-2.5-2.5l-10,10l-10-10L57.5,38.193z"></path></svg>';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var state = {
    hoverName: null,
    selected: null,
    cluster: null,
    community: null,
    mapW: 390,
    pan: { x: 0, y: 0 },
    dragging: false
  };

  var el = {};
  var pinEls = {};
  var badgeEls = {};
  var badgeCountEls = {};
  var chipEls = {};
  var leaderEls = {};
  var drag = null;
  var dragged = false;
  var panelKey = null;

  /* ── zoom / pan transform, exactly as the design computed it ── */

  function view() {
    var sel = state.selected;
    var cl = null;
    if (!sel && state.cluster) {
      CLUSTERS.forEach(function (c) { if (c.key === state.cluster) cl = c; });
    }
    var p = sel ? COUNTRY_POINTS[sel] : (cl ? [cl.x, cl.y, cl.scale] : null);
    if (!p) return { s: 1, tx: 0, ty: 0 };
    var s = p[2] || 3.6;
    var clamp = function (v) { return Math.max(100 - 100 * s, Math.min(0, v)); };
    return {
      s: s,
      tx: clamp(50 - s * p[0] + state.pan.x),
      ty: clamp(50 - s * p[1] + state.pan.y)
    };
  }

  function zoomed() { return !!(state.selected || state.cluster); }

  /* Every marker on screen — country pins and cluster badges alike — so hit
     areas are sized against what is really there, never against hidden pins. */
  function geometry() {
    var v = view();
    var tight = crowded();
    var w = state.mapW, h = w * MAP_RATIO;
    var at = function (x, y) { return [v.tx + v.s * x, v.ty + v.s * y]; };
    var onMap = function (xy) { return xy[0] > -3 && xy[0] < 103 && xy[1] > -3 && xy[1] < 103; };
    var list = [];

    Object.keys(COUNTRY_POINTS).filter(has).forEach(function (name) {
      var p = COUNTRY_POINTS[name];
      var truth = at(p[0], p[1]);
      var n = NUDGE[name];
      var xy = n ? [truth[0] + n[0] / w * 100, truth[1] + n[1] / h * 100] : truth;
      var grouped = CLUSTER_OF[name];
      var visible = onMap(xy) && (!grouped || !tight[name] || state.selected === name || state.cluster === grouped);
      list.push({ kind: 'pin', name: name, xy: xy, truth: truth, nudged: !!n, visible: visible });
    });

    CLUSTERS.forEach(function (c) {
      var xy = at(c.x, c.y);
      var stood = groupedMembers(c, tight);
      list.push({
        kind: 'cluster', cluster: c, xy: xy, count: stood.length,
        visible: stood.length > 1 && onMap(xy) && !state.selected && state.cluster !== c.key
      });
    });

    var shown = list.filter(function (m) { return m.visible; });
    shown.forEach(function (m) {
      var nearest = Infinity;
      shown.forEach(function (o) {
        if (o === m) return;
        nearest = Math.min(nearest, Math.hypot((m.xy[0] - o.xy[0]) / 100 * w, (m.xy[1] - o.xy[1]) / 100 * h));
      });
      /* never floor above the real separation: an oversized box would cover a
         neighbour's centre */
      m.hit = Math.max(12, Math.min(44, nearest));
    });

    return { v: v, list: list, tight: tight };
  }

  /* ── actions ── */

  /* The communities panel opens below the map, so on a phone it starts off the
     bottom of the screen. Bring the map card to the top of the viewport, which
     leaves the most room underneath it for the panel. Selection can be made
     from a marker, a group chooser row or a region chip far down the page, so
     this runs for all of them. */
  var REVEAL_GAP = 8;

  function revealMap() {
    var card = el.frame.parentNode;
    if (!card || !card.getBoundingClientRect || !window.scrollTo) return;
    var y = card.getBoundingClientRect().top + (window.pageYOffset || 0) - REVEAL_GAP;
    if (y < 0) y = 0;
    /* already there — don't nudge the page for nothing */
    if (Math.abs((window.pageYOffset || 0) - y) < 4) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      try {
        window.scrollTo({ top: y, behavior: 'smooth' });
        return;
      } catch (e) { /* older browsers take the two-argument form only */ }
    }
    window.scrollTo(0, y);
  }

  function selectCountry(name) {
    if (!COUNTRY_POINTS[name]) return;
    state.selected = name;
    state.hoverName = name;
    state.community = null;
    state.cluster = null;
    state.pan = { x: 0, y: 0 };
    render();
    revealMap();
  }

  function resetView() {
    state.selected = null;
    state.hoverName = null;
    state.community = null;
    state.cluster = null;
    state.pan = { x: 0, y: 0 };
    render();
  }

  function openCluster(key) {
    state.cluster = key;
    state.selected = null;
    state.hoverName = null;
    state.community = null;
    state.pan = { x: 0, y: 0 };
    render();
    revealMap();
  }

  function focusCountry(name) {
    if (state.selected) return;
    state.hoverName = name;
    render();
  }

  function clearFocus() {
    if (state.selected) return;
    state.hoverName = null;
    render();
  }

  function openCommunity(name) {
    state.community = name;
    renderSheet();
  }

  function closeCommunity() {
    state.community = null;
    renderSheet();
  }

  /* ── build the markers once; render only updates their geometry ── */

  function buildMarkers() {
    Object.keys(COUNTRY_POINTS).filter(has).forEach(function (name) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pin';
      btn.style.display = 'none';
      btn.setAttribute('aria-label', name);

      var dot = document.createElement('span');
      dot.className = 'pin__dot';
      btn.appendChild(dot);

      if (UNLABELLED[name]) {
        var lab = document.createElement('span');
        lab.className = 'pin__label';
        lab.textContent = UNLABELLED[name];
        btn.appendChild(lab);
      }

      btn.addEventListener('click', function () {
        if (dragged) return;
        if (state.selected === name) resetView(); else selectCountry(name);
      });
      btn.addEventListener('mouseenter', function () { focusCountry(name); });
      btn.addEventListener('mouseleave', function () { clearFocus(); });

      el.marks.appendChild(btn);
      pinEls[name] = btn;
    });

    CLUSTERS.forEach(function (c) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'badge';
      btn.style.display = 'none';
      /* the count is set on every render — how many countries the badge stands
         for depends on the map's width */
      var count = document.createElement('span');
      count.className = 'badge__count';
      btn.appendChild(count);
      btn.addEventListener('click', function () {
        if (!dragged) openCluster(c.key);
      });
      el.marks.appendChild(btn);
      badgeEls[c.key] = btn;
      badgeCountEls[c.key] = count;
    });

    Object.keys(NUDGE).forEach(function (name) {
      var line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('stroke', '#004a9b');
      line.setAttribute('stroke-width', '1.6');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      line.setAttribute('opacity', '0.75');
      line.style.display = 'none';
      el.leaders.appendChild(line);
      leaderEls[name] = line;
    });
  }

  function buildRegions() {
    REGIONS.forEach(function (r) {
      var live = r.items.filter(has);
      if (!live.length) return;

      var wrap = document.createElement('div');
      wrap.className = 'region';

      var head = document.createElement('div');
      head.className = 'region__head';
      var swatch = document.createElement('span');
      swatch.className = 'region__swatch';
      swatch.style.background = r.color;
      var label = document.createElement('span');
      label.className = 'region__label';
      label.textContent = r.label;
      head.appendChild(swatch);
      head.appendChild(label);

      var chips = document.createElement('div');
      chips.className = 'chips';
      live.forEach(function (name) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.textContent = name;
        chip.addEventListener('click', function () {
          if (state.selected === name) resetView(); else selectCountry(name);
        });
        chip.addEventListener('mouseenter', function () { focusCountry(name); });
        chip.addEventListener('mouseleave', function () { clearFocus(); });
        chips.appendChild(chip);
        chipEls[name] = { chip: chip, color: r.color };
      });

      wrap.appendChild(head);
      wrap.appendChild(chips);
      el.regions.appendChild(wrap);
    });
  }

  /* ── panning ── */

  function onPointerDown(event) {
    if (!zoomed()) return;
    drag = {
      x: event.clientX, y: event.clientY, id: event.pointerId,
      el: event.currentTarget, pan: { x: state.pan.x, y: state.pan.y }
    };
    dragged = false;
  }

  function onPointerMove(event) {
    if (!drag) return;
    var w = state.mapW, h = w * MAP_RATIO;
    var dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!dragged && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      dragged = true;
      /* capture only once this is really a drag — capturing on pointerdown
         retargets the following click and swallows marker taps */
      if (drag.el.setPointerCapture) drag.el.setPointerCapture(drag.id);
    }
    if (!dragged) return;
    state.dragging = true;
    state.pan = { x: drag.pan.x + dx / w * 100, y: drag.pan.y + dy / h * 100 };
    render();
  }

  function onPointerUp() {
    if (!drag) return;
    if (drag.el.releasePointerCapture && drag.el.hasPointerCapture && drag.el.hasPointerCapture(drag.id)) {
      drag.el.releasePointerCapture(drag.id);
    }
    drag = null;
    state.dragging = false;
    render();
    setTimeout(function () { dragged = false; }, 0);
  }

  /* ── rendering ── */

  function render() {
    var g = geometry();
    var v = g.v;

    el.frame.classList.toggle('is-zoomed', zoomed());
    el.frame.classList.toggle('is-dragging', state.dragging);
    el.zoom.style.transform = 'translate(' + v.tx + '%, ' + v.ty + '%) scale(' + v.s + ')';

    g.list.forEach(function (m) {
      var node = m.kind === 'pin' ? pinEls[m.name] : badgeEls[m.cluster.key];
      if (!node) return;
      if (!m.visible) {
        node.style.display = 'none';
        if (m.kind === 'pin' && leaderEls[m.name]) leaderEls[m.name].style.display = 'none';
        return;
      }
      var hit = m.hit || 18;
      node.style.display = 'flex';
      node.style.left = m.xy[0] + '%';
      node.style.top = m.xy[1] + '%';
      node.style.width = hit + 'px';
      node.style.height = hit + 'px';
      node.style.margin = (-hit / 2) + 'px 0 0 ' + (-hit / 2) + 'px';

      if (m.kind === 'cluster') {
        badgeCountEls[m.cluster.key].textContent = m.count;
        node.setAttribute('aria-label', m.cluster.label + ', ' + m.count +
          (m.count === 1 ? ' country' : ' countries'));
      }

      if (m.kind === 'pin') {
        var active = state.hoverName === m.name || state.selected === m.name;
        node.classList.toggle('is-active', active);
        var line = leaderEls[m.name];
        if (line) {
          if (m.nudged) {
            line.style.display = '';
            line.setAttribute('x1', m.truth[0]);
            line.setAttribute('y1', m.truth[1]);
            line.setAttribute('x2', m.xy[0]);
            line.setAttribute('y2', m.xy[1]);
          } else {
            line.style.display = 'none';
          }
        }
      }
    });

    /* tooltip */
    var name = state.hoverName;
    if (name && COUNTRY_POINTS[name]) {
      var p = COUNTRY_POINTS[name];
      var year = COUNTRY_YEARS[name];
      el.tip.hidden = false;
      el.tip.textContent = year ? name + ' · ' + year : name;
      el.tip.style.left = (v.tx + v.s * p[0]) + '%';
      el.tip.style.top = (v.ty + v.s * p[1]) + '%';
    } else {
      el.tip.hidden = true;
    }

    /* region chips follow the highlight */
    Object.keys(chipEls).forEach(function (key) {
      var c = chipEls[key];
      var on = state.hoverName === key;
      c.chip.classList.toggle('is-active', on);
      c.chip.style.background = on ? c.color : '';
    });

    renderPanels(g.tight);
  }

  function renderPanels(tight) {
    /* the grouped set is part of the key: a resize can change which countries
       a group still stands for, and the chooser has to follow */
    var open = null;
    if (!state.selected && state.cluster) {
      CLUSTERS.forEach(function (c) { if (c.key === state.cluster) open = c; });
    }
    var key = (state.selected || '') + '|' + (state.cluster || '') + '|' +
      (open ? groupedMembers(open, tight).join(',') : '');
    if (key === panelKey) return;
    panelKey = key;

    /* cluster chooser */
    var cl = open;
    if (cl) {
      var live = groupedMembers(cl, tight);
      el.clusterTitle.textContent = cl.label;
      el.clusterCount.textContent = live.length + ' countries';
      el.clusterRows.innerHTML = '';
      live.forEach(function (name) {
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'panel-row';
        row.innerHTML = '<span class="panel-row__dot"></span>' +
          '<span class="panel-row__name"></span>' +
          '<span class="panel-row__year">' + (COUNTRY_YEARS[name] || '') + '</span>' + CHEVRON;
        row.querySelector('.panel-row__name').textContent = name;
        row.addEventListener('click', function () { selectCountry(name); });
        row.addEventListener('mouseenter', function () { focusCountry(name); });
        row.addEventListener('mouseleave', function () { clearFocus(); });
        el.clusterRows.appendChild(row);
      });
      el.clusterPanel.hidden = false;
    } else {
      el.clusterPanel.hidden = true;
      el.clusterRows.innerHTML = '';
    }

    /* country communities */
    var sel = state.selected;
    if (sel) {
      var locs = LOCATIONS[sel] || [];
      el.countryTitle.textContent = sel;
      el.countryYear.textContent = COUNTRY_YEARS[sel] || '';
      el.countryCount.textContent = locs.length + (locs.length === 1 ? ' community' : ' communities');
      el.countryRows.innerHTML = '';
      locs.forEach(function (loc) {
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'panel-row';
        row.innerHTML = '<span class="panel-row__dot"></span><span class="panel-row__name"></span>' + CHEVRON;
        row.querySelector('.panel-row__name').textContent = loc;
        row.addEventListener('click', function () { openCommunity(loc); });
        el.countryRows.appendChild(row);
      });
      el.countryPanel.hidden = false;
    } else {
      el.countryPanel.hidden = true;
      el.countryRows.innerHTML = '';
    }
  }

  function renderSheet() {
    var name = state.community;
    if (!name) {
      el.sheet.hidden = true;
      document.body.classList.remove('is-locked');
      return;
    }
    var country = state.selected;
    var region = regionOf(country);
    el.sheetName.textContent = name;
    el.sheetMeta.textContent = country + (region ? ' · ' + region.label : '');
    el.sheetIntro.textContent = 'A community of the Sisters of St Joseph of the Apparition in ' +
      name + ', ' + country + '.';

    /* a photograph is used if one has been placed at
       assets/communities/<slug>.jpg; otherwise the slot stays marked as awaited */
    var slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    el.sheetPhoto.innerHTML = '<span>Photograph to be supplied by the Congregation.</span>';
    var img = new Image();
    img.alt = name + ', ' + country;
    img.onload = function () {
      if (state.community !== name) return;
      el.sheetPhoto.innerHTML = '';
      el.sheetPhoto.appendChild(img);
    };
    img.src = 'assets/communities/' + slug + '.jpg';

    el.sheet.hidden = false;
    document.body.classList.add('is-locked');
    el.sheetClose.focus();
  }

  /* ── search: find a country or a community by name ──
     Countries match their own name and the names people commonly use for
     them; communities match their place name. Choosing a country zooms to it
     as a marker would; choosing a community also opens its sheet. */

  var SEARCH_ALIASES = {
    'Palestinian Territories': ['Palestine'],
    'United Kingdom': ['UK', 'Britain', 'Great Britain', 'England'],
    'Myanmar': ['Burma']
  };
  var SEARCH_MAX = 8;
  var searchIndex = null;
  var searchHits = [];
  var searchActive = -1;

  function fold(s) {
    return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : s.toLowerCase();
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function buildSearchIndex() {
    var list = [];
    REGIONS.forEach(function (r) {
      r.items.filter(has).forEach(function (country) {
        var n = LOCATIONS[country].length;
        list.push({
          kind: 'country', name: country, label: country,
          where: r.label + ' · ' + n + (n === 1 ? ' community' : ' communities'),
          keys: [country].concat(SEARCH_ALIASES[country] || []).map(fold)
        });
        LOCATIONS[country].forEach(function (loc) {
          list.push({ kind: 'community', name: loc, country: country, label: loc,
                      where: country, keys: [fold(loc)] });
        });
      });
    });
    return list;
  }

  /* every term must appear in one of the entry's names; a name that starts
     with the query ranks first, then a word that does, and countries rank
     above communities of equal standing */
  function searchScore(entry, q, terms) {
    var best = 0;
    entry.keys.forEach(function (key) {
      for (var i = 0; i < terms.length; i++) if (key.indexOf(terms[i]) < 0) return;
      var s = 1;
      if (key.indexOf(q) === 0) s = 4;
      else if ((' ' + key).indexOf(' ' + terms[0]) > -1) s = 2;
      best = Math.max(best, s);
    });
    return best ? best * 2 + (entry.kind === 'country' ? 1 : 0) : 0;
  }

  /* highlight the query terms in the label, matching accent-blind */
  function markTerms(label, terms) {
    var folded = '', at = [];
    for (var i = 0; i < label.length; i++) {
      var f = fold(label[i]);
      for (var k = 0; k < f.length; k++) { folded += f[k]; at.push(i); }
    }
    var on = [];
    terms.forEach(function (t) {
      var from = 0, j;
      while (t && (j = folded.indexOf(t, from)) > -1) {
        for (var k = j; k < j + t.length; k++) on[at[k]] = true;
        from = j + t.length;
      }
    });
    var html = '', open = false;
    for (var c = 0; c < label.length; c++) {
      if (on[c] && !open) { html += '<mark>'; open = true; }
      if (!on[c] && open) { html += '</mark>'; open = false; }
      html += escapeHtml(label[c]);
    }
    return open ? html + '</mark>' : html;
  }

  function searchOpen() { return !el.searchBox.hidden; }

  function openSearch() {
    if (!searchIndex) searchIndex = buildSearchIndex();
    el.searchOpen.hidden = true;
    el.searchOpen.setAttribute('aria-expanded', 'true');
    el.searchBox.hidden = false;
    el.searchInput.value = '';
    renderSearch();
    el.searchInput.focus();
  }

  function closeSearch(refocus) {
    if (!searchOpen()) return;
    el.searchBox.hidden = true;
    el.searchList.hidden = true;
    el.searchInput.setAttribute('aria-expanded', 'false');
    el.searchInput.removeAttribute('aria-activedescendant');
    el.searchOpen.hidden = false;
    el.searchOpen.setAttribute('aria-expanded', 'false');
    searchHits = [];
    searchActive = -1;
    if (refocus) el.searchOpen.focus();
  }

  function renderSearch() {
    var q = fold(el.searchInput.value.trim());
    searchActive = -1;
    el.searchInput.removeAttribute('aria-activedescendant');
    if (!q) {
      searchHits = [];
      el.searchList.hidden = true;
      el.searchInput.setAttribute('aria-expanded', 'false');
      return;
    }
    var terms = q.split(/\s+/);
    searchHits = searchIndex
      .map(function (e) { return { e: e, s: searchScore(e, q, terms) }; })
      .filter(function (h) { return h.s > 0; })
      .sort(function (a, b) { return b.s - a.s || a.e.label.localeCompare(b.e.label); })
      .slice(0, SEARCH_MAX)
      .map(function (h) { return h.e; });

    el.searchList.innerHTML = '';
    if (!searchHits.length) {
      el.searchList.innerHTML = '<div class="suggest__empty">No country or community matches “' +
        escapeHtml(el.searchInput.value.trim()) + '”.</div>';
    }
    searchHits.forEach(function (e, i) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'suggest__item';
      row.id = 'msg-' + i;
      row.tabIndex = -1;
      row.setAttribute('role', 'option');
      row.innerHTML = '<span class="suggest__title">' + markTerms(e.label, terms) + '</span>' +
        '<span class="suggest__where">' + escapeHtml(e.where) + '</span>';
      row.addEventListener('click', function () { chooseSearch(e); });
      el.searchList.appendChild(row);
    });
    el.searchList.hidden = false;
    el.searchInput.setAttribute('aria-expanded', 'true');
  }

  function setSearchActive(n) {
    var rows = el.searchList.querySelectorAll('.suggest__item');
    if (!rows.length) return;
    searchActive = (n + rows.length) % rows.length;
    Array.prototype.forEach.call(rows, function (r, i) {
      r.classList.toggle('is-active', i === searchActive);
      r.setAttribute('aria-selected', i === searchActive ? 'true' : 'false');
    });
    rows[searchActive].scrollIntoView({ block: 'nearest' });
    el.searchInput.setAttribute('aria-activedescendant', 'msg-' + searchActive);
  }

  function chooseSearch(entry) {
    closeSearch(true);
    if (entry.kind === 'country') {
      selectCountry(entry.name);
    } else {
      selectCountry(entry.country);
      openCommunity(entry.name);
    }
  }

  function bindSearch() {
    el.searchOpen.addEventListener('click', openSearch);
    el.searchClose.addEventListener('click', function () { closeSearch(true); });
    el.searchInput.addEventListener('input', renderSearch);
    el.searchInput.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') { event.preventDefault(); setSearchActive(searchActive + 1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); setSearchActive(searchActive - 1); }
      else if (event.key === 'Enter') {
        event.preventDefault();
        if (searchHits.length) chooseSearch(searchHits[searchActive > -1 ? searchActive : 0]);
      }
    });
    /* a tap anywhere else closes the search without stealing that tap */
    document.addEventListener('pointerdown', function (event) {
      if (searchOpen() && !el.search.contains(event.target)) closeSearch(false);
    });
  }

  function measure() {
    var w = el.frame.clientWidth;
    if (w && w !== state.mapW) {
      state.mapW = w;
      /* A group whose countries have spread apart at the new width no longer
         has a badge, so an open chooser for it would be unreachable once
         closed and would list fewer countries than it did. Return to the world
         view instead of leaving it stranded. */
      if (state.cluster) {
        var open = null;
        CLUSTERS.forEach(function (c) { if (c.key === state.cluster) open = c; });
        if (open && groupedMembers(open, crowded()).length < 2) {
          state.cluster = null;
          state.hoverName = null;
          state.pan = { x: 0, y: 0 };
        }
      }
      render();
    }
  }

  function init() {
    el.frame = document.getElementById('mapFrame');
    if (!el.frame) return;
    el.zoom = document.getElementById('mapZoom');
    el.marks = document.getElementById('mapMarks');
    el.leaders = document.getElementById('mapLeaders');
    el.tip = document.getElementById('mapTip');
    el.regions = document.getElementById('regionList');

    el.clusterPanel = document.getElementById('clusterPanel');
    el.clusterTitle = document.getElementById('clusterTitle');
    el.clusterCount = document.getElementById('clusterCount');
    el.clusterRows = document.getElementById('clusterRows');

    el.countryPanel = document.getElementById('countryPanel');
    el.countryTitle = document.getElementById('countryTitle');
    el.countryYear = document.getElementById('countryYear');
    el.countryCount = document.getElementById('countryCount');
    el.countryRows = document.getElementById('countryRows');

    el.sheet = document.getElementById('communitySheet');
    el.sheetName = document.getElementById('sheetName');
    el.sheetMeta = document.getElementById('sheetMeta');
    el.sheetPhoto = document.getElementById('sheetPhoto');
    el.sheetIntro = document.getElementById('sheetIntro');
    el.sheetClose = document.getElementById('sheetClose');

    el.search = document.getElementById('mapSearch');
    el.searchOpen = document.getElementById('mapSearchOpen');
    el.searchBox = document.getElementById('mapSearchBox');
    el.searchInput = document.getElementById('mapSearchInput');
    el.searchClose = document.getElementById('mapSearchClose');
    el.searchList = document.getElementById('mapSearchList');

    buildMarkers();
    buildRegions();
    bindSearch();

    el.frame.addEventListener('pointerdown', onPointerDown);
    el.frame.addEventListener('pointermove', onPointerMove);
    el.frame.addEventListener('pointerup', onPointerUp);
    el.frame.addEventListener('pointercancel', onPointerUp);
    el.frame.addEventListener('pointerleave', onPointerUp);
    el.frame.addEventListener('dblclick', function () { if (zoomed()) resetView(); });

    Array.prototype.forEach.call(document.querySelectorAll('[data-reset-view]'), function (b) {
      b.addEventListener('click', resetView);
    });
    el.sheetClose.addEventListener('click', closeCommunity);
    el.sheet.addEventListener('click', function (event) {
      if (event.target === el.sheet) closeCommunity();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (searchOpen()) closeSearch(true);
      else if (state.community) closeCommunity();
      else if (zoomed()) resetView();
    });

    window.addEventListener('resize', measure);
    state.mapW = el.frame.clientWidth || 390;
    render();
    /* the artwork sets the frame's height, so re-measure once it has loaded */
    var art = el.zoom.querySelector('img');
    if (art && !art.complete) art.addEventListener('load', measure);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
