import { usePartner } from '@kernel/auth';
import { Card, Empty } from '@kernel/ui';
import { useHistoryEntries } from '../api/know-me.queries';

/** Reverse-chronological list of completed days with both truths + ✓/✗. */
export function HistoryArchive() {
  const { partner } = usePartner();
  const { data: entries } = useHistoryEntries();
  const partnerName = partner?.display_name ?? 'them';

  if (!entries || entries.length === 0)
    return (
      <Empty
        icon="📖"
        title="No history yet"
        hint="Play a day together to start your archive."
      />
    );

  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <Card key={e.coupleDay} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{e.coupleDay}</span>
            <span>
              {e.selfRight ? '✓' : '✗'} you · {partnerName}{' '}
              {e.partnerRight ? '✓' : '✗'}
            </span>
          </div>
          <p className="text-sm font-medium">{e.prompt}</p>
          <div className="text-xs text-muted">
            You: <b className="text-fg">{e.selfOwnLabel}</b> · {partnerName}:{' '}
            <b className="text-fg">{e.partnerOwnLabel}</b>
          </div>
        </Card>
      ))}
    </div>
  );
}
