// Confirmation panel shown in place of a quote form after it has been sent.

(function (E) {
  'use strict';

  const { t } = E.lang;
  const { h } = E.ui;


  /** QuickChart draws the QR image from the text in the URL. It holds the customer's name and the request code. */
  function qrUrl(quote) {
    const text = `${quote.customer.name} · ${quote.id}`;
    return `https://quickchart.io/qr?size=240&margin=2&text=${encodeURIComponent(text)}`;
  }

  /**
   * Fill `panel` with a success message and show it.
   * status: 'sent' | 'failed' | 'disabled' (what happened with the Google Sheet) | 'full' (no slots left).
   * Accepted requests get a QR code to keep; actions: extra buttons / links.
   */
  function renderSuccess(panel, { quote, status, actions = [] }) {
    const accepted = status !== 'full';
    panel.dataset.status = status;
    panel.replaceChildren(
      h('span', { class: 'success__icon', 'aria-hidden': 'true' }),
      h('h3', {}, accepted ? t('success.title') : t('seats.full.title')),
      h('p', { class: 'success__text' }, t(`toast.quote.${status}`, { id: quote.id })),
      status === 'sent' ? h('p', { class: 'success__mail' }, t('success.email', { email: quote.customer.email })) : null,
      accepted ? h('figure', { class: 'success__qr' },
        h('img', { src: qrUrl(quote), alt: t('success.qrAlt', { name: quote.customer.name }), width: 180, height: 180 }),
        h('figcaption', {}, t('success.qrNote'))) : null,
      h('p', { class: 'success__code' }, h('span', {}, t('success.code')), h('strong', {}, quote.id)),
      h('p', { class: 'success__actions' }, ...actions));
    panel.hidden = false;
    panel.focus();
  }

  E.success = { renderSuccess };
})(window.Ericss = window.Ericss || {});
