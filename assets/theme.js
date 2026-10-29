(function () {
  'use strict';
  var theme = 'dark';
  try {
    var saved = localStorage.getItem('haking-tradecalc-theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch (error) {
    // Keep the dark default when browser storage is unavailable.
  }
  document.documentElement.dataset.theme = theme;
})();
