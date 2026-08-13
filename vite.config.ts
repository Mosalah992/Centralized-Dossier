import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Matches pages_build_output_dir in wrangler.toml.
    outDir: 'dist',
    emptyOutDir: true,
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
