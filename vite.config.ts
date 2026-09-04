// vite.config.ts

import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Sin loadEnv a proposito: solo las variables con prefijo VITE_ deben llegar al bundle.
// loadEnv(mode, '.', '') cargaba TODAS las del .env y aqui se inyectaba GEMINI_API_KEY
// en el codigo del navegador. Hoy la IA vive en el backend: la key no sale del servidor.
export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      tailwindcss(),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'logo-icon.png'],
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
              src: 'pwa-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
          categories: ['business', 'productivity'],
          screenshots: [
            {
              src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 720"><rect fill="%23f1f5f9" width="540" height="720"/><text x="50%" y="50%" font-size="60" font-weight="bold" fill="%231e293b" text-anchor="middle" dominant-baseline="central">FactuMovil</text></svg>',
              sizes: '540x720',
              type: 'image/svg+xml',
              form_factor: 'narrow',
            },
          ],
        },
        // Solo assets estaticos. El navegador ya no llama a Gemini ni a Supabase (todo
        // pasa por la API), y cachear respuestas de datos deja informacion de facturacion
        // en el dispositivo mucho despues de cerrar la sesion.
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
