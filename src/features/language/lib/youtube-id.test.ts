import { describe, expect, it } from 'vitest';
import { youtubeId } from '../api/media';

/**
 * She will paste whatever the YouTube app on her phone gave her, which is a
 * `youtu.be` short link about half the time. Getting this wrong doesn't error —
 * it silently files the video as a plain "link" with no poster and no player.
 */
describe('youtubeId', () => {
  it('reads the ordinary watch URL', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ'
    );
  });

  it('reads a watch URL with other parameters in front', () => {
    expect(
      youtubeId('https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ&t=42')
    ).toBe('dQw4w9WgXcQ');
  });

  it('reads the share link the phone app produces', () => {
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ?t=30')).toBe('dQw4w9WgXcQ');
  });

  it('reads embed and shorts links', () => {
    expect(youtubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ'
    );
    expect(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ'
    );
  });

  it('accepts ids containing hyphens and underscores', () => {
    expect(youtubeId('https://youtu.be/a-B_c1D2e3F')).toBe('a-B_c1D2e3F');
  });

  it('says no to anything that is not a video, so it is filed as a link', () => {
    expect(youtubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(
      youtubeId('https://www.youtube.com/results?search_query=russian')
    ).toBeNull();
    expect(youtubeId('not a url at all')).toBeNull();
    expect(youtubeId('')).toBeNull();
  });
});
