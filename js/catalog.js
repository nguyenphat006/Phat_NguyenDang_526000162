// Products page: search, filter, sort, wishlist, product details and the quote buttons.

(function (E) {
  'use strict';

  const { loadData } = E.api;
  const { filterProducts } = E.filters;
  const { getLang, onLangChange, pick, t } = E.lang;
  const store = E.store;
  const { $, $$, categoryLabel, debounce, formatMoney, h, toast } = E.ui;


  const CATEGORIES = ['teak', 'aluminum', 'rope', 'wicker'];
  const PAGE_SIZE = 12;

  async function initCatalog(cart, { openQuote } = {}) {
    const grid = $('#product-grid');
    if (!grid) return;

    let products;
    try {
      products = await loadData('products');
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
      shown: PAGE_SIZE,
    };

    const search = $('#q');
    const sortSelect = $('#sort');
    const range = $('#max-price');
    const rangeOut = $('#max-price-out');
    const wishOnly = $('#wish-only');
    const wishCount = $('#wish-count');
    const count = $('#catalog-count');
    const empty = $('#catalog-empty');
    const more = $('#load-more');
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
      id: product.id, sku: product.sku, name: product.name, price: product.price, image: product.image, category: product.category,
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

    function quoteProduct(product) {
      if (dialog.open) dialog.close();
      openQuote?.open(product);
    }

    function renderCard(product) {
      const name = pick(product.name);
      const wished = wishlist.has(product.id);
      return h('li', { dataset: { id: product.id } },
        h('article', { class: 'product' },
          h('figure', { class: 'product__media' },
            h('img', { src: product.image, alt: name, width: 600, height: 480, loading: 'lazy' }),
            h('button', { type: 'button', class: 'product__round product__cart', 'data-action': 'add', 'aria-label': `${t('card.add')}: ${name}` }, '+'),
            h('button', {
              type: 'button', class: 'product__round product__wish', 'data-action': 'wish', 'aria-pressed': String(wished),
              'aria-label': wished ? t('wish.remove') : t('wish.add'),
            }, '♥')),
          h('div', { class: 'product__body' },
            h('p', { class: 'product__cat' }, `${categoryLabel(product.category)} · ${product.sku}`),
            h('h3', {}, name),
            h('p', { class: 'product__desc' }, pick(product.description)),
            h('p', { class: 'product__meta' }, `${product.dimensions} · ${t('days', { n: product.leadTimeDays })}`),
            h('p', { class: 'product__meta product__moq' }, t('card.moq', { n: product.moq })),
            h('p', { class: 'product__price' }, formatMoney(product.price)),
            h('p', { class: 'product__actions' },
              h('button', { type: 'button', class: 'btn btn--small btn--ghost', 'data-action': 'details' }, t('card.details')),
              h('button', { type: 'button', class: 'btn btn--small', 'data-action': 'quote' }, t('card.quote'))))));
    }

    function render() {
      const matches = filterProducts(products, { ...state, wishlist, lang: getLang() });
      const visible = matches.slice(0, state.shown);
      grid.replaceChildren(...visible.map(renderCard));
      empty.hidden = matches.length > 0;
      more.hidden = matches.length <= state.shown;
      more.textContent = t('catalog.more', { n: matches.length - state.shown });
      count.textContent = t('catalog.count', { n: visible.length, total: matches.length });
      rangeOut.textContent = formatMoney(state.maxPrice);
      wishCount.textContent = wishlist.size;
      chips.forEach((chip) => {
        const active = chip.dataset.cat === state.category;
        chip.classList.toggle('is-active', active);
        chip.setAttribute('aria-pressed', String(active));
      });
    }

    /** Any change to the filters starts again from the first page. */
    const refilter = (change) => { Object.assign(state, change, { shown: PAGE_SIZE }); render(); };

    function renderDialog(id) {
      const product = products.find((entry) => entry.id === id);
      if (!product) return;
      openProductId = id;
      const wished = wishlist.has(id);
      dialogBody.replaceChildren(
        h('figure', { class: 'detail__media' }, h('img', { src: product.image, alt: pick(product.name), width: 600, height: 480 })),
        h('div', { class: 'detail__text' },
          h('p', { class: 'product__cat' }, `${categoryLabel(product.category)} · ${product.sku}`),
          h('h2', { id: 'product-dialog-title' }, pick(product.name)),
          h('p', {}, pick(product.description)),
          h('dl', { class: 'detail__specs' },
            h('dt', {}, t('detail.dimensions')), h('dd', {}, product.dimensions),
            h('dt', {}, t('detail.lead')), h('dd', {}, t('days', { n: product.leadTimeDays })),
            h('dt', {}, t('detail.moq')), h('dd', {}, t('pq.pieces', { n: product.moq })),
            h('dt', {}, t('detail.price')), h('dd', { class: 'product__price' }, formatMoney(product.price))),
          h('p', { class: 'product__actions' },
            h('button', { type: 'button', class: 'btn btn--small', onClick: () => quoteProduct(product) }, t('card.quote')),
            h('button', { type: 'button', class: 'btn btn--small btn--ghost', onClick: () => addToCart(product) }, t('card.add')),
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
        quote: () => quoteProduct(product),
        details: () => { renderDialog(product.id); dialog.showModal(); },
      };
      actions[button.dataset.action]?.();
    });
    dialog.addEventListener('close', () => { openProductId = null; });

    search.addEventListener('input', debounce(() => refilter({ query: search.value }), 150));
    sortSelect.addEventListener('change', () => refilter({ sort: sortSelect.value }));
    range.addEventListener('input', () => refilter({ maxPrice: Number(range.value) }));
    wishOnly.addEventListener('change', () => refilter({ wishOnly: wishOnly.checked }));
    chips.forEach((chip) => chip.addEventListener('click', () => refilter({ category: chip.dataset.cat })));
    more.addEventListener('click', () => { state.shown += PAGE_SIZE; render(); });
    $('#reset-filters').addEventListener('click', () => {
      search.value = '';
      sortSelect.value = 'default';
      range.value = priceCap;
      wishOnly.checked = false;
      refilter({ query: '', category: 'all', maxPrice: priceCap, sort: 'default', wishOnly: false });
    });

    onLangChange(() => { render(); if (openProductId) renderDialog(openProductId); });
    render();
  }

  E.catalog = { initCatalog };
})(window.Ericss = window.Ericss || {});
