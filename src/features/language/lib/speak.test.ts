import { describe, expect, it } from 'vitest';
import { gradeAnswer, speakAnswer } from './exercise-schema';

const speak = {
  kind: 'speak',
  payload: {},
  answer: null,
} as unknown as Parameters<typeof gradeAnswer>[0];

describe('speakAnswer', () => {
  it('reads the old bare self-mark', () => {
    expect(speakAnswer(true)).toEqual({ ok: true, audio: null });
    expect(speakAnswer(false)).toEqual({ ok: false, audio: null });
  });

  it('reads a recording with or without a self-mark', () => {
    expect(speakAnswer({ ok: null, audio: 'speech/a.mp4' })).toEqual({
      ok: null,
      audio: 'speech/a.mp4',
    });
    expect(speakAnswer({ ok: true, audio: 'speech/a.mp4' })).toEqual({
      ok: true,
      audio: 'speech/a.mp4',
    });
  });

  it('is empty for anything else', () => {
    expect(speakAnswer(undefined)).toEqual({ ok: null, audio: null });
    expect(speakAnswer('yes')).toEqual({ ok: null, audio: null });
  });
});

describe('grading a spoken answer', () => {
  it('is right only when he says he got it', () => {
    expect(gradeAnswer(speak, true).correct).toBe(true);
    expect(gradeAnswer(speak, { ok: true, audio: 'x' }).correct).toBe(true);
    expect(gradeAnswer(speak, { ok: false, audio: 'x' }).correct).toBe(false);
    // A recording alone is for her to judge — not a mark.
    expect(gradeAnswer(speak, { ok: null, audio: 'x' }).correct).toBe(false);
  });
});
