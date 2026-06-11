import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { useNow } from '@kernel/hooks';
import { useTableSync } from '@kernel/realtime';
import { coupleDay } from '@kernel/lib';
import { qk } from '@kernel/query';
import { Fab, LoadingScreen, PageHeader, Segmented } from '@kernel/ui';
import {
  useMyAnswer,
  usePartnerSubmitted,
  useReveal,
  useToday,
} from '../api/know-me.queries';
import { useEnsureToday } from '../api/know-me.mutations';
import { DailyCard } from '../components/daily-card';
import { WaitingCard } from '../components/waiting-card';
import { RevealCard } from '../components/reveal-card';
import { LoveMapPanel } from '../components/love-map-panel';
import { HistoryArchive } from '../components/history-archive';
import { AuthorQuestionSheet } from '../components/author-question-sheet';

export function KnowMeRoute() {
  const { self, partner } = usePartner();
  const now = useNow(60_000);
  const day = coupleDay(self?.timezone, partner?.timezone, now);

  // Fire ensure-today once per couple-day (the string only detects rollover —
  // the no-arg RPC computes the authoritative day server-side).
  const ensure = useEnsureToday();
  const firedFor = useRef<string | null>(null);
  useEffect(() => {
    if (firedFor.current !== day) {
      firedFor.current = day;
      ensure.mutate();
    }
    // ensure.mutate is stable; intentionally keyed on the day string only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const { data: today, isLoading } = useToday();
  const dayId = today?.dayId;

  // Live signal: presence drives both the reveal query and partner-submitted.
  useTableSync('know_me_presence', qk.knowMe.reveal(dayId ?? 'none'), {
    filter: dayId ? `day_id=eq.${dayId}` : undefined,
    enabled: !!dayId,
  });

  const { data: mine } = useMyAnswer(dayId);
  const { data: partnerSubmitted } = usePartnerSubmitted(dayId);
  const bothSubmitted = !!mine && !!partnerSubmitted;
  const { data: revealRows } = useReveal(dayId, bothSubmitted);

  const [tab, setTab] = useState<'today' | 'history'>('today');
  const [authoring, setAuthoring] = useState(false);

  return (
    <div className="curtain-reveal space-y-12">
      <PageHeader
        title="Know Me"
        subtitle="One question a day, by candlelight 💛"
      />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'history', label: 'History' },
        ]}
        className="w-full"
      />

      {tab === 'history' ? (
        <section className="space-y-7">
          <p className="eyebrow">The Archive</p>
          <HistoryArchive />
        </section>
      ) : (
        <>
          <section className="space-y-7">
            <p className="eyebrow">Tonight's Question</p>
            {isLoading || !today ? (
              <LoadingScreen />
            ) : bothSubmitted && revealRows ? (
              <RevealCard today={today} rows={revealRows} />
            ) : mine ? (
              <WaitingCard
                today={today}
                ownChoice={mine.own_choice ?? null}
                guessChoice={mine.guess_choice ?? null}
              />
            ) : (
              <DailyCard today={today} />
            )}
          </section>

          {/* The relationship as one gold-stitched line between acts. */}
          <hr className="seam" aria-hidden="true" />

          <section className="space-y-7">
            <p className="eyebrow">The Standings</p>
            <LoveMapPanel />
          </section>
        </>
      )}

      <Fab label="Write a question" onClick={() => setAuthoring(true)}>
        <Plus />
      </Fab>

      <AuthorQuestionSheet
        open={authoring}
        onClose={() => setAuthoring(false)}
      />
    </div>
  );
}
