import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'public/index.html'),
        'user-portal': resolve(__dirname, 'public/user-portal.html'),
        admin: resolve(__dirname, 'public/admin-dashboard.html'),
        'card-display': resolve(__dirname, 'public/card-display.html'),
        'qr-quick': resolve(__dirname, 'public/qr-quick.html'),
      },
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
  plugins: [
    // @tailwindcss/vite disabled for now — inline <style> in unmigrated HTML
    // pages causes "Missing opening {" parse errors. CSS is handled by
    // the existing build:css script. Will re-enable after all pages migrated.
    // tailwindcss(),
  ],
  publicDir: false,
})
