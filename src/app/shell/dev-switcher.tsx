import { useAuth, useMembers } from '@kernel/auth';

/**
 * Local-only control to flip between the two seeded accounts, so both sides
 * of RLS / presence / "who answered" are testable without a login wall.
 */
export function DevUserSwitcher() {
  const { isLocal, devSlot, devSwitchUser } = useAuth();
  const { data: members } = useMembers();
  if (!isLocal || !devSlot) return null;

  const current = members?.find((m) => m.role === devSlot);
  const next = devSlot === 'a' ? 'b' : 'a';

  return (
    <button
      type="button"
      onClick={() => void devSwitchUser(next)}
      title="Switch account (dev)"
      className="flex items-center gap-1.5 rounded bg-surface-2 px-2.5 py-1 text-sm"
    >
      <span>{current?.emoji ?? '👤'}</span>
      <span className="max-w-20 truncate">
        {current?.display_name ?? devSlot}
      </span>
      <span className="text-xs text-muted">⇄</span>
    </button>
  );
}
