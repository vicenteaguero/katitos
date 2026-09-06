import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DoublePolaroid } from './double-polaroid';
import type { PolaroidDay } from '../lib/polaroid-days';
import type { Polaroid } from '../types';

function photo(id: string, user: string): Polaroid {
  return {
    id,
    day: '2026-08-12',
    image_path: `${id}.jpg`,
    caption: null,
    taken_by: user,
    user_id: user,
    is_shared: false,
    created_at: '2026-08-12T00:00:00Z',
    updated_at: '2026-08-12T00:00:00Z',
  } as Polaroid;
}

const day: PolaroidDay = {
  day: '2026-08-12',
  shared: null,
  mine: photo('mine', 'a'),
  theirs: photo('theirs', 'b'),
  extras: [],
  isLegacy: false,
};

function setup(over: Partial<Parameters<typeof DoublePolaroid>[0]> = {}) {
  const onOpen = vi.fn();
  // The plates render PolaroidImage, which asks for a signed URL - it just
  // needs a client to hang the (never-resolving) query off.
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <DoublePolaroid
        day={day}
        partnerName="Katita"
        partnerZone="Asia/Novosibirsk"
        onOpen={onOpen}
        {...over}
      />
    </QueryClientProvider>
  );
  return { onOpen };
}

/** The plate element carrying the front/back class. */
const plateFor = (name: RegExp) => screen.getByRole('button', { name });

describe('DoublePolaroid', () => {
  it('puts your love on top when it opens', () => {
    setup();
    expect(plateFor(/Open Katita's photo/)).toHaveClass('pair-plate--front');
    expect(plateFor(/Bring You's photo to the front/)).toHaveClass(
      'pair-plate--back'
    );
  });

  it('brings yours forward when you tap it', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(plateFor(/Bring You's photo to the front/));
    expect(plateFor(/Open You's photo/)).toHaveClass('pair-plate--front');
    expect(plateFor(/Bring Katita's photo to the front/)).toHaveClass(
      'pair-plate--back'
    );
  });

  it('opens the one already in front instead of re-swapping it', async () => {
    const user = userEvent.setup();
    const { onOpen } = setup();
    await user.click(plateFor(/Open Katita's photo/));
    expect(onOpen).toHaveBeenCalledWith(day.theirs);
  });

  it('has only two states - one is always in front', async () => {
    const user = userEvent.setup();
    const { onOpen } = setup();
    // Tap back, then tap back again: never lands on "neither in front".
    await user.click(plateFor(/Bring You's photo to the front/));
    await user.click(plateFor(/Bring Katita's photo to the front/));
    expect(plateFor(/Open Katita's photo/)).toHaveClass('pair-plate--front');
    // And the taps that swapped never counted as opening.
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('never fronts a side with no photo', () => {
    setup({ day: { ...day, theirs: null } });
    expect(plateFor(/Open You's photo/)).toHaveClass('pair-plate--front');
  });

  it('lets the parent drive which one is in front', async () => {
    const user = userEvent.setup();
    const onFocusChange = vi.fn();
    setup({ focus: 'theirs', onFocusChange });
    await user.click(plateFor(/Bring You's photo to the front/));
    expect(onFocusChange).toHaveBeenCalledWith('mine');
  });
});
