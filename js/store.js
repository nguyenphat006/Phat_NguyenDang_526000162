// Thin wrapper around localStorage that always stores JSON and never throws.
const NAMESPACE = 'ericss:';

export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(NAMESPACE + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    return fallback; // storage blocked, or the stored text is not valid JSON
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(NAMESPACE + key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(NAMESPACE + key);
  } catch (error) { /* ignore */ }
}
