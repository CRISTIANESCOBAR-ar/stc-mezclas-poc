import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'STC Mezclas — Optimizador',
        short_name: 'STC Mezclas',
        description: 'Optimizador de mezclas de algodón — STC PoC',
        theme_color: '#3730a3',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        lang: 'es',
        icons: [
          { src: 'pwa-64x64.png',           sizes: '64x64',     type: 'image/png' },
          { src: 'pwa-192x192.png',          sizes: '192x192',   type: 'image/png' },
          { src: 'pwa-512x512.png',          sizes: '512x512',   type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512',  type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Las llamadas al backend local no se cachean
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
    '/api': {
        target: 'http://127.0.0.1:3006',
        changeOrigin: true,
      },
    },
  },
});
