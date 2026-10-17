// Pure validation for the quote forms. Each validator returns { field: translationKey } for every error.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]{8,18}$/;

function validateContact({ name = '', email = '', phone = '' }) {
  const errors = {};
  if (name.trim().length < 2) errors.name = 'err.name';
  if (!EMAIL.test(email.trim())) errors.email = 'err.email';
  if (phone.trim() && !PHONE.test(phone.trim())) errors.phone = 'err.phone';
  return errors;
}

/** Contact page form: the message is required (at least 10 characters). */
export function validateQuote(values) {
  const errors = validateContact(values);
  if ((values.message ?? '').trim().length < 10) errors.message = 'err.message';
  return errors;
}

/** Per-product quote form: the customer's own MOQ must be a whole number from 1 to maxQty. */
export function validateProductQuote(values, maxQty = 100000) {
  const errors = validateContact(values);
  const qty = Number(values.qty);
  if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) errors.qty = 'err.qty';
  return errors;
}

/**
 * The one quote form (dialog and contact page).
 * With a product the customer's MOQ is required; without one (a custom project) a message is required,
 * unless a quote cart is attached.
 */
export function validateRequest(values, { hasProduct = false, hasCart = false, maxQty = 100000 } = {}) {
  if (hasProduct) return validateProductQuote(values, maxQty);
  const errors = validateContact(values);
  if (!hasCart && (values.message ?? '').trim().length < 10) errors.message = 'err.message';
  return errors;
}

/** True for a saved quote object with the fields the history list needs. */
export function isQuoteRecord(value) {
  return Boolean(value)
    && typeof value.id === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.customer?.name === 'string'
    && Number.isFinite(value.totals?.total)
    && Array.isArray(value.items);
}
