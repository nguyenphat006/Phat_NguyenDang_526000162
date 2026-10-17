// Language helpers for the data-driven parts of the site (strings live in data/ui.js).
// The static header/footer are translated by site.js; both read <html lang>.

(function (E) {
  'use strict';

  const { loadData } = E.api;


  let dictionary = { vi: {}, en: {} };
  const listeners = new Set();

  const getLang = () => (document.documentElement.lang === 'en' ? 'en' : 'vi');

  /** Translate a key; {name} placeholders are replaced from vars. */
  function t(key, vars = {}) {
    const text = dictionary[getLang()][key] ?? dictionary.vi[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
  }

  /** Pick the current language from a {vi, en} object. */
  const pick = (value) => (value && typeof value === 'object' ? value[getLang()] ?? value.vi : value);

  const onLangChange = (callback) => listeners.add(callback);

  function applyStatic() {
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
    document.querySelectorAll('[data-t-ph]').forEach((el) => { el.placeholder = t(el.dataset.tPh); });
    document.querySelectorAll('[data-t-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.tAria)));
    const titleKey = document.documentElement.dataset.titleKey;
    if (titleKey) document.title = t(titleKey);
  }

  async function initLang() {
    dictionary = await loadData('ui');
    applyStatic();
    document.addEventListener('ericss:lang', () => {
      applyStatic();
      listeners.forEach((callback) => callback(getLang()));
    });
  }

  E.lang = { getLang, t, pick, onLangChange, initLang };
})(window.Ericss = window.Ericss || {});
