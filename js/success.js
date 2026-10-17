// Confirmation panel shown in place of a quote form after it has been sent.
import { t } from './lang.js';
import { h } from './ui.js';

/**
 * Fill `panel` with a success message and show it.
 * status: 'sent' | 'failed' | 'disabled' (what happened with the Google Sheet); actions: extra buttons / links.
 */
export function renderSuccess(panel, { quote, status, actions = [] }) {
  panel.dataset.status = status;
  panel.replaceChildren(
    h('span', { class: 'success__icon', 'aria-hidden': 'true' }),
    h('h3', {}, t('success.title')),
    h('p', { class: 'success__text' }, t(`toast.quote.${status}`, { id: quote.id })),
    h('p', { class: 'success__code' }, h('span', {}, t('success.code')), h('strong', {}, quote.id)),
    h('p', { class: 'success__actions' }, ...actions));
  panel.hidden = false;
  panel.focus();
}
