/* eslint-disable react-refresh/only-export-components -- this file pairs a play component with its game module */
import { useEffect, useRef, useState } from 'react';
import { defineGame, type GamePlayProps } from '@kernel/registry';
import { Button } from '@kernel/ui';
import { cn } from '@kernel/lib';

const EMOJIS = ['🐱', '🌸', '✈️', '☕', '🌙', '❤️', '🍓', '🎲'];
const PAIRS = 6;

interface Tile {
  key: number;
  emoji: string;
}

function buildDeck(): Tile[] {
  const chosen = EMOJIS.slice(0, PAIRS);
  const deck = [...chosen, ...chosen].map((emoji, key) => ({ key, emoji }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function MemoryMatch({ onFinish }: GamePlayProps) {
  const [deck, setDeck] = useState<Tile[]>(buildDeck);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false);
  const finished = useRef(false);

  const done = matched.size === deck.length;

  useEffect(() => {
    if (done && !finished.current) {
      finished.current = true;
      onFinish({ score: moves });
    }
  }, [done, moves, onFinish]);

  const flip = (idx: number) => {
    if (busy || flipped.includes(idx) || matched.has(idx)) return;
    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      setBusy(true);
      const [a, b] = next;
      if (deck[a].emoji === deck[b].emoji) {
        setMatched((prev) => new Set([...prev, a, b]));
        setFlipped([]);
        setBusy(false);
      } else {
        setTimeout(() => {
          setFlipped([]);
          setBusy(false);
        }, 700);
      }
    }
  };

  const reset = () => {
    finished.current = false;
    setDeck(buildDeck());
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="font-sans text-sm tabular-nums text-muted">
          Moves{' '}
          <span className="gilt-text font-display text-lg tracking-tight">
            {moves}
          </span>
        </span>
        <Button size="sm" variant="ghost" onClick={reset}>
          Restart
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {deck.map((t, idx) => {
          const show = flipped.includes(idx) || matched.has(idx);
          const isMatched = matched.has(idx);
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => flip(idx)}
              className={cn(
                'lift-press flex aspect-square items-center justify-center rounded-none text-2xl transition',
                show
                  ? 'velvet-2 gilt-hairline shadow-catch'
                  : 'velvet gilt-hairline-flat',
                isMatched && 'candle-flicker'
              )}
            >
              {show ? t.emoji : ''}
            </button>
          );
        })}
      </div>
      {done && (
        <p className="gilt-text gold-shimmer text-center font-display text-2xl font-semibold tracking-tight">
          Done in {moves} moves
        </p>
      )}
    </div>
  );
}

export const memoryMatchGame = defineGame({
  id: 'memory-match',
  title: 'Memory Match',
  description: 'Flip and match the pairs in as few moves as you can.',
  emoji: '🧠',
  scoreOrder: 'asc',
  formatScore: (s) => `${s} moves`,
  PlayComponent: MemoryMatch,
});
