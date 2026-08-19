import { describe, expect, it } from 'vitest';
import { extForMime } from './use-audio-recorder';

/**
 * The whole cross-device audio bug lived in this one mapping.
 *
 * A clip recorded on her iPhone is AAC in an MP4 container; the old code saved
 * every recording as `.webm` and served it as `audio/webm`, so nothing she said
 * would play on his phone. These cases are the ones that actually occur.
 */
describe('extForMime', () => {
  it('gives WebM its own extension', () => {
    expect(extForMime('audio/webm')).toBe('webm');
  });

  it('ignores the codecs suffix browsers append', () => {
    expect(extForMime('audio/webm;codecs=opus')).toBe('webm');
    expect(extForMime('audio/mp4;codecs=mp4a.40.2')).toBe('m4a');
  });

  it('maps every shape of iOS recording to m4a', () => {
    // Safari reports these three for what is the same AAC-in-MP4 file.
    expect(extForMime('audio/mp4')).toBe('m4a');
    expect(extForMime('audio/aac')).toBe('m4a');
    expect(extForMime('audio/x-m4a')).toBe('m4a');
  });

  it('handles ogg and wav', () => {
    expect(extForMime('audio/ogg;codecs=opus')).toBe('ogg');
    expect(extForMime('audio/wav')).toBe('wav');
    expect(extForMime('audio/wave')).toBe('wav');
  });

  it('is not fooled by case or padding', () => {
    expect(extForMime('AUDIO/MP4')).toBe('m4a');
    expect(extForMime('  audio/webm ; codecs=opus')).toBe('webm');
  });

  it('falls back to webm rather than producing an empty extension', () => {
    // A path with no extension is worse than a wrong one: it breaks the URL.
    expect(extForMime('')).toBe('webm');
    expect(extForMime('application/octet-stream')).toBe('webm');
  });
});
