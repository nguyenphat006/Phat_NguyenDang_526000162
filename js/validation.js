// Pure validation for the quote request form. Returns { field: translationKey } for each error.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateQuote({ name = '', email = '', message = '' }) {
  const errors = {};
  if (name.trim().length < 2) errors.name = 'err.name';
  if (!EMAIL.test(email.trim())) errors.email = 'err.email';
  if (message.trim().length < 10) errors.message = 'err.message';
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
