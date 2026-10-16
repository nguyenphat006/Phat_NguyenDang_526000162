import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { calcQuote, meetsMoq } from '../js/pricing.js';
import { buildQuote, newQuoteId } from '../js/quotes.js';
import { toSheetRow } from '../js/sheet.js';
import { isQuoteRecord } from '../js/validation.js';

const pricing = JSON.parse(readFileSync(new URL('../data/pricing.json', import.meta.url), 'utf8'));
const products = JSON.parse(readFileSync(new URL('../data/products.json', import.meta.url), 'utf8'));
const apps = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');

test('meetsMoq compares the customer quantity with the factory MOQ', () => {
  assert.equal(meetsMoq(10, 10), true);
  assert.equal(meetsMoq(9, 10), false);
  assert.equal(meetsMoq(500, 20), true);
});

test('newQuoteId has a stable shape', () => {
  assert.match(newQuoteId(new Date('2026-10-16T05:00:00Z'), 0.123456), /^Q-20261016-[0-9A-Z]{4}$/);
  assert.match(newQuoteId(), /^Q-\d{8}-[0-9A-Z]{4}$/);
});

test('buildQuote for a product with the customer MOQ', () => {
  const product = products.find((p) => p.id === 'rope-corde-chair');
  const qty = 50;
  const quote = buildQuote({
    type: 'product',
    customer: { name: '  An Nguyen ', email: ' an@mail.com ', phone: ' 0901234567 ', company: 'ABC Hotel ' },
    interest: product.category,
    message: ' Cần giao tháng 12. ',
    items: [{ id: product.id, sku: product.sku, name: product.name, price: product.price, qty }],
    totals: calcQuote([{ price: product.price, qty }], pricing),
    product: { id: product.id, sku: product.sku, name: product.name, price: product.price, factoryMoq: product.moq },
    customerMoq: qty,
    id: 'Q-TEST-0001',
    createdAt: '2026-10-16T05:00:00.000Z',
  });
  assert.equal(quote.customer.name, 'An Nguyen');
  assert.equal(quote.customer.email, 'an@mail.com');
  assert.equal(quote.message, 'Cần giao tháng 12.');
  assert.equal(quote.sync, 'pending');
  assert.equal(quote.customerMoq, 50);
  // 50 x 6,800,000 = 340,000,000 ; -8% volume = 312,800,000 ; +10% VAT = 344,080,000
  assert.equal(quote.totals.subtotal, 340_000_000);
  assert.equal(quote.totals.volumeDiscount, 27_200_000);
  assert.equal(quote.totals.total, 344_080_000);
  assert.equal(isQuoteRecord(quote), true);
});

test('toSheetRow flattens a product quote for the Sheet', () => {
  const product = products.find((p) => p.id === 'alu-vento-chair');
  const quote = buildQuote({
    type: 'product',
    customer: { name: 'Lan', email: 'lan@mail.com' },
    items: [{ id: product.id, sku: product.sku, name: product.name, price: product.price, qty: 12 }],
    totals: calcQuote([{ price: product.price, qty: 12 }], pricing),
    product: { id: product.id, sku: product.sku, name: product.name, price: product.price, factoryMoq: product.moq },
    customerMoq: 12,
    lang: 'en',
    id: 'Q-TEST-0002',
    createdAt: '2026-10-16T05:00:00.000Z',
  });
  const row = toSheetRow(quote);
  assert.equal(row.id, 'Q-TEST-0002');
  assert.equal(row.type, 'product');
  assert.equal(row.lang, 'en');
  assert.equal(row.productSku, product.sku);
  assert.equal(row.productName, product.name.vi);
  assert.equal(row.factoryMoq, product.moq); // 30
  assert.equal(row.customerMoq, 12);
  assert.equal(row.meetsMoq, 'no'); // 12 < 30
  assert.equal(row.items, `${product.name.vi} (${product.sku}) × 12`);
  assert.deepEqual(JSON.parse(row.itemsJson)[0].qty, 12);
  assert.equal(row.total, quote.totals.total);
});

test('toSheetRow for a contact quote leaves product columns empty', () => {
  const quote = buildQuote({
    type: 'contact', customer: { name: 'Mai', email: 'mai@mail.com' }, message: 'Xin báo giá dự án khách sạn.',
    totals: { subtotal: 0, total: 0 }, id: 'Q-TEST-0003', createdAt: '2026-10-16T05:00:00.000Z',
  });
  const row = toSheetRow(quote);
  assert.equal(row.productSku, '');
  assert.equal(row.customerMoq, '');
  assert.equal(row.meetsMoq, '');
  assert.equal(row.items, '');
  assert.equal(row.message, 'Xin báo giá dự án khách sạn.');
});

test('every column the Apps Script writes exists in toSheetRow (and vice versa)', () => {
  const headers = [...apps.match(/const HEADERS = \[([\s\S]*?)\];/)[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
  const quote = buildQuote({ type: 'contact', customer: { name: 'A', email: 'a@b.co' }, totals: { total: 0 } });
  const rowKeys = Object.keys(toSheetRow(quote));
  const missingInRow = headers.filter((h) => h !== 'receivedAt' && !rowKeys.includes(h));
  const missingInSheet = rowKeys.filter((k) => !headers.includes(k));
  assert.deepEqual(missingInRow, []);
  assert.deepEqual(missingInSheet, []);
});
