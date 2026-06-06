import { usePartner } from '@kernel/auth';
import { usePresenceStore } from '../store';

export function usePartnerPresence() {
  const { partner } = usePartner();
  const onlineIds = usePresenceStore((s) => s.onlineIds);
  const online = partner ? onlineIds.includes(partner.user_id) : false;
  return { partner, online };
}
