import { Link } from 'react-router';
import { ShieldCheck } from 'lucide-react';
import { useVpnStatus } from '../api/vpn.queries';
import { fleetSummary } from '../lib/health';

const DOT: Record<'good' | 'warn' | 'bad', string> = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-rose-500',
};

/**
 * The way in, from the top bar of the home screen.
 *
 * Sits beside the currency shortcut because it answers the same kind of
 * question — the small practical one you have three times a day and do not
 * want to go looking for. Quieter than currency on purpose: wine is the fast
 * lane she uses daily, this is the one she needs on a bad day.
 *
 * The dot is the whole point of putting it here rather than in a menu: she can
 * see whether her internet is meant to be working without opening anything.
 */
export function TunnelButton() {
  const { data: servers } = useVpnStatus();
  const tone = servers?.length ? fleetSummary(servers).tone : null;

  return (
    <Link
      to="/vpn"
      aria-label="Internet"
      className="lift-press relative flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-fg shadow-loge"
    >
      <ShieldCheck className="h-[18px] w-[18px]" />
      {tone && (
        <span
          className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-bg ${DOT[tone]}`}
        />
      )}
    </Link>
  );
}
