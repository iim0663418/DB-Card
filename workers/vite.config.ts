import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'public/dist',
    emptyOutDir: true,
    manifest: true,
    sourcemap: true,
    modulePreload: false, // Avoid data: URI that CSP blocks
    rollupOptions: {
      input: {
        icons: resolve(import.meta.dirname, 'src/icons.js'),
        'user-portal': resolve(import.meta.dirname, 'public/js/modules/main.js'),
        // 其他頁面後續加入：
        // 'admin-dashboard': resolve(import.meta.dirname, 'public/js/admin-main.js'),
      },
      output: {
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash].[ext]',
      },
    },
    minify: 'esbuild',
  },
  publicDir: false,
});
