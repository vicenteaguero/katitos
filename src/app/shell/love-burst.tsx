import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { addLoveListener, type BurstKind } from './love-channel';
import './love-burst.css';

/**
 * On-screen love burst: a shower of floating hearts + a few popping pet-word
 * bubbles, played when love is sent or received (see ./love-channel). The
 * 'cheer' kind is the same show, louder: her whole day of habits is in.
 */

const HEARTS = ['💗', '🤍', '❤️', '💞', '💕', '🌹'];
const WORDS = [
  'Liubimonkey 🐵',
  'любимая 🤍',
  'My sunshine ☀️',
  'mi polola 🌹',
  'te amo 💞',
  'любименки 💕',
  'bonita ✨',
  'my everything 🌟',
];
const CONFETTI = ['🎉', '🥳', '🏆', '✨', '🎊', '👑', '🌟', '🍾', '💪', '🤍'];
const CHEERS = [
  'Молодец! 💪',
  'Bravo, Liubimaya 👑',
  'Proud of you 🥹',
  'Ты умница ✨',
  'Te pasaste, bonita 🎉',
  'My sunshine did it ☀️',
  'Queen of habits 👑',
];

/** How much of a show each kind puts on. */
const SHOW = {
  love: {
    pool: HEARTS,
    words: WORDS,
    count: [10, 20],
    dur: [1, 2.5],
    extra: 3,
    ms: 2900,
  },
  cheer: {
    pool: CONFETTI,
    words: CHEERS,
    count: [36, 52],
    dur: [1.6, 3.4],
    extra: 4,
    ms: 4600,
  },
} as const;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface HeartCfg {
  k: number;
  emoji: string;
  style: CSSProperties;
}
interface BubbleCfg {
  k: number;
  word: string;
  style: CSSProperties;
}
interface Burst {
  id: number;
  hearts: HeartCfg[];
  bubbles: BubbleCfg[];
}

let counter = 0;

function makeBurst(note: string, kind: BurstKind): Burst {
  const show = SHOW[kind];
  const n = Math.round(rand(show.count[0], show.count[1]));
  const wide = kind === 'cheer';
  const hearts: HeartCfg[] = Array.from({ length: n }, (_, k) => ({
    k,
    emoji: pick(show.pool),
    style: {
      // Originate from a centred band and fan outward, so the shower reads as
      // coming from the middle of the screen (the hero), not edge-to-edge.
      // A cheer fills the whole width and keeps coming for longer.
      left: wide ? `${rand(4, 96)}%` : `${rand(30, 70)}%`,
      fontSize: `${rand(18, wide ? 46 : 40)}px`,
      ['--dx' as string]: `${rand(-95, 95)}px`,
      ['--dur' as string]: `${rand(show.dur[0], show.dur[1]).toFixed(2)}s`,
      ['--delay' as string]: `${rand(0, wide ? 1.2 : 0.5).toFixed(2)}s`,
      ['--rot' as string]: `${rand(-45, 45)}deg`,
      ['--scale' as string]: `${rand(0.7, 1.2).toFixed(2)}`,
    } as CSSProperties,
  }));
  // The sent note first, then a few random words, never the same one twice.
  const others = [...show.words].sort(() => Math.random() - 0.5);
  const words = [note, ...others].filter(Boolean).slice(0, show.extra + 1);
  const bubbles: BubbleCfg[] = words.map((word, k) => ({
    k,
    word,
    style: {
      // A centred cluster over the hero.
      top: `${rand(30, 62)}%`,
      left: `${rand(28, 72)}%`,
      ['--delay' as string]: `${(k * 0.35 + rand(0, 0.2)).toFixed(2)}s`,
    } as CSSProperties,
  }));
  return { id: ++counter, hearts, bubbles };
}

export function LoveBurst() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(
    () =>
      addLoveListener((note, kind) => {
        const burst = makeBurst(note, kind);
        setBursts((b) => [...b, burst]);
        window.setTimeout(
          () => setBursts((b) => b.filter((x) => x.id !== burst.id)),
          SHOW[kind].ms
        );
      }),
    []
  );

  if (bursts.length === 0) return null;

  return createPortal(
    <div className="lb-root" aria-hidden="true">
      {bursts.map((burst) => (
        <div key={burst.id}>
          {burst.hearts.map((h) => (
            <span key={h.k} className="lb-heart" style={h.style}>
              {h.emoji}
            </span>
          ))}
          {burst.bubbles.map((b) => (
            <div key={b.k} className="lb-bubble" style={b.style}>
              {b.word}
            </div>
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
}
