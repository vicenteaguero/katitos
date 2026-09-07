import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlignLeft,
  BookMarked,
  ChevronRight,
  Minus,
  Table,
} from 'lucide-react';
import { cn } from '@kernel/lib';
import {
  Button,
  Dialog,
  Field,
  Input,
  SectionLabel,
  Segmented,
  Select,
} from '@kernel/ui';
import { useCreateLesson, useCreateUnit } from '../api/lessons.mutations';
import { defaultTemplateFor, LESSON_TEMPLATES } from '../lib/templates';
import type { LessonKind, UnitWithLessons } from '../types';

const TEMPLATE_ICON = {
  blank: Minus,
  words: BookMarked,
  grammar: Table,
  listening: AlignLeft,
  homework: AlignLeft,
  exam: AlignLeft,
} as const;

const PLACEHOLDER: Record<LessonKind, string> = {
  lesson: 'Asking for the bill',
  homework: 'Домашка: numbers 1 to 20',
  exam: 'Экзамен: the basics',
};

/**
 * The sheet a new lesson starts from: its kind, its name, the shape it
 * begins with, and which unit it lands in. One grabber, one title, one
 * primary action, then straight into the builder.
 *
 * `unitId` pins the unit (the per-unit "add" in edit mode); without it the
 * sheet offers a picker, defaulting to the last unit, and makes "Unit 1"
 * itself when the course has none yet.
 */
export function NewLessonSheet({
  open,
  onClose,
  courseId,
  units,
  unitId,
}: {
  open: boolean;
  onClose: () => void;
  courseId: string;
  units: UnitWithLessons[];
  unitId?: string | null;
}) {
  const navigate = useNavigate();
  const createLesson = useCreateLesson();
  const createUnit = useCreateUnit();
  const [kind, setKind] = useState<LessonKind>('lesson');
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState(defaultTemplateFor('lesson'));
  const [unit, setUnit] = useState<string>('');

  // Fresh every time it opens.
  useEffect(() => {
    if (!open) return;
    setKind('lesson');
    setTitle('');
    setTemplate(defaultTemplateFor('lesson'));
    setUnit(unitId ?? units[units.length - 1]?.id ?? '');
  }, [open, unitId, units]);

  const pending = createLesson.isPending || createUnit.isPending;
  const templates = LESSON_TEMPLATES.filter((t) => t.for.includes(kind));

  const create = async () => {
    if (!title.trim() || pending) return;
    let target = units.find((u) => u.id === unit);
    let position = target?.lessons.length ?? 0;
    let targetId = target?.id;
    if (!targetId) {
      targetId = await createUnit.mutateAsync({
        courseId,
        title: 'Unit 1',
        position: units.length,
      });
      position = 0;
      target = undefined;
    }
    createLesson.mutate(
      {
        courseId,
        unitId: targetId,
        title,
        kind,
        position,
        blocks: LESSON_TEMPLATES.find((t) => t.id === template)?.blocks,
      },
      {
        onSuccess: (id) => {
          onClose();
          navigate(`/language/build/${id}`);
        },
      }
    );
  };

  return (
    <Dialog
      placement="auto"
      open={open}
      onClose={onClose}
      title="New lesson"
      size="md"
    >
      <div className="space-y-3.5">
        <Segmented
          full
          shape="bar"
          label="Kind"
          value={kind}
          onChange={(v) => {
            // Homework and exams start from their own sheet, not a lesson's.
            setKind(v as LessonKind);
            setTemplate(defaultTemplateFor(v as LessonKind));
          }}
          options={[
            { value: 'lesson', label: 'Lesson' },
            { value: 'homework', label: 'Homework' },
            { value: 'exam', label: 'Exam' },
          ]}
        />
        <Input
          tone="ink"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={PLACEHOLDER[kind]}
          aria-label="Called"
          autoFocus
          className="font-semibold"
        />
        {!unitId && units.length > 1 && (
          <Field label="In">
            <Select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="rounded"
            >
              {units.map((u, i) => (
                <option key={u.id} value={u.id}>
                  Unit {i + 1}, {u.title}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div>
          <SectionLabel as="p">Start from</SectionLabel>
          <div
            role="radiogroup"
            aria-label="Start from"
            className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]"
          >
            {templates.map((t) => {
              const Icon =
                TEMPLATE_ICON[t.id as keyof typeof TEMPLATE_ICON] ?? AlignLeft;
              const on = template === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTemplate(t.id)}
                  className={cn(
                    'lift-press w-[124px] shrink-0 snap-start rounded-[14px] border bg-surface p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-gold',
                    on ? 'border-gold' : 'border-fg/[0.08]'
                  )}
                >
                  <Icon
                    className={cn('h-4 w-4', on ? 'text-gold' : 'text-muted')}
                  />
                  <span className="mt-2 block font-sans text-[13px] font-bold text-fg">
                    {t.title}
                  </span>
                  <span className="block font-sans text-[11px] font-medium text-muted">
                    {t.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <Button full disabled={!title.trim() || pending} onClick={create}>
          Create and write it <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </Dialog>
  );
}
