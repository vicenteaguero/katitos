import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  TopBarSlotProvider,
  useScreenChrome,
  useTopBarAction,
  useTopBarChrome,
} from './top-bar-slot';

/**
 * A screen owns its chrome while it is mounted, and only while: two
 * components on one screen can each set a part, and the parts they did not
 * set are left alone. Leaving the screen leaves nothing behind.
 */
function Reader() {
  const c = useTopBarChrome();
  return (
    <div>
      <span data-testid="title">{String(c.title ?? '')}</span>
      <span data-testid="sub">{String(c.subtitle ?? '')}</span>
      <span data-testid="nav">{c.hideNav ? 'hidden' : 'shown'}</span>
      <span data-testid="action">{c.action}</span>
    </div>
  );
}
function Title({ text }: { text: string }) {
  useScreenChrome({ title: text, subtitle: 'sub' }, [text]);
  return null;
}
function Action() {
  useTopBarAction(<button>Edit</button>, []);
  return null;
}
function Immersive() {
  useScreenChrome({ hideNav: true }, []);
  return null;
}

describe('useScreenChrome', () => {
  it('merges parts set by different components', () => {
    render(
      <TopBarSlotProvider>
        <Reader />
        <Title text="Course" />
        <Action />
      </TopBarSlotProvider>
    );
    expect(screen.getByTestId('title')).toHaveTextContent('Course');
    expect(screen.getByTestId('sub')).toHaveTextContent('sub');
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('clears what a component set when it unmounts, and nothing else', () => {
    const { rerender } = render(
      <TopBarSlotProvider>
        <Reader />
        <Title text="Course" />
        <Immersive />
      </TopBarSlotProvider>
    );
    expect(screen.getByTestId('nav')).toHaveTextContent('hidden');
    rerender(
      <TopBarSlotProvider>
        <Reader />
        <Title text="Course" />
      </TopBarSlotProvider>
    );
    expect(screen.getByTestId('nav')).toHaveTextContent('shown');
    expect(screen.getByTestId('title')).toHaveTextContent('Course');
  });

  it('follows the latest value of a part', () => {
    const { rerender } = render(
      <TopBarSlotProvider>
        <Reader />
        <Title text="One" />
      </TopBarSlotProvider>
    );
    rerender(
      <TopBarSlotProvider>
        <Reader />
        <Title text="Two" />
      </TopBarSlotProvider>
    );
    expect(screen.getByTestId('title')).toHaveTextContent('Two');
  });
});
