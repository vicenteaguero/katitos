/**
 * Currency-exchange glyph — two coins trading places along a pair of swap
 * arrows. Inherits `currentColor`; size via the `size` prop (px). Drawn to
 * match the lucide stroke language (1.75 weight, round caps) so it sits in the
 * top bar next to the other icons without looking foreign.
 */
export function ExchangeIcon({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* two coins */}
      <circle cx="6" cy="6.5" r="2.4" />
      <circle cx="18" cy="17.5" r="2.4" />
      {/* top arrow: left coin → right */}
      <path d="M8.6 6.5H20" />
      <path d="M17.2 3.6 20 6.5l-2.8 2.9" />
      {/* bottom arrow: right coin → left */}
      <path d="M15.4 17.5H4" />
      <path d="M6.8 14.6 4 17.5l2.8 2.9" />
    </svg>
  );
}
