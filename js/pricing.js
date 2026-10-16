// Pure pricing functions: no DOM, no storage, so they are easy to test.
// All money values are whole VND.

// toPrecision(12) removes floating-point noise (e.g. 14662499.999999998) before rounding
export const roundVnd = (value) => Math.round(Number(value.toPrecision(12)));

/** Highest discount rate whose minimum quantity has been reached. */
export function volumeRate(totalQty, tiers) {
  return tiers
    .filter((tier) => totalQty >= tier.minQty)
    .reduce((best, tier) => Math.max(best, tier.rate), 0);
}

export function findCoupon(code, coupons) {
  const normalized = String(code ?? '').trim().toUpperCase();
  return coupons.find((coupon) => coupon.code === normalized) ?? null;
}

/**
 * Totals for a list of { price, qty } lines.
 * Order: volume discount -> coupon (on the discounted amount) -> VAT on what is left.
 */
export function calcQuote(items, config, couponCode = '') {
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const volumeRateApplied = volumeRate(totalQty, config.volumeDiscounts);
  const volumeDiscount = roundVnd(subtotal * volumeRateApplied);
  const afterVolume = subtotal - volumeDiscount;

  const coupon = findCoupon(couponCode, config.coupons);
  let couponStatus = couponCode ? 'invalid' : 'none';
  let couponDiscount = 0;
  if (coupon) {
    if (subtotal >= coupon.minSubtotal && subtotal > 0) {
      couponStatus = 'applied';
      couponDiscount = roundVnd(afterVolume * coupon.rate);
    } else {
      couponStatus = 'minimum';
    }
  }

  const taxable = afterVolume - couponDiscount;
  const vat = roundVnd(taxable * config.vatRate);

  return {
    totalQty, subtotal, volumeRate: volumeRateApplied, volumeDiscount,
    coupon, couponStatus, couponDiscount, taxable, vatRate: config.vatRate, vat, total: taxable + vat,
  };
}

/** Unit price (rounded to the nearest 1,000 VND) and lead time for a configured piece. */
export function estimateUnit(estimator, selection) {
  const type = estimator.types[selection.type];
  const material = estimator.materials[selection.material];
  const size = estimator.sizes[selection.size];
  const finish = estimator.finishes[selection.finish];
  const raw = type.base * material.multiplier * size.multiplier + finish.fee;
  return {
    unitPrice: roundVnd(roundVnd(raw) / 1000) * 1000,
    leadDays: type.days + material.days + size.days + finish.days,
  };
}

/** Does the customer's quantity reach the factory's minimum order quantity? */
export const meetsMoq = (qty, factoryMoq) => qty >= factoryMoq;
