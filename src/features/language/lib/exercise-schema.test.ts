import { describe, expect, it } from 'vitest';
import {
  gapCount,
  gradeAnswer,
  scrambleTokens,
  splitTemplate,
  validateExercise,
  type ExerciseLike,
} from './exercise-schema';

const ex = (kind: string, payload: unknown, answer: unknown): ExerciseLike => ({
  kind,
  payload,
  answer,
});

const OPTIONS = [
  { id: 'a', ru: 'да' },
  { id: 'b', ru: 'нет' },
];

describe('choice', () => {
  const q = ex('choice', { options: OPTIONS }, 'a');

  it('marks the right option right', () => {
    expect(gradeAnswer(q, 'a')).toEqual({ correct: true, score: 1 });
  });

  it('marks the wrong option wrong', () => {
    expect(gradeAnswer(q, 'b').correct).toBe(false);
  });

  it('marks no answer at all wrong rather than crashing', () => {
    expect(gradeAnswer(q, undefined).correct).toBe(false);
  });
});

describe('multi', () => {
  const q = ex('multi', { options: OPTIONS }, ['a', 'b']);

  it('needs every right answer and nothing else', () => {
    expect(gradeAnswer(q, ['b', 'a'])).toEqual({ correct: true, score: 1 });
  });

  it('gives half marks for half the answers', () => {
    expect(gradeAnswer(q, ['a']).score).toBeCloseTo(0.5);
  });

  it('does not reward ticking everything', () => {
    const wide = ex('multi', { options: OPTIONS }, ['a']);
    // One right, one wrong: the wrong pick cancels the right one out.
    expect(gradeAnswer(wide, ['a', 'b']).score).toBe(0);
    expect(gradeAnswer(wide, ['a', 'b']).correct).toBe(false);
  });

  it('never goes negative', () => {
    const q1 = ex('multi', { options: OPTIONS }, ['a']);
    expect(gradeAnswer(q1, ['b', 'c', 'd']).score).toBe(0);
  });
});

describe('type', () => {
  const q = ex('type', {}, 'спасибо');

  it('accepts the word', () => {
    expect(gradeAnswer(q, 'спасибо').correct).toBe(true);
  });

  it('forgives case and stray punctuation', () => {
    expect(gradeAnswer(q, ' Спасибо! ').correct).toBe(true);
  });

  it('forgives the two Russian letters that look alike', () => {
    expect(gradeAnswer(ex('type', {}, 'ещё'), 'еще').correct).toBe(true);
  });

  it('still says no to the wrong word', () => {
    expect(gradeAnswer(q, 'пожалуйста').correct).toBe(false);
  });
});

describe('a written answer with more than one right form', () => {
  it('accepts any of the forms she is willing to allow', () => {
    // Russian gives the same sentence two perfectly good shapes.
    const q = ex('type', {}, ['у меня есть сестра', 'у меня сестра']);
    expect(gradeAnswer(q, 'у меня сестра').correct).toBe(true);
    expect(gradeAnswer(q, 'у меня есть сестра').correct).toBe(true);
  });

  it('still says no to something that is not one of them', () => {
    const q = ex('type', {}, ['спасибо', 'благодарю']);
    expect(gradeAnswer(q, 'пожалуйста').correct).toBe(false);
  });

  it('forgives case and punctuation on every form, not just the first', () => {
    const q = ex('type', {}, ['спасибо', 'благодарю']);
    expect(gradeAnswer(q, ' Благодарю! ').correct).toBe(true);
  });

  it('works the same for a listening question', () => {
    const q = ex('listen', { audioPath: 'a.m4a' }, ['привет', 'здравствуй']);
    expect(gradeAnswer(q, 'Здравствуй').correct).toBe(true);
  });

  it('lets a single gap accept alternatives too', () => {
    const q = ex('complete', { template: 'Я {{1}} по-русски' }, [
      ['говорю', 'разговариваю'],
    ]);
    expect(gradeAnswer(q, ['разговариваю']).correct).toBe(true);
    expect(gradeAnswer(q, ['читаю']).correct).toBe(false);
  });

  it('refuses to save a question whose answer list is empty', () => {
    expect(validateExercise(ex('type', {}, []))).toBe('The answer is missing');
  });
});

describe('complete', () => {
  const q = ex('complete', { template: 'Я {{1}} в {{2}}' }, ['живу', 'Москве']);

  it('counts the gaps in a sentence', () => {
    expect(gapCount('Я {{1}} в {{2}}')).toBe(2);
    expect(gapCount('no gaps here')).toBe(0);
  });

  it('splits a sentence into the words around its gaps', () => {
    expect(splitTemplate('Я {{1}} в {{2}}')).toEqual(['Я ', ' в ', '']);
  });

  it('marks every gap and says which one was wrong', () => {
    const grade = gradeAnswer(q, ['живу', 'Питере']);
    expect(grade.detail).toEqual([true, false]);
    expect(grade.score).toBeCloseTo(0.5);
    expect(grade.correct).toBe(false);
  });

  it('is right only when every gap is', () => {
    expect(gradeAnswer(q, ['живу', 'москве']).correct).toBe(true);
  });

  it('treats a skipped gap as wrong, not as a crash', () => {
    expect(gradeAnswer(q, ['живу']).detail).toEqual([true, false]);
  });
});

describe('order', () => {
  const q = ex('order', { tokens: ['я', 'тебя', 'люблю'] }, [
    'я',
    'тебя',
    'люблю',
  ]);

  it('accepts the right order', () => {
    expect(gradeAnswer(q, ['я', 'тебя', 'люблю']).correct).toBe(true);
  });

  it('rejects the wrong order but says how close it was', () => {
    const grade = gradeAnswer(q, ['я', 'люблю', 'тебя']);
    expect(grade.correct).toBe(false);
    expect(grade.score).toBeCloseTo(1 / 3);
  });

  it('does not call a half-finished answer correct', () => {
    expect(gradeAnswer(q, ['я', 'тебя']).correct).toBe(false);
  });
});

describe('match', () => {
  const q = ex(
    'match',
    {
      pairs: [
        { left: 'вода', right: 'water' },
        { left: 'хлеб', right: 'bread' },
      ],
    },
    { вода: 'water', хлеб: 'bread' }
  );

  it('needs every pair joined correctly', () => {
    expect(gradeAnswer(q, { вода: 'water', хлеб: 'bread' }).correct).toBe(true);
  });

  it('gives credit for the pairs that are right', () => {
    const grade = gradeAnswer(q, { вода: 'water', хлеб: 'water' });
    expect(grade.correct).toBe(false);
    expect(grade.score).toBeCloseTo(0.5);
  });

  it('handles nothing joined at all', () => {
    expect(gradeAnswer(q, {}).score).toBe(0);
  });
});

describe('listen and speak', () => {
  it('listen is marked like typing', () => {
    const q = ex('listen', { audioPath: 'a.webm' }, 'привет');
    expect(gradeAnswer(q, 'Привет').correct).toBe(true);
  });

  it('speak is marked by the person speaking', () => {
    const q = ex('speak', {}, null);
    expect(gradeAnswer(q, true).correct).toBe(true);
    expect(gradeAnswer(q, false).correct).toBe(false);
  });
});

describe('scrambleTokens', () => {
  it('never shows the words in the answer’s own order', () => {
    const answer = ['я', 'тебя', 'очень', 'люблю'];
    expect(scrambleTokens(answer)).not.toEqual(answer);
  });

  it('keeps every word exactly once', () => {
    const answer = ['я', 'тебя', 'очень', 'люблю'];
    expect([...scrambleTokens(answer)].sort()).toEqual([...answer].sort());
  });

  it('swaps a two-word sentence rather than leaving it alone', () => {
    expect(scrambleTokens(['спасибо', 'большое'])).not.toEqual([
      'спасибо',
      'большое',
    ]);
  });

  it('is the same jumble every time, so it cannot reshuffle mid-answer', () => {
    const answer = ['a', 'b', 'c', 'd', 'e'];
    expect(scrambleTokens(answer)).toEqual(scrambleTokens(answer));
  });

  it('copes with one word and with none', () => {
    expect(scrambleTokens(['да'])).toEqual(['да']);
    expect(scrambleTokens([])).toEqual([]);
  });

  it('handles repeated words without losing one', () => {
    const answer = ['и', 'я', 'и', 'ты'];
    expect([...scrambleTokens(answer)].sort()).toEqual([...answer].sort());
  });
});

describe('validateExercise', () => {
  it('passes a well-formed question', () => {
    expect(
      validateExercise(ex('choice', { options: OPTIONS }, 'a'))
    ).toBeNull();
  });

  it('catches a choice with only one option', () => {
    expect(validateExercise(ex('choice', { options: [OPTIONS[0]] }, 'a'))).toBe(
      'The question is incomplete'
    );
  });

  it('catches a question with no answer stored', () => {
    expect(validateExercise(ex('choice', { options: OPTIONS }, null))).toBe(
      'The answer is missing'
    );
  });

  it('catches a sentence with more gaps than answers', () => {
    expect(
      validateExercise(ex('complete', { template: '{{1}} и {{2}}' }, ['да']))
    ).toBe('There is not one answer per gap');
  });

  it('refuses a choose-several with nothing marked correct', () => {
    expect(validateExercise(ex('multi', { options: OPTIONS }, []))).toBe(
      'The answer is missing'
    );
  });

  it('refuses a typing question with a blank answer', () => {
    expect(validateExercise(ex('type', {}, ''))).toBe('The answer is missing');
  });

  it('refuses a listening question with nothing to listen to', () => {
    expect(validateExercise(ex('listen', { audioPath: null }, 'привет'))).toBe(
      'The question is incomplete'
    );
    expect(
      validateExercise(ex('listen', { audioPath: 'a/b.m4a' }, 'привет'))
    ).toBeNull();
  });

  it('lets speak through without a stored answer', () => {
    expect(validateExercise(ex('speak', {}, null))).toBeNull();
  });

  it('refuses a kind it does not know how to mark', () => {
    expect(validateExercise(ex('interpretive-dance', {}, null))).toContain(
      'Unknown exercise'
    );
  });
});

describe('an unknown kind is never silently correct', () => {
  it('marks it wrong', () => {
    expect(gradeAnswer(ex('nonsense', {}, 'x'), 'x').correct).toBe(false);
  });
});
