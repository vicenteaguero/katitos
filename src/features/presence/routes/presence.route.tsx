import type { CSSProperties } from 'react';
import { Hand } from 'lucide-react';
import { usePartner, useMembers } from '@kernel/auth';
import { useTableSync } from '@kernel/realtime';
import { notifyPartner } from '@kernel/push';
import { relativeTime, cn } from '@kernel/lib';
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
    <div className="curtain-reveal space-y-12">
      <PageHeader title="Connection" subtitle="Are you here, right now?" />

      <section className="space-y-7">
        <p className="eyebrow">In The House Tonight</p>

        {/* Footlight hero: the warm 'she just arrived' glow behind her presence. */}
        <div className="relative">
          <div
            className="footlight pointer-events-none absolute inset-0"
            aria-hidden="true"
          />
          <Card className="relative flex items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <span
                className={cn(
                  'gilt-text shrink-0 text-4xl',
                  online && 'candle-flicker'
                )}
              >
                {partner?.emoji ?? '💛'}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-semibold tracking-tight text-fg">
                  {partner?.display_name ?? 'Your love'}
                </p>
                <p className="mt-2 flex items-center gap-2 font-sans text-sm text-muted">
                  <span
                    className={cn(
                      'inline-block h-2 w-2 shrink-0 rounded-none',
                      online ? 'candle-flicker bg-purple' : 'bg-muted'
                    )}
                    aria-hidden="true"
                  />
                  {online
                    ? 'here with you now'
                    : partner?.last_seen_at
                      ? `last seen ${relativeTime(partner.last_seen_at)}`
                      : 'not seen yet'}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="shrink-0"
              onClick={() => void poke()}
            >
              <Hand size={16} /> Poke
            </Button>
          </Card>
        </div>
      </section>

      {/* The relationship as one gold-stitched line between acts. */}
      <hr className="seam" aria-hidden="true" />

      <section className="space-y-7">
        <p className="eyebrow">Recent Arrivals</p>
        {!opens || opens.length === 0 ? (
          <Empty icon="👀" title="No one has arrived yet" />
        ) : (
          <div className="curtain-stagger space-y-2">
            {opens.map((o, i) => (
              <div
                key={o.id}
                style={{ '--i': i } as CSSProperties}
                className="gilt-hairline-flat velvet flex items-center justify-between rounded-none px-5 py-3.5 font-sans text-sm shadow-catch"
              >
                <span className="truncate text-fg">{nameFor(o.user_id)}</span>
                <span className="shrink-0 font-medium tabular-nums text-muted">
                  {relativeTime(o.opened_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
