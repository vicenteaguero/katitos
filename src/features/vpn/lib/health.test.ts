import { describe, expect, it } from 'vitest';
import { fleetSummary, lastSeen, uptimeText } from './health';
import type { VpnServer } from '../types';

const server = (over: Partial<VpnServer>): VpnServer => ({
  id: crypto.randomUUID(),
  label: 'Helsinki',
  city: 'Helsinki',
  country: 'FI',
  role: 'primary',
  protocols: ['xhttp'],
  sort: 10,
  last_beat: new Date().toISOString(),
  alive: true,
  clients: 1,
  load1: 0.1,
  mem_pct: 20,
  uptime_24h: 1,
  uptime_7d: 1,
  ...over,
});

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
    expect(uptimeText(null)).toBe('—');
  });
});

describe('fleetSummary', () => {
  it('warns when there is no fleet at all', () => {
    expect(fleetSummary([]).tone).toBe('warn');
  });

  it('names the main server and counts the spares behind it', () => {
    const s = fleetSummary([
      server({ label: 'Helsinki', role: 'primary' }),
      server({ label: 'Casa', role: 'home' }),
    ]);
    expect(s.tone).toBe('good');
    expect(s.line).toBe('Helsinki is up · 1 spare ready');
  });

  // A live spare is still working internet, so it must not read as an outage —
  // but it is not the steady state either, and hiding that loses the one signal
  // that says "he should go look".
  it('is only a warning when the main server is the quiet one', () => {
    const s = fleetSummary([
      server({ label: 'Helsinki', role: 'primary', alive: false }),
      server({ label: 'Casa', role: 'home' }),
    ]);
    expect(s.tone).toBe('warn');
    expect(s.line).toBe('Casa is up — the main one is quiet');
  });

  it('is bad only when nothing has reported in', () => {
    const s = fleetSummary([server({ alive: false })]);
    expect(s.tone).toBe('bad');
  });
});
