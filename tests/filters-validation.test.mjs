import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { filterProducts, normalize } from '../js/filters.js';
import { isQuoteRecord, validateProductQuote, validateQuote } from '../js/validation.js';

const products = JSON.parse(readFileSync(new URL('../data/products.json', import.meta.url), 'utf8'));
const ids = (list) => list.map((p) => p.id);

test('seed data: 20-30 products with every field the UI needs', () => {
  assert.ok(products.length >= 20 && products.length <= 30, `got ${products.length}`);
  products.forEach((p) => {
    assert.ok(p.id && p.sku && p.category && p.image, p.id);
    assert.ok(p.name.vi && p.name.en && p.description.vi && p.description.en, p.id);
    assert.ok(Number.isInteger(p.price) && p.price > 0, p.id);
    assert.ok(Number.isInteger(p.moq) && p.moq >= 1, `${p.id} moq`);
    assert.ok(Number.isInteger(p.leadTimeDays) && p.leadTimeDays > 0, p.id);
    assert.ok(Array.isArray(p.tags), p.id);
    assert.match(p.sku, /^ERC-(TK|AL|RP|WK)-\d{3}$/, p.id);
  });
  assert.equal(new Set(ids(products)).size, products.length, 'ids are unique');
  assert.equal(new Set(products.map((p) => p.sku)).size, products.length, 'skus are unique');
  ['teak', 'aluminum', 'rope', 'wicker'].forEach((c) => assert.ok(products.some((p) => p.category === c), c));
});

test('normalize strips Vietnamese diacritics', () => {
  assert.equal(normalize('Ghế Mây Nhựa Đẹp'), 'ghe may nhua dep');
});

test('category filter agrees with a plain loop', () => {
  for (const category of ['teak', 'aluminum', 'rope', 'wicker']) {
    const expected = products.filter((p) => p.category === category).length;
    assert.equal(filterProducts(products, { category }).length, expected, category);
  }
  assert.equal(filterProducts(products, { category: 'all' }).length, products.length);
});

test('max price filter keeps only products at or under the cap', () => {
  const cap = 10_000_000;
  const list = filterProducts(products, { maxPrice: cap });
  assert.ok(list.length > 0 && list.length < products.length);
  assert.ok(list.every((p) => p.price <= cap));
  assert.equal(list.length, products.filter((p) => p.price <= cap).length);
});

test('search ignores accents and case', () => {
  const found = filterProducts(products, { query: 'DAY THUNG' });
  assert.ok(found.length >= 2);
  assert.ok(found.every((p) => /d[aâ]y th[uư]ng|rope/i.test(`${p.name.vi} ${p.description.vi} ${p.name.en}`) || p.category === 'rope'));
  assert.deepEqual(filterProducts(products, { query: 'zzz' }), []);
  assert.deepEqual(ids(filterProducts(products, { query: 'erc-wk-001' })), ['wicker-tresse-sofa']); // the SKU is searchable too
});

test('sorting', () => {
  const asc = filterProducts(products, { sort: 'price-asc' }).map((p) => p.price);
  const desc = filterProducts(products, { sort: 'price-desc' }).map((p) => p.price);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  assert.deepEqual(desc, [...desc].sort((a, b) => b - a));
  const names = filterProducts(products, { sort: 'name', lang: 'vi' }).map((p) => p.name.vi);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'vi')));
});

test('favourites only', () => {
  const list = filterProducts(products, { wishOnly: true, wishlist: new Set(['alu-luna-side']) });
  assert.deepEqual(ids(list), ['alu-luna-side']);
});

test('filters combine', () => {
  const list = filterProducts(products, { category: 'wicker', maxPrice: 20_000_000 });
  assert.ok(list.length >= 1);
  assert.ok(list.every((p) => p.category === 'wicker' && p.price <= 20_000_000));
});

test('validateQuote (contact form)', () => {
  assert.deepEqual(validateQuote({ name: 'An', email: 'an@mail.com', message: 'Tôi cần báo giá bàn ăn.' }), {});
  const errors = validateQuote({ name: ' A ', email: 'not-an-email', message: 'ngắn' });
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'message', 'name']);
  assert.equal(validateQuote({ name: 'An', email: 'an@mail.com', message: 'Tôi cần báo giá bàn ăn.', phone: '12ab' }).phone, 'err.phone');
  assert.deepEqual(validateQuote({ name: 'An', email: 'an@mail.com', message: 'Tôi cần báo giá bàn ăn.', phone: '+84 914 642 008' }), {});
});

test('validateProductQuote checks the customer MOQ', () => {
  const ok = { name: 'An', email: 'an@mail.com', qty: '50' };
  assert.deepEqual(validateProductQuote(ok), {});
  assert.equal(validateProductQuote({ ...ok, qty: '0' }).qty, 'err.qty');
  assert.equal(validateProductQuote({ ...ok, qty: '-3' }).qty, 'err.qty');
  assert.equal(validateProductQuote({ ...ok, qty: '2.5' }).qty, 'err.qty');
  assert.equal(validateProductQuote({ ...ok, qty: '' }).qty, 'err.qty');
  assert.equal(validateProductQuote({ ...ok, qty: 'abc' }).qty, 'err.qty');
  assert.equal(validateProductQuote({ ...ok, qty: '100001' }).qty, 'err.qty');
  assert.deepEqual(validateProductQuote({ ...ok, qty: '100000' }), {});
  assert.equal(validateProductQuote({ ...ok, qty: '5' }, 4).qty, 'err.qty'); // custom cap
  // the note is optional on the product form
  assert.equal(validateProductQuote(ok).message, undefined);
});

test('isQuoteRecord guards imported JSON', () => {
  const good = { id: 'Q-1', createdAt: '2026-10-16T00:00:00Z', customer: { name: 'A' }, totals: { total: 5 }, items: [] };
  assert.equal(isQuoteRecord(good), true);
  assert.equal(isQuoteRecord({ ...good, totals: { total: 'x' } }), false);
  assert.equal(isQuoteRecord(null), false);
  assert.equal(isQuoteRecord({ id: 'Q-2' }), false);
});
