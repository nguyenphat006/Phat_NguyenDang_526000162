// Gives the other modules their data tables.
// The tables live in data/*.js (plain scripts that fill Ericss.data), so no fetch() is needed
// and the site works when index.html is simply opened from disk.
(function (E) {
  'use strict';

  /** Promise of one data table: 'products' | 'pricing' | 'ui' | 'config'. */
  function loadData(name) {
    const table = E.data && E.data[name];
    return table === undefined ? Promise.reject(new Error(`data table "${name}" is missing`)) : Promise.resolve(table);
  }

  E.api = { loadData };
})(window.Ericss = window.Ericss || {});
