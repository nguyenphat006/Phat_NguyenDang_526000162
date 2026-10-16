// Renders the quote cart dialog and the header badge. Present on every page.
import { MAX_QTY } from './cart.js';
import { onLangChange, pick, t } from './lang.js';
import { $, formatMoney, h, toast } from './ui.js';

export function initCartUI(cart) {
  const badge = $('.cart-btn__count');
  const list = $('#cart-list');
  const empty = $('#cart-empty');
  const body = $('#cart-body');
  const totalsEl = $('#cart-totals');
  const couponForm = $('#coupon-form');
  const couponInput = $('#coupon-input');
  const couponMsg = $('#coupon-msg');
  if (!list) return;

  function renderLine(item) {
    const name = pick(item.name);
    return h('li', { class: 'cart-line', dataset: { id: item.id } },
      h('img', { src: item.image, alt: '', width: 72, height: 72, loading: 'lazy' }),
      h('div', { class: 'cart-line__info' },
        h('strong', {}, name),
        h('span', {}, formatMoney(item.price)),
        h('p', { class: 'qty' },
          h('button', { type: 'button', 'data-action': 'dec', 'aria-label': `${t('cart.decrease')}: ${name}` }, '−'),
          h('input', { type: 'number', min: 1, max: MAX_QTY, value: item.qty, 'aria-label': `${t('cart.qty')}: ${name}`, 'data-action': 'qty' }),
          h('button', { type: 'button', 'data-action': 'inc', 'aria-label': `${t('cart.increase')}: ${name}` }, '+'))),
      h('div', { class: 'cart-line__side' },
        h('strong', {}, formatMoney(item.price * item.qty)),
        h('button', { type: 'button', class: 'link-btn', 'data-action': 'remove' }, t('cart.remove'))));
  }

  function renderTotals(totals) {
    const rows = [[t('totals.subtotal'), formatMoney(totals.subtotal), '']];
    if (totals.volumeDiscount > 0) {
      rows.push([t('totals.volume', { rate: Math.round(totals.volumeRate * 100) }), `− ${formatMoney(totals.volumeDiscount)}`, 'is-discount']);
    }
    if (totals.couponStatus === 'applied') {
      rows.push([t('totals.coupon', { code: totals.coupon.code }), `− ${formatMoney(totals.couponDiscount)}`, 'is-discount']);
    }
    rows.push([t('totals.vat', { rate: Math.round(totals.vatRate * 100) }), formatMoney(totals.vat), '']);
    rows.push([t('totals.total'), formatMoney(totals.total), 'is-total']);
    totalsEl.replaceChildren(...rows.flatMap(([label, value, cls]) => [
      h('dt', { class: cls }, label),
      h('dd', { class: cls }, value),
    ]));
  }

  function renderCoupon(totals) {
    const messages = {
      applied: t('coupon.applied', { code: totals.coupon?.code ?? '', rate: Math.round((totals.coupon?.rate ?? 0) * 100) }),
      invalid: t('coupon.invalid'),
      minimum: t('coupon.minimum', { amount: totals.coupon ? formatMoney(totals.coupon.minSubtotal) : '' }),
      none: '',
    };
    couponMsg.textContent = messages[totals.couponStatus];
    couponMsg.dataset.status = totals.couponStatus;
    if (document.activeElement !== couponInput) couponInput.value = cart.couponCode;
  }

  function render() {
    const count = cart.count();
    badge.textContent = count;
    badge.hidden = count === 0;
    const isEmpty = cart.items.length === 0;
    empty.hidden = !isEmpty;
    body.hidden = isEmpty;
    list.replaceChildren(...cart.items.map(renderLine));
    if (!isEmpty) {
      const totals = cart.totals();
      renderTotals(totals);
      renderCoupon(totals);
    }
  }

  // Event delegation: one listener for every line in the list
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    const line = event.target.closest('.cart-line');
    if (!button || !line) return;
    const item = cart.items.find((entry) => entry.id === line.dataset.id);
    if (!item) return;
    const actions = {
      inc: () => cart.setQty(item.id, item.qty + 1),
      dec: () => (item.qty > 1 ? cart.setQty(item.id, item.qty - 1) : cart.remove(item.id)),
      remove: () => cart.remove(item.id),
    };
    actions[button.dataset.action]?.();
  });
  list.addEventListener('change', (event) => {
    if (event.target.dataset.action !== 'qty') return;
    cart.setQty(event.target.closest('.cart-line').dataset.id, event.target.value);
  });

  couponForm.addEventListener('submit', (event) => {
    event.preventDefault();
    cart.setCoupon(couponInput.value);
  });
  $('#cart-clear').addEventListener('click', () => {
    cart.clear();
    toast(t('toast.cartCleared'));
  });

  cart.subscribe(render);
  onLangChange(render);
  render();
}
