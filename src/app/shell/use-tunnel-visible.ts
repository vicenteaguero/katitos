import { usePartner } from '@kernel/auth';
import { isAnnounced } from '../changelog';

/** The date on the changelog entry that hands this to her. */
export const TUNNEL_RELEASE = '2026-09-06';

/**
 * Whether the tunnel is his private tool yet, or hers too.
 *
 * The route is mounted for everyone - the registry has no idea who is asking -
 * so the gate is on the ways IN: the top-bar button, the home card, the More
 * drawer. He sees them the moment this ships, because he is the one testing
 * from a phone in Chile; she sees them when the changelog entry is unheld,
 * which is the same breath as being told what it is.
 *
 * The alternative was showing her a shield icon she did not ask for, on an app
 * that has never mentioned a VPN, and letting her work out what it does.
 */
export function useTunnelVisible(): boolean {
  const { self } = usePartner();
  return !!self?.is_admin || isAnnounced(TUNNEL_RELEASE);
}
