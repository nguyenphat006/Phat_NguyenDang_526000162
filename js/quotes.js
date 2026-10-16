// Quote requests: building records, saving them as JSON in localStorage and syncing them to the Google Sheet.
import * as store from './store.js';
import { sendToSheet } from './sheet.js';
import { isQuoteRecord } from './validation.js';

export function newQuoteId(now = new Date(), random = Math.random()) {
  const day = now.toISOString().slice(0, 10).replaceAll('-', '');
  return `Q-${day}-${random.toString(36).slice(2, 6).toUpperCase().padEnd(4, '0')}`;
}

/**
 * Build a quote record (pure).
 * type: 'contact' (message only) | 'cart' (cart attached) | 'product' (one product + the customer's own MOQ)
 */
export function buildQuote({
  type, customer, interest = '', message = '', items = [], coupon = '', totals, product = null, customerMoq = null,
  lang = 'vi', id = newQuoteId(), createdAt = new Date().toISOString(),
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
    sync: 'pending',
  };
}

let quotes = store.read('quotes', []).filter(isQuoteRecord);
const listeners = new Set();

function commit() {
  store.write('quotes', quotes);
  listeners.forEach((listener) => listener(quotes));
}

export const getQuotes = () => quotes;
export const onQuotesChange = (listener) => listeners.add(listener);

export function replaceQuotes(next) {
  quotes = next;
  commit();
}

/** Try to send one saved quote to the Sheet and remember the outcome. */
export async function syncQuote(id) {
  const quote = quotes.find((entry) => entry.id === id);
  if (!quote) return 'missing';
  const status = await sendToSheet(quote);
  quotes = quotes.map((entry) => (entry.id === id ? { ...entry, sync: status } : entry));
  commit();
  return status;
}

/** Save locally first (so nothing is lost), then sync. Resolves to the sync status. */
export function submitQuote(record) {
  quotes = [record, ...quotes];
  commit();
  return syncQuote(record.id);
}

/** Retry everything that has not reached the Sheet yet. */
export async function syncPending() {
  const waiting = quotes.filter((entry) => entry.sync !== 'sent').map((entry) => entry.id);
  for (const id of waiting) await syncQuote(id); // one by one keeps the Apps Script lock short
}
