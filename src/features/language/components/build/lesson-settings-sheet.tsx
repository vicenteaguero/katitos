import { useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { Button, Dialog, Field, FieldRow, Input, Segmented } from '@kernel/ui';
import { QuietNote } from '../kit';
import { clockIn, isAsleep } from '../../lib/quiet';
import type { LessonKind } from '../../types';

/**
 * The lesson's name, its kind, a line under it. On a phone, where there is
 * no Publish card in a rail, this sheet also carries the due date, the
 * length and the button that hands it over (`full`).
 */
export function LessonSettingsSheet({
  open,
  onClose,
  lesson,
  onSave,
  full = false,
}: {
  open: boolean;
  onClose: () => void;
  lesson: {
    title: string;
    subtitle: string | null;
    kind: string;
    status: string;
    due_on: string | null;
    est_minutes: number | null;
  };
  onSave: (patch: {
    title?: string;
    subtitle?: string | null;
    kind?: LessonKind;
    status?: 'draft' | 'published';
    dueOn?: string | null;
    estMinutes?: number | null;
    wake?: boolean;
  }) => void;
  full?: boolean;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [subtitle, setSubtitle] = useState(lesson.subtitle ?? '');
  const [kind, setKind] = useState(lesson.kind as LessonKind);
  const [dueOn, setDueOn] = useState(lesson.due_on ?? '');
  const [minutes, setMinutes] = useState(
    lesson.est_minutes ? String(lesson.est_minutes) : ''
  );
  // His clock, next to the button that reaches his phone.
  const { partner } = usePartner();
  const asleep = isAsleep(partner?.timezone);
  const clock = clockIn(partner?.timezone);
  const [wake, setWake] = useState(false);

  /**
   * Only what she actually changed.
   *
   * Sending every field meant a rename made on the phone was overwritten by
   * whatever this device had when the sheet opened.
   */
  const changes = () => {
    const patch: Parameters<typeof onSave>[0] = {};
    if (title !== lesson.title) patch.title = title;
    if ((subtitle || null) !== (lesson.subtitle ?? null)) {
      patch.subtitle = subtitle || null;
    }
    if (kind !== lesson.kind) patch.kind = kind;
    if (full) {
      if ((dueOn || null) !== (lesson.due_on ?? null))
        patch.dueOn = dueOn || null;
      const est = minutes ? Number(minutes) : null;
      if (est !== (lesson.est_minutes ?? null)) patch.estMinutes = est;
    }
    return patch;
  };

  const published = lesson.status === 'published';

  return (
    <Dialog
      placement="auto"
      open={open}
      onClose={onClose}
      title="This lesson"
      size="md"
    >
      <div className="space-y-3">
        <Segmented
          full
          shape="bar"
          value={kind}
          onChange={(v) => setKind(v as LessonKind)}
          label="Kind"
          options={[
            { value: 'lesson', label: 'Lesson' },
            { value: 'homework', label: 'Homework' },
            { value: 'exam', label: 'Exam' },
          ]}
        />
        <Field label="Called">
          <Input
            tone="ink"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="A line under it">
          <Input
            tone="ink"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </Field>
        {full && (
          <FieldRow>
            <Field label="Due">
              <Input
                tone="ink"
                type="date"
                value={dueOn}
                onChange={(e) => setDueOn(e.target.value)}
              />
            </Field>
            <Field label="About how long" hint="Minutes">
              <Input
                tone="ink"
                value={minutes}
                onChange={(e) =>
                  setMinutes(e.target.value.replace(/[^\d]/g, ''))
                }
                inputMode="numeric"
                placeholder="20"
              />
            </Field>
          </FieldRow>
        )}
        <Button
          full
          variant={full ? 'secondary' : 'primary'}
          onClick={() => {
            const patch = changes();
            if (Object.keys(patch).length) onSave(patch);
            onClose();
          }}
        >
          Save
        </Button>
        {/* Publishing is what tells him it exists - nothing reaches his phone
            until she decides it is ready. */}
        {full && (
          <>
            <Button
              full
              onClick={() => {
                onSave({
                  ...changes(),
                  status: published ? 'draft' : 'published',
                  wake,
                });
                onClose();
              }}
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
              />
            )}
          </>
        )}
        <p className="font-sans text-xs text-muted">
          <Trash2 className="mr-1 inline h-3 w-3" />
          To put the whole lesson away, use the course screen.
        </p>
      </div>
    </Dialog>
  );
}
