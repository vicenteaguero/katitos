import { useState } from 'react';
import { Camera } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { Button, CameraCapture, Card, toast } from '@kernel/ui';
import { useAttachReaction } from '../api/know-me.mutations';
import type { QuestionWithDay, RevealRow } from '../types';
import { KnowMeImage } from './know-me-image';

/**
 * Both truths + both guesses with ✓/✗, my score, and a reaction selfie. The
 * partner's choices arrive here ONLY via the masking reveal RPC, after both
 * submitted.
 */
export function RevealCard({
  today,
  rows,
}: {
  today: QuestionWithDay;
  rows: RevealRow[];
}) {
  const { partner } = usePartner();
  const attach = useAttachReaction(today.dayId);
  const [camera, setCamera] = useState(false);

  const partnerName = partner?.display_name ?? 'them';
  const labelOf = (id: string | null) =>
    today.options.find((o) => o.id === id)?.label ?? '—';

  const me = rows.find((r) => r.is_self);
  const them = rows.find((r) => !r.is_self);

  // A point when MY guess equals the PARTNER's truth (and vice-versa).
  const iGotIt = !!me?.guess_choice && me.guess_choice === them?.own_choice;
  const theyGotIt =
    !!them?.guess_choice && them.guess_choice === me?.own_choice;

  const tick = (ok: boolean) => (ok ? ' ✓' : ' ✗');

  return (
    <Card className="space-y-4">
      <p className="text-lg font-medium">{today.question.prompt}</p>

      <div className="space-y-2 rounded-lg border border-border bg-surface-2 p-3 text-sm">
        <div>
          You really are: <b>{labelOf(me?.own_choice ?? null)}</b>
        </div>
        <div>
          {partnerName} really is: <b>{labelOf(them?.own_choice ?? null)}</b>
        </div>
        <div className="border-t border-border pt-2">
          Your guess for {partnerName}:{' '}
          <b>{labelOf(me?.guess_choice ?? null)}</b>
          <span className={iGotIt ? 'text-success' : 'text-warning'}>
            {tick(iGotIt)}
          </span>
        </div>
        <div>
          {partnerName}'s guess for you:{' '}
          <b>{labelOf(them?.guess_choice ?? null)}</b>
          <span className={theyGotIt ? 'text-success' : 'text-warning'}>
            {tick(theyGotIt)}
          </span>
        </div>
      </div>

      <p className="text-center text-sm text-muted">
        {iGotIt ? '🎯 You nailed it!' : '😄 Missed this one'} ·{' '}
        {theyGotIt ? `${partnerName} got you` : `${partnerName} missed you`}
      </p>

      <div className="flex gap-3">
        {(['me', 'them'] as const).map((who) => {
          const row = who === 'me' ? me : them;
          return (
            <div key={who} className="flex-1 text-center">
              {row?.reaction_path ? (
                <KnowMeImage
                  path={row.reaction_path}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-border text-2xl text-muted">
                  {who === 'me' ? '🙂' : (partner?.emoji ?? '💛')}
                </div>
              )}
              <p className="mt-1 text-xs text-muted">
                {who === 'me' ? 'You' : partnerName}
              </p>
            </div>
          );
        })}
      </div>

      {!me?.reaction_path && (
        <Button full variant="secondary" onClick={() => setCamera(true)}>
          <Camera size={18} /> React with a selfie
        </Button>
      )}

      {camera && (
        <CameraCapture
          facingMode="user"
          onCancel={() => setCamera(false)}
          onCapture={(blob) => {
            setCamera(false);
            attach.mutate(blob, {
              onSuccess: () => toast.success('Reaction added 📸'),
              onError: (e) => toast.error(e.message),
            });
          }}
        />
      )}
    </Card>
  );
}
