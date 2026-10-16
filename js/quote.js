// Contact page: validated quote form, request history (JSON export / import) and Google Sheet sync status.
import { loadJSON } from './api.js';
import { getLang, onLangChange, t } from './lang.js';
import { buildQuote, getQuotes, onQuotesChange, replaceQuotes, submitQuote, syncPending, syncQuote } from './quotes.js';
import { $, downloadJSON, formatDate, formatMoney, h, toast } from './ui.js';
import { isQuoteRecord, validateQuote } from './validation.js';

const FIELDS = ['name', 'email', 'phone', 'message'];

export async function initQuote(cart) {
  const form = $('#quote-form');
  if (!form) return;
  const list = $('#quote-history');
  const empty = $('#history-empty');
  const attach = $('#attach-cart');
  const attachLabel = $('#attach-label');
  const importInput = $('#import-file');
  const notice = $('#sheet-notice');
  const config = await loadJSON('data/config.json').catch(() => ({}));
  notice.hidden = Boolean(config.sheetEndpoint);

  function showErrors(errors) {
    FIELDS.forEach((field) => {
      const message = $(`#err-${field}`);
      message.textContent = errors[field] ? t(errors[field]) : '';
      form.elements[field].setAttribute('aria-invalid', String(Boolean(errors[field])));
    });
  }

  function renderAttach() {
    const count = cart.count();
    attach.disabled = count === 0;
    if (count === 0) attach.checked = false;
    attachLabel.textContent = count === 0 ? t('form.attachEmpty') : t('form.attach', { n: count });
  }

  function renderHistory() {
    const quotes = getQuotes();
    empty.hidden = quotes.length > 0;
    list.replaceChildren(...quotes.map((quote) => {
      const pieces = quote.items.reduce((sum, item) => sum + item.qty, 0);
      return h('li', { class: 'history__item', dataset: { id: quote.id } },
        h('div', {},
          h('strong', {}, quote.id),
          h('span', {}, ` · ${formatDate(quote.createdAt)}`),
          h('p', {}, `${t(`history.type.${quote.type ?? 'contact'}`)} · ${quote.customer.name} · ${t('history.items', { n: pieces })} · ${formatMoney(quote.totals.total)}`)),
        h('p', { class: 'history__side' },
          h('span', { class: `badge badge--${quote.sync ?? 'pending'}` }, t(`sync.${quote.sync ?? 'pending'}`)),
          quote.sync === 'sent' ? null : h('button', { type: 'button', class: 'link-btn', 'data-action': 'retry' }, t('history.retry')),
          h('button', { type: 'button', class: 'link-btn', 'data-action': 'delete', 'aria-label': `${t('history.delete')} ${quote.id}` }, t('history.delete'))));
    }));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (data.website) { form.reset(); return; } // honeypot field was filled in: a bot
    const errors = validateQuote(data);
    showErrors(errors);
    const firstInvalid = FIELDS.find((field) => errors[field]);
    if (firstInvalid) { form.elements[firstInvalid].focus(); return; }

    const withCart = attach.checked && cart.count() > 0;
    const quote = buildQuote({
      type: withCart ? 'cart' : 'contact',
      customer: data,
      interest: data.interest,
      message: data.message,
      items: withCart ? cart.items.map(({ id, sku, name, price, qty }) => ({ id, sku, name, price, qty })) : [],
      coupon: withCart ? cart.couponCode : '',
      totals: withCart ? cart.totals() : { subtotal: 0, total: 0 },
      lang: getLang(),
    });
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    const status = await submitQuote(quote);
    submit.disabled = false;
    if (withCart) cart.clear();
    form.reset();
    showErrors({});
    toast(t(`toast.quote.${status}`, { id: quote.id }));
  });

  // Clear an error as soon as the user fixes the field
  form.addEventListener('input', (event) => {
    if (!FIELDS.includes(event.target.name)) return;
    if (!validateQuote(Object.fromEntries(new FormData(form)))[event.target.name]) {
      $(`#err-${event.target.name}`).textContent = '';
      event.target.setAttribute('aria-invalid', 'false');
    }
  });

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.closest('li').dataset.id;
    if (button.dataset.action === 'delete') {
      replaceQuotes(getQuotes().filter((quote) => quote.id !== id));
    } else if (button.dataset.action === 'retry') {
      button.disabled = true;
      const status = await syncQuote(id);
      toast(t(`toast.quote.${status}`, { id }));
    }
  });

  $('#history-export').addEventListener('click', () => {
    if (getQuotes().length === 0) { toast(t('history.nothing')); return; }
    downloadJSON(`ericss-quotes-${new Date().toISOString().slice(0, 10)}.json`, getQuotes());
  });
  $('#history-clear').addEventListener('click', () => {
    replaceQuotes([]);
    toast(t('history.cleared'));
  });
  $('#history-import').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const [file] = importInput.files;
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const valid = (Array.isArray(parsed) ? parsed : [parsed]).filter(isQuoteRecord);
      const known = new Set(getQuotes().map((quote) => quote.id));
      const fresh = valid.filter((quote) => !known.has(quote.id)).map((quote) => ({ ...quote, sync: 'pending' }));
      replaceQuotes([...fresh, ...getQuotes()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      toast(t('history.imported', { n: fresh.length }));
      syncPending();
    } catch (error) {
      toast(t('history.importError'));
    }
    importInput.value = '';
  });

  cart.subscribe(renderAttach);
  onQuotesChange(renderHistory);
  onLangChange(() => { renderAttach(); renderHistory(); showErrors({}); });
  renderAttach();
  renderHistory();
}
