import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { Button, Field, Sheet, Textarea, toast } from '@kernel/ui';
import { useUpdateMilestone } from '../api/tree.mutations';
import type { TreeMilestone } from '../types';

interface MilestoneSheetProps {
  milestone: TreeMilestone | null;
  onClose: () => void;
}

export function MilestoneSheet({ milestone, onClose }: MilestoneSheetProps) {
  const update = useUpdateMilestone();
  const [note, setNote] = useState('');

  useEffect(() => {
    setNote(milestone?.note ?? '');
  }, [milestone?.id, milestone?.note]);

  const save = () => {
    if (!milestone) return;
    update.mutate(
      { id: milestone.id, note: note.trim() || null },
      {
        onSuccess: () => {
          toast.success('Saved 🌳');
          onClose();
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <Sheet
      open={milestone !== null}
      onClose={onClose}
      title={milestone ? `${milestone.emoji ?? '🌟'} ${milestone.title}` : ''}
    >
      {milestone && (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            {DateTime.fromISO(milestone.achieved_at).toFormat('LLLL d, yyyy')}
          </p>
          <Field label="Note">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was happening when we reached this?"
            />
          </Field>
          <Button full onClick={save} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
