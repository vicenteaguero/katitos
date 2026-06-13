import { defineConfig, devices } from '@playwright/test';

/**
 * E2E smoke suite. Runs the Vite dev server and drives the app in a
 * mobile-sized viewport (iPhone). Requires local Supabase to be running
 * (`supabase start`) for data-backed flows.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'iPhone 13', use: { ...devices['iPhone 13'] } },
    {
      // No built-in device entry yet — model the larger Pro Max viewport
      // (~440×956 @3x, Dynamic Island) on the iPhone 13 WebKit profile.
      name: 'iPhone 17 Pro Max',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 440, height: 956 },
        deviceScaleFactor: 3,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
