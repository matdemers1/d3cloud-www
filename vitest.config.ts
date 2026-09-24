import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The library's entry imports its own stylesheet, which Node cannot load;
    // bundling it through Vite turns that import into a no-op.
    server: { deps: { inline: ['@d3cloud/ui'] } },
  },
});
