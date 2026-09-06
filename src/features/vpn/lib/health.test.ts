import { describe, expect, it } from 'vitest';
import { lastSeen, uptimeText } from './health';

describe('lastSeen', () => {
  const now = Date.parse('2026-09-05T12:00:00Z');

  it('says never when it has never reported', () => {
    expect(lastSeen(null, now)).toBe('never');
  });

  it('rounds the freshest beats to "just now"', () => {
    expect(lastSeen('2026-09-05T11:59:10Z', now)).toBe('just now');
  });

  it('counts up through minutes, hours and days', () => {
    expect(lastSeen('2026-09-05T11:41:00Z', now)).toBe('19 min ago');
    expect(lastSeen('2026-09-05T07:00:00Z', now)).toBe('5 h ago');
    expect(lastSeen('2026-09-02T12:00:00Z', now)).toBe('3 d ago');
  });
});

describe('uptimeText', () => {
  it('keeps a decimal only where it carries information', () => {
    expect(uptimeText(0.9993)).toBe('99.9%');
    expect(uptimeText(0.84)).toBe('84%');
  });

  it('shows a dash rather than 0% for a server with no history', () => {
    expect(uptimeText(null)).toBe('-');
  });
});
