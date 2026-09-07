import { describe, expect, it } from 'vitest';
import { answerText } from './answer-text';

describe('answerText', () => {
  it('names the chosen option in the language being taught', () => {
    expect(
      answerText(
        {
          kind: 'choice',
          answer: 'a',
          payload: {
            options: [
              { id: 'a', ru: 'Счёт, пожалуйста', en: 'The bill, please' },
              { id: 'b', ru: 'Вода' },
            ],
          },
        },
        'ru'
      )
    ).toBe('Счёт, пожалуйста');
  });

  it('lists several, and pairs, with commas', () => {
    expect(
      answerText({
        kind: 'multi',
        answer: ['a', 'c'],
        payload: {
          options: [
            { id: 'a', ru: 'да' },
            { id: 'b', ru: 'нет' },
            { id: 'c', ru: 'может' },
          ],
        },
      })
    ).toBe('да, может');
    expect(
      answerText({
        kind: 'match',
        answer: {},
        payload: { pairs: [{ left: 'счёт', right: 'the bill' }] },
      })
    ).toBe('счёт = the bill');
  });

  it('takes the first accepted ordering', () => {
    expect(
      answerText({
        kind: 'order',
        answer: [
          ['я', 'тебя', 'люблю'],
          ['я', 'люблю', 'тебя'],
        ],
        payload: {},
      })
    ).toBe('я тебя люблю');
  });

  it('shows every accepted form of a typed answer', () => {
    expect(
      answerText({
        kind: 'type',
        answer: ['спасибо', 'благодарю'],
        payload: {},
      })
    ).toBe('спасибо / благодарю');
    expect(answerText({ kind: 'speak', answer: true, payload: {} })).toBe('');
  });
});
