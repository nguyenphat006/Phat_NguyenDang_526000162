// Small DOM + formatting helpers shared by every feature module.
import { getLang, t } from './lang.js';

/** Build an element: h('li', { class: 'x', onClick: fn }, child, 'text') */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? '' : value);
  });
  el.append(...children.flat().filter((child) => child !== null && child !== undefined && child !== false));
  return el;
}

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function formatMoney(amount) {
  return new Intl.NumberFormat(getLang() === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso) {
  return new Intl.DateTimeFormat(getLang() === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

let toastTimer;
/** Show a short status message (the <p class="toast"> lives on every page). */
export function toast(message) {
  const el = $('.toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3200);
}

/** Save an object as a .json file download. */
export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = h('a', { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const categoryLabel = (category) => t(`cat.${category}`);
