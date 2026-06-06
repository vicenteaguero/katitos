import { defineConfig } from 'vitest/config';

// Integration tests hit the LOCAL Supabase stack (run `supabase start` first).
// Kept separate from the hermetic unit suite (vite.config.ts).
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.itest.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 20_000,
    fileParallelism: false,
    globals: true,
  },
});
