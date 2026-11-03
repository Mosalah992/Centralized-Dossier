/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

import { archivesEditor } from './editor/vite-plugin-editor';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    /*
     * The Archives Editor's filesystem API. `apply: 'serve'` inside the plugin
     * means Vite never runs it during a build, so no part of it can reach
     * dist/ — the editor is dev-only by construction rather than by
     * configuration. test/bundle.test.ts asserts the same thing about the
     * built output, because a guarantee nobody checks is a guarantee that
     * quietly stops holding.
     */
    archivesEditor(ROOT),
  ],
  build: {
    // Matches pages_build_output_dir in wrangler.toml.
    outDir: 'dist',
    emptyOutDir: true,
    /*
     * Fonts are always files. Vite inlines anything under 4 KB as a data: URI,
     * which caught the small Cyrillic subsets of Pixelify Sans, and the CSP in
     * public/_headers allows fonts only from 'self', so the browser refused
     * them. test/bundle.test.ts checks no stylesheet carries a data: font.
     */
    assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
  },
  test: {
    // Other sessions' worktrees live under .claude/worktrees; their tests read
    // their own checkouts, not this one.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
  server: {
    port: 5173,
    // `npm run dev` serves the UI; `npm run pages:dev` serves /api/* from the
    // Functions on 8788. Proxying keeps the two on one origin in development,
    // exactly as they share one origin once deployed.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
      },
    },
  },
});
