const { defineConfig } = require('vite');
const { resolve } = require('path');

module.exports = defineConfig({
  build: {
    outDir: 'public/dist',
    rollupOptions: {
      input: {
        icons: resolve(process.cwd(), 'src/icons.js')
      },
      output: {
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash].[ext]'
      }
    },
    minify: 'esbuild',
    sourcemap: true
  },
  publicDir: false
});
