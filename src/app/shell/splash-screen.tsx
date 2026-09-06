import { useEffect, useRef } from 'react';

/**
 * The visible splash is `#boot` in index.html - styled INLINE, so it paints
 * with zero CSS-load gap and is the ONLY loading screen (no React-rendered
 * second splash to hand off to, which was what flashed the home in between).
 *
 * This component renders nothing; it only decides WHEN to dismiss #boot: once
 * loading is done AND it's been shown long enough, fade it out and remove it.
 */
const MIN_VISIBLE_MS = 1200;
const FADE_MS = 500;

export function SplashScreen({ active }: { active: boolean }) {
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (active) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - mountedAt.current));
    const t = window.setTimeout(() => {
      const el = document.getElementById('boot');
      if (!el) return;
      el.classList.add('boot-out');
      window.setTimeout(() => el.remove(), FADE_MS);
    }, wait);
    return () => window.clearTimeout(t);
  }, [active]);

  return null;
}
