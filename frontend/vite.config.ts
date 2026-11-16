import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Polling keeps HMR working when the source lives on a mounted volume.
    watch: { usePolling: true },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'anden-icon-96.png', 'img/**/*'],
      manifest: {
        name: 'Anden',
        short_name: 'Anden',
        description:
          'Copiloto de planificación agrícola para parcelas en Moquegua',
        theme_color: '#1B5E20',
        background_color: '#FAF7F0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Shell + catalog + read-only GETs; nothing that mutates state.
        // Precache covers dist files + includeAssets (icons and photos).
        runtimeCaching: [
          {
            // API reads: network-first with short TTL so data stays fresh
            // but still works offline. Writes (POST/PATCH/DELETE) and the
            // agent endpoints are never cached.
            urlPattern:
              /^https?:\/\/[^/]*\/api\/v1\/(catalog|parcels|comparisons|saved-plans|auth\/me)(\/.*)?$/,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-reads',
              expiration: { maxEntries: 128, maxAgeSeconds: 3600 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Irrigation is a live forecast; cache it briefly.
            urlPattern: /^https?:\/\/[^/]*\/api\/v1\/parcels\/[^/]+\/irrigation.*/,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-irrigation',
              expiration: { maxEntries: 8, maxAgeSeconds: 600 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Static assets with hashes: cache-first, immutable.
            urlPattern: /\.(?:js|css|svg|png|woff2?)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static',
              expiration: { maxEntries: 512, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
  },
} as never);
