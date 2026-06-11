import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import {
  Button,
  Field,
  FilePickerButton,
  Input,
  Select,
  Sheet,
  Textarea,
  toast,
} from '@kernel/ui';
import { useAuthorQuestion } from '../api/know-me.mutations';
import type { KnowMeOption } from '../types';

const CATEGORIES = ['general', 'love', 'food', 'quirks', 'future'] as const;
const OPTION_IDS = ['a', 'b', 'c', 'd'] as const;

/** Author a custom question: prompt, category, 4 options (+ optional photos). */
export function AuthorQuestionSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const author = useAuthorQuestion();
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [images, setImages] = useState<Record<string, Blob>>({});

  const reset = () => {
    setPrompt('');
    setCategory('general');
    setLabels({});
    setImages({});
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
          toast.success('Question added — it will be asked soon 💛');
          reset();
          onClose();
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="Write a question">
      <div className="space-y-6">
        <p className="eyebrow">A New Question</p>

        <Field label="Prompt">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What's my…?"
            rows={2}
          />
        </Field>

        <Field label="Category">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <div className="space-y-3">
          {OPTION_IDS.map((id) => (
            <div key={id} className="flex items-center gap-3">
              <Input
                value={labels[id] ?? ''}
                onChange={(e) =>
                  setLabels((l) => ({ ...l, [id]: e.target.value }))
                }
                placeholder={`Option ${id.toUpperCase()}`}
              />
              <FilePickerButton
                onPick={(file) => setImages((im) => ({ ...im, [id]: file }))}
                className={
                  images[id] ? 'gilt-hairline bg-purple/25 text-fg' : ''
                }
              >
                <ImagePlus size={18} />
              </FilePickerButton>
            </div>
          ))}
        </div>

        <Button full disabled={!valid || author.isPending} onClick={submit}>
          Add question
        </Button>
      </div>
    </Sheet>
  );
}
