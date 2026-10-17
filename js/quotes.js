// Quote requests: building records, saving them as JSON in localStorage and syncing them to the Google Sheet.

(function (E) {
  'use strict';

  const store = E.store;
  const { sendToSheet } = E.sheet;
  const { isQuoteRecord } = E.validation;


  function newQuoteId(now = new Date(), random = Math.random()) {
    const day = now.toISOString().slice(0, 10).replaceAll('-', '');
    return `Q-${day}-${random.toString(36).slice(2, 6).toUpperCase().padEnd(4, '0')}`;
  }

  /**
   * Build a quote record (pure).
   * type: 'contact' (message only) | 'cart' (cart attached) | 'product' (one product + the customer's own MOQ)
   */
  function buildQuote({
    type, customer, interest = '', message = '', items = [], coupon = '', totals, product = null, customerMoq = null,
    lang = 'vi', fillMs = null, id = newQuoteId(), createdAt = new Date().toISOString(),
  }) {
    return {
      id, createdAt, type, lang,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim(),
        phone: (customer.phone ?? '').trim(),
        company: (customer.company ?? '').trim(),
      },
      interest,
      message: message.trim(),
      items,
      coupon,
      totals,
      product,
      customerMoq,
      fillMs,
      sync: 'pending',
    };
  }

  // ---------- anti-spam on this device: a pause between requests and an hourly cap ----------
  const MIN_GAP_MS = 30 * 1000;
  const MAX_PER_HOUR = 5;

  /** Pure: may a new request be sent now? `sentAt` = timestamps (ms) of earlier submissions. */
  function checkSubmitRate(sentAt, now = Date.now()) {
    const recent = sentAt.filter((time) => now - time < 3600 * 1000);
    const last = Math.max(0, ...recent);
    if (last && now - last < MIN_GAP_MS) return { ok: false, reason: 'wait', seconds: Math.ceil((MIN_GAP_MS - (now - last)) / 1000) };
    if (recent.length >= MAX_PER_HOUR) return { ok: false, reason: 'hour' };
    return { ok: true };
  }

  const canSubmit = () => checkSubmitRate(store.read('submits', []));
  function markSubmitted(now = Date.now()) {
    store.write('submits', [...store.read('submits', []).filter((time) => now - time < 3600 * 1000), now]);
  }

  let quotes = store.read('quotes', []).filter(isQuoteRecord);
  const listeners = new Set();

  function commit() {
    store.write('quotes', quotes);
    listeners.forEach((listener) => listener(quotes));
  }

  const getQuotes = () => quotes;
  const onQuotesChange = (listener) => listeners.add(listener);

  function replaceQuotes(next) {
    quotes = next;
    commit();
  }

  /** Try to send one saved quote to the Sheet and remember the outcome. */
  async function syncQuote(id) {
    const quote = quotes.find((entry) => entry.id === id);
    if (!quote) return 'missing';
    const status = await sendToSheet(quote);
    quotes = quotes.map((entry) => (entry.id === id ? { ...entry, sync: status } : entry));
    commit();
    return status;
  }

  /** Save locally first (so nothing is lost), then sync. Resolves to the sync status. */
  function submitQuote(record) {
    quotes = [record, ...quotes];
    commit();
    return syncQuote(record.id);
  }

  /** Retry everything that has not reached the Sheet yet. */
  async function syncPending() {
    const waiting = quotes.filter((entry) => entry.sync !== 'sent' && entry.sync !== 'limited').map((entry) => entry.id);
    for (const id of waiting) await syncQuote(id); // one by one keeps the Apps Script lock short
  }

  E.quotes = { newQuoteId, buildQuote, checkSubmitRate, canSubmit, markSubmitted, getQuotes, onQuotesChange, replaceQuotes, syncQuote, submitQuote, syncPending };
})(window.Ericss = window.Ericss || {});
