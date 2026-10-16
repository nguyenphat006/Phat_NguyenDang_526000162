// "Send quote" dialog for one product on the products page, including the customer's own MOQ.
import { getLang, onLangChange, pick, t } from './lang.js';
import { calcQuote, meetsMoq } from './pricing.js';
import { buildQuote, submitQuote } from './quotes.js';
import { $, categoryLabel, formatMoney, h, toast } from './ui.js';
import { validateProductQuote } from './validation.js';

const FIELDS = ['name', 'email', 'phone', 'qty'];

export function initProductQuote(pricing, config) {
  const dialog = $('#quote-dialog');
  if (!dialog) return null;
  const form = $('#pq-form');
  const summary = $('#pq-summary');
  const hint = $('#pq-moq-hint');
  const estimate = $('#pq-estimate');
  const qtyInput = form.elements.qty;
  const maxQty = config.maxQuoteQty ?? 100000;
  let product = null;

  const readQty = () => Number(qtyInput.value);
  const qtyIsValid = () => Number.isInteger(readQty()) && readQty() >= 1 && readQty() <= maxQty;

  function renderSummary() {
    if (!product) return;
    summary.replaceChildren(
      h('figure', { class: 'pq__media' }, h('img', { src: product.image, alt: pick(product.name), width: 600, height: 480 })),
      h('p', { class: 'product__cat' }, categoryLabel(product.category)),
      h('h3', {}, pick(product.name)),
      h('p', { class: 'pq__sku' }, `SKU ${product.sku}`),
      h('dl', { class: 'detail__specs' },
        h('dt', {}, t('detail.price')), h('dd', {}, formatMoney(product.price)),
        h('dt', {}, t('detail.moq')), h('dd', {}, t('pq.pieces', { n: product.moq })),
        h('dt', {}, t('detail.lead')), h('dd', {}, t('days', { n: product.leadTimeDays })),
        h('dt', {}, t('detail.dimensions')), h('dd', {}, product.dimensions)));
  }

  function renderEstimate() {
    if (!product) return;
    if (!qtyIsValid()) {
      hint.textContent = '';
      hint.dataset.status = '';
      estimate.replaceChildren();
      return;
    }
    const qty = readQty();
    const ok = meetsMoq(qty, product.moq);
    hint.textContent = ok ? t('pq.moqOk', { moq: product.moq }) : t('pq.moqBelow', { moq: product.moq });
    hint.dataset.status = ok ? 'ok' : 'below';

    const totals = calcQuote([{ price: product.price, qty }], pricing);
    const rows = [[t('totals.subtotal'), formatMoney(totals.subtotal), '']];
    if (totals.volumeDiscount > 0) {
      rows.push([t('totals.volume', { rate: Math.round(totals.volumeRate * 100) }), `− ${formatMoney(totals.volumeDiscount)}`, 'is-discount']);
    }
    rows.push([t('totals.vat', { rate: Math.round(totals.vatRate * 100) }), formatMoney(totals.vat), '']);
    rows.push([t('pq.estimated'), formatMoney(totals.total), 'is-total']);
    estimate.replaceChildren(...rows.flatMap(([label, value, cls]) => [h('dt', { class: cls }, label), h('dd', { class: cls }, value)]));
  }

  function showErrors(errors) {
    FIELDS.forEach((field) => {
      const message = $(`#pq-err-${field}`);
      message.textContent = errors[field] ? t(errors[field], { max: maxQty.toLocaleString(getLang() === 'vi' ? 'vi-VN' : 'en-US') }) : '';
      form.elements[field].setAttribute('aria-invalid', String(Boolean(errors[field])));
    });
  }

  qtyInput.max = maxQty;
  qtyInput.addEventListener('input', renderEstimate);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (data.website) { dialog.close(); return; } // honeypot field was filled in: a bot
    const errors = validateProductQuote(data, maxQty);
    showErrors(errors);
    const firstInvalid = FIELDS.find((field) => errors[field]);
    if (firstInvalid) { form.elements[firstInvalid].focus(); return; }

    const qty = Number(data.qty);
    const quote = buildQuote({
      type: 'product',
      customer: data,
      interest: product.category,
      message: data.message ?? '',
      items: [{ id: product.id, sku: product.sku, name: product.name, price: product.price, qty }],
      totals: calcQuote([{ price: product.price, qty }], pricing),
      product: { id: product.id, sku: product.sku, name: product.name, price: product.price, factoryMoq: product.moq },
      customerMoq: qty,
      lang: getLang(),
    });
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    const status = await submitQuote(quote);
    submit.disabled = false;
    dialog.close();
    toast(t(`toast.quote.${status}`, { id: quote.id }));
  });

  onLangChange(() => { renderSummary(); renderEstimate(); showErrors({}); });

  return {
    open(chosen) {
      product = chosen;
      form.reset();
      qtyInput.value = chosen.moq;
      showErrors({});
      renderSummary();
      renderEstimate();
      dialog.showModal();
      form.elements.name.focus();
    },
  };
}
