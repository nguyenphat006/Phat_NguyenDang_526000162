// Sends quote requests to a Google Sheet through a Google Apps Script web app (see apps-script/README.md).

(function (E) {
  'use strict';

  const { loadData } = E.api;


  /**
   * Flatten a saved quote into the fields the Google Sheet uses (pure).
   * The Apps Script turns them into the Vietnamese columns of the "Báo giá" table; nothing here is stored as raw JSON.
   */
  function toSheetRow(quote) {
    const items = quote.items ?? [];
    const product = quote.product ?? null;
    const totals = quote.totals ?? {};
    const customerMoq = quote.customerMoq ?? null;
    return {
      id: quote.id,
      type: quote.type ?? 'contact',
      lang: quote.lang ?? 'vi',
      name: quote.customer.name,
      email: quote.customer.email ?? '',
      phone: quote.customer.phone ?? '',
      company: quote.customer.company ?? '',
      productSku: product?.sku ?? '',
      productName: product?.name?.vi ?? '',
      factoryMoq: product?.factoryMoq ?? '',
      customerMoq: customerMoq ?? '',
      meetsMoq: product && customerMoq !== null ? (customerMoq >= product.factoryMoq ? 'yes' : 'no') : '',
      items: items.map((item) => `${item.name?.vi ?? item.id}${item.sku ? ` (${item.sku})` : ''} × ${item.qty}`).join('; '),
      subtotal: totals.subtotal ?? 0,
      volumeDiscount: totals.volumeDiscount ?? 0,
      couponDiscount: totals.couponDiscount ?? 0,
      vat: totals.vat ?? 0,
      total: totals.total ?? 0,
      message: quote.message ?? '',
    };
  }

  async function readConfig() {
    try {
      return await loadData('config');
    } catch (error) {
      return {};
    }
  }

  /**
   * How many quote slots are used. The Apps Script answers GET with { count, limit }.
   * Resolves to { count, limit, left, open } or null when unknown (no endpoint, offline).
   */
  async function getSeats() {
    const { sheetEndpoint } = await readConfig();
    if (!sheetEndpoint) return null;
    try {
      const response = await fetch(sheetEndpoint, { cache: 'no-store' });
      const reply = await response.json();
      if (reply && reply.ok && Number.isFinite(reply.count) && Number.isFinite(reply.limit)) {
        return { count: reply.count, limit: reply.limit, left: Math.max(reply.limit - reply.count, 0), open: reply.count < reply.limit };
      }
    } catch (error) { /* unknown: keep the form open, the server still enforces the limit */ }
    return null;
  }

  /** Resolves to 'sent' | 'failed' | 'disabled' (no endpoint configured) | 'full' (no slots left). */
  async function sendToSheet(quote) {
    const { sheetEndpoint } = await readConfig();
    if (!sheetEndpoint) return 'disabled';

    // text/plain keeps this a "simple" request, so the browser sends no CORS preflight (Apps Script cannot answer one).
    const init = { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(toSheetRow(quote)) };
    try {
      const response = await fetch(sheetEndpoint, init);
      const reply = await response.json().catch(() => null);
      if (reply && reply.ok === false) return reply.error === 'full' ? 'full' : 'failed';
      return 'sent';
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

  E.sheet = { toSheetRow, sendToSheet, getSeats };
})(window.Ericss = window.Ericss || {});
