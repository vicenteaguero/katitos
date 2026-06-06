import { Hand } from 'lucide-react';
import { usePartner, useMembers } from '@kernel/auth';
import { useTableSync } from '@kernel/realtime';
import { notifyPartner } from '@kernel/push';
import { relativeTime } from '@kernel/lib';
import { qk } from '@kernel/query';
import { Button, Card, Empty, PageHeader, toast } from '@kernel/ui';
import { useRecentOpens } from '../api/presence.queries';
import { usePartnerPresence } from '../hooks/use-partner-presence';

export function PresenceRoute() {
  useTableSync('couple_members', qk.couple.members());
  useTableSync('app_opens', qk.presence.appOpens());
  const { partner, online } = usePartnerPresence();
  const { self } = usePartner();
  const { data: members } = useMembers();
  const { data: opens } = useRecentOpens();

  const nameFor = (id: string) =>
    members?.find((m) => m.user_id === id)?.display_name ?? 'Someone';

  const poke = async () => {
    await notifyPartner({
      title: 'Katitos 👉',
      body: `${self?.display_name ?? 'Someone'} poked you`,
    });
    toast.success('Poke sent 👉');
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Connection" subtitle="Are you there?" />

      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{partner?.emoji ?? '💛'}</span>
          <div>
            <p className="font-semibold">
              {partner?.display_name ?? 'Your love'}
            </p>
            <p className="text-sm text-muted">
              {online
                ? 'online now 🟢'
                : partner?.last_seen_at
                  ? `last seen ${relativeTime(partner.last_seen_at)}`
                  : 'not seen yet'}
            </p>
          </div>
        </div>
        <Button onClick={() => void poke()}>
          <Hand size={16} /> Poke
        </Button>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted">Recent opens</h2>
        {!opens || opens.length === 0 ? (
          <Empty icon="👀" title="No activity yet" />
        ) : (
          <div className="space-y-1.5">
            {opens.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded bg-surface px-3 py-2 text-sm"
              >
                <span>{nameFor(o.user_id)}</span>
                <span className="text-muted">{relativeTime(o.opened_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
