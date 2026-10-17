// Quote cart: state + persistence. The UI lives in cart-ui.js.

(function (E) {
  'use strict';

  const store = E.store;
  const { calcQuote } = E.pricing;


  const MAX_QTY = 99;

  const isValidItem = (item) =>
    item && typeof item.id === 'string' && Number.isFinite(item.price) && Number.isInteger(item.qty) && item.qty > 0;

  const clampQty = (qty) => Math.max(1, Math.min(MAX_QTY, Math.round(Number(qty) || 1)));

  function createCart(pricing) {
    let items = store.read('cart', []).filter(isValidItem);
    let couponCode = String(store.read('coupon', ''));
    const listeners = new Set();

    function commit() {
      store.write('cart', items);
      store.write('coupon', couponCode);
      listeners.forEach((listener) => listener());
    }

    return {
      get items() { return items; },
      get couponCode() { return couponCode; },
      count: () => items.reduce((sum, item) => sum + item.qty, 0),

      /** item: { id, name: {vi, en}, price, image, category } */
      add(item, qty = 1) {
        const existing = items.find((line) => line.id === item.id);
        items = existing
          ? items.map((line) => (line.id === item.id ? { ...line, qty: clampQty(line.qty + qty) } : line))
          : [...items, { ...item, qty: clampQty(qty) }];
        commit();
      },
      setQty(id, qty) {
        items = items.map((line) => (line.id === id ? { ...line, qty: clampQty(qty) } : line));
        commit();
      },
      remove(id) {
        items = items.filter((line) => line.id !== id);
        commit();
      },
      clear() {
        items = [];
        couponCode = '';
        commit();
      },
      setCoupon(code) {
        couponCode = String(code).trim().toUpperCase();
        commit();
      },
      totals: () => calcQuote(items, pricing, couponCode),
      subscribe: (listener) => listeners.add(listener),
    };
  }

  E.cart = { MAX_QTY, createCart };
})(window.Ericss = window.Ericss || {});
