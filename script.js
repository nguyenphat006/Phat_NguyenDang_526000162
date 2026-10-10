// AOS (Animate On Scroll) — runs once, gentle timing so motion never feels busy
if (window.AOS) {
  AOS.init({ duration: 800, easing: 'ease-out-cubic', once: true, offset: 60 });
}

// ---------- Language (Vietnamese is the default, English is swapped in) ----------
const SLOTS = [
  ['data-i18n', (el, v) => { el.innerHTML = v; }],
  ['data-i18n-alt', (el, v) => { el.alt = v; }],
  ['data-i18n-aria', (el, v) => { el.setAttribute('aria-label', v); }],
  ['data-i18n-content', (el, v) => { el.setAttribute('content', v); }],
];
const VI = { ui: window.I18N.ui.vi };
const EN = window.I18N.en;
let lang = 'vi';

// Remember the Vietnamese source text that ships in the HTML
SLOTS.forEach(([attr]) => {
  document.querySelectorAll(`[${attr}]`).forEach((el) => {
    const key = el.getAttribute(attr);
    VI[key] = attr === 'data-i18n' ? el.innerHTML
      : attr === 'data-i18n-alt' ? el.alt
      : attr === 'data-i18n-content' ? el.getAttribute('content')
      : el.getAttribute('aria-label');
  });
});

const langButtons = document.querySelectorAll('.lang-switch__btn');

function setLang(next) {
  lang = next;
  const dict = next === 'en' ? EN : VI;
  SLOTS.forEach(([attr, apply]) => {
    document.querySelectorAll(`[${attr}]`).forEach((el) => {
      const text = dict[el.getAttribute(attr)];
      if (text !== undefined) apply(el, text);
    });
  });
  document.title = dict.title;
  document.documentElement.lang = next;
  langButtons.forEach((b) => {
    const active = b.dataset.lang === next;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-pressed', String(active));
  });
  setNav(nav.classList.contains('is-open'));
  try { localStorage.setItem('ericss-lang', next); } catch (e) { /* storage unavailable */ }
}

// Mobile navigation toggle
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('primary-nav');

function setNav(open) {
  nav.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  const ui = lang === 'en' ? EN : VI.ui;
  toggle.setAttribute('aria-label', open ? ui.menuClose : ui.menuOpen);
}

toggle.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });

// Gallery filter
const filters = document.querySelectorAll('.filter');
const items = document.querySelectorAll('.gallery__item');

filters.forEach((btn) => {
  btn.addEventListener('click', () => {
    const value = btn.dataset.filter;
    filters.forEach((b) => {
      const active = b === btn;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    items.forEach((item) => {
      item.hidden = !(value === 'all' || item.dataset.category === value);
    });
    if (window.AOS) AOS.refresh();
  });
});

// Highlight current section in the menu
const links = document.querySelectorAll('.site-nav__list a');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    links.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + entry.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });

document.querySelectorAll('main section[id]').forEach((s) => observer.observe(s));

// Language switch buttons + restore saved choice
langButtons.forEach((btn) => btn.addEventListener('click', () => setLang(btn.dataset.lang)));
try {
  const saved = localStorage.getItem('ericss-lang');
  if (saved === 'en') setLang('en');
} catch (e) { /* storage unavailable: stay on the default language */ }

// Native <dialog> (GitHub accounts) — open from footer, close via button, backdrop or Esc
document.querySelectorAll('[data-open-dialog]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const dlg = document.getElementById(btn.dataset.openDialog);
    if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
  });
});
document.querySelectorAll('dialog').forEach((dlg) => {
  dlg.querySelector('[data-close-dialog]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
});
