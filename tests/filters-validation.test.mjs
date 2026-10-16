import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { filterProducts, normalize } from '../js/filters.js';
import { isQuoteRecord, validateQuote } from '../js/validation.js';

const products = JSON.parse(readFileSync(new URL('../data/products.json', import.meta.url), 'utf8'));
const ids = (list) => list.map((p) => p.id);

test('every product has the fields the UI needs', () => {
  products.forEach((p) => {
    assert.ok(p.id && p.category && p.image, p.id);
    assert.ok(p.name.vi && p.name.en && p.description.vi && p.description.en, p.id);
    assert.ok(Number.isInteger(p.price) && p.price > 0, p.id);
    assert.ok(Array.isArray(p.tags), p.id);
  });
  assert.equal(new Set(ids(products)).size, products.length, 'ids are unique');
});

test('normalize strips Vietnamese diacritics', () => {
  assert.equal(normalize('Ghế Mây Nhựa Đẹp'), 'ghe may nhua dep');
});

test('category filter', () => {
  assert.equal(filterProducts(products, { category: 'teak' }).length, 2);
  assert.equal(filterProducts(products, { category: 'all' }).length, products.length);
});

test('max price filter', () => {
  assert.deepEqual(ids(filterProducts(products, { maxPrice: 10_000_000, sort: 'price-asc' })), ['rope-corde-chair', 'alu-luna-side']);
});

test('search ignores accents and case', () => {
  const found = ids(filterProducts(products, { query: 'DAY THUNG', sort: 'price-asc' }));
  assert.deepEqual(found, ['rope-corde-chair', 'rope-maree-sofa']);
  assert.deepEqual(filterProducts(products, { query: 'zzz' }), []);
});

test('sorting', () => {
  assert.equal(filterProducts(products, { sort: 'price-asc' })[0].id, 'rope-corde-chair');
  assert.equal(filterProducts(products, { sort: 'price-desc' })[0].id, 'teak-sole-lounge');
});

test('favourites only', () => {
  const list = filterProducts(products, { wishOnly: true, wishlist: new Set(['alu-luna-side']) });
  assert.deepEqual(ids(list), ['alu-luna-side']);
});

test('filters combine', () => {
  const list = filterProducts(products, { category: 'wicker', maxPrice: 20_000_000 });
  assert.deepEqual(ids(list), ['wicker-noir-armchair']);
});

test('validateQuote', () => {
  assert.deepEqual(validateQuote({ name: 'An', email: 'an@mail.com', message: 'Tôi cần báo giá bàn ăn.' }), {});
  const errors = validateQuote({ name: ' A ', email: 'not-an-email', message: 'ngắn' });
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'message', 'name']);
});

test('isQuoteRecord guards imported JSON', () => {
  const good = { id: 'Q-1', createdAt: '2026-10-16T00:00:00Z', customer: { name: 'A' }, totals: { total: 5 }, items: [] };
  assert.equal(isQuoteRecord(good), true);
  assert.equal(isQuoteRecord({ ...good, totals: { total: 'x' } }), false);
  assert.equal(isQuoteRecord(null), false);
  assert.equal(isQuoteRecord({ id: 'Q-2' }), false);
});
