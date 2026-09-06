import { beforeEach, describe, expect, it, vi } from 'vitest';
import { claimAudio, sharedAudio, stopSharedAudio } from './shared-audio';

/**
 * One player, handed between buttons.
 *
 * A study session shows a screenful of words, each with its own play button.
 * The rule is simple and easy to get wrong: starting one must stop whatever
 * was playing, and must tell THAT button it is no longer playing - without
 * anything reaching back and stopping the clip that just started.
 */
describe('the shared player', () => {
  beforeEach(() => {
    stopSharedAudio();
    const el = sharedAudio();
    el.pause = vi.fn();
    el.play = vi.fn().mockResolvedValue(undefined);
  });

  it('is the same element every time - one player, not thirty', () => {
    expect(sharedAudio()).toBe(sharedAudio());
  });

  it('never preloads, so a list of words costs nothing until one is tapped', () => {
    expect(sharedAudio().preload).toBe('none');
  });

  it('tells the previous owner it has lost the player', () => {
    const first = vi.fn();
    claimAudio(first);
    expect(first).not.toHaveBeenCalled();

    claimAudio(vi.fn());
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('does not tell the NEW owner to stop when it takes over', () => {
    claimAudio(vi.fn());
    const second = vi.fn();
    claimAudio(second);
    expect(second).not.toHaveBeenCalled();
  });

  it('stops whatever is playing and releases it', () => {
    const owner = vi.fn();
    const el = claimAudio(owner);
    stopSharedAudio();
    expect(el.pause).toHaveBeenCalled();
    expect(owner).toHaveBeenCalledTimes(1);
  });

  it('has nobody left to release after a stop', () => {
    const owner = vi.fn();
    claimAudio(owner);
    stopSharedAudio();
    stopSharedAudio();
    // Released once, not once per call - a second stop must not re-notify a
    // button that already knows.
    expect(owner).toHaveBeenCalledTimes(1);
  });

  it('is safe to stop when nothing was ever played', () => {
    expect(() => stopSharedAudio()).not.toThrow();
  });
});
