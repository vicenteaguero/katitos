import { Link } from 'react-router';
import { Button } from '@kernel/ui';

export function NotFoundRoute() {
  return (
    <div className="curtain-reveal relative flex flex-col items-center justify-center px-7 py-20 text-center">
      <div className="footlight" aria-hidden="true" />
      <div className="relative flex flex-col items-center gap-7">
        <p className="eyebrow">Intermission</p>
        <div className="gilt-text candle-flicker text-6xl" aria-hidden="true">
          🎭
        </div>
        <h1 className="font-display text-5xl font-semibold tracking-tight text-fg">
          This act isn’t in tonight’s programme
        </h1>
        <p className="max-w-xs font-sans text-sm leading-relaxed text-muted">
          The page you sought has slipped behind the curtain. Let’s find our way
          back to the stage.
        </p>
        <Link to="/" className="mt-3 block">
          <Button className="bg-accent">Home</Button>
        </Link>
      </div>
    </div>
  );
}
