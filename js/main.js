// Entry point: every page loads this module; each feature starts only if its markup exists.
import { loadJSON } from './api.js';
import { createCart } from './cart.js';
import { initCartUI } from './cart-ui.js';
import { initCatalog } from './catalog.js';
import { initEstimator } from './estimator.js';
import { initLang } from './lang.js';
import { initQuote } from './quote.js';
import { toast } from './ui.js';

async function boot() {
  await initLang();
  const pricing = await loadJSON('data/pricing.json');
  const cart = createCart(pricing);
  initCartUI(cart);
  await initCatalog(cart);
  initEstimator(cart, pricing);
  initQuote(cart);
}

boot().catch((error) => {
  // Most common cause: the page was opened from disk (file://) so fetch() is blocked.
  console.warn('Ericss: could not start data features.', error);
  toast('Không tải được dữ liệu. Hãy mở trang qua máy chủ web (http).');
});
