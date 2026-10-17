// The single quote-request form. The same markup is used inside the dialog on the products page and
// inline on the contact page, so a request always carries the product the customer picked and their own MOQ.
import { loadJSON } from './api.js';
import { getLang, onLangChange, pick, t } from './lang.js';
import { calcQuote, meetsMoq } from './pricing.js';
import { buildQuote, submitQuote } from './quotes.js';
import { renderSuccess } from './success.js';
import { $, categoryLabel, formatMoney, h } from './ui.js';
import { validateRequest } from './validation.js';

const FIELDS = ['name', 'email', 'phone', 'qty', 'message'];
const CATEGORIES = ['teak', 'aluminum', 'rope', 'wicker'];

export async function initQuoteForm({ pricing, config, cart }) {
  const form = $('#pq-form');
  if (!form) return null;
  const dialog = form.closest('dialog');
  const summary = $('#pq-summary');
  const success = $('#pq-success');
  const estimate = $('#pq-estimate');
  const hint = $('#pq-moq-hint');
  const presets = $('#pq-presets');
  const qtyRow = $('#pq-qty-row');
  const qtyInput = form.elements.qty;
  const select = form.elements.product;
  const attach = form.elements.attach ?? null; // only the contact page has the "attach my cart" box
  const attachLabel = $('#pq-attach-label');
  const emptyTemplate = $('#pq-summary-empty');
  const maxQty = config.maxQuoteQty ?? 100000;
  const locale = () => (getLang() === 'vi' ? 'vi-VN' : 'en-US');

  let products = [];
  try {
    products = await loadJSON('data/products.json');
  } catch (error) { /* the select then offers only "custom project" */ }

  const current = () => products.find((product) => product.id === select.value) ?? null;
  const readQty = () => Number(qtyInput.value);
  const qtyIsValid = () => Number.isInteger(readQty()) && readQty() >= 1 && readQty() <= maxQty;
  const useCart = () => Boolean(attach && attach.checked && cart.count() > 0);

  /** Everything that will be sent: the chosen product at the customer's MOQ, plus the cart if attached. */
  function collectLines() {
    const lines = new Map();
    const product = current();
    if (product && qtyIsValid()) {
      lines.set(product.id, { id: product.id, sku: product.sku, name: product.name, price: product.price, qty: readQty() });
    }
    if (useCart()) {
      cart.items.forEach(({ id, sku, name, price, qty }) => {
        const existing = lines.get(id);
        lines.set(id, existing ? { ...existing, qty: existing.qty + qty } : { id, sku, name, price, qty });
      });
    }
    return [...lines.values()];
  }

  // ---------- rendering ----------
  function fillProducts() {
    const previous = select.value;
    select.replaceChildren(
      h('option', { value: '' }, t('pq.custom')),
      ...CATEGORIES.map((category) => h('optgroup', { label: categoryLabel(category) },
        ...products.filter((p) => p.category === category).map((p) => h('option', { value: p.id }, `${pick(p.name)} · ${p.sku}`)))));
    select.value = products.some((p) => p.id === previous) ? previous : '';
  }

  function renderSummary() {
    const product = current();
    if (!product) {
      summary.replaceChildren(emptyTemplate ? emptyTemplate.content.cloneNode(true) : h('p', { class: 'pq__hint-text' }, t('pq.pickHint')));
      summary.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
      return;
    }
    summary.replaceChildren(
      h('figure', { class: 'pq__media' }, h('img', { src: product.image, alt: pick(product.name), width: 600, height: 480 })),
      h('p', { class: 'product__cat' }, categoryLabel(product.category)),
      h('h3', {}, pick(product.name)),
      h('p', { class: 'pq__sku' }, `SKU ${product.sku}`),
      h('p', { class: 'pq__desc' }, pick(product.description)),
      h('dl', { class: 'detail__specs' },
        h('dt', {}, t('detail.price')), h('dd', {}, formatMoney(product.price)),
        h('dt', {}, t('detail.moq')), h('dd', {}, t('pq.pieces', { n: product.moq })),
        h('dt', {}, t('detail.lead')), h('dd', {}, t('days', { n: product.leadTimeDays })),
        h('dt', {}, t('detail.dimensions')), h('dd', {}, product.dimensions)));
  }

  function renderPresets() {
    const product = current();
    presets.replaceChildren(...(product ? [1, 2, 5] : []).map((times) => {
      const qty = product.moq * times;
      const label = qty.toLocaleString(locale());
      return h('button', { type: 'button', class: 'preset', 'data-qty': qty }, times === 1 ? t('pq.preset.moq', { n: label }) : label);
    }));
  }

  function renderEstimate() {
    const product = current();
    qtyRow.hidden = !product;
    if (product && qtyIsValid()) {
      const ok = meetsMoq(readQty(), product.moq);
      hint.textContent = ok ? t('pq.moqOk', { moq: product.moq }) : t('pq.moqBelow', { moq: product.moq });
      hint.dataset.status = ok ? 'ok' : 'below';
    } else {
      hint.textContent = '';
      hint.dataset.status = '';
    }

    const lines = collectLines();
    if (lines.length === 0) { estimate.replaceChildren(); return; }
    const totals = calcQuote(lines, pricing, useCart() ? cart.couponCode : '');
    const rows = [[t('totals.subtotal'), formatMoney(totals.subtotal), '']];
    if (totals.volumeDiscount > 0) rows.push([t('totals.volume', { rate: Math.round(totals.volumeRate * 100) }), `− ${formatMoney(totals.volumeDiscount)}`, 'is-discount']);
    if (totals.couponStatus === 'applied') rows.push([t('totals.coupon', { code: totals.coupon.code }), `− ${formatMoney(totals.couponDiscount)}`, 'is-discount']);
    rows.push([t('totals.vat', { rate: Math.round(totals.vatRate * 100) }), formatMoney(totals.vat), '']);
    rows.push([t('pq.estimated'), formatMoney(totals.total), 'is-total']);
    estimate.replaceChildren(...rows.flatMap(([label, value, cls]) => [h('dt', { class: cls }, label), h('dd', { class: cls }, value)]));
  }

  function renderAttach() {
    if (!attach) return;
    const count = cart.count();
    attach.disabled = count === 0;
    if (count === 0) attach.checked = false;
    attachLabel.textContent = count === 0 ? t('form.attachEmpty') : t('form.attach', { n: count });
  }

  function showErrors(errors) {
    FIELDS.forEach((field) => {
      const message = $(`#pq-err-${field}`);
      message.textContent = errors[field] ? t(errors[field], { max: maxQty.toLocaleString(locale()) }) : '';
      form.elements[field].setAttribute('aria-invalid', String(Boolean(errors[field])));
    });
  }

  function refresh() { renderSummary(); renderPresets(); renderEstimate(); }

  // ---------- behaviour ----------
  function setProduct(id) {
    select.value = products.some((product) => product.id === id) ? id : '';
    const product = current();
    qtyInput.value = product ? product.moq : '';
    showErrors({});
    refresh();
  }

  function setQty(value) {
    qtyInput.value = Math.max(1, Math.min(maxQty, Math.round(Number(value) || 1)));
    renderEstimate();
  }

  function showForm() {
    success.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  }

  select.addEventListener('change', () => setProduct(select.value));
  qtyInput.addEventListener('input', renderEstimate);
  attach?.addEventListener('change', renderEstimate);
  form.addEventListener('click', (event) => {
    const step = event.target.closest('[data-step]');
    const preset = event.target.closest('[data-qty]');
    if (step) setQty((Number(qtyInput.value) || 0) + Number(step.dataset.step));
    if (preset) setQty(preset.dataset.qty);
  });
  // an error disappears as soon as the field becomes valid
  form.addEventListener('input', (event) => {
    const field = event.target.name;
    if (!FIELDS.includes(field)) return;
    const errors = validateRequest(Object.fromEntries(new FormData(form)), { hasProduct: Boolean(current()), hasCart: useCart(), maxQty });
    if (!errors[field]) {
      $(`#pq-err-${field}`).textContent = '';
      event.target.setAttribute('aria-invalid', 'false');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (data.website) { dialog?.close(); return; } // honeypot field was filled in: a bot
    const product = current();
    const errors = validateRequest(data, { hasProduct: Boolean(product), hasCart: useCart(), maxQty });
    showErrors(errors);
    const firstInvalid = FIELDS.find((field) => errors[field]);
    if (firstInvalid) { form.elements[firstInvalid].focus(); return; }

    const withCart = useCart();
    const lines = collectLines();
    const quote = buildQuote({
      type: withCart ? 'cart' : product ? 'product' : 'contact',
      customer: data,
      interest: product ? product.category : 'custom',
      message: data.message ?? '',
      items: lines,
      coupon: withCart ? cart.couponCode : '',
      totals: lines.length ? calcQuote(lines, pricing, withCart ? cart.couponCode : '') : { subtotal: 0, total: 0 },
      product: product ? { id: product.id, sku: product.sku, name: product.name, price: product.price, factoryMoq: product.moq } : null,
      customerMoq: product ? Number(data.qty) : null,
      lang: getLang(),
    });

    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    const status = await submitQuote(quote);
    submit.disabled = false;
    submit.removeAttribute('aria-busy');
    if (withCart) cart.clear();

    form.hidden = true;
    renderSuccess(success, {
      quote,
      status,
      actions: [
        dialog
          ? h('button', { type: 'button', class: 'btn btn--small', onClick: () => dialog.close() }, t('success.close'))
          : h('button', { type: 'button', class: 'btn btn--small', onClick: () => { form.reset(); setProduct(''); showForm(); } }, t('success.another')),
        h('a', { class: 'btn btn--small btn--ghost', href: dialog ? 'contact.html#history-title' : '#history-title' }, t('success.history')),
      ],
    });
  });

  cart.subscribe(() => { renderAttach(); renderEstimate(); });
  onLangChange(() => { fillProducts(); refresh(); renderAttach(); showErrors({}); });

  fillProducts();
  setProduct(new URLSearchParams(location.search).get('product') ?? '');
  renderAttach();

  return {
    /** Products page: open the dialog for one product. */
    open(product) {
      form.reset();
      form.hidden = false;
      success.hidden = true;
      setProduct(product.id);
      renderAttach();
      dialog.showModal();
      form.elements.name.focus();
    },
  };
}
