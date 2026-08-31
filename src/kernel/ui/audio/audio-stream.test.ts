import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * One prompt per launch, not one per word.
 *
 * Recording a lesson means thirty clips in a row. The old recorder stopped the
 * microphone's tracks after every one, which on an installed PWA is a fresh
 * permission prompt each time. These tests are about the two halves of getting
 * that right: hold the stream long enough that nobody is asked twice, and let
 * go of it reliably enough that the red pill never stays lit.
 */

interface FakeTrack {
  readyState: string;
  stop: ReturnType<typeof vi.fn>;
}

function fakeStream() {
  const track: FakeTrack = {
    readyState: 'live',
    stop: vi.fn(() => {
      track.readyState = 'ended';
    }),
  };
  return {
    track,
    stream: {
      getAudioTracks: () => [track],
      getTracks: () => [track],
    } as unknown as MediaStream,
  };
}

let getUserMedia: ReturnType<typeof vi.fn>;
let made: ReturnType<typeof fakeStream>[];

async function load() {
  vi.resetModules();
  return await import('./audio-stream');
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
  made = [];
  getUserMedia = vi.fn(async () => {
    const s = fakeStream();
    made.push(s);
    return s.stream;
  });
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  setVisibility('visible');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the shared microphone', () => {
  it('asks the device once, however many words you record', async () => {
    const { acquireMic, releaseMic } = await load();
    for (let i = 0; i < 30; i++) {
      await acquireMic();
      releaseMic();
    }
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('hands the same stream to two recorders at once', async () => {
    const { acquireMic } = await load();
    expect(await acquireMic()).toBe(await acquireMic());
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('lets the microphone go once nothing has used it for a while', async () => {
    const { acquireMic, releaseMic } = await load();
    await acquireMic();
    releaseMic();
    expect(made[0].track.stop).not.toHaveBeenCalled();

    vi.advanceTimersByTime(120_000);
    expect(made[0].track.stop).toHaveBeenCalled();

    // …and the next recording is a genuinely new stream.
    await acquireMic();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('keeps holding it while a recorder is still running', async () => {
    const { acquireMic, releaseMic } = await load();
    await acquireMic();
    await acquireMic();
    releaseMic(); // one of two lets go
    vi.advanceTimersByTime(300_000);
    expect(made[0].track.stop).not.toHaveBeenCalled();

    releaseMic();
    vi.advanceTimersByTime(120_000);
    expect(made[0].track.stop).toHaveBeenCalled();
  });

  it('survives a glance at a notification', async () => {
    const { acquireMic, releaseMic } = await load();
    await acquireMic();
    releaseMic();

    setVisibility('hidden');
    vi.advanceTimersByTime(3_000);
    setVisibility('visible');
    vi.advanceTimersByTime(3_000);

    expect(made[0].track.stop).not.toHaveBeenCalled();
    await acquireMic();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('does let go if the app is left in the background', async () => {
    const { acquireMic, releaseMic } = await load();
    await acquireMic();
    releaseMic();

    setVisibility('hidden');
    vi.advanceTimersByTime(45_000);
    expect(made[0].track.stop).toHaveBeenCalled();
  });

  it('lets go at once when the page is really going away', async () => {
    const { acquireMic, releaseMic } = await load();
    await acquireMic();
    releaseMic();

    window.dispatchEvent(new Event('pagehide'));
    expect(made[0].track.stop).toHaveBeenCalled();
  });

  it('leaves no phantom holder when permission is refused', async () => {
    const { acquireMic, releaseMic } = await load();
    getUserMedia.mockRejectedValueOnce(new Error('NotAllowedError'));
    await expect(acquireMic()).rejects.toThrow();

    // A refusal must not leave the count stuck above zero, or the microphone
    // would never be released again for the rest of the session.
    await acquireMic();
    releaseMic();
    vi.advanceTimersByTime(120_000);
    expect(made[0].track.stop).toHaveBeenCalled();
  });

  it('replaces a stream the browser has already ended', async () => {
    const { acquireMic, releaseMic } = await load();
    await acquireMic();
    releaseMic();
    // iOS ends tracks on its own after an interruption (a phone call).
    made[0].track.readyState = 'ended';

    await acquireMic();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });
});
