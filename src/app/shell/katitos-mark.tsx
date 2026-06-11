import { cn } from '@kernel/lib';

/**
 * The Katitos brand mark — a cat head with negative-space heart eyes, rendered
 * in the "Bolshoi Nocturne" language (DESIGN_BIBLE §9.3 "Living Heart-Eyes").
 *
 * The head is Marble Snow; the two heart eyes are *not* cut to the wine
 * background — instead they are filled with the gilt gradient and lit by a
 * faint Imperial-Purple `.candle-flicker` glow, so the brand white still reads
 * as a heartbeat while the gold mediates. Geometry traced from
 * `design/logo/v1-solid.svg`.
 */
export function KatitosMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role="img"
      aria-label="Katitos"
      className={cn('block', className)}
    >
      <defs>
        {/* The theater gilt — mirrors --grad-gilt (135deg). */}
        <linearGradient id="katitos-gilt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9C7A2E" />
          <stop offset="45%" stopColor="#E4C36A" />
          <stop offset="50%" stopColor="#FFF1C9" />
          <stop offset="55%" stopColor="#E4C36A" />
          <stop offset="100%" stopColor="#9C7A2E" />
        </linearGradient>
        {/* Imperial-Purple candle halo behind the heart-eyes. */}
        <radialGradient id="katitos-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4A2350" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#4A2350" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4A2350" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Head — Marble Snow, with ears. */}
      <g fill="#FFFAFA">
        <path d="M150 150 L196 232 L120 226 Z" />
        <path d="M362 150 L316 232 L392 226 Z" />
        <circle cx="256" cy="288" r="118" />
      </g>

      {/* Living heart-eyes — purple candle glow, then gilt-filled hearts. */}
      <g className="candle-flicker" style={{ transformOrigin: 'center' }}>
        <circle cx="214" cy="295" r="46" fill="url(#katitos-glow)" />
        <circle cx="298" cy="295" r="46" fill="url(#katitos-glow)" />
      </g>
      <g fill="url(#katitos-gilt)">
        <path d="M214 268 c-14-16-38-6-38 13 c0 17 24 30 38 44 c14-14 38-27 38-44 c0-19-24-29-38-13 Z" />
        <path d="M298 268 c-14-16-38-6-38 13 c0 17 24 30 38 44 c14-14 38-27 38-44 c0-19-24-29-38-13 Z" />
      </g>

      {/* Nose — wine, the brand oxblood note. */}
      <path d="M256 318 l10 14 h-20 Z" fill="#6E1423" />
    </svg>
  );
}
