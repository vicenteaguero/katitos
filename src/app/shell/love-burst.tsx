import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { addLoveListener } from './love-channel';
import './love-burst.css';

/**
 * On-screen love burst: a shower of floating hearts + a few popping pet-word
 * bubbles, played when love is sent or received (see ./love-channel).
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

function makeBurst(note: string): Burst {
  const n = Math.round(rand(10, 20));
  const hearts: HeartCfg[] = Array.from({ length: n }, (_, k) => ({
    k,
    emoji: pick(HEARTS),
    style: {
      left: `${rand(2, 96)}%`,
      fontSize: `${rand(18, 40)}px`,
      ['--dx' as string]: `${rand(-70, 70)}px`,
      ['--dur' as string]: `${rand(1, 2.5).toFixed(2)}s`,
      ['--delay' as string]: `${rand(0, 0.5).toFixed(2)}s`,
      ['--rot' as string]: `${rand(-45, 45)}deg`,
      ['--scale' as string]: `${rand(0.7, 1.2).toFixed(2)}`,
    } as CSSProperties,
  }));
  // The sent note first, then a few random pet words.
  const words = [note, ...Array.from({ length: 3 }, () => pick(WORDS))].slice(
    0,
    4
  );
  const bubbles: BubbleCfg[] = words.map((word, k) => ({
    k,
    word,
    style: {
      top: `${rand(18, 70)}%`,
      left: `${rand(12, 78)}%`,
      ['--delay' as string]: `${(k * 0.35 + rand(0, 0.2)).toFixed(2)}s`,
    } as CSSProperties,
  }));
  return { id: ++counter, hearts, bubbles };
}

export function LoveBurst() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(
    () =>
      addLoveListener((note) => {
        const burst = makeBurst(note);
        setBursts((b) => [...b, burst]);
        window.setTimeout(
          () => setBursts((b) => b.filter((x) => x.id !== burst.id)),
          2900
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
