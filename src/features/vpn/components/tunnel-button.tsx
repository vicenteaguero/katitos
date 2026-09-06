import { Link } from 'react-router';
import { useWhereAmI } from '../api/vpn.queries';

/**
 * The way in, from the top bar of the home screen.
 *
 * Same circle as the currency button beside it - same 36px, same gilt
 * hairline, same lift - because they are the same kind of thing: one tap, one
 * answer. Only the fill differs, and that is what tells them apart: currency
 * is wine, this is her glossy green when it is on and a quiet panel when it is
 * not.
 *
 * No badge, no dot. An earlier version hung a pulsing notification dot off the
 * corner and it read as an alert about nothing. The fill IS the state.
 *
 * Letters, not a shield: a shield is a symbol for people who already know what
 * the thing is, and the point of this feature is that she does not have to.
 * In the sans face at 11px - the display face at this size was unreadable.
 */
export function TunnelButton() {
  const { data: where } = useWhereAmI();
  const on = where?.on_tunnel === true;

  return (
    <Link
      to="/vpn"
      aria-label={on ? 'VPN, on' : 'VPN, off'}
      className={`lift-press flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold leading-none shadow-loge transition ${
        on ? 'bg-purple text-accent-fg' : 'bg-surface-2 text-muted'
      }`}
      style={{ border: '1px solid rgba(228,195,106,.4)' }}
    >
      VPN
    </Link>
  );
}
