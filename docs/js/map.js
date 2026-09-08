/* "Where we are" — interactive layer over the Congregation's own foundations map.
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

  /* [x%, y%, zoomScale] measured against assets/world-map-foundations.png (1625x968) */
  var COUNTRY_POINTS = {
    'France': [39.0, 34.1, 4], 'United Kingdom': [38.6, 28.4, 4.4], 'Ireland': [36.3, 26.5, 5],
    'Italy': [44.0, 39.6, 4], 'Malta': [45.2, 44.2, 3.6], 'Greece': [47.5, 41.3, 4.5],
    'Cyprus': [52.1, 44.3, 6], 'Romania': [49.2, 26.9, 4.2],
    'Tunisia': [42.7, 50.7, 4.5], 'Ethiopia': [53.4, 69.5, 3.6],
    'Israel': [53.2, 49.6, 6], 'Palestinian Territories': [53.5, 49.2, 5],
    'Syria': [55.1, 45.6, 5], 'Lebanon': [53.1, 47.2, 6], 'Jordan': [54.6, 50.3, 6],
    'India': [64.7, 57.0, 2.8], 'Myanmar': [71.4, 56.3, 3.4], 'Thailand': [73.0, 62.0, 3.6],
    'Singapore': [72.7, 69.6, 6], 'Philippines': [80.0, 62.0, 4],
    'Australia': [84.0, 85.8, 2.4],
    'Guatemala': [11.7, 52.3, 5], 'Panama': [14.5, 58.3, 5.5], 'Peru': [15.5, 69.2, 3.6]
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
    { key: 'med', label: 'Mediterranean & Holy Land', x: 51.7, y: 45.9, scale: 4.6,
      members: ['Greece', 'Malta', 'Cyprus', 'Syria', 'Lebanon', 'Israel', 'Palestinian Territories', 'Jordan'] },
    { key: 'brit', label: 'Britain & Ireland', x: 34.4, y: 24.2, scale: 4.4,
      members: ['United Kingdom', 'Ireland'] },
    { key: 'sea', label: 'South-East Asia', x: 72.4, y: 62.6, scale: 3.4,
      members: ['Myanmar', 'Thailand', 'Singapore'] },
    { key: 'camerica', label: 'Central America', x: 8.6, y: 55.2, scale: 5,
      members: ['Guatemala', 'Panama'] }
  ];

  var CLUSTER_OF = {};
  CLUSTERS.forEach(function (c) {
    c.members.forEach(function (m) { CLUSTER_OF[m] = c.key; });
  });

  /* Malta and the Palestinian Territories are not drawn or named on the artwork */
  var UNLABELLED = { 'Malta': 'Malta', 'Palestinian Territories': 'Palestine' };

  /* marker offset in screen px, drawn with a leader line back to the true point */
  var NUDGE = { 'Palestinian Territories': [34, 20] };

  var MAP_RATIO = 968 / 1625;

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
    var pos = {};
    live.forEach(function (name) {
      var p = COUNTRY_POINTS[name];
      var n = NUDGE[name];
      pos[name] = n ? [p[0] + n[0] / w * 100, p[1] + n[1] / h * 100] : [p[0], p[1]];
    });
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

  function selectCountry(name) {
    if (!COUNTRY_POINTS[name]) return;
    state.selected = name;
    state.hoverName = name;
    state.community = null;
    state.cluster = null;
    state.pan = { x: 0, y: 0 };
    render();
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

    buildMarkers();
    buildRegions();

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
      if (state.community) closeCommunity();
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
