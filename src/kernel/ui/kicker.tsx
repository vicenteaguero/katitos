import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type Tone = 'gold' | 'muted' | 'copper' | 'fg';

const tones: Record<Tone, string> = {
  gold: 'text-gold',
  muted: 'text-muted',
  copper: 'text-copper',
  fg: 'text-fg',
};

/**
 * The tiny label over a thing: "words", "table", "3 of 8", "known".
 *
 * One size and one tracking for all of them. The feature had grown four -
 * 0.68, 0.62, 0.6 and 0.55rem - for what is the same voice every time.
 * (`.eyebrow` is a different device: the centred display-face heading with
 * gilt rules either side, for a section, not a row.)
 */
export function Kicker({
  tone = 'gold',
  as: Tag = 'span',
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { tone?: Tone; as?: 'span' | 'p' }) {
  return (
    <Tag
      className={cn(
        'font-sans text-[0.68rem] font-semibold uppercase tracking-[0.12em]',
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
