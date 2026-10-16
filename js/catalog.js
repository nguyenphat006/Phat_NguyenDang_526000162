// Products page: search, filter, sort, wishlist and product details.
import { loadJSON } from './api.js';
import { filterProducts } from './filters.js';
import { getLang, onLangChange, pick, t } from './lang.js';
import * as store from './store.js';
import { $, $$, categoryLabel, debounce, formatMoney, h, toast } from './ui.js';

const CATEGORIES = ['teak', 'aluminum', 'rope', 'wicker'];

export async function initCatalog(cart) {
  const grid = $('#product-grid');
  if (!grid) return;

  let products;
  try {
    products = await loadJSON('data/products.json');
  } catch (error) {
    grid.replaceChildren(h('li', { class: 'products__message' }, t('error.load')));
    return;
  }

  const wishlist = new Set(store.read('wishlist', []));
  const prices = products.map((product) => product.price);
  const priceCap = Math.ceil(Math.max(...prices) / 500000) * 500000;
  const params = new URLSearchParams(location.search);
  const state = {
    query: params.get('q') ?? '',
    category: CATEGORIES.includes(params.get('cat')) ? params.get('cat') : 'all',
    maxPrice: priceCap,
    sort: 'default',
    wishOnly: false,
  };

  const search = $('#q');
  const sortSelect = $('#sort');
  const range = $('#max-price');
  const rangeOut = $('#max-price-out');
  const wishOnly = $('#wish-only');
  const wishCount = $('#wish-count');
  const count = $('#catalog-count');
  const empty = $('#catalog-empty');
  const chips = $$('.chip');
  const dialog = $('#product-dialog');
  const dialogBody = $('#product-dialog-body');
  let openProductId = null;

  range.min = Math.floor(Math.min(...prices) / 500000) * 500000;
  range.max = priceCap;
  range.step = 500000;
  range.value = state.maxPrice;
  search.value = state.query;

  const toCartItem = (product) => ({
    id: product.id, name: product.name, price: product.price, image: product.image, category: product.category,
  });

  function toggleWish(id) {
    if (wishlist.has(id)) wishlist.delete(id);
    else wishlist.add(id);
    store.write('wishlist', [...wishlist]);
    render();
    if (openProductId) renderDialog(openProductId);
  }

  function addToCart(product) {
    cart.add(toCartItem(product));
    toast(t('toast.added', { name: pick(product.name) }));
  }

  function renderCard(product) {
    const name = pick(product.name);
    const wished = wishlist.has(product.id);
    return h('li', { dataset: { id: product.id } },
      h('article', { class: 'product' },
        h('figure', { class: 'product__media' },
          h('img', { src: product.image, alt: name, width: 600, height: 480, loading: 'lazy' }),
          h('button', {
            type: 'button', class: 'product__wish', 'data-action': 'wish', 'aria-pressed': String(wished),
            'aria-label': wished ? t('wish.remove') : t('wish.add'),
          }, '♥')),
        h('div', { class: 'product__body' },
          h('p', { class: 'product__cat' }, categoryLabel(product.category)),
          h('h3', {}, name),
          h('p', { class: 'product__desc' }, pick(product.description)),
          h('p', { class: 'product__meta' }, `${product.dimensions} · ${t('days', { n: product.leadTimeDays })}`),
          h('p', { class: 'product__price' }, formatMoney(product.price)),
          h('p', { class: 'product__actions' },
            h('button', { type: 'button', class: 'btn btn--small btn--ghost', 'data-action': 'details' }, t('card.details')),
            h('button', { type: 'button', class: 'btn btn--small', 'data-action': 'add' }, t('card.add'))))));
  }

  function render() {
    const visible = filterProducts(products, { ...state, wishlist, lang: getLang() });
    grid.replaceChildren(...visible.map(renderCard));
    empty.hidden = visible.length > 0;
    count.textContent = t('catalog.count', { n: visible.length, total: products.length });
    rangeOut.textContent = formatMoney(state.maxPrice);
    wishCount.textContent = wishlist.size;
    chips.forEach((chip) => {
      const active = chip.dataset.cat === state.category;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', String(active));
    });
  }

  function renderDialog(id) {
    const product = products.find((entry) => entry.id === id);
    if (!product) return;
    openProductId = id;
    const wished = wishlist.has(id);
    dialogBody.replaceChildren(
      h('figure', { class: 'detail__media' }, h('img', { src: product.image, alt: pick(product.name), width: 600, height: 480 })),
      h('div', { class: 'detail__text' },
        h('p', { class: 'product__cat' }, categoryLabel(product.category)),
        h('h2', { id: 'product-dialog-title' }, pick(product.name)),
        h('p', {}, pick(product.description)),
        h('dl', { class: 'detail__specs' },
          h('dt', {}, t('detail.dimensions')), h('dd', {}, product.dimensions),
          h('dt', {}, t('detail.lead')), h('dd', {}, t('days', { n: product.leadTimeDays })),
          h('dt', {}, t('detail.price')), h('dd', { class: 'product__price' }, formatMoney(product.price))),
        h('p', { class: 'product__actions' },
          h('button', { type: 'button', class: 'btn btn--small', onClick: () => addToCart(product) }, t('card.add')),
          h('button', { type: 'button', class: 'btn btn--small btn--ghost', 'aria-pressed': String(wished), onClick: () => toggleWish(id) },
            wished ? t('wish.remove') : t('wish.add')))));
  }

  // One listener for every card (event delegation)
  grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    const card = event.target.closest('li[data-id]');
    if (!button || !card) return;
    const product = products.find((entry) => entry.id === card.dataset.id);
    const actions = {
      wish: () => toggleWish(product.id),
      add: () => addToCart(product),
      details: () => { renderDialog(product.id); dialog.showModal(); },
    };
    actions[button.dataset.action]?.();
  });
  dialog.addEventListener('close', () => { openProductId = null; });

  search.addEventListener('input', debounce(() => { state.query = search.value; render(); }, 150));
  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; render(); });
  range.addEventListener('input', () => { state.maxPrice = Number(range.value); render(); });
  wishOnly.addEventListener('change', () => { state.wishOnly = wishOnly.checked; render(); });
  chips.forEach((chip) => chip.addEventListener('click', () => { state.category = chip.dataset.cat; render(); }));
  $('#reset-filters').addEventListener('click', () => {
    Object.assign(state, { query: '', category: 'all', maxPrice: priceCap, sort: 'default', wishOnly: false });
    search.value = '';
    sortSelect.value = 'default';
    range.value = priceCap;
    wishOnly.checked = false;
    render();
  });

  onLangChange(() => { render(); if (openProductId) renderDialog(openProductId); });
  render();
}
