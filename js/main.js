// Entry point, loaded last on every page: each feature starts only if its markup exists on that page.

(function (E) {
  'use strict';

  const { loadData } = E.api;
  const { createCart } = E.cart;
  const { initCartUI } = E.cartUi;
  const { initCatalog } = E.catalog;
  const { initEstimator } = E.estimator;
  const { initLang } = E.lang;
  const { initLanding } = E.landing;
  const { initHistory } = E.history;
  const { initQuoteForm } = E.quoteForm;
  const { syncPending } = E.quotes;

  async function boot() {
    await initLang();
    const [pricing, config] = await Promise.all([loadData('pricing'), loadData('config').catch(() => ({}))]);
    const cart = createCart(pricing);
    initCartUI(cart);
    const quoteForm = await initQuoteForm({ pricing, config, cart });
    await initCatalog(cart, { openQuote: quoteForm });
    initEstimator(cart, pricing);
    await initHistory();
    await initLanding();
    syncPending(); // quotes saved earlier but not yet in the Google Sheet (offline, or endpoint added later)
  }

  boot().catch((error) => console.warn('Ericss: could not start the data features.', error));
})(window.Ericss = window.Ericss || {});
