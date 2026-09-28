// Builds the single-file preview (see scripts/inline-preview.mjs). The live site uses vite.config.js.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: false, // everything the preview needs is imported and inlined, so /public isn't copied
  build: {
    outDir: 'dist-preview',
    emptyOutDir: true,
    assetsInlineLimit: 100000000, // inline the logo picture
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { input: 'preview.html' },
  },
});
