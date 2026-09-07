import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar, Ring } from './progress';

describe('ProgressBar', () => {
  it('is a progress bar with its numbers', () => {
    render(<ProgressBar value={3} max={8} label="Lesson" />);
    const bar = screen.getByRole('progressbar', { name: 'Lesson' });
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '8');
  });

  it('never overflows its track', () => {
    const { container } = render(<ProgressBar value={12} max={8} />);
    const fill = container.querySelector('span') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('draws one pill per step, and the current one half-lit', () => {
    const { container } = render(<ProgressBar segments={3} value={1} />);
    const pills = container.querySelectorAll('span');
    expect(pills).toHaveLength(3);
    expect(pills[0].style.background).toContain('228, 195, 106');
    expect(pills[0].style.background).not.toContain('0.55');
    expect(pills[1].style.background).toContain('0.55');
    expect(pills[2].style.background).toContain('251, 245, 240');
  });

  it('falls back to one bar when there are too many steps', () => {
    const { container } = render(<ProgressBar segments={40} value={10} />);
    expect(container.querySelectorAll('span')).toHaveLength(1);
  });
});

describe('Ring', () => {
  it('names its value and shows the number', () => {
    render(
      <Ring value={12} max={20} label="Practised">
        12
      </Ring>
    );
    const ring = screen.getByRole('progressbar', { name: 'Practised' });
    expect(ring).toHaveAttribute('aria-valuenow', '12');
    expect(ring).toHaveTextContent('12');
  });
});
