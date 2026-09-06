/**
 * One microphone stream for the whole app session - the camera's twin.
 *
 * Recording a word used to call `getUserMedia({ audio: true })` and then stop
 * the tracks the moment the clip ended. On an installed PWA that is a fresh
 * permission prompt for every single recording, and building a lesson means
 * recording thirty words. Approving thirty times is not a permission model,
 * it is a punishment.
 *
 * Holding one stream means one prompt per launch instead. It is still not held
 * forever: the red pill staying lit while you write the next question would be
 * worse than the prompt, so the mic is released once nothing has used it for a
 * while, and the moment the app is backgrounded for real.
 */
let stream: MediaStream | null = null;
/** How many recorders are using it right now. */
let holders = 0;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let hiddenTimer: ReturnType<typeof setTimeout> | undefined;

/** Let go of the hardware after this long with nobody recording. */
const IDLE_MS = 120_000;
/**
 * How long the app may sit in the background before the mic is dropped.
 *
 * Not zero, and that is the point: glancing at a notification and coming
 * straight back is the single most common way to leave an app for two seconds,
 * and it used to cost another permission prompt on return.
 */
const HIDDEN_GRACE_MS = 45_000;

function stop() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

function clearTimer(t: ReturnType<typeof setTimeout> | undefined) {
  if (t) clearTimeout(t);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    clearTimer(hiddenTimer);
    hiddenTimer = undefined;
    if (document.visibilityState !== 'hidden') return;
    hiddenTimer = setTimeout(() => {
      if (holders === 0) stop();
    }, HIDDEN_GRACE_MS);
  });
  // Leaving for good is different from glancing away: let go immediately.
  window.addEventListener('pagehide', () => {
    clearTimer(idleTimer);
    clearTimer(hiddenTimer);
    stop();
  });
}

/** Borrow the microphone, prompting only if we don't already hold it. */
export async function acquireMic(): Promise<MediaStream> {
  clearTimer(idleTimer);
  idleTimer = undefined;
  holders += 1;

  const live = stream?.getAudioTracks().some((t) => t.readyState === 'live');
  if (stream && live) return stream;

  if (stream) stop();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    // Denied or unavailable - drop the hold we just took, or the count never
    // returns to zero and the stream is never released.
    holders = Math.max(0, holders - 1);
    throw e;
  }
  return stream;
}

/**
 * Give it back. The stream stays warm for a while so the next word doesn't
 * prompt again, then releases itself.
 */
export function releaseMic(): void {
  holders = Math.max(0, holders - 1);
  if (holders > 0) return;
  clearTimer(idleTimer);
  idleTimer = setTimeout(() => {
    if (holders === 0) stop();
  }, IDLE_MS);
}
