import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { ScavengerProofImage } from './scavenger-proof-image';

interface ClaimRevealProps {
  /** The claimed date's title — on the legendary card + the flourish below it. */
  title: string;
  /** The owner's deck tone (blue/pink) — the card's top seam. */
  toneColor: string;
  /** A fresh object URL for the just-captured proof (instant, optional). */
  photoUrl?: string | null;
  /** The card's stored photo path, shown when there is no fresh capture. */
  cardImagePath?: string | null;
  onDone: () => void;
}

const SPARKS = 18;

/**
 * Full-screen, notch-safe "you opened the rarest card in the pack" reveal that
 * plays when the creator claims a date. Portal → <body>, tap (or ~2.5s) to
 * dismiss. All the spectacle lives in scavenger.css; this just stages it and
 * fires the haptic punch.
 */
export function ClaimReveal({
  title,
  toneColor,
  photoUrl,
  cardImagePath,
  onDone,
}: ClaimRevealProps) {
  const [out, setOut] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const closedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    setOut(true);
    window.setTimeout(() => onDoneRef.current(), 300);
  }, []);

  // Haptic flourish on entrance + auto-dismiss. Reduced motion → quick + calm.
  useEffect(() => {
    navigator.vibrate?.([0, 40, 30, 60]);
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const t = window.setTimeout(dismiss, reduced ? 1100 : 2500);
    return () => window.clearTimeout(t);
  }, [dismiss]);

  const sparks = Array.from({ length: SPARKS }, (_, i) => {
    const angle = (i / SPARKS) * Math.PI * 2 + (i % 2 ? 0.32 : 0);
    const dist = 116 + (i % 5) * 30;
    const size = 5 + (i % 3) * 4;
    return (
      <span
        key={i}
        className="sc-spark"
        style={
          {
            '--tx': `${Math.cos(angle) * dist}px`,
            '--ty': `${Math.sin(angle) * dist}px`,
            '--d': `${0.5 + (i % 4) * 0.06}s`,
            width: `${size}px`,
            height: `${size}px`,
            background: i % 4 === 0 ? '#fff1c9' : 'var(--gold)',
          } as CSSProperties
        }
      />
    );
  });

  return createPortal(
    <div
      className={`sc-reveal${out ? ' sc-reveal--out' : ''}`}
      role="dialog"
      aria-label={`${title} claimed`}
      onClick={dismiss}
    >
      <div className="sc-reveal-backdrop" />
      <div className="sc-rays-wrap" aria-hidden="true">
        <div className="sc-rays" />
      </div>
      {sparks}

      <div className="sc-card">
        <div className="sc-card-seam" style={{ background: toneColor }} />
        {photoUrl ? (
          <img src={photoUrl} alt="" className="sc-card-photo" />
        ) : cardImagePath ? (
          <ScavengerProofImage path={cardImagePath} className="sc-card-photo" />
        ) : (
          <img src="/deck.png" alt="" className="sc-card-photo" />
        )}
        <div className="sc-card-veil" />
        <div className="sc-foil" />
        <div className="sc-card-meta">
          <p className="sc-card-eyebrow">Georgia · date claimed</p>
          <h3 className="sc-card-title">{title}</h3>
        </div>
      </div>

      <p className="sc-word">CLAIMED!</p>
      <p className="sc-hint">Tap to close</p>
    </div>,
    document.body
  );
}
