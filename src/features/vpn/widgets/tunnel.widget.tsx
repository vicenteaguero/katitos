import { Link } from 'react-router';
import { ShieldCheck } from 'lucide-react';
import { Card, CardTitle } from '@kernel/ui';
import { useVpnStatus } from '../api/vpn.queries';
import { fleetSummary } from '../lib/health';

const DOT: Record<'good' | 'warn' | 'bad', string> = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-rose-500',
};

/**
 * Her internet, on the home screen.
 *
 * Deliberately not load-bearing. If this card is wrong, or missing, or the
 * whole app is down, her tunnel does not notice — Katitos never sits in that
 * path. It is here so that when something feels slow she can look instead of
 * asking, and so I can see from Chile that the boxes are still reporting in.
 *
 * Nothing at all until there IS a fleet: before the first server exists this
 * would be a card that says "no servers", which is clutter about a feature she
 * has not been given yet.
 */
export function TunnelWidget() {
  const { data: servers } = useVpnStatus();

  if (!servers || servers.length === 0) return null;

  const { tone, line } = fleetSummary(servers);

  return (
    <Link to="/vpn">
      <Card className="lift-press">
        <CardTitle>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-4 w-4" /> Your internet
          </span>
        </CardTitle>
        <p className="mt-1 inline-flex items-center gap-2 font-sans text-sm text-fg">
          <span className={`h-2 w-2 rounded-full ${DOT[tone]}`} />
          {line}
        </p>
      </Card>
    </Link>
  );
}
