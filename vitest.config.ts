/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules', 'e2e'],
    // React and its renderer must be transformed by the same module graph.
    // Astro 7 externalises them for SSR, which leaves react-dom holding a
    // second, natively-imported copy of React whose hook dispatcher is null —
    // every hook call then fails with "Cannot read properties of null".
    server: {
      deps: { inline: ['react', 'react-dom', 'react-dom/client', '@testing-library/react'] },
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
});
