// Apply the stored theme before first paint. A separate file rather than an
// inline <script>, because the Worker's CSP is `script-src 'self'` and blocks
// inline scripts. @d3cloud/ui keys off data-theme; with no stored choice it is
// left unset so the system follows prefers-color-scheme on its own.
(function () {
  try {
    var stored = localStorage.getItem('d3cloud-theme');
    if (stored === 'dark' || stored === 'light') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (_) {}
})();
