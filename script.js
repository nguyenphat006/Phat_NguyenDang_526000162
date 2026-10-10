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
    let order = 0;
    items.forEach((item) => {
      item.hidden = !(value === 'all' || item.dataset.category === value);
      item.classList.remove('filter-in');
      if (!item.hidden) {
        void item.offsetWidth; // restart the animation
        item.style.animationDelay = `${order++ * 70}ms`;
        item.classList.add('filter-in');
      }
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
    if (dlg && typeof dlg.showModal === 'function') { dlg.showModal(); if (window.lenis) window.lenis.stop(); }
  });
});
document.querySelectorAll('dialog').forEach((dlg) => {
  dlg.addEventListener('close', () => { if (window.lenis) window.lenis.start(); });
  dlg.querySelector('[data-close-dialog]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
});

// ---------- Modern touches ----------
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const progressBar = document.querySelector('.progress');
const header = document.querySelector('.site-header');
const toTop = document.querySelector('.to-top');
let ticking = false;

function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
  header.classList.toggle('is-scrolled', y > 24);
  toTop.classList.toggle('is-visible', y > 700);
  ticking = false;
}
window.addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
onScroll();

toTop.addEventListener('click', () => {
  if (window.lenis) window.lenis.scrollTo(0, { duration: 1.4 });
  else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
});

// Count-up numbers in the stats band
function countUp(el) {
  const target = Number(el.dataset.count);
  const from = Number(el.dataset.from || 0);
  const suffix = el.dataset.suffix || '';
  const format = (n) => (target >= 10000 ? n.toLocaleString('en-US') : String(n)) + suffix;
  if (reduceMotion) { el.textContent = format(target); return; }
  const start = performance.now();
  const duration = 1600;
  (function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = format(Math.round(from + (target - from) * eased));
    if (t < 1) requestAnimationFrame(frame);
  })(start);
}
const counters = new IntersectionObserver((entries, obs) => {
  entries.forEach((e) => { if (e.isIntersecting) { countUp(e.target); obs.unobserve(e.target); } });
}, { threshold: 0.6 });
document.querySelectorAll('[data-count]').forEach((el) => counters.observe(el));

// Curtain reveal for pictures (added by JS so content stays visible without it).
// The parent is observed because a clipped element never reports as intersecting.
if (!reduceMotion) {
  const reveals = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll(':scope > .reveal').forEach((el) => el.classList.add('is-visible'));
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.about__media, .step figure, .gallery__item figure, .card__media').forEach((el) => {
    el.classList.add('reveal');
    reveals.observe(el.parentElement);
  });
}

// ---------- External motion libraries: Lenis, GSAP + ScrollTrigger, vanilla-tilt ----------
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (!reduceMotion && window.Lenis) {
  // Lenis: inertia-based smooth scrolling, driven by GSAP's ticker
  const lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 3), smoothWheel: true });
  window.lenis = lenis;
  if (window.gsap && window.ScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(performance.now());
  }
  // In-page links glide to the section, leaving room for the sticky header
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    const id = link && link.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -(header.offsetHeight - 1), duration: 1.3 });
    history.replaceState(null, '', id);
  });
}

if (!reduceMotion && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  // Layered parallax in the hero: arch, inset and background disc drift at different speeds
  const heroTrigger = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 };
  gsap.to('.hero__arch', { yPercent: 6, ease: 'none', scrollTrigger: heroTrigger });
  gsap.to('.hero__inset', { yPercent: -22, ease: 'none', scrollTrigger: heroTrigger });
  gsap.to('.hero__visual', { '--disc-shift': '60px', ease: 'none', scrollTrigger: heroTrigger });

  // About picture: the photo slides inside its frame while the page scrolls
  gsap.fromTo('.about__media img',
    { yPercent: -7, scale: 1.14 },
    { yPercent: 7, scale: 1.14, ease: 'none',
      scrollTrigger: { trigger: '.about__media', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });

  // Magnetic buttons: they lean toward the cursor, then spring back
  if (canHover) {
    document.querySelectorAll('.btn').forEach((btn) => {
      const x = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
      const y = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        x((e.clientX - (r.left + r.width / 2)) * 0.12);
        y((e.clientY - (r.top + r.height / 2)) * 0.18);
      });
      btn.addEventListener('pointerleave', () => { x(0); y(0); });
    });
  }
}

// vanilla-tilt: collection cards tilt slightly in 3D under the cursor
if (!reduceMotion && canHover && window.VanillaTilt) {
  VanillaTilt.init(document.querySelectorAll('.card'), {
    max: 5, speed: 600, scale: 1.02, perspective: 1100, glare: true, 'max-glare': 0.12,
  });
}
