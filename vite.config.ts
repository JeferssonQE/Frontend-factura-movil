import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'robots.txt'],
          manifest: {
            name: 'FactuMovil AI',
            short_name: 'FactuMovil',
            description: 'Facturación electrónica inteligente con IA',
            theme_color: '#1e293b',
            background_color: '#ffffff',
            display: 'standalone',
            scope: '/',
            start_url: '/',
            orientation: 'portrait-primary',
            icons: [
              {
                src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%231e293b" width="192" height="192"/><text x="50%" y="50%" font-size="100" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">FM</text></svg>',
                sizes: '192x192',
                type: 'image/svg+xml',
                purpose: 'any'
              },
              {
                src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="%231e293b" width="512" height="512"/><text x="50%" y="50%" font-size="280" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">FM</text></svg>',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'any'
              },
              {
                src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%231e293b" width="192" height="192" rx="45"/><text x="50%" y="50%" font-size="100" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">FM</text></svg>',
                sizes: '192x192',
                type: 'image/svg+xml',
                purpose: 'maskable'
              },
              {
                src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="%231e293b" width="512" height="512" rx="120"/><text x="50%" y="50%" font-size="280" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">FM</text></svg>',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'maskable'
              }
            ],
            categories: ['business', 'productivity'],
            screenshots: [
              {
                src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 720"><rect fill="%23f1f5f9" width="540" height="720"/><text x="50%" y="50%" font-size="60" font-weight="bold" fill="%231e293b" text-anchor="middle" dominant-baseline="central">FactuMovil</text></svg>',
                sizes: '540x720',
                type: 'image/svg+xml',
                form_factor: 'narrow'
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/api\.generativelanguage\.googleapis\.com\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'gemini-api-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 3600
                  }
                }
              },
              {
                urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'supabase-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 86400
                  }
                }
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
