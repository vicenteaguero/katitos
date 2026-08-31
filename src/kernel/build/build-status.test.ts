import { describe, expect, it } from 'vitest';
import {
  AUTO_UPDATE_WINDOW_MS,
  compareBuilds,
  shouldAutoUpdate,
  type BuildStamp,
} from './build-status';

const stamp = (over: Partial<BuildStamp> = {}): BuildStamp => ({
  sha: 'a'.repeat(40),
  short: 'aaaaaaa',
  ref: 'main',
  subject: 'feat(x): :sparkles: a thing',
  committedAt: '2026-08-19T11:00:00Z',
  builtAt: '2026-08-19T11:01:00Z',
  version: '1.1.0',
  env: 'production',
  dirty: false,
  ...over,
});

/**
 * The whole feature is one comparison, so it is the one thing worth pinning:
 * getting it backwards would say "you have the newest version" to a phone
 * three deploys behind, which is worse than showing nothing at all.
 */
describe('compareBuilds', () => {
  it('says current when the running build is what the server serves', () => {
    expect(compareBuilds(stamp(), stamp())).toBe('current');
  });

  it('says stale the moment the shas differ', () => {
    expect(compareBuilds(stamp(), stamp({ sha: 'b'.repeat(40) }))).toBe(
      'stale'
    );
  });

  it('compares the full sha, not the short one', () => {
    // Two commits sharing a 7-char prefix is rare but not impossible, and the
    // short form is only ever for reading aloud.
    const local = stamp({ sha: `${'c'.repeat(7)}1111`, short: 'ccccccc' });
    const server = stamp({ sha: `${'c'.repeat(7)}2222`, short: 'ccccccc' });
    expect(compareBuilds(local, server)).toBe('stale');
  });

  it('says unknown when the server could not be asked', () => {
    expect(compareBuilds(stamp(), null)).toBe('unknown');
  });

  it('says unknown rather than current when a sha is missing', () => {
    // Both 'unknown' would otherwise compare equal and claim everything is fine.
    expect(
      compareBuilds(stamp({ sha: 'unknown' }), stamp({ sha: 'unknown' }))
    ).toBe('unknown');
  });

  it('reports checking only while it has no answer yet', () => {
    expect(compareBuilds(stamp(), null, { checking: true })).toBe('checking');
    expect(compareBuilds(stamp(), stamp(), { checking: false })).toBe(
      'current'
    );
  });

  it('puts uncommitted work above everything else', () => {
    // A dirty build matches no commit, so "you are behind" is the wrong story.
    const local = stamp({ dirty: true });
    expect(compareBuilds(local, stamp({ sha: 'd'.repeat(40) }))).toBe('dirty');
    expect(compareBuilds(local, null, { checking: true })).toBe('dirty');
  });
});

/**
 * Updating without being asked.
 *
 * The danger is not being too eager, it is looping: a build that installs but
 * never takes over would reload the app forever, and on a phone that looks
 * exactly like the app being broken.
 */
describe('shouldAutoUpdate', () => {
  const server = stamp({ sha: 'b'.repeat(40) });

  it('takes a version it has not tried yet', () => {
    expect(shouldAutoUpdate('stale', server, null)).toBe(true);
  });

  it('never tries the same version twice', () => {
    expect(shouldAutoUpdate('stale', server, server.sha)).toBe(false);
  });

  it('tries again when the server moves on to another one', () => {
    expect(shouldAutoUpdate('stale', server, 'c'.repeat(40))).toBe(true);
  });

  it('does nothing while up to date, checking, or offline', () => {
    expect(shouldAutoUpdate('current', server, null)).toBe(false);
    expect(shouldAutoUpdate('checking', null, null)).toBe(false);
    expect(shouldAutoUpdate('unknown', null, null)).toBe(false);
  });

  it('leaves a build with uncommitted work alone', () => {
    // That is someone's own build in their hands; do not yank it away.
    expect(shouldAutoUpdate('dirty', server, null)).toBe(false);
  });

  it('only takes a version by itself soon after launch', () => {
    // The check re-runs whenever the app comes back to the foreground, and the
    // reload it leads to throws away whatever is being typed. A version found
    // mid-session waits for the next launch.
    expect(shouldAutoUpdate('stale', server, null, 0)).toBe(true);
    expect(shouldAutoUpdate('stale', server, null, AUTO_UPDATE_WINDOW_MS)).toBe(
      true
    );
    expect(
      shouldAutoUpdate('stale', server, null, AUTO_UPDATE_WINDOW_MS + 1)
    ).toBe(false);
    expect(shouldAutoUpdate('stale', server, null, 45 * 60_000)).toBe(false);
  });
});
