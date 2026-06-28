import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
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
// Show the splash for at least this long so the open animation always plays —
// even when auth resolves instantly (a warm/cached boot), where it used to
// flash by. Then fade out over FADE_MS.
const MIN_VISIBLE_MS = 1200;
const FADE_MS = 600;

export function SplashScreen({ active }: { active: boolean }) {
  const mountedAt = useRef(Date.now());
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>('in');

  // This splash now covers — so drop the instant index.html boot splash. Doing
  // it HERE (not on a timer in main.tsx) guarantees no gap: #boot stays up until
  // this animated splash has actually painted over it.
  useEffect(() => {
    document.getElementById('boot')?.remove();
  }, []);

  // Once loading is done AND we've shown it long enough, start the fade.
  useEffect(() => {
    if (active) {
      setPhase('in');
      return;
    }
    const elapsed = Date.now() - mountedAt.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const t = window.setTimeout(() => setPhase('out'), wait);
    return () => window.clearTimeout(t);
  }, [active]);

  // After the fade animation, unmount.
  useEffect(() => {
    if (phase !== 'out') return;
    const t = window.setTimeout(() => setPhase('gone'), FADE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === 'gone') return null;

  return (
    <div
      className={phase === 'out' ? 'splash splash--out' : 'splash'}
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
