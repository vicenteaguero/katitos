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
import {
  useArchiveHabit,
  useCreateHabit,
  useUpdateHabit,
} from '../api/streak.mutations';
import type { Habit } from '../types';
import { EmojiField } from './emoji-field';

export interface HabitEditorProps {
  open: boolean;
  onClose: () => void;
  /** Editing an existing habit, or null to create a new one. */
  habit: Habit | null;
  /** Today or tomorrow, decided by the caller. */
  effectiveFrom: string;
  startsToday: boolean;
}

const PER_WEEK = ['1', '2', '3', '4', '5', '6', '7'] as const;

/**
 * A habit is three answers: what, which face, how many days a week.
 *
 * Seven days a week is not a weekly habit with a target of seven, it is a daily
 * one - so picking 7 stores it as daily and it behaves like every other daily
 * habit, no special case anywhere downstream.
 */
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
  const [emoji, setEmoji] = useState('💧');
  const [perWeek, setPerWeek] = useState(7);

  useEffect(() => {
    if (!open) return;
    setTitle(habit?.title ?? '');
    setEmoji(habit?.emoji ?? '💧');
    setPerWeek(
      habit ? (habit.schedule === 'daily' ? 7 : habit.target_per_week) : 7
    );
  }, [open, habit]);

  const schedule = perWeek === 7 ? 'daily' : 'weekly';
  const targetPerWeek = perWeek === 7 ? 1 : perWeek;

  const save = async () => {
    const clean = title.trim();
    if (!clean) return;
    if (habit) {
      await update.mutateAsync({
        id: habit.id,
        title: clean,
        emoji,
        schedule,
        targetPerWeek,
      });
    } else {
      await create.mutateAsync({
        title: clean,
        emoji,
        schedule,
        targetPerWeek,
        effectiveFrom,
      });
    }
    onClose();
  };

  const putAway = async () => {
    if (!habit) return;
    const yes = await confirmDialog({
      title: `Put away ${habit.title}?`,
      body: 'The empty slot only comes back when the streak earns it again.',
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
      <div className="space-y-3 pb-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Drink 2 litres"
          maxLength={40}
          autoFocus
        />

        <EmojiField value={emoji} onChange={setEmoji} />

        <div>
          <Kicker>Days per week</Kicker>
          <Segmented
            className="mt-1.5"
            full
            shape="bar"
            label="Days per week"
            value={String(perWeek)}
            onChange={(v) => setPerWeek(Number(v))}
            options={PER_WEEK.map((n) => ({ value: n, label: n }))}
          />
        </div>

        <div className="flex gap-2">
          <Button
            full
            onClick={save}
            disabled={!title.trim() || create.isPending || update.isPending}
          >
            {habit ? 'Save' : startsToday ? 'Add it' : 'Add it, from tomorrow'}
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
