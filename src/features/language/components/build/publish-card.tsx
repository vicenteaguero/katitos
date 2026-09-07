import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { Button, Card, Input, SectionLabel } from '@kernel/ui';
import { QuietNote } from '../kit';
import { clockIn, isAsleep } from '../../lib/quiet';
import type { Lesson } from '../../types';

/**
 * Handing a lesson over, and the two numbers that go with it.
 *
 * Publishing is what tells him it exists; nothing reaches his phone until
 * she decides it is ready. Due and length save on blur; the one button
 * flips the status.
 */
export function PublishCard({
  lesson,
  onSave,
}: {
  lesson: Pick<Lesson, 'status' | 'due_on' | 'est_minutes'>;
  onSave: (patch: {
    status?: 'draft' | 'published';
    dueOn?: string | null;
    estMinutes?: number | null;
    wake?: boolean;
  }) => void;
}) {
  const { partner } = usePartner();
  const asleep = isAsleep(partner?.timezone);
  const clock = clockIn(partner?.timezone);
  const [wake, setWake] = useState(false);
  const [dueOn, setDueOn] = useState(lesson.due_on ?? '');
  const [minutes, setMinutes] = useState(
    lesson.est_minutes ? String(lesson.est_minutes) : ''
  );
  useEffect(() => setDueOn(lesson.due_on ?? ''), [lesson.due_on]);
  useEffect(
    () => setMinutes(lesson.est_minutes ? String(lesson.est_minutes) : ''),
    [lesson.est_minutes]
  );
  const published = lesson.status === 'published';

  return (
    <Card tone="hero" className="space-y-2.5">
      <SectionLabel as="p" className="mb-0">
        Publish
      </SectionLabel>
      <p className="font-sans text-xs font-medium leading-relaxed text-muted">
        {published
          ? 'He has it. Every box still saves itself.'
          : 'Draft: only you see it.'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Input
          tone="ink"
          type="date"
          value={dueOn}
          aria-label="Due"
          onChange={(e) => setDueOn(e.target.value)}
          onBlur={() => {
            if ((dueOn || null) !== (lesson.due_on ?? null))
              onSave({ dueOn: dueOn || null });
          }}
          className="min-h-0 px-3 py-2 text-[13px]"
        />
        <Input
          tone="ink"
          value={minutes}
          aria-label="About how long, in minutes"
          inputMode="numeric"
          placeholder="~20 min"
          onChange={(e) => setMinutes(e.target.value.replace(/[^\d]/g, ''))}
          onBlur={() => {
            const est = minutes ? Number(minutes) : null;
            if (est !== (lesson.est_minutes ?? null))
              onSave({ estMinutes: est });
          }}
          className="px-3 py-2 text-[13px]"
        />
      </div>
      <Button
        full
        size="sm"
        variant={published ? 'secondary' : 'primary'}
        onClick={() =>
          onSave({ status: published ? 'draft' : 'published', wake })
        }
      >
        <Send className="h-4 w-4" />
        {published ? 'Put back to draft' : 'Give it to him'}
      </Button>
      {!published && (
        <QuietNote
          clock={clock}
          asleep={asleep}
          wake={wake}
          onWake={setWake}
          className="bg-transparent px-0 py-0"
        />
      )}
    </Card>
  );
}
