import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const backendPort = loadEnv(mode, path.resolve(__dirname, '../backend'), 'PORT').PORT || '3005';
  return {
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'STC Mezclas — Optimizador',
        short_name: 'STC Mezclas',
        description: 'Optimizador de mezclas de algodón — STC PoC',
        theme_color: '#f3f4f6',
        background_color: '#f3f4f6',
        display: 'standalone',
        start_url: '/',
        lang: 'es',
        icons: [
          { src: 'icon-192.png',         sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png',         sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    host: process.env.STC_DEV_HOST || '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.STC_API_TARGET || `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
  };
});
