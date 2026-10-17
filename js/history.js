// Contact page: list of sent requests with Google Sheet sync status, retry, delete, Excel export.

(function (E) {
  'use strict';

  const { loadData } = E.api;
  const { onLangChange, t } = E.lang;
  const { getQuotes, onQuotesChange, replaceQuotes, syncPending, syncQuote } = E.quotes;
  const { $, downloadExcel, formatDate, formatMoney, h, toast } = E.ui;


  const TYPES = { contact: 'Liên hệ', cart: 'Giỏ báo giá', product: 'Sản phẩm' };

  /** One saved quote as a row with Vietnamese column names (same columns as the Google Sheet). */
  function toExcelRow(quote) {
    const product = quote.product ?? null;
    const totals = quote.totals ?? {};
    const customerMoq = quote.customerMoq ?? null;
    return {
      'Mã yêu cầu': quote.id,
      'Thời gian': formatDate(quote.createdAt),
      'Loại yêu cầu': TYPES[quote.type ?? 'contact'] ?? '',
      'Họ và tên': quote.customer.name,
      'Email': quote.customer.email ?? '',
      'Số điện thoại': quote.customer.phone ?? '',
      'Công ty': quote.customer.company ?? '',
      'Sản phẩm đặt': (quote.items ?? []).map((item) => `${item.name?.vi ?? item.id}${item.sku ? ` (${item.sku})` : ''} × ${item.qty}`).join('\n'),
      'MOQ xưởng': product?.factoryMoq ?? '',
      'MOQ khách đặt': customerMoq ?? '',
      'Đạt MOQ': product && customerMoq !== null ? (customerMoq >= product.factoryMoq ? 'Có' : 'Không') : '',
      'Tạm tính': totals.subtotal ?? 0,
      'Giảm giá': (totals.volumeDiscount ?? 0) + (totals.couponDiscount ?? 0),
      'VAT': totals.vat ?? 0,
      'Tổng cộng': totals.total ?? 0,
      'Lời nhắn': quote.customer.message ?? quote.message ?? '',
    };
  }

  async function initHistory() {
    const list = $('#quote-history');
    if (!list) return;
    const empty = $('#history-empty');
    const notice = $('#sheet-notice');
    const config = await loadData('config').catch(() => ({}));
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
            quote.sync === 'sent' || quote.sync === 'limited' ? null : h('button', { type: 'button', class: 'link-btn', 'data-action': 'retry' }, t('history.retry')),
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
      downloadExcel(`ericss-yeu-cau-bao-gia-${new Date().toISOString().slice(0, 10)}`, getQuotes().map(toExcelRow));
    });
    $('#history-clear').addEventListener('click', () => {
      replaceQuotes([]);
      toast(t('history.cleared'));
    });

    onQuotesChange(render);
    onLangChange(render);
    render();
  }

  E.history = { initHistory };
})(window.Ericss = window.Ericss || {});
