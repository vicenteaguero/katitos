/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // All colors reference CSS variables (see src/index.css) so a future
      // visual redesign means editing the token file only — never components.
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        border: 'var(--color-border)',
        fg: 'var(--color-fg)',
        muted: 'var(--color-muted)',
        accent: 'var(--color-accent)',
        'accent-fg': 'var(--color-accent-fg)',
        danger: 'var(--color-danger)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        // Romantic accent layer — her purple/brown + theater gilt + Chile copper.
        purple: 'var(--color-purple)',
        brown: 'var(--color-brown)',
        lapis: 'var(--color-lapis)',
        copper: 'var(--color-copper)',
        gold: 'var(--gold)',
      },
      borderRadius: {
        // SQUARE corners are mandatory — ornament is the gilt hairline.
        none: '0',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        display: 'var(--font-display)',
      },
      boxShadow: {
        loge: 'var(--shadow-loge)',
        catch: 'var(--shadow-catch)',
        candle: 'var(--ring-candle)',
      },
      maxWidth: {
        app: 'var(--app-max-width)',
      },
      spacing: {
        stage: 'var(--space-stage)',
        act: 'var(--space-act)',
      },
    },
  },
  plugins: [],
};
