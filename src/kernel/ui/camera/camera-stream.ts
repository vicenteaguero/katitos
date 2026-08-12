type Facing = 'user' | 'environment';

/**
 * One camera stream for the whole app session.
 *
 * iOS re-prompts for permission on every fresh `getUserMedia()` in an installed
 * PWA — it does not remember the grant the way a normal tab does. The camera
 * component already reused its stream across capture/retake, but it stopped the
 * tracks when it unmounted, so closing and reopening the camera meant another
 * prompt. Taking three photos meant being asked three times.
 *
 * Keeping the stream at module level means one prompt per app launch instead.
 *
 * The stream is NOT held forever: the camera indicator staying lit while you
 * read the wall would be worse than the prompt. It is released when the app
 * goes to the background, and after a short idle once nothing is using it.
 */
let stream: MediaStream | null = null;
let facing: Facing | null = null;
/** How many camera views are open right now. */
let holders = 0;
let idleTimer: ReturnType<typeof setTimeout> | undefined;

/** Let go of the hardware after this long with nobody watching. */
const IDLE_MS = 90_000;

function stop() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  facing = null;
}

function clearIdle() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = undefined;
  }
}

/** Release as soon as the app is backgrounded — never hold the camera there. */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && holders === 0) {
      clearIdle();
      stop();
    }
  });
  window.addEventListener('pagehide', () => {
    clearIdle();
    stop();
  });
}

/**
 * Borrow the camera. Returns the shared stream, prompting only if we don't
 * already hold one facing the right way.
 */
export async function acquireCamera(want: Facing): Promise<MediaStream> {
  clearIdle();
  holders += 1;

  const live = stream?.getVideoTracks().some((t) => t.readyState === 'live');
  if (stream && live && facing === want) return stream;

  // Switching cameras genuinely needs a new stream.
  if (stream) stop();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: want },
      audio: false,
    });
  } catch (e) {
    // Denied or unavailable — drop the hold we just took, or the count never
    // returns to zero and the stream is never released.
    holders = Math.max(0, holders - 1);
    throw e;
  }
  facing = want;
  return stream;
}

/**
 * Give it back. The stream stays warm for a while so reopening the camera
 * doesn't prompt again, then releases itself.
 */
export function releaseCamera(): void {
  holders = Math.max(0, holders - 1);
  if (holders > 0) return;
  clearIdle();
  idleTimer = setTimeout(() => {
    if (holders === 0) stop();
  }, IDLE_MS);
}
