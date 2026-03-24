import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'LoreTrack',
        short_name: 'LoreTrack',
        description: 'Voice field reporting for community workers',
        theme_color: '#1B3A4B',
        background_color: '#F5F0E8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache the app shell for offline access
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        // Don't cache API calls — handled by the upload queue instead
        navigateFallback: 'index.html',
        runtimeCaching: [],
      },
    }),
  ],
  server: {
    // Proxy API requests to the Express server in development
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
