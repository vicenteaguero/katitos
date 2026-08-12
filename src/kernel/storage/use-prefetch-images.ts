import { useEffect } from 'react';

/**
 * Pull a set of already-signed images into the browser cache, now.
 *
 * `loading="lazy"` is right for a long feed you might not scroll, and wrong for
 * an album you open specifically to scroll through: it makes every photo start
 * downloading only once it is nearly on screen, so scrolling is a trail of
 * blank squares.
 *
 * The proxies are ~20 KB each, so fetching a page of them up front costs a few
 * hundred KB once, and the service worker keeps them for next time. Opening the
 * album is a deliberate act — it should be paid for properly and then be fast.
 */
export function usePrefetchImages(urls: Iterable<string> | undefined): void {
  // Joined so the effect keys on the actual set, not the iterable's identity.
  const key = urls ? [...urls].join('|') : '';

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const images: HTMLImageElement[] = [];

    // After first paint: the photos on screen matter more than the ones below.
    const t = window.setTimeout(() => {
      if (cancelled) return;
      for (const url of key.split('|')) {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
        images.push(img);
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      // Dropping src lets the browser abandon anything still in flight when you
      // leave the screen straight away.
      for (const img of images) img.src = '';
    };
  }, [key]);
}
