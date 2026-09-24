import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@d3cloud/ui';
import { App } from './App';
import { RouterProvider } from './router';
// The display face (DI-ADR-006): Latin only, one weight, both styles, bundled
// to this origin so font-src 'self' holds.
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
  <StrictMode>
    {/* Same key as public/theme-init.js, which set data-theme before paint. */}
    <ThemeProvider storageKey="d3cloud-theme">
      <RouterProvider>
        <App />
      </RouterProvider>
    </ThemeProvider>
  </StrictMode>,
);
