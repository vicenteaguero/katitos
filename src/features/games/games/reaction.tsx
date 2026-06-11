/* eslint-disable react-refresh/only-export-components -- this file pairs a play component with its game module */
import { useEffect, useRef, useState } from 'react';
import { defineGame, type GamePlayProps } from '@kernel/registry';
import { toast } from '@kernel/ui';
import { cn } from '@kernel/lib';

type Phase = 'idle' | 'waiting' | 'go' | 'done';

function Reaction({ onFinish }: GamePlayProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [ms, setMs] = useState<number | null>(null);
  const startRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const begin = () => {
    setMs(null);
    setPhase('waiting');
    const delay = 800 + Math.random() * 2500;
    timerRef.current = window.setTimeout(() => {
      startRef.current = performance.now();
      setPhase('go');
    }, delay);
  };

  const tap = () => {
    if (phase === 'idle' || phase === 'done') return begin();
    if (phase === 'waiting') {
      window.clearTimeout(timerRef.current);
      setPhase('idle');
      toast.error('Too early! 🫣');
      return;
    }
    // phase === 'go'
    const t = Math.round(performance.now() - startRef.current);
    setMs(t);
    setPhase('done');
    onFinish({ score: t });
  };

  const bg =
    phase === 'go'
      ? 'bg-success'
      : phase === 'waiting'
        ? 'bg-danger'
        : 'bg-surface-2';
  const text =
    phase === 'idle'
      ? 'Tap to start'
      : phase === 'waiting'
        ? 'Wait for green…'
        : phase === 'go'
          ? 'TAP!'
          : `${ms} ms — tap to retry`;

  return (
    <button
      type="button"
      onClick={tap}
      className={cn(
        'gilt-hairline lift-press shadow-catch flex h-64 w-full items-center justify-center rounded-none px-7 text-center font-display text-3xl font-semibold tracking-tight text-fg transition-colors',
        bg
      )}
    >
      <span className={cn(phase === 'go' && 'candle-flicker')}>{text}</span>
    </button>
  );
}

export const reactionGame = defineGame({
  id: 'reaction',
  title: 'Reaction',
  description: 'Tap the moment it turns green. Fastest time wins.',
  emoji: '⚡',
  scoreOrder: 'asc',
  formatScore: (s) => `${s} ms`,
  PlayComponent: Reaction,
});
