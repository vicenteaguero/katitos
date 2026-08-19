import { describe, expect, it } from 'vitest';
import {
  ALL_ENTRIES,
  CHANGELOG,
  LATEST,
  LATEST_KEY,
  changelogKey,
  isAnnounced,
  type ChangelogEntry,
} from './changelog';

const entry: ChangelogEntry = {
  title: 'For the distance',
  date: '2026-08-11',
  lines: ['Our polaroid is now two polaroids', 'Albums!'],
};

describe('changelogKey', () => {
  it('is stable for identical content — an accepted modal stays accepted', () => {
    expect(changelogKey(entry)).toBe(changelogKey({ ...entry }));
  });

  it('changes when a line is edited, so the modal comes back', () => {
    const edited = {
      ...entry,
      lines: [entry.lines[0], 'Albums, one per era of ours!'],
    };
    expect(changelogKey(edited)).not.toBe(changelogKey(entry));
  });

  it('changes when a line is added', () => {
    const added = { ...entry, lines: [...entry.lines, 'And flowers'] };
    expect(changelogKey(added)).not.toBe(changelogKey(entry));
  });

  it('changes when a line is removed', () => {
    const fewer = { ...entry, lines: [entry.lines[0]] };
    expect(changelogKey(fewer)).not.toBe(changelogKey(entry));
  });

  it('changes when the title changes', () => {
    expect(changelogKey({ ...entry, title: 'Something else' })).not.toBe(
      changelogKey(entry)
    );
  });

  it('does not collide for lines that differ only in order', () => {
    const swapped = { ...entry, lines: [entry.lines[1], entry.lines[0]] };
    expect(changelogKey(swapped)).not.toBe(changelogKey(entry));
  });

  it('carries the date so keys are legible in the database', () => {
    expect(changelogKey(entry).startsWith('2026-08-11-')).toBe(true);
  });
});

describe('the changelog itself', () => {
  it('has at least one release to show her', () => {
    expect(CHANGELOG.length).toBeGreaterThan(0);
  });

  it('leads with the newest entry', () => {
    const dates = ALL_ENTRIES.map((e) => e.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(LATEST).toBe(CHANGELOG[0]);
  });

  it('exports a key matching the newest entry', () => {
    expect(LATEST_KEY).toBe(changelogKey(LATEST));
  });

  it('is written for her, not for a developer', () => {
    const jargon =
      /\b(migration|RLS|schema|refactor|typecheck|API|null|commit|deploy|query|cache)\b/i;
    for (const e of ALL_ENTRIES) {
      for (const line of e.lines) {
        expect(line, `jargon in: ${line}`).not.toMatch(jargon);
      }
    }
  });

  it('says something in every line', () => {
    for (const e of ALL_ENTRIES) {
      expect(e.lines.length).toBeGreaterThan(0);
      for (const line of e.lines)
        expect(line.trim().length).toBeGreaterThan(10);
    }
  });
});

/**
 * Shipping and announcing are two different days.
 *
 * A release can be live for her to stumble into while the occasion is still
 * being saved up. `held` is what buys that gap, and these are the three things
 * that have to hold or she gets told early: it is out of her Settings history,
 * it is not what the modal measures itself against, and un-holding it is a
 * single deletion rather than an edit that quietly changes the digest.
 */
describe('a held entry', () => {
  it('is not among the ones she can see', () => {
    expect(CHANGELOG.every((e) => !e.held)).toBe(true);
  });

  it('is never what the modal compares against', () => {
    for (const entry of ALL_ENTRIES.filter((e) => e.held)) {
      expect(changelogKey(entry)).not.toBe(LATEST_KEY);
    }
  });

  it('leaves the last announced release as the newest one shown', () => {
    expect(LATEST).toBe(ALL_ENTRIES.find((e) => !e.held));
    expect(LATEST_KEY).toBe(changelogKey(LATEST));
  });

  it('is not announced, so anything that shows itself stays hidden', () => {
    for (const held of ALL_ENTRIES.filter((e) => e.held)) {
      expect(isAnnounced(held.date)).toBe(false);
    }
    expect(isAnnounced(LATEST.date)).toBe(true);
  });

  it('becomes hers by deleting one flag, with its text untouched', () => {
    const held = { ...entry, held: true };
    const announced = { ...entry };
    expect(changelogKey(held)).toBe(changelogKey(announced));
  });
});
