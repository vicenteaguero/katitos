import { describe, expect, it } from 'vitest';
import { convert, formatAmount, indexRates } from './currency';

describe('currency.convert', () => {
  const rates = indexRates([
    { base: 'USD', quote: 'CLP', rate: 950 },
    { base: 'USD', quote: 'RUB', rate: 90 },
  ]);

  it('returns the amount for same currency', () => {
    expect(convert(5, 'USD', 'USD', rates)).toBe(5);
  });

  it('uses the direct rate', () => {
    expect(convert(2, 'USD', 'CLP', rates)).toBe(1900);
  });

  it('uses the inverse rate', () => {
    expect(convert(950, 'CLP', 'USD', rates)).toBeCloseTo(1, 5);
  });

  it('triangulates through USD', () => {
    // RUB -> CLP: 90 RUB = 1 USD = 950 CLP, so 90 RUB -> 950 CLP
    expect(convert(90, 'RUB', 'CLP', rates)).toBeCloseTo(950, 3);
  });

  it('returns null when impossible', () => {
    expect(convert(1, 'EUR', 'JPY', rates)).toBeNull();
  });
});

describe('currency.formatAmount', () => {
  it('never includes the currency code — the caller places it', () => {
    // This is the whole bug: Intl's `style: 'currency'` PREFIXED the code and
    // the UI appended it again, giving "CLP 123.4 CLP".
    expect(formatAmount(1234.5, 'CLP')).not.toMatch(/CLP/);
    expect(formatAmount(1234.5, 'USD')).not.toMatch(/USD|\$/);
  });

  it('counts CLP and RUB whole, the way they are actually spoken', () => {
    expect(formatAmount(1234.5, 'CLP')).not.toMatch(/[.,]\d\s*$/);
    expect(formatAmount(1234.5, 'RUB')).not.toMatch(/[.,]\d\s*$/);
  });

  it('keeps cents for the currencies that have them', () => {
    expect(formatAmount(12.5, 'USD')).toMatch(/12[.,]50/);
    expect(formatAmount(12.5, 'EUR')).toMatch(/12[.,]50/);
  });

  it('groups thousands so a big number stays readable', () => {
    expect(formatAmount(1234567, 'CLP')).toMatch(/\D/);
    expect(formatAmount(1234567, 'CLP').replace(/\D/g, '')).toBe('1234567');
  });

  it('falls back rather than throwing on an unknown code', () => {
    expect(() => formatAmount(10, 'ZZZ')).not.toThrow();
  });

  it('rounds instead of truncating', () => {
    expect(formatAmount(0.6, 'CLP')).toBe('1');
    expect(formatAmount(999.5, 'RUB').replace(/\D/g, '')).toBe('1000');
  });
});
