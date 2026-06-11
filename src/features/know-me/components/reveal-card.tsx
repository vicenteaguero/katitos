import { useState } from 'react';
import { Camera } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { cn } from '@kernel/lib';
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

  // The single most affirmative moment: both read each other right. Sacred Snow.
  const bothNailed = iGotIt && theyGotIt;

  return (
    <Card className="km-reveal km-candle space-y-7">
      <p className="font-display text-3xl font-medium leading-tight tracking-tight text-fg">
        {today.question.prompt}
      </p>

      <div className="gilt-hairline-flat velvet-2 space-y-3 rounded-none p-5 font-sans text-sm shadow-catch">
        <div className="text-muted">
          You really are:{' '}
          <b className="font-semibold text-fg">
            {labelOf(me?.own_choice ?? null)}
          </b>
        </div>
        <div className="text-muted">
          {partnerName} really is:{' '}
          <b className="font-semibold text-fg">
            {labelOf(them?.own_choice ?? null)}
          </b>
        </div>
        <div
          className="km-verdict-rule h-px w-full bg-border"
          aria-hidden="true"
        />
        <div className="text-muted">
          Your guess for {partnerName}:{' '}
          <b className="font-semibold text-fg">
            {labelOf(me?.guess_choice ?? null)}
          </b>
          <span
            className={iGotIt ? 'font-semibold text-success' : 'text-muted'}
          >
            {tick(iGotIt)}
          </span>
        </div>
        <div className="text-muted">
          {partnerName}'s guess for you:{' '}
          <b className="font-semibold text-fg">
            {labelOf(them?.guess_choice ?? null)}
          </b>
          <span
            className={theyGotIt ? 'font-semibold text-success' : 'text-muted'}
          >
            {tick(theyGotIt)}
          </span>
        </div>
      </div>

      <p
        className={cn(
          'text-center font-display text-xl italic',
          bothNailed ? 'candle-flicker text-accent-fg' : 'text-muted'
        )}
      >
        {iGotIt ? '🎯 You nailed it' : '😄 Missed this one'} ·{' '}
        {theyGotIt ? `${partnerName} got you` : `${partnerName} missed you`}
      </p>

      <div className="flex gap-4">
        {(['me', 'them'] as const).map((who) => {
          const row = who === 'me' ? me : them;
          return (
            <div key={who} className="flex-1 text-center">
              {row?.reaction_path ? (
                <KnowMeImage
                  path={row.reaction_path}
                  className="gilt-hairline aspect-square w-full rounded-none object-cover shadow-catch"
                />
              ) : (
                <div className="gilt-hairline-flat velvet-2 flex aspect-square w-full items-center justify-center rounded-none text-3xl text-muted shadow-catch">
                  {who === 'me' ? '🙂' : (partner?.emoji ?? '❤️')}
                </div>
              )}
              <p className="mt-2 font-sans text-xs uppercase tracking-[0.12em] text-muted">
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
