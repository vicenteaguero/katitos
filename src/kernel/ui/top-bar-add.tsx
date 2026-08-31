import { useRef, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { TopBarButton } from './top-bar-button';
import { useTopBarAction } from './top-bar-slot';

/**
 * The "add one" control, in the top bar where every other screen keeps it.
 *
 * Replaces the floating action button, which covered content, sat under the
 * thumb by accident rather than design, and was disliked enough to be worth
 * removing everywhere at once.
 *
 * Rendered as a component (not a bare hook) so it can be dropped in exactly
 * where the old button lived — including inside a conditional branch — without
 * anyone having to think about hook ordering.
 */
export function TopBarAdd({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  /** Defaults to a plus. */
  children?: ReactNode;
}) {
  // The callback is almost always a fresh closure each render. Holding it in a
  // ref keeps the effect's deps stable, so the top bar isn't re-set on every
  // single render (which would loop through the provider's state).
  const cb = useRef(onClick);
  cb.current = onClick;

  useTopBarAction(
    <TopBarButton label={label} onClick={() => cb.current()}>
      {children ?? <Plus className="h-4 w-4" />}
    </TopBarButton>,
    [label]
  );

  return null;
}
