// Contact page: validated quote request form + history stored as JSON (with export / import).
import { onLangChange, t } from './lang.js';
import * as store from './store.js';
import { $, downloadJSON, formatDate, formatMoney, h, toast } from './ui.js';
import { isQuoteRecord, validateQuote } from './validation.js';

const FIELDS = ['name', 'email', 'message'];

function newQuoteId() {
  const day = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `Q-${day}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function initQuote(cart) {
  const form = $('#quote-form');
  if (!form) return;
  const list = $('#quote-history');
  const empty = $('#history-empty');
  const attach = $('#attach-cart');
  const attachLabel = $('#attach-label');
  const importInput = $('#import-file');
  let quotes = store.read('quotes', []).filter(isQuoteRecord);

  function showErrors(errors) {
    FIELDS.forEach((field) => {
      const input = form.elements[field];
      const message = $(`#err-${field}`);
      message.textContent = errors[field] ? t(errors[field]) : '';
      input.setAttribute('aria-invalid', String(Boolean(errors[field])));
    });
  }

  function renderAttach() {
    const count = cart.count();
    attach.disabled = count === 0;
    if (count === 0) attach.checked = false;
    attachLabel.textContent = count === 0 ? t('form.attachEmpty') : t('form.attach', { n: count });
  }

  function renderHistory() {
    empty.hidden = quotes.length > 0;
    list.replaceChildren(...quotes.map((quote) => h('li', { class: 'history__item', dataset: { id: quote.id } },
      h('div', {},
        h('strong', {}, quote.id),
        h('span', {}, ` · ${formatDate(quote.createdAt)}`),
        h('p', {}, `${quote.customer.name} · ${t('history.items', { n: quote.items.reduce((sum, item) => sum + item.qty, 0) })} · ${formatMoney(quote.totals.total)}`)),
      h('button', { type: 'button', class: 'link-btn', 'data-action': 'delete', 'aria-label': `${t('history.delete')} ${quote.id}` }, t('history.delete')))));
  }

  const persist = () => { store.write('quotes', quotes); renderHistory(); };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const errors = validateQuote(data);
    showErrors(errors);
    const firstInvalid = FIELDS.find((field) => errors[field]);
    if (firstInvalid) {
      form.elements[firstInvalid].focus();
      return;
    }
    const withCart = attach.checked && cart.count() > 0;
    const quote = {
      id: newQuoteId(),
      createdAt: new Date().toISOString(),
      customer: { name: data.name.trim(), email: data.email.trim() },
      interest: data.interest,
      message: data.message.trim(),
      items: withCart ? cart.items.map(({ id, name, price, qty }) => ({ id, name, price, qty })) : [],
      coupon: withCart ? cart.couponCode : '',
      totals: withCart ? cart.totals() : { subtotal: 0, total: 0 },
    };
    quotes = [quote, ...quotes];
    persist();
    if (withCart) cart.clear();
    form.reset();
    showErrors({});
    toast(t('toast.quoteSaved', { id: quote.id }));
  });

  // Clear an error as soon as the user fixes the field
  form.addEventListener('input', (event) => {
    if (!FIELDS.includes(event.target.name)) return;
    if (!validateQuote(Object.fromEntries(new FormData(form)))[event.target.name]) {
      $(`#err-${event.target.name}`).textContent = '';
      event.target.setAttribute('aria-invalid', 'false');
    }
  });

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="delete"]');
    if (!button) return;
    const id = button.closest('li').dataset.id;
    quotes = quotes.filter((quote) => quote.id !== id);
    persist();
  });

  $('#history-export').addEventListener('click', () => {
    if (quotes.length === 0) { toast(t('history.nothing')); return; }
    downloadJSON(`ericss-quotes-${new Date().toISOString().slice(0, 10)}.json`, quotes);
  });
  $('#history-clear').addEventListener('click', () => {
    quotes = [];
    persist();
    toast(t('history.cleared'));
  });
  $('#history-import').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const [file] = importInput.files;
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const valid = (Array.isArray(parsed) ? parsed : [parsed]).filter(isQuoteRecord);
      const known = new Set(quotes.map((quote) => quote.id));
      const fresh = valid.filter((quote) => !known.has(quote.id));
      quotes = [...fresh, ...quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      persist();
      toast(t('history.imported', { n: fresh.length }));
    } catch (error) {
      toast(t('history.importError'));
    }
    importInput.value = '';
  });

  cart.subscribe(renderAttach);
  onLangChange(() => { renderAttach(); renderHistory(); showErrors({}); });
  renderAttach();
  renderHistory();
}
