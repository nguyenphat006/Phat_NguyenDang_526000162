// Entry point: every page loads this module; each feature starts only if its markup exists.
import { loadJSON } from './api.js';
import { createCart } from './cart.js';
import { initCartUI } from './cart-ui.js';
import { initCatalog } from './catalog.js';
import { initEstimator } from './estimator.js';
import { initLang } from './lang.js';
import { initProductQuote } from './product-quote.js';
import { initQuote } from './quote.js';
import { syncPending } from './quotes.js';
import { toast } from './ui.js';

async function boot() {
  await initLang();
  const [pricing, config] = await Promise.all([loadJSON('data/pricing.json'), loadJSON('data/config.json').catch(() => ({}))]);
  const cart = createCart(pricing);
  initCartUI(cart);
  await initCatalog(cart, { openQuote: initProductQuote(pricing, config) });
  initEstimator(cart, pricing);
  await initQuote(cart);
  document.documentElement.dataset.ready = '1';
  syncPending(); // quotes saved earlier but not yet in the Google Sheet (offline, or endpoint added later)
}

boot().catch((error) => {
  // Most common cause: the page was opened from disk (file://) so fetch() is blocked.
  console.warn('Ericss: could not start data features.', error);
  document.dispatchEvent(new CustomEvent('ericss:data-error'));
  toast('Không tải được dữ liệu. Hãy mở trang qua máy chủ web (http).');
});
