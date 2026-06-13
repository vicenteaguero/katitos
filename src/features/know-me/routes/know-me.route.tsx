import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { useNow } from '@kernel/hooks';
import { coupleDay } from '@kernel/lib';
import {
  Button,
  Empty,
  Fab,
  LoadingScreen,
  PageHeader,
  Segmented,
} from '@kernel/ui';
import { useTodayAll } from '../api/know-me.queries';
import { useEnsureToday } from '../api/know-me.mutations';
import { QuestionBlock } from '../components/question-block';
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

  const { data: questions, isLoading, isError, refetch } = useTodayAll();
  const items = questions ?? [];
  // The day only ever "loads" while genuinely fetching or first creating it —
  // never an open-ended spinner. Settled-with-nothing gets its own message.
  const settling = (isLoading || ensure.isPending) && items.length === 0;
  const failed = (isError || ensure.isError) && items.length === 0;

  const [tab, setTab] = useState<'today' | 'history'>('today');
  const [authoring, setAuthoring] = useState(false);

  return (
    <div className="curtain-reveal space-y-12">
      <PageHeader
        title="Know Me"
        subtitle="Three questions a day, by candlelight ❤️"
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
            <p className="eyebrow">
              {items.length > 1 ? "Tonight's Questions" : "Tonight's Question"}
            </p>
            {settling ? (
              <LoadingScreen />
            ) : failed ? (
              <Empty
                icon="🕯️"
                title="Couldn't load tonight's questions"
                hint="Check your connection and try again."
                action={<Button onClick={() => void refetch()}>Retry</Button>}
              />
            ) : items.length === 0 ? (
              <Empty
                icon="🌙"
                title="No questions yet"
                hint="Tonight's questions are being set — check back in a moment."
              />
            ) : (
              <div className="space-y-10">
                {items.map((item, i) => (
                  <div key={item.dayId} className="space-y-3">
                    {items.length > 1 && (
                      <p className="font-sans text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted">
                        Question {i + 1} of {items.length}
                      </p>
                    )}
                    <QuestionBlock item={item} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* The relationship as one gold-stitched line between acts. */}
          <hr className="seam" aria-hidden="true" />

          <section className="space-y-7">
            <p className="font-sans text-sm text-muted">The Standings</p>
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
