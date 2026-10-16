// Language helpers for the data-driven parts of the site (strings live in data/ui.json).
// The static header/footer are translated by script.js; both read <html lang>.
import { loadJSON } from './api.js';

let dictionary = { vi: {}, en: {} };
const listeners = new Set();

export const getLang = () => (document.documentElement.lang === 'en' ? 'en' : 'vi');

/** Translate a key; {name} placeholders are replaced from vars. */
export function t(key, vars = {}) {
  const text = dictionary[getLang()][key] ?? dictionary.vi[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

/** Pick the current language from a {vi, en} object. */
export const pick = (value) => (value && typeof value === 'object' ? value[getLang()] ?? value.vi : value);

export const onLangChange = (callback) => listeners.add(callback);

function applyStatic() {
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-t-ph]').forEach((el) => { el.placeholder = t(el.dataset.tPh); });
  document.querySelectorAll('[data-t-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.tAria)));
  const titleKey = document.documentElement.dataset.titleKey;
  if (titleKey) document.title = t(titleKey);
}

export async function initLang() {
  dictionary = await loadJSON('data/ui.json');
  applyStatic();
  document.addEventListener('ericss:lang', () => {
    applyStatic();
    listeners.forEach((callback) => callback(getLang()));
  });
}
