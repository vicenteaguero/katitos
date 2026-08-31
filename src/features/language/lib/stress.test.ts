import { describe, expect, it } from 'vitest';
import { ACUTE, stressVariants, stripStress } from './stress';

describe('stressVariants', () => {
  it('offers one spelling per vowel, and knows hers', () => {
    const { variants, answer } = stressVariants(`спаси${ACUTE}бо`);
    expect(variants).toEqual([
      `спа${ACUTE}сибо`,
      `спаси${ACUTE}бо`,
      `спасибо${ACUTE}`,
    ]);
    expect(answer).toBe(1);
  });

  it('is honest when the accent is not on a vowel', () => {
    expect(stressVariants(`сп${ACUTE}асибо`).answer).toBe(-1);
    expect(stressVariants('спасибо').answer).toBe(-1);
  });

  it('strips the mark', () => {
    expect(stripStress(`за${ACUTE}мок`)).toBe('замок');
  });
});
