import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast, useToastStore } from './toast';

const state = () => useToastStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});

/**
 * Toasts are the only way back from a destructive tap, which is exactly why
 * they must not become wallpaper. Clearing a page of stickers is half a dozen
 * taps in a row, and each one used to leave its own nine-second card stacked
 * over the thing you were editing.
 */
describe('toast', () => {
  it('replaces the toast with the same key instead of stacking', () => {
    toast.info('Taken off the page', { key: 'unplace' });
    toast.info('2 taken off the page', { key: 'unplace' });
    toast.info('3 taken off the page', { key: 'unplace' });
    expect(state().toasts).toHaveLength(1);
    expect(state().toasts[0].message).toBe('3 taken off the page');
  });

  it('restarts the clock when it is replaced', () => {
    toast.info('one', {
      key: 'k',
      action: { label: 'Undo', onClick: () => {} },
    });
    vi.advanceTimersByTime(8_000);
    toast.info('two', {
      key: 'k',
      action: { label: 'Undo', onClick: () => {} },
    });
    // The first one's deadline must not take the second one away with it.
    vi.advanceTimersByTime(2_000);
    expect(state().toasts).toHaveLength(1);
    vi.advanceTimersByTime(8_000);
    expect(state().toasts).toHaveLength(0);
  });

  it('still stacks unrelated messages', () => {
    toast.success('Saved');
    toast.error('Something broke');
    expect(state().toasts).toHaveLength(2);
  });

  it('never lets the pile grow past three', () => {
    for (let i = 0; i < 6; i++) toast.info(`n${i}`);
    expect(state().toasts).toHaveLength(3);
    // The three kept are the NEWEST three.
    expect(state().toasts.map((t) => t.message)).toEqual(['n3', 'n4', 'n5']);
  });

  it('keeps an Undo on screen longer than a plain message', () => {
    toast.info('plain');
    toast.info('undoable', { action: { label: 'Undo', onClick: () => {} } });
    vi.advanceTimersByTime(3_600);
    expect(state().toasts.map((t) => t.message)).toEqual(['undoable']);
    vi.advanceTimersByTime(5_500);
    expect(state().toasts).toHaveLength(0);
  });

  it('dismissing one cancels its timer rather than leaving it armed', () => {
    toast.info('one', { key: 'k' });
    state().dismiss('k');
    expect(state().toasts).toHaveLength(0);
    toast.info('two', { key: 'k' });
    // The cancelled timer must not remove the new toast at the old deadline.
    vi.advanceTimersByTime(3_000);
    expect(state().toasts).toHaveLength(1);
  });
});
