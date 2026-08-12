import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      // 'prompt' (not 'autoUpdate') + no skipWaiting in sw.ts → a new version
      // installs quietly and applies on the NEXT launch, instead of force-
      // reloading mid-session (which flashed multiple versions on boot).
      registerType: 'prompt',
      // Use our own service worker so we can handle web-push, extending the
      // Workbox-generated precache via injectManifest.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: 'auto',
      manifest: {
        name: 'Katitos',
        short_name: 'Katitos',
        description: 'A private space for two.',
        id: '/',
        lang: 'en',
        categories: ['lifestyle', 'social'],
        // Drives Android's toolbar (NOT the iOS standalone status bar, which
        // follows apple-mobile-web-app-status-bar-style). The iOS opaque-bar
        // culprit was the HTML <meta name="theme-color">, now removed.
        theme_color: '#100408',
        background_color: '#100408',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        // webp so the Wall's slate ships with the shell instead of being a cold
        // network fetch on every first visit to a primary tab. Workbox
        // revision-hashes each entry, so the cost is once per file change.
        // NOT jpg: the old 150 KB chalkboard.jpg has to stay on disk for the
        // one session an old bundle still asks for it, but precaching it would
        // hand every install 150 KB nobody will ever look at again.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // iOS reads launch images directly at startup — no need to precache the
        // large splash PNGs into the runtime cache.
        globIgnores: ['**/icons/splash/**'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    rollupOptions: {
      output: {
        // Split big vendors into their own chunks for better caching.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
          vendor: [
            'lucide-react',
            'luxon',
            'zod',
            'react-hook-form',
            '@use-gesture/react',
            'zustand',
            'nanoid',
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/*.d.ts'],
    },
  },
});
