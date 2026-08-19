/**
 * ONE audio element for the whole app.
 *
 * A study session mounts thirty cards; thirty native `<audio controls>` meant
 * thirty media elements, thirty preloads and a screen of chrome nobody asked
 * for. Only one sound is ever playing, so only one player exists — and it
 * lives here rather than beside the component so the module stays a plain
 * module (and fast refresh keeps working).
 */
let el: HTMLAudioElement | null = null;
/** Lets the currently-playing button un-press itself when another one starts. */
let release: (() => void) | null = null;

export function sharedAudio(): HTMLAudioElement {
  if (!el) {
    el = new Audio();
    el.preload = 'none';
  }
  return el;
}

/** Take over playback, releasing whoever had it. */
export function claimAudio(onStopped: () => void): HTMLAudioElement {
  release?.();
  release = onStopped;
  return sharedAudio();
}

/** Stop whatever is playing — e.g. when a screen unmounts mid-clip. */
export function stopSharedAudio(): void {
  el?.pause();
  release?.();
  release = null;
}
