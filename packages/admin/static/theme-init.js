(function () {
  var t = localStorage.getItem('wolly_theme') || 'system';
  var r = t === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : t;
  document.documentElement.dataset.theme = r;
})();
