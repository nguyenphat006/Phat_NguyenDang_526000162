import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { calcQuote, estimateUnit, findCoupon, volumeRate } from '../js/pricing.js';

const pricing = JSON.parse(readFileSync(new URL('../data/pricing.json', import.meta.url), 'utf8'));

test('volumeRate picks the highest tier reached', () => {
  assert.equal(volumeRate(1, pricing.volumeDiscounts), 0);
  assert.equal(volumeRate(4, pricing.volumeDiscounts), 0);
  assert.equal(volumeRate(5, pricing.volumeDiscounts), 0.03);
  assert.equal(volumeRate(10, pricing.volumeDiscounts), 0.05);
  assert.equal(volumeRate(99, pricing.volumeDiscounts), 0.08);
});

test('findCoupon ignores case and spaces', () => {
  assert.equal(findCoupon(' ericss10 ', pricing.coupons).code, 'ERICSS10');
  assert.equal(findCoupon('nope', pricing.coupons), null);
  assert.equal(findCoupon('', pricing.coupons), null);
});

test('empty cart totals zero', () => {
  const q = calcQuote([], pricing);
  assert.equal(q.total, 0);
  assert.equal(q.couponStatus, 'none');
});

test('simple order: subtotal + 10% VAT', () => {
  const q = calcQuote([{ price: 10_000_000, qty: 2 }], pricing);
  assert.equal(q.subtotal, 20_000_000);
  assert.equal(q.volumeDiscount, 0);
  assert.equal(q.vat, 2_000_000);
  assert.equal(q.total, 22_000_000);
});

test('volume discount, then coupon on the discounted amount, then VAT', () => {
  // 5 x 10,000,000 = 50,000,000 ; -3% = 48,500,000 ; ERICSS10 -10% = 43,650,000 ; VAT 4,365,000
  const q = calcQuote([{ price: 10_000_000, qty: 5 }], pricing, 'ERICSS10');
  assert.equal(q.volumeDiscount, 1_500_000);
  assert.equal(q.couponStatus, 'applied');
  assert.equal(q.couponDiscount, 4_850_000);
  assert.equal(q.taxable, 43_650_000);
  assert.equal(q.vat, 4_365_000);
  assert.equal(q.total, 48_015_000);
});

test('coupon below its minimum is reported and not applied', () => {
  const q = calcQuote([{ price: 10_000_000, qty: 1 }], pricing, 'ERICSS10');
  assert.equal(q.couponStatus, 'minimum');
  assert.equal(q.couponDiscount, 0);
  assert.equal(q.total, 11_000_000);
});

test('invalid coupon is reported', () => {
  assert.equal(calcQuote([{ price: 1_000_000, qty: 1 }], pricing, 'XXXX').couponStatus, 'invalid');
});

test('multiple lines add up', () => {
  const q = calcQuote([{ price: 6_800_000, qty: 4 }, { price: 8_900_000, qty: 1 }], pricing);
  assert.equal(q.totalQty, 5);
  assert.equal(q.subtotal, 36_100_000);
  assert.equal(q.volumeDiscount, 1_083_000); // 3%
  assert.equal(q.total, Math.round((36_100_000 - 1_083_000) * 1.1));
});

test('estimateUnit: price and lead time', () => {
  const { estimator } = pricing;
  assert.deepEqual(estimateUnit(estimator, { type: 'table', material: 'teak', size: 'm', finish: 'natural' }),
    { unitPrice: 12_600_000, leadDays: 26 });
  assert.deepEqual(estimateUnit(estimator, { type: 'chair', material: 'aluminum', size: 'l', finish: 'matte' }),
    { unitPrice: 3_600_000, leadDays: 22 });
});

test('estimateUnit rounds .5 up even with floating-point noise', () => {
  // 15,000,000 x 1.15 x 0.85 = 14,662,500 -> 14,663,000
  const r = estimateUnit(pricing.estimator, { type: 'sofa', material: 'rope', size: 's', finish: 'natural' });
  assert.equal(r.unitPrice, 14_663_000);
});
