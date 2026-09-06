import { Link } from 'react-router';
import { useWhereAmI } from '../api/vpn.queries';

/**
 * The way in, from the top bar of the home screen.
 *
 * It says VPN, in letters. A shield meant nothing to her — it is a symbol for
 * people who already know what the thing is, and the whole point of this
 * feature is that she does not have to.
 *
 * It fills in when she is actually coming out through one of our servers, and
 * is quiet when she is not, so the top bar answers "is it on?" before she taps
 * anything. Not a dot on a badge: the badge itself.
 */
export function TunnelButton() {
  const { data: where } = useWhereAmI();
  const on = where?.on_tunnel === true;

  return (
    <Link
      to="/vpn"
      aria-label={on ? 'VPN, on' : 'VPN, off'}
      className={`lift-press flex h-9 items-center rounded-full px-3 font-display text-xs font-semibold tracking-wider shadow-loge transition ${
        on ? 'bg-emerald-600 text-white' : 'bg-surface-2 text-muted'
      }`}
    >
      VPN
    </Link>
  );
}
