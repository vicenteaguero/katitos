import { useEffect } from 'react';
import type { AlbumPageWithPhotos } from '../../types';

declare global {
  interface Window {
    __albumPdf?: (opts?: { share?: boolean }) => Promise<Blob>;
  }
}

/**
 * The printed album, reachable only from a console.
 *
 * There is no button for this on purpose. It downloads every ORIGINAL in the
 * book - the opposite of what the app does the rest of the time, and the reason
 * the screen is fast - so it is not something to leave lying around next to
 * "add a photo". `import()` keeps the writer out of the bundle entirely until
 * somebody actually calls it.
 *
 *   await window.__albumPdf()             // download
 *   await window.__albumPdf({share:true}) // iOS: hand it to the share sheet
 *
 * Off unless this is a dev build, or `localStorage['katitos:pdf'] = '1'`.
 */
export function usePdfBridge(
  pages: AlbumPageWithPhotos[] | undefined,
  title: string
): void {
  useEffect(() => {
    const wanted =
      import.meta.env.DEV ||
      (typeof localStorage !== 'undefined' &&
        localStorage.getItem('katitos:pdf') === '1');
    if (!wanted || !pages?.length) return;

    window.__albumPdf = async (opts) => {
      const { exportAlbumPdf } = await import('../../lib/pdf/export-album');
      return exportAlbumPdf(pages, title, opts);
    };
    return () => {
      delete window.__albumPdf;
    };
  }, [pages, title]);
}
