/* Image lightbox. Tapping a photograph in the page opens it full-screen;
   previous / next move through every photograph on the page in reading
   order (including parts loaded later), by button, arrow key or swipe.
   Escape, the close button or a tap on the backdrop closes it. */
(function () {
  'use strict';

  var SELECTOR = '.figure img, .gallery__item img, img.photo, .hero img';
  var box = null;
  var items = [];
  var current = -1;
  var lastFocus = null;

  function collect() {
    items = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
  }

  function captionFor(img) {
    var fig = img.closest('figure');
    var fc = fig && fig.querySelector('figcaption');
    if (fc && fc.textContent.trim()) return fc.textContent.trim();
    return img.getAttribute('alt') || '';
  }

  function build() {
    box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Image viewer');
    box.hidden = true;
    box.innerHTML =
      '<button type="button" class="lightbox__close" data-close aria-label="Close">&times;</button>' +
      '<button type="button" class="lightbox__nav lightbox__nav--prev" data-prev aria-label="Previous image">&#8249;</button>' +
      '<figure class="lightbox__figure">' +
        '<img class="lightbox__img" alt="">' +
        '<figcaption class="lightbox__caption"><span data-caption></span><span class="lightbox__count" data-count></span></figcaption>' +
      '</figure>' +
      '<button type="button" class="lightbox__nav lightbox__nav--next" data-next aria-label="Next image">&#8250;</button>';
    document.body.appendChild(box);

    box.querySelector('[data-close]').addEventListener('click', close);
    box.querySelector('[data-prev]').addEventListener('click', function () { show(current - 1); });
    box.querySelector('[data-next]').addEventListener('click', function () { show(current + 1); });
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.classList.contains('lightbox__figure')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(current - 1);
      else if (e.key === 'ArrowRight') show(current + 1);
    });

    /* swipe left / right */
    var startX = null, startY = null;
    box.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      startX = startY = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  function show(n) {
    if (!items.length) return;
    current = (n + items.length) % items.length;
    var src = items[current];
    var img = box.querySelector('.lightbox__img');
    img.src = src.currentSrc || src.src;
    img.alt = src.alt || '';
    box.querySelector('[data-caption]').textContent = captionFor(src);
    box.querySelector('[data-count]').textContent = items.length > 1 ? (current + 1) + ' / ' + items.length : '';
    box.querySelector('[data-prev]').hidden = items.length < 2;
    box.querySelector('[data-next]').hidden = items.length < 2;
    /* warm the neighbours so the next tap is instant */
    [current + 1, current - 1].forEach(function (i) {
      var k = (i + items.length) % items.length;
      if (k !== current) { var pre = new Image(); pre.src = items[k].currentSrc || items[k].src; }
    });
  }

  function open(img) {
    if (!box) build();
    collect();
    var i = items.indexOf(img);
    if (i < 0) return;
    lastFocus = document.activeElement;
    box.hidden = false;
    document.body.classList.add('has-lightbox');
    show(i);
    box.querySelector('[data-close]').focus();
  }

  function close() {
    if (!box || box.hidden) return;
    box.hidden = true;
    document.body.classList.remove('has-lightbox');
    box.querySelector('.lightbox__img').removeAttribute('src');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var img = e.target.closest && e.target.closest(SELECTOR);
    if (!img || img.closest('a') || img.closest('.lightbox')) return;
    e.preventDefault();
    open(img);
  });
})();
