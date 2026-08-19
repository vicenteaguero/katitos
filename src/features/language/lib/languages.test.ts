import { describe, expect, it } from 'vitest';
import { languagesOf, supportLangs } from './languages';

/**
 * Who teaches what.
 *
 * This is the fact the whole feature turns on, and it was being asked for with
 * an EN / ES switch in the top bar while the answer sat in the database the
 * whole time: she is `native_language: 'ru', learning_language: 'es'`, he is
 * the mirror of that. Getting it wrong shows her a Russian dictionary for the
 * Spanish she is learning.
 */
describe('languagesOf', () => {
  const him = { native_language: 'es', learning_language: 'ru' };
  const her = { native_language: 'ru', learning_language: 'es' };

  it('reads the couple as it actually is', () => {
    expect(languagesOf(him, her)).toEqual({ native: 'es', learning: 'ru' });
    expect(languagesOf(her, him)).toEqual({ native: 'ru', learning: 'es' });
  });

  it('falls back to the partner when nobody said what I am learning', () => {
    expect(languagesOf({ native_language: 'es' }, her).learning).toBe('ru');
  });

  it('never has you learning the language you already speak', () => {
    // A half-filled row used to be able to say native ru, learning ru.
    const confused = { native_language: 'ru', learning_language: 'ru' };
    expect(languagesOf(confused, her)).toEqual({
      native: 'ru',
      learning: 'es',
    });
  });

  it('ignores a language it does not know', () => {
    expect(
      languagesOf({ native_language: 'pt', learning_language: 'de' }, null)
    ).toEqual({ native: 'es', learning: 'ru' });
  });

  it('survives a member row that has not loaded yet', () => {
    expect(languagesOf(null, null)).toEqual({ native: 'es', learning: 'ru' });
  });
});

describe('supportLangs', () => {
  it('never offers the language being taught', () => {
    expect(supportLangs('ru', 'es')).not.toContain('ru');
    expect(supportLangs('es', 'ru')).not.toContain('es');
  });

  it('puts your own language first, then the one you share', () => {
    expect(supportLangs('ru', 'es')).toEqual(['es', 'en']);
    expect(supportLangs('es', 'ru')).toEqual(['ru', 'en']);
  });

  it('still gives two choices when your language IS the one taught', () => {
    // She opens the Russian course she wrote: Russian cannot explain itself.
    expect(supportLangs('ru', 'ru')).toEqual(['en', 'es']);
  });
});
