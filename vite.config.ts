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
        // NOT locked to portrait: she authors lessons on a tablet, and a
        // locked-portrait installed PWA simply refuses to turn.
        orientation: 'any',
        start_url: '/',
        scope: '/',
        // Long-press the icon on a phone, right-click it on a desk: straight
        // to the three places the classroom is used from.
        shortcuts: [
          {
            name: 'Language',
            url: '/language',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Practice',
            url: '/language/study',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Dictionary',
            url: '/language/dictionary',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
        // A desk window with its own controls where the platform allows it.
        display_override: ['window-controls-overlay', 'standalone'],
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
        // jpg is deliberately absent: the slate ships as webp only. The old
        // jpg lingered for the one session a pre-switch bundle might still ask
        // for it — the app now takes a new build at launch, so nobody does.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // iOS reads launch images directly at startup — no need to precache the
        // large splash PNGs into the runtime cache.
        globIgnores: [
          '**/icons/splash/**',
          // The aggregate font files reference every subset; only latin and
          // cyrillic are ever shown here. The rest stay on the server for the
          // day a Greek word turns up, instead of costing every install a
          // megabyte of Vietnamese.
          '**/*-cyrillic-ext-*',
          '**/*-latin-ext-*',
          '**/*-vietnamese-*',
          '**/*-greek*',
        ],
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
    // The reminder scheduler's timezone maths lives in supabase/functions
    // because Deno runs it, but it is plain TypeScript with no Deno in it and
    // it is the most breakable code in the app — so it is tested here with
    // everything else rather than trusted because it is hard to reach.
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'supabase/functions/**/*.{test,spec}.ts',
    ],
    exclude: ['node_modules', 'dist', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/*.d.ts'],
    },
  },
});
