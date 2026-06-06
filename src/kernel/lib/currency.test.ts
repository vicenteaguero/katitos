import { describe, expect, it } from 'vitest';
import { convert, indexRates } from './currency';

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
