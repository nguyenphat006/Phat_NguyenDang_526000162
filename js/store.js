// Thin wrapper around localStorage that always stores JSON and never throws.

(function (E) {
  'use strict';

  const NAMESPACE = 'ericss:';

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(NAMESPACE + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      return fallback; // storage blocked, or the stored text is not valid JSON
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(NAMESPACE + key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(NAMESPACE + key);
    } catch (error) { /* ignore */ }
  }

  E.store = { read, write, remove };
})(window.Ericss = window.Ericss || {});
