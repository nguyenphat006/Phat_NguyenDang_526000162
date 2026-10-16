// Loads JSON data files once and caches them.
const cache = new Map();

export async function loadJSON(url) {
  if (cache.has(url)) return cache.get(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const data = await response.json();
  cache.set(url, data);
  return data;
}
