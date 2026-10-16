// Price estimator: pick type, material, size and finish; see price, lead time and add it to the quote cart.
import { MAX_QTY } from './cart.js';
import { estimateUnit, calcQuote } from './pricing.js';
import { onLangChange, pick, t } from './lang.js';
import { $, formatMoney, h, toast } from './ui.js';

const MATERIAL_IMAGE = {
  teak: 'assets/img/g-teak-table.jpg',
  aluminum: 'assets/img/cat-aluminum.jpg',
  rope: 'assets/img/cat-rope.jpg',
  wicker: 'assets/img/cat-wicker.jpg',
};

export function initEstimator(cart, pricing) {
  const form = $('#estimator-form');
  if (!form) return;
  const { estimator } = pricing;
  const fields = { type: $('#est-type'), material: $('#est-material'), size: $('#est-size'), finish: $('#est-finish') };
  const qtyInput = $('#est-qty');
  const out = {
    unit: $('#est-unit'), subtotal: $('#est-subtotal'), discount: $('#est-discount'),
    vat: $('#est-vat'), total: $('#est-total'), lead: $('#est-lead'),
  };
  const groups = { type: estimator.types, material: estimator.materials, size: estimator.sizes, finish: estimator.finishes };

  function fillOptions() {
    Object.entries(fields).forEach(([name, select]) => {
      const current = select.value;
      select.replaceChildren(...Object.entries(groups[name]).map(([key, option]) =>
        h('option', { value: key }, pick(option.label))));
      if (current) select.value = current;
    });
  }

  const selection = () => Object.fromEntries(Object.entries(fields).map(([name, select]) => [name, select.value]));
  const quantity = () => Math.max(1, Math.min(MAX_QTY, Math.round(Number(qtyInput.value) || 1)));

  function update() {
    const unit = estimateUnit(estimator, selection());
    const totals = calcQuote([{ price: unit.unitPrice, qty: quantity() }], pricing);
    out.unit.textContent = formatMoney(unit.unitPrice);
    out.subtotal.textContent = formatMoney(totals.subtotal);
    out.discount.textContent = totals.volumeDiscount > 0
      ? `− ${formatMoney(totals.volumeDiscount)} (${Math.round(totals.volumeRate * 100)}%)`
      : formatMoney(0);
    out.vat.textContent = formatMoney(totals.vat);
    out.total.textContent = formatMoney(totals.total);
    out.lead.textContent = t('days', { n: unit.leadDays });
  }

  form.addEventListener('input', update);
  form.addEventListener('change', () => { qtyInput.value = quantity(); update(); });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const pickedSel = selection();
    const unit = estimateUnit(estimator, pickedSel);
    const labelFor = (lang) => ['type', 'material', 'size', 'finish']
      .map((name) => groups[name][pickedSel[name]].label[lang]).join(' · ');
    const item = {
      id: `custom-${pickedSel.type}-${pickedSel.material}-${pickedSel.size}-${pickedSel.finish}`,
      name: { vi: `Tùy chỉnh: ${labelFor('vi')}`, en: `Custom: ${labelFor('en')}` },
      price: unit.unitPrice,
      image: MATERIAL_IMAGE[pickedSel.material],
      category: pickedSel.material,
    };
    cart.add(item, quantity());
    toast(t('toast.added', { name: pick(item.name) }));
  });

  fillOptions();
  Object.assign(fields.size, { value: 'm' }); // start from the standard size
  update();
  onLangChange(() => { fillOptions(); update(); });
}
