import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import {
  Button,
  Field,
  IconButton,
  Input,
  Segmented,
  Sheet,
  Switch,
  toast,
} from '@kernel/ui';
import {
  useAddLovePhrase,
  useDeleteLovePhrase,
  useLovePhrases,
  useUpdateLovePhrase,
} from '../api/love-phrases';
import { renderPhrase } from '../lib/pick-phrase';

type Gender = 'm' | 'f' | 'any';

const GENDERS = [
  { value: 'any' as const, label: 'Both' },
  { value: 'f' as const, label: 'To her' },
  { value: 'm' as const, label: 'To him' },
];

/**
 * The sweet-nothing editor. Admin only - it's rendered nowhere else, and RLS
 * refuses the writes regardless.
 *
 * `gender` is who a phrase may be sent TO. That distinction is the whole
 * reason this exists: feminine lines in a shared pool meant she kept sending
 * him phrases addressed to a woman.
 */
export function PhraseEditor() {
  const { partner } = usePartner();
  const { data: phrases } = useLovePhrases();
  const add = useAddLovePhrase();
  const update = useUpdateLovePhrase();
  const del = useDeleteLovePhrase();

  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [gender, setGender] = useState<Gender>('any');

  const partnerName = partner?.role === 'a' ? 'Katito' : 'Katita';

  const submit = () => {
    if (!text.trim()) return;
    add.mutate(
      { text, gender },
      {
        onSuccess: () => {
          setText('');
          setGender('any');
          setOpen(false);
          toast.success('Added 💌');
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <div className="space-y-2 rounded-lg bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-sans text-sm font-semibold text-fg">
            Sweet nothings
          </p>
          <p className="font-sans text-xs text-muted">
            {phrases?.length ?? 0} in the pot - only you can edit these
          </p>
        </div>
        <IconButton
          label="Add a phrase"
          className="h-9 w-9"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-5 w-5" />
        </IconButton>
      </div>

      <div className="max-h-72 space-y-1 overflow-y-auto">
        {(phrases ?? []).map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 rounded-md px-1 py-1.5"
          >
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate font-sans text-sm ${
                  p.enabled ? 'text-fg' : 'text-muted line-through'
                }`}
              >
                {renderPhrase(p.text, partnerName)}
              </span>
              <span className="font-sans text-[0.6rem] uppercase tracking-[0.12em] text-muted">
                {p.gender === 'any'
                  ? 'both'
                  : p.gender === 'f'
                    ? 'to her'
                    : 'to him'}
              </span>
            </span>
            <Switch
              checked={p.enabled}
              onChange={(next) => update.mutate({ id: p.id, enabled: next })}
              label="Enabled"
            />
            <IconButton
              label="Delete"
              className="h-8 w-8"
              onClick={() => del.mutate(p.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        ))}
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="A new sweet nothing"
        size="half"
      >
        <div className="space-y-3">
          <Field
            label="What does it say?"
            hint="Use {name} where their pet name should go."
          >
            <Input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="My polar bear 🐻‍❄️"
            />
          </Field>
          <Field label="Who can receive it?">
            <Segmented
              full
              options={GENDERS}
              value={gender}
              onChange={setGender}
            />
          </Field>
          <Button full onClick={submit} disabled={add.isPending}>
            Add it
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
