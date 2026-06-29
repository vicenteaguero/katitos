/**
 * The Summer "Add" control — injected into the top bar by each tab (via
 * `useTopBarAction`) so adding is always in the same place, small and tidy. No
 * plus, just "Add"; the active tab decides what it adds.
 */
export function TopAdd({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="lift-press rounded-full bg-accent px-3.5 py-1 font-sans text-xs font-semibold text-accent-fg shadow-loge"
      style={{ border: '1px solid rgba(228,195,106,.4)' }}
    >
      Add
    </button>
  );
}
