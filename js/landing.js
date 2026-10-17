// Landing page only: facts that come from the JSON data, the drag-to-scroll frames and the wordmark's scroll move.
import { loadJSON } from './api.js';
import { onLangChange, t } from './lang.js';
import { $, formatMoney } from './ui.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MATERIALS = ['teak', 'aluminum', 'rope', 'wicker'];

/** Cheapest price, fastest delivery and lowest MOQ of a list of products (pure). */
export function summarize(products) {
  return {
    minPrice: Math.min(...products.map((p) => p.price)),
    minDays: Math.min(...products.map((p) => p.leadTimeDays)),
    maxDays: Math.max(...products.map((p) => p.leadTimeDays)),
    minMoq: Math.min(...products.map((p) => p.moq)),
  };
}

function renderFacts(products) {
  const all = summarize(products);
  const range = t('home.fact.range', { min: all.minDays, max: all.maxDays });
  $('#fact-lead').textContent = range;
  $('#proc-lead').textContent = range;
  $('#fact-moq').textContent = t('home.fact.from', { n: all.minMoq });
  MATERIALS.forEach((material) => {
    const target = $(`[data-material="${material}"]`);
    const own = products.filter((product) => product.category === material);
    if (!target || own.length === 0) return;
    const s = summarize(own);
    target.textContent = t('home.show.meta', { price: formatMoney(s.minPrice), days: s.minDays, moq: s.minMoq });
  });
}

/** Mouse drag on the row of frames (touch and trackpad already scroll natively). */
function enableDragScroll(row) {
  let startX = 0;
  let startLeft = 0;
  let dragging = false;
  row.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse') return;
    dragging = true;
    startX = event.clientX;
    startLeft = row.scrollLeft;
    row.classList.add('is-dragging');
    row.setPointerCapture(event.pointerId);
  });
  row.addEventListener('pointermove', (event) => {
    if (dragging) row.scrollLeft = startLeft - (event.clientX - startX);
  });
  const stop = () => { dragging = false; row.classList.remove('is-dragging'); };
  row.addEventListener('pointerup', stop);
  row.addEventListener('pointercancel', stop);
  // arrow keys scroll the focused row by one frame
  row.addEventListener('keydown', (event) => {
    const step = (row.querySelector('li')?.offsetWidth ?? 160) * 1.5;
    if (event.key === 'ArrowRight') { row.scrollBy({ left: step, behavior: 'smooth' }); event.preventDefault(); }
    if (event.key === 'ArrowLeft') { row.scrollBy({ left: -step, behavior: 'smooth' }); event.preventDefault(); }
  });
}

/** The monument: as the first screen leaves, the name shrinks a little (travel under 8%). */
function scaleWordmark() {
  const word = $('.monument__name span:first-child');
  if (!word || reduceMotion || !window.gsap || !window.ScrollTrigger) return;
  window.gsap.registerPlugin(window.ScrollTrigger);
  window.gsap.to(word, {
    scale: 0.93, ease: 'none',
    scrollTrigger: { trigger: '.monument', start: 'top top', end: 'bottom top', scrub: 0.5 },
  });
}

export async function initLanding() {
  if (document.body.dataset.page !== 'home') return;
  const frames = $('.frames__row');
  if (frames) enableDragScroll(frames);
  scaleWordmark();

  let products = [];
  try {
    products = await loadJSON('data/products.json');
  } catch (error) { return; } // the static text in the page stays as it is
  const render = () => renderFacts(products);
  onLangChange(render);
  render();
}
