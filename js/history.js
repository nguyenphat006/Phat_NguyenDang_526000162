// Contact page: list of sent requests with Google Sheet sync status, retry, delete, JSON export / import.
import { loadJSON } from './api.js';
import { onLangChange, t } from './lang.js';
import { getQuotes, onQuotesChange, replaceQuotes, syncPending, syncQuote } from './quotes.js';
import { $, downloadJSON, formatDate, formatMoney, h, toast } from './ui.js';
import { isQuoteRecord } from './validation.js';

export async function initHistory() {
  const list = $('#quote-history');
  if (!list) return;
  const empty = $('#history-empty');
  const importInput = $('#import-file');
  const notice = $('#sheet-notice');
  const config = await loadJSON('data/config.json').catch(() => ({}));
  notice.hidden = Boolean(config.sheetEndpoint);

  function render() {
    const quotes = getQuotes();
    empty.hidden = quotes.length > 0;
    list.replaceChildren(...quotes.map((quote) => {
      const pieces = quote.items.reduce((sum, item) => sum + item.qty, 0);
      const what = quote.product ? `${quote.product.sku} · MOQ ${quote.customerMoq}` : t('history.items', { n: pieces });
      return h('li', { class: 'history__item', dataset: { id: quote.id } },
        h('div', {},
          h('strong', {}, quote.id),
          h('span', {}, ` · ${formatDate(quote.createdAt)}`),
          h('p', {}, `${t(`history.type.${quote.type ?? 'contact'}`)} · ${quote.customer.name} · ${what} · ${formatMoney(quote.totals.total)}`)),
        h('p', { class: 'history__side' },
          h('span', { class: `badge badge--${quote.sync ?? 'pending'}` }, t(`sync.${quote.sync ?? 'pending'}`)),
          quote.sync === 'sent' ? null : h('button', { type: 'button', class: 'link-btn', 'data-action': 'retry' }, t('history.retry')),
          h('button', { type: 'button', class: 'link-btn', 'data-action': 'delete', 'aria-label': `${t('history.delete')} ${quote.id}` }, t('history.delete'))));
    }));
  }

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

  onQuotesChange(render);
  onLangChange(render);
  render();
}
