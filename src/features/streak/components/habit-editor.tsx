import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Button,
  Input,
  Kicker,
  Segmented,
  Sheet,
  confirmDialog,
} from '@kernel/ui';
import { cn } from '@kernel/lib';
import {
  useArchiveHabit,
  useCreateHabit,
  useUpdateHabit,
} from '../api/streak.mutations';
import type { Habit } from '../types';

/**
 * A small palette rather than a keyboard.
 *
 * An emoji picker on iOS means leaving the app in your head; twenty-four things
 * two people might actually promise each other is faster and looks tidier in a
 * row of circles.
 */
const EMOJI = [
  '💧',
  '🏃',
  '📖',
  '🧘',
  '💊',
  '🥗',
  '😴',
  '🚶',
  '🦷',
  '🧴',
  '✍️',
  '🎧',
  '🌿',
  '🎸',
  '🧹',
  '💪',
  '☀️',
  '📷',
  '🇷🇺',
  '🇨🇱',
  '🕯️',
  '🎨',
  '🧠',
  '💌',
];

export interface HabitEditorProps {
  open: boolean;
  onClose: () => void;
  /** Editing an existing habit, or null to create a new one. */
  habit: Habit | null;
  /** Today or tomorrow, decided by the caller - see the note on the field. */
  effectiveFrom: string;
  startsToday: boolean;
}

export function HabitEditor({
  open,
  onClose,
  habit,
  effectiveFrom,
  startsToday,
}: HabitEditorProps) {
  const create = useCreateHabit();
  const update = useUpdateHabit();
  const archive = useArchiveHabit();

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState(EMOJI[0]);
  const [schedule, setSchedule] = useState<'daily' | 'weekly'>('daily');
  const [target, setTarget] = useState(3);

  useEffect(() => {
    if (!open) return;
    setTitle(habit?.title ?? '');
    setEmoji(habit?.emoji ?? EMOJI[0]);
    setSchedule((habit?.schedule as 'daily' | 'weekly') ?? 'daily');
    setTarget(habit?.target_per_week ?? 3);
  }, [open, habit]);

  const save = async () => {
    const clean = title.trim();
    if (!clean) return;
    if (habit) {
      await update.mutateAsync({
        id: habit.id,
        title: clean,
        emoji,
        schedule,
        targetPerWeek: target,
      });
    } else {
      await create.mutateAsync({
        title: clean,
        emoji,
        schedule,
        targetPerWeek: schedule === 'weekly' ? target : 1,
        effectiveFrom,
      });
    }
    onClose();
  };

  const putAway = async () => {
    if (!habit) return;
    const yes = await confirmDialog({
      title: `Put away ${habit.title}?`,
      body: 'The days you already lived keep it. The empty slot only comes back when the streak earns it again.',
      confirmLabel: 'Put it away',
      danger: true,
    });
    if (!yes) return;
    await archive.mutateAsync(habit.id);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={habit ? 'Edit habit' : 'New habit'}
      size="auto"
    >
      <div className="space-y-4 pb-2">
        <div>
          <Kicker>What is it</Kicker>
          <Input
            className="mt-1.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Drink 2 litres"
            maxLength={40}
            autoFocus
          />
        </div>

        <div>
          <Kicker>Its face</Kicker>
          <div className="mt-1.5 grid grid-cols-8 gap-1.5">
            {EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                aria-label={e}
                aria-pressed={emoji === e}
                className={cn(
                  'lift-press grid h-10 place-items-center rounded-lg text-[20px]',
                  emoji === e ? 'bg-accent' : 'bg-surface-2'
                )}
                style={
                  emoji === e
                    ? { border: '1px solid rgba(228,195,106,.45)' }
                    : undefined
                }
              >
                <span aria-hidden="true">{e}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Kicker>How often</Kicker>
          <Segmented
            className="mt-1.5"
            full
            label="How often"
            value={schedule}
            onChange={setSchedule}
            options={[
              { value: 'daily', label: 'Every day' },
              { value: 'weekly', label: 'Some days' },
            ]}
          />
          {schedule === 'weekly' && (
            <>
              <Segmented
                className="mt-2"
                full
                shape="bar"
                label="Times a week"
                value={String(target)}
                onChange={(v) => setTarget(Number(v))}
                options={[2, 3, 4, 5].map((n) => ({
                  value: String(n),
                  label: `${n}×`,
                }))}
              />
              <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-muted">
                A habit like this never breaks a single day. It breaks the week
                that ends short, and until you reach {target} the days of that
                week wait instead of counting.
              </p>
            </>
          )}
        </div>

        {!habit && (
          <p className="font-sans text-[11px] leading-relaxed text-muted">
            {startsToday
              ? 'It counts from today, since it is your first one.'
              : 'It starts counting tomorrow, so adding it tonight cannot cost the streak.'}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            full
            onClick={save}
            disabled={!title.trim() || create.isPending || update.isPending}
          >
            {habit ? 'Save' : 'Add it'}
          </Button>
          {habit && (
            <Button
              variant="destructive"
              onClick={putAway}
              aria-label="Put away"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
