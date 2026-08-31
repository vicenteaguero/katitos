/**
 * A colour token that can take a Tailwind alpha modifier.
 *
 * A bare `var(--x)` cannot: Tailwind 3 emits NOTHING for `bg-danger/10` and
 * the class silently disappears — a wrong answer had no tint, a divider no
 * line, a ring fell back to blue. Ninety-odd usages across the app were dead.
 * `color-mix` keeps ONE source of truth — the hex stays in index.css, where
 * the raw-CSS rules already read it — and only the `/NN` forms go through it,
 * so every plain class compiles exactly as before.
 */
const token =
  (v) =>
  ({ opacityValue } = {}) =>
    opacityValue === undefined || String(opacityValue).startsWith('var(')
      ? `var(${v})`
      : `color-mix(in srgb, var(${v}) calc(${opacityValue} * 100%), transparent)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // All colors reference CSS variables (see src/index.css) so a future
      // visual redesign means editing the token file only — never components.
      colors: {
        bg: token('--color-bg'),
        surface: token('--color-surface'),
        'surface-2': token('--color-surface-2'),
        border: token('--color-border'),
        fg: token('--color-fg'),
        muted: token('--color-muted'),
        accent: token('--color-accent'),
        'accent-fg': token('--color-accent-fg'),
        danger: token('--color-danger'),
        success: token('--color-success'),
        warning: token('--color-warning'),
        // Romantic accent layer — her purple/brown + theater gilt + Chile copper.
        purple: token('--color-purple'),
        brown: token('--color-brown'),
        lapis: token('--color-lapis'),
        copper: token('--color-copper'),
        gold: token('--gold'),
      },
      borderRadius: {
        // Mixed-corner system: none = photos/heroes, DEFAULT (12px) = buttons/
        // chips/inputs, lg (20px) = cards/toasts, xl (28px) = sheet tops.
        none: '0',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        display: 'var(--font-display)',
        hand: 'var(--font-hand)',
      },
      boxShadow: {
        loge: 'var(--shadow-loge)',
        catch: 'var(--shadow-catch)',
        candle: 'var(--ring-candle)',
      },
      maxWidth: {
        app: 'var(--app-max-width)',
        // The shell's cap — the phone column, until a desk route lifts it.
        shell: 'var(--shell-max-width)',
      },
      spacing: {
        stage: 'var(--space-stage)',
        act: 'var(--space-act)',
      },
    },
  },
  plugins: [],
};
