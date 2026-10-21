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
  const MAX_COMPARE = 3;

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
    let compare = store.read('compare', []).filter((id) => products.some((product) => product.id === id)).slice(0, MAX_COMPARE);
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
    const compareBar = $('#compare-bar');
    const compareChips = $('#compare-chips');
    const compareHint = $('#compare-hint');
    const compareOpen = $('#compare-open');
    const compareDialog = $('#compare-dialog');
    const compareTable = $('#compare-table');
    const diffOnly = $('#compare-diff');

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

    // ---------- compare up to three products side by side ----------
    const byId = (id) => products.find((product) => product.id === id);

    function toggleCompare(id) {
      if (compare.includes(id)) {
        compare = compare.filter((entry) => entry !== id);
      } else if (compare.length >= MAX_COMPARE) {
        toast(t('compare.max', { n: MAX_COMPARE }));
        return;
      } else {
        compare = [...compare, id];
      }
      store.write('compare', compare);
      render();
      renderCompareBar();
      if (compareDialog.open) {
        if (compare.length < 2) compareDialog.close();
        else renderCompareTable();
      }
    }

    function renderCompareBar() {
      compareBar.hidden = compare.length === 0;
      document.body.classList.toggle('has-compare-bar', compare.length > 0);
      compareChips.replaceChildren(...compare.map((id) => {
        const product = byId(id);
        return h('li', { class: 'compare-chip' },
          h('img', { src: product.image, alt: '', width: 40, height: 40 }),
          h('span', {}, pick(product.name)),
          h('button', { type: 'button', 'data-remove': id, 'aria-label': t('compare.removeOne', { name: pick(product.name) }) }, '×'));
      }));
      compareOpen.textContent = t('compare.open', { n: compare.length });
      compareOpen.disabled = compare.length < 2;
      compareHint.textContent = compare.length < 2 ? t('compare.need') : '';
    }

    /** The rows of the comparison table. `best`: which product gets a badge (lowest value). */
    const COMPARE_ROWS = [
      { label: 'compare.row.category', raw: (p) => p.category, show: (p) => categoryLabel(p.category) },
      { label: 'detail.price', raw: (p) => p.price, show: (p) => formatMoney(p.price), best: 'compare.best.price' },
      { label: 'detail.dimensions', raw: (p) => p.dimensions, show: (p) => p.dimensions },
      { label: 'detail.moq', raw: (p) => p.moq, show: (p) => t('pq.pieces', { n: p.moq }), best: 'compare.best.moq' },
      { label: 'detail.lead', raw: (p) => p.leadTimeDays, show: (p) => t('days', { n: p.leadTimeDays }), best: 'compare.best.lead' },
      { label: 'compare.row.description', raw: (p) => pick(p.description), show: (p) => pick(p.description) },
    ];

    function renderCompareTable() {
      const items = compare.map(byId).filter(Boolean);
      const rows = COMPARE_ROWS.filter((row) => !diffOnly.checked || new Set(items.map(row.raw)).size > 1);
      const head = h('tr', {},
        h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, t('compare.criteria'))),
        ...items.map((product) => h('th', { scope: 'col', class: 'compare__product' },
          h('img', { src: product.image, alt: pick(product.name), width: 300, height: 240 }),
          h('span', { class: 'product__cat' }, product.sku),
          h('strong', {}, pick(product.name)))));
      const body = rows.map((row) => {
        const values = items.map(row.raw);
        const best = row.best && new Set(values).size > 1 ? Math.min(...values) : null;
        return h('tr', {},
          h('th', { scope: 'row' }, t(row.label)),
          ...items.map((product, i) => h('td', { class: values[i] === best ? 'is-best' : null },
            row.show(product),
            values[i] === best ? h('span', { class: 'compare__badge' }, t(row.best)) : null)));
      });
      const actions = h('tr', { class: 'compare__actions' },
        h('td', {}),
        ...items.map((product) => h('td', {},
          h('button', { type: 'button', class: 'btn btn--small', onClick: () => { compareDialog.close(); quoteProduct(product); } }, t('card.quote')),
          h('button', { type: 'button', class: 'btn btn--small btn--ghost', onClick: () => addToCart(product) }, t('card.add')),
          h('button', { type: 'button', class: 'link-btn', onClick: () => toggleCompare(product.id) }, t('compare.remove')))));
      compareTable.replaceChildren(
        h('table', { class: 'compare' },
          h('caption', { class: 'sr-only' }, t('compare.title')),
          h('thead', {}, head),
          h('tbody', {}, ...body, rows.length === 0 ? h('tr', {}, h('td', { colspan: items.length + 1, class: 'compare__same' }, t('compare.same'))) : null),
          h('tfoot', {}, actions)));
    }

    function renderCard(product) {
      const name = pick(product.name);
      const wished = wishlist.has(product.id);
      const comparing = compare.includes(product.id);
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
            h('p', { class: 'product__compare' },
              h('button', { type: 'button', class: 'compare-toggle', 'data-action': 'compare', 'aria-pressed': String(comparing) },
                h('span', { class: 'compare-toggle__box', 'aria-hidden': 'true' }),
                comparing ? t('compare.added') : t('compare.add'))),
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
        compare: () => toggleCompare(product.id),
        add: () => addToCart(product),
        quote: () => quoteProduct(product),
        details: () => { renderDialog(product.id); dialog.showModal(); },
      };
      actions[button.dataset.action]?.();
    });
    dialog.addEventListener('close', () => { openProductId = null; });

    compareChips.addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove]');
      if (button) toggleCompare(button.dataset.remove);
    });
    compareOpen.addEventListener('click', () => {
      if (compare.length < 2) return;
      renderCompareTable();
      compareDialog.showModal();
    });
    $('#compare-clear').addEventListener('click', () => {
      compare = [];
      store.write('compare', compare);
      render();
      renderCompareBar();
    });
    diffOnly.addEventListener('change', renderCompareTable);

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

    onLangChange(() => { render(); renderCompareBar(); if (compareDialog.open) renderCompareTable(); if (openProductId) renderDialog(openProductId); });
    render();
    renderCompareBar();
  }

  E.catalog = { initCatalog };
})(window.Ericss = window.Ericss || {});
