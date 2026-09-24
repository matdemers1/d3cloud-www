// Apply the stored theme before first paint. A separate file rather than an
// inline <script>, because the Worker's CSP is `script-src 'self'` and blocks
// inline scripts. The line below is exactly @d3cloud/ui's
// themeBootScript('d3cloud-theme'), so it agrees with the ThemeProvider that
// takes over once React loads; src/theme.test.ts fails if they ever differ.
(function(){var p;try{p=window.localStorage.getItem("d3cloud-theme")}catch(e){}if(p!=="light"&&p!=="dark"){try{p=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}catch(e){p=null}}if(p)document.documentElement.setAttribute("data-theme",p)})();
