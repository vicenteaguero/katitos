/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** 'local' = dev auto-login + user switcher; 'prod' = real login screen. */
  readonly VITE_AUTH_MODE: 'local' | 'prod';
  /** VAPID public key for web-push subscription. */
  readonly VITE_VAPID_PUBLIC_KEY: string;
  /** Seeded local credentials (only read when VITE_AUTH_MODE === 'local'). */
  readonly VITE_DEV_USER_A_EMAIL?: string;
  readonly VITE_DEV_USER_A_PASSWORD?: string;
  readonly VITE_DEV_USER_B_EMAIL?: string;
  readonly VITE_DEV_USER_B_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
