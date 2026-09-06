import { Link } from 'react-router';
import { useVpnStatus, useWhereAmI } from '../api/vpn.queries';

/**
 * The way in, from the top bar of the home screen.
 *
 * It says VPN in letters. A shield is a symbol for people who already know
 * what the thing is, and the whole point of this feature is that she does not
 * have to.
 *
 * It is built to rhyme with the currency button beside it — same height, same
 * gilt hairline, same lift — and to never be mistaken for it: currency is wine,
 * this is her glossy green. Colour carries the state, so the top bar answers
 * "is it on?" before she taps anything.
 *
 * Two signals, never conflated: the PILL is her connection (green = you are
 * coming out through Helsinki, charcoal = you are not), and the DOT is the
 * server's health (gold = awake, red = it has stopped reporting). Red on a
 * green pill is possible and correct — she is connected through a box that
 * just went quiet on me — and that is exactly the moment worth seeing.
 *
 * The dot only pulses while she is actually protected. A halo that breathes
 * when nothing is happening is decoration lying about state.
 */
export function TunnelButton() {
  const { data: where } = useWhereAmI();
  const { data: servers } = useVpnStatus();

  const on = where?.on_tunnel === true;
  const fleetUp = !!servers?.some((s) => s.alive);
  const dot = fleetUp ? 'bg-gold' : 'bg-danger';

  return (
    <Link
      to="/vpn"
      aria-label={on ? 'VPN, on' : fleetUp ? 'VPN, off' : 'VPN, server down'}
      className={`lift-press relative flex h-9 items-center rounded-full px-3 font-display text-xs font-semibold tracking-widest shadow-loge transition ${
        on ? 'bg-purple text-accent-fg' : 'bg-lapis text-muted'
      }`}
      style={{ border: '1px solid rgba(228,195,106,.4)' }}
    >
      VPN
      <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
        {on && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dot} opacity-75`}
          />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot} ring-2 ring-bg`}
        />
      </span>
    </Link>
  );
}
