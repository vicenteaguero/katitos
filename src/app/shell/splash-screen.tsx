import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { KatitosMark } from './katitos-mark';
import './splash-screen.css';

/** A faint mosaic of rose kittens (the brand mark), tiled to cover the screen. */
function Mosaic() {
  const marks = useMemo(() => {
    const out: { rot: number; op: number }[] = [];
    for (let i = 0; i < 140; i++)
      out.push({
        rot: Math.round(Math.random() * 40 - 20),
        op: 0.05 + Math.random() * 0.06,
      });
    return out;
  }, []);
  return (
    <div className="splash-mosaic" aria-hidden="true">
      {marks.map((m, i) => (
        <span
          key={i}
          style={{ transform: `rotate(${m.rot}deg)`, opacity: m.op }}
        >
          <KatitosMark size={42} fill="#d98fb0" />
        </span>
      ))}
    </div>
  );
}

/**
 * Boot splash. Shown while the app is loading; once `active` flips false it
 * fades and settles out, so the hand-off into the app feels smooth and warm.
 */
export function SplashScreen({ active }: { active: boolean }) {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (active) {
      setMounted(true);
      return;
    }
    // Keep it up a beat after "ready", then fade out.
    const t = window.setTimeout(() => setMounted(false), 620);
    return () => window.clearTimeout(t);
  }, [active]);

  if (!mounted) return null;

  return (
    <div
      className={active ? 'splash' : 'splash splash--out'}
      style={{ '--i': 0 } as CSSProperties}
    >
      <Mosaic />
      <div className="splash-center">
        <span className="splash-halo" aria-hidden="true" />
        <KatitosMark size={104} />
        <span className="splash-word">Katitos</span>
      </div>
    </div>
  );
}
