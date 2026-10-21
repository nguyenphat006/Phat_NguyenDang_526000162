// Landing page: click a photo to see it large in a gallery modal (previous / next, keyboard, swipe, caption).
// The <dialog> is built here, so the page still shows every photo normally when JavaScript is off.

(function () {
  'use strict';

  if (document.body.dataset.page !== 'home' || typeof HTMLDialogElement === 'undefined') return;

  const TEXT = {
    vi: { close: 'Đóng', prev: 'Ảnh trước', next: 'Ảnh sau', label: 'Xem ảnh lớn' },
    en: { close: 'Close', prev: 'Previous photo', next: 'Next photo', label: 'Photo viewer' },
  };
  const text = () => TEXT[document.documentElement.lang === 'en' ? 'en' : 'vi'];

  // Which photos can be opened and which ones you flip through together. The list is read each time the modal opens,
  // so the gallery only offers the photos its current filter shows.
  const GROUPS = [
    { all: '.gallery__item img', open: '.gallery__item:not([hidden]) img', caption: (img) => img.closest('figure')?.querySelector('figcaption')?.textContent ?? img.alt },
    { all: '.step img', open: '.step img', caption: (img) => img.closest('article')?.querySelector('h3')?.textContent ?? img.alt },
    { all: '.card__media img', open: '.card__media img', caption: (img) => img.closest('article')?.querySelector('h3')?.textContent ?? img.alt },
    { all: '.about__media img', open: '.about__media img', caption: (img) => img.alt },
  ];

  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.innerHTML = `
    <figure class="lightbox__figure">
      <img class="lightbox__img" alt="" decoding="async">
      <figcaption class="lightbox__caption"><span class="lightbox__text"></span><span class="lightbox__count" aria-live="polite"></span></figcaption>
    </figure>
    <button class="lightbox__btn lightbox__close" type="button"><span aria-hidden="true">&times;</span></button>
    <button class="lightbox__btn lightbox__prev" type="button"><span aria-hidden="true">&#8249;</span></button>
    <button class="lightbox__btn lightbox__next" type="button"><span aria-hidden="true">&#8250;</span></button>`;
  document.body.append(dialog);

  const view = dialog.querySelector('.lightbox__img');
  const captionText = dialog.querySelector('.lightbox__text');
  const counter = dialog.querySelector('.lightbox__count');
  const closeBtn = dialog.querySelector('.lightbox__close');
  const prevBtn = dialog.querySelector('.lightbox__prev');
  const nextBtn = dialog.querySelector('.lightbox__next');

  let list = [];       // [{ src, alt, caption }]
  let index = 0;
  let opener = null;

  function labels() {
    const t = text();
    dialog.setAttribute('aria-label', t.label);
    closeBtn.setAttribute('aria-label', t.close);
    prevBtn.setAttribute('aria-label', t.prev);
    nextBtn.setAttribute('aria-label', t.next);
  }

  function show(i) {
    index = (i + list.length) % list.length;
    const item = list[index];
    view.src = item.src;
    view.alt = item.alt;
    captionText.textContent = item.caption;
    counter.textContent = list.length > 1 ? `${index + 1} / ${list.length}` : '';
    prevBtn.hidden = nextBtn.hidden = list.length < 2;
    // warm the neighbours so flipping feels instant
    if (list.length > 1) [index - 1, index + 1].forEach((n) => { new Image().src = list[(n + list.length) % list.length].src; });
  }

  function open(img) {
    const group = GROUPS.find((g) => img.matches(g.all));
    const imgs = [...document.querySelectorAll(group.open)];
    list = imgs.map((el) => ({ src: el.currentSrc || el.src, alt: el.alt, caption: (group.caption(el) || '').trim() }));
    opener = img;
    labels();
    show(Math.max(imgs.indexOf(img), 0));
    dialog.showModal();
    closeBtn.focus({ preventScroll: true });
  }

  // make every openable photo a real control: pointer, keyboard and screen reader
  function enable(img) {
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-haspopup', 'dialog');
    img.addEventListener('click', () => open(img));
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
    });
  }
  GROUPS.forEach((group) => document.querySelectorAll(group.all).forEach(enable));

  prevBtn.addEventListener('click', () => show(index - 1));
  nextBtn.addEventListener('click', () => show(index + 1));
  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog || e.target.classList.contains('lightbox__figure')) dialog.close(); });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
  });
  dialog.addEventListener('close', () => { view.removeAttribute('src'); if (opener) opener.focus({ preventScroll: true }); });

  // swipe on touch screens
  let startX = null;
  dialog.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  dialog.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50 && list.length > 1) show(index + (dx < 0 ? 1 : -1));
  });
})();
