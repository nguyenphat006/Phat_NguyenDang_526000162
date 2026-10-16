// Pure search / filter / sort for the product list.

export const normalize = (text) =>
  String(text ?? '')
    .toLowerCase() // first, so that "Đ" also becomes "đ" before it is replaced
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');

const sorters = {
  default: () => 0,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  name: (a, b, lang) => a.name[lang].localeCompare(b.name[lang], lang),
};

export function filterProducts(products, { query = '', category = 'all', maxPrice = Infinity, sort = 'default', wishOnly = false, wishlist = new Set(), lang = 'vi' }) {
  const needle = normalize(query).trim();
  const searchable = (p) => normalize([p.sku, p.name.vi, p.name.en, p.description.vi, p.description.en, p.category, ...p.tags].join(' '));

  return products
    .filter((p) => category === 'all' || p.category === category)
    .filter((p) => p.price <= maxPrice)
    .filter((p) => !wishOnly || wishlist.has(p.id))
    .filter((p) => !needle || searchable(p).includes(needle))
    .sort((a, b) => (sorters[sort] ?? sorters.default)(a, b, lang));
}
