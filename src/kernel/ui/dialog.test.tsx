import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './dialog';

/**
 * The one modal every sheet in the app is built on, so the things that were
 * wrong with the old sheet are pinned here: focus escaped it, the page behind
 * stayed live, Escape closed the whole stack, and it had no name.
 */
describe('Dialog', () => {
  it('is named by its title', () => {
    render(
      <Dialog open onClose={() => {}} title="This word">
        <button>a</button>
      </Dialog>
    );
    expect(
      screen.getByRole('dialog', { name: 'This word' })
    ).toBeInTheDocument();
  });

  it('takes focus when it opens later, not only when it mounts open', async () => {
    const { rerender } = render(
      <Dialog open={false} onClose={() => {}} title="Later">
        <button>a</button>
      </Dialog>
    );
    rerender(
      <Dialog open onClose={() => {}} title="Later">
        <button>a</button>
      </Dialog>
    );
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Later' })).toHaveFocus()
    );
  });

  it('keeps Tab inside the panel, and wraps at both ends', async () => {
    const user = userEvent.setup();
    render(
      <Dialog open onClose={() => {}} title="T">
        <button>a</button>
        <button>b</button>
      </Dialog>
    );
    // Opens with the panel itself focused - no keyboard pops on a phone.
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Close' })
    );
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'a' })
    );
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'b' })
    );
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Close' })
    );
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'b' })
    );
  });

  it('closes only the top dialog on Escape', async () => {
    const user = userEvent.setup();
    const outer = vi.fn();
    const inner = vi.fn();
    render(
      <Dialog open onClose={outer} title="Outer">
        <button>a</button>
        <Dialog open onClose={inner} title="Inner">
          <button>b</button>
        </Dialog>
      </Dialog>
    );
    await user.keyboard('{Escape}');
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it('makes the app behind it inert while open, and gives focus back after', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    const trigger = document.createElement('button');
    trigger.textContent = 'open';
    root.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <Dialog open onClose={() => {}} title="T">
        <button>a</button>
      </Dialog>
    );
    expect(root.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).not.toBe(trigger);

    rerender(
      <Dialog open={false} onClose={() => {}} title="T">
        <button>a</button>
      </Dialog>
    );
    await waitFor(() => expect(root.hasAttribute('inert')).toBe(false));
    expect(document.activeElement).toBe(trigger);
    root.remove();
  });
});
