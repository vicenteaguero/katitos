import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import {
  Button,
  FilePickerButton,
  Input,
  Sheet,
  Textarea,
  toast,
} from '@kernel/ui';
import { cn } from '@kernel/lib';
import { useAuthorQuestion } from '../api/know-me.mutations';
import type { KnowMeOption } from '../types';

const CATEGORIES = ['general', 'love', 'food', 'quirks', 'future'] as const;
const OPTION_IDS = ['a', 'b', 'c', 'd'] as const;

/** Author a custom question — compact: prompt, category chips, 2×2 options. */
export function AuthorQuestionSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const author = useAuthorQuestion();
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<string>('love');
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [images, setImages] = useState<Record<string, Blob>>({});
  const [withPics, setWithPics] = useState(false);

  const reset = () => {
    setPrompt('');
    setCategory('love');
    setLabels({});
    setImages({});
    setWithPics(false);
  };

  const valid =
    prompt.trim().length > 0 &&
    OPTION_IDS.every((id) => (labels[id] ?? '').trim().length > 0);

  const submit = () => {
    if (!valid) return;
    const options: KnowMeOption[] = OPTION_IDS.map((id) => ({
      id,
      label: labels[id].trim(),
    }));
    author.mutate(
      { prompt: prompt.trim(), category, options, optionImages: images },
      {
        onSuccess: () => {
          toast.success('Question added — it will be asked soon ❤️');
          reset();
          onClose();
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="New question">
      <div className="space-y-4">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What's my…?"
          rows={2}
          className="font-display text-lg"
        />

        {/* Category as quiet chips — no dropdown. */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                'lift-press rounded-full px-3 py-1 font-sans text-xs font-semibold capitalize',
                category === c
                  ? 'bg-accent text-accent-fg'
                  : 'bg-surface-2 text-muted'
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Four answers, 2×2. Images are opt-in to keep it clean. */}
        <div className="grid grid-cols-2 gap-2">
          {OPTION_IDS.map((id) => (
            <div key={id} className="flex items-center gap-1.5">
              <Input
                value={labels[id] ?? ''}
                onChange={(e) =>
                  setLabels((l) => ({ ...l, [id]: e.target.value }))
                }
                placeholder={`Answer ${id.toUpperCase()}`}
              />
              {withPics && (
                <FilePickerButton
                  onPick={(file) => setImages((im) => ({ ...im, [id]: file }))}
                  className={cn(
                    'shrink-0',
                    images[id] ? 'bg-purple/25 text-fg' : ''
                  )}
                >
                  <ImagePlus size={16} />
                </FilePickerButton>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setWithPics((v) => !v)}
            className="font-sans text-xs font-semibold text-gold"
          >
            {withPics ? '— text only' : '+ add pictures'}
          </button>
          <Button
            disabled={!valid || author.isPending}
            onClick={submit}
            className="px-6"
          >
            Add
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
