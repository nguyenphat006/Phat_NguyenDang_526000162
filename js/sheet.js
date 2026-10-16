// Sends quote requests to a Google Sheet through a Google Apps Script web app (see apps-script/README.md).
import { loadJSON } from './api.js';

/** Flatten a saved quote into the one-row-per-request shape the Sheet columns expect (pure). */
export function toSheetRow(quote) {
  const items = quote.items ?? [];
  const product = quote.product ?? null;
  const totals = quote.totals ?? {};
  const customerMoq = quote.customerMoq ?? null;
  return {
    id: quote.id,
    createdAt: quote.createdAt,
    type: quote.type ?? 'contact',
    lang: quote.lang ?? 'vi',
    name: quote.customer.name,
    email: quote.customer.email ?? '',
    phone: quote.customer.phone ?? '',
    company: quote.customer.company ?? '',
    interest: quote.interest ?? '',
    productSku: product?.sku ?? '',
    productName: product?.name?.vi ?? '',
    productPrice: product?.price ?? '',
    factoryMoq: product?.factoryMoq ?? '',
    customerMoq: customerMoq ?? '',
    meetsMoq: product && customerMoq !== null ? (customerMoq >= product.factoryMoq ? 'yes' : 'no') : '',
    items: items.map((item) => `${item.name?.vi ?? item.id}${item.sku ? ` (${item.sku})` : ''} × ${item.qty}`).join('; '),
    itemsJson: JSON.stringify(items),
    subtotal: totals.subtotal ?? 0,
    volumeDiscount: totals.volumeDiscount ?? 0,
    coupon: quote.coupon ?? '',
    couponDiscount: totals.couponDiscount ?? 0,
    vat: totals.vat ?? 0,
    total: totals.total ?? 0,
    message: quote.message ?? '',
  };
}

async function readConfig() {
  try {
    return await loadJSON('data/config.json');
  } catch (error) {
    return {};
  }
}

/** Resolves to 'sent' | 'failed' | 'disabled' (no endpoint configured). */
export async function sendToSheet(quote) {
  const { sheetEndpoint } = await readConfig();
  if (!sheetEndpoint) return 'disabled';

  // text/plain keeps this a "simple" request, so the browser sends no CORS preflight (Apps Script cannot answer one).
  const init = { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(toSheetRow(quote)) };
  try {
    const response = await fetch(sheetEndpoint, init);
    const reply = await response.json().catch(() => null);
    return reply && reply.ok === false ? 'failed' : 'sent';
  } catch (error) {
    // Some browsers refuse to read the redirected Apps Script reply. Send again without reading it;
    // the script ignores an id it has already stored, so this cannot create a duplicate row.
    try {
      await fetch(sheetEndpoint, { ...init, mode: 'no-cors' });
      return 'sent';
    } catch (offline) {
      return 'failed';
    }
  }
}
