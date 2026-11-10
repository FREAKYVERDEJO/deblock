// Only the color preference is stored; this never reads or changes writing.
(() => {
  const root = document.documentElement;
  const key = 'deblock.theme';
  let theme = 'dark';
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch { /* The toggle still works when browser storage is unavailable. */ }
  root.dataset.theme = theme;

  document.addEventListener('DOMContentLoaded', () => {
    const options = document.querySelectorAll('[data-theme-option]');
    function render() {
      for (const option of options) {
        option.setAttribute('aria-pressed', String(option.dataset.themeOption === root.dataset.theme));
      }
    }
    for (const option of options) {
      option.addEventListener('click', () => {
        root.dataset.theme = option.dataset.themeOption;
        try { localStorage.setItem(key, root.dataset.theme); } catch { /* Optional. */ }
        render();
      });
    }
    render();
  });
})();
