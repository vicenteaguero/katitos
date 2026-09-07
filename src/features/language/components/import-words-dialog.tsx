import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Button, Dialog, Textarea, toast } from '@kernel/ui';
import { useAddVocabMany } from '../api/vocab';
import { parseWordList, splitKnown } from '../lib/import-words';
import type { Lang, Vocab } from '../types';

/**
 * Paste a list, get a dictionary.
 *
 * Whatever she has - a spreadsheet column pair, a note, a message - one word
 * per line, meaning beside it. The line under the box says what will go in
 * and what is already here before anything is written.
 */
export function ImportWordsDialog({
  open,
  onClose,
  termLang,
  meaningLang,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  termLang: Lang;
  meaningLang: Lang;
  /** What the dictionary already holds in this language. */
  existing: Vocab[];
}) {
  const [text, setText] = useState('');
  const add = useAddVocabMany();
  const parsed = useMemo(() => parseWordList(text), [text]);
  const { fresh, known } = useMemo(
    () =>
      splitKnown(
        parsed,
        existing.map((w) => w[termLang] ?? '').filter(Boolean)
      ),
    [parsed, existing, termLang]
  );

  return (
    <Dialog
      placement="auto"
      open={open}
      onClose={onClose}
      title="Paste a list"
      size="md"
    >
      <div className="space-y-3">
        <Textarea
          tone="ink"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          spellCheck={false}
          autoFocus
          placeholder={`счёт = the bill\nофициант\tthe waiter\tofitsiant #food\nзаказать - to order`}
          className="font-mono text-[13px] leading-[1.8]"
        />
        <p className="font-sans text-xs text-muted">
          One a line. A tab, “=”, “, ”, “;” or “:” between the word and its
          meaning; a third part is how it sounds; #tags anywhere.
        </p>
        {parsed.length > 0 && (
          <div className="space-y-1.5">
            <p className="flex items-center gap-2 font-sans text-xs font-medium text-muted">
              <Check className="h-3.5 w-3.5 text-[#a9b37e]" />
              {parsed.length} {parsed.length === 1 ? 'word' : 'words'}{' '}
              recognised, {known.length} already in the dictionary
            </p>
            {fresh.length > 0 && (
              <ul className="max-h-36 space-y-0.5 overflow-y-auto rounded border border-fg/[0.06] bg-surface px-3 py-2 font-sans text-sm">
                {fresh.slice(0, 5).map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-display text-base text-fg">
                      {w.term}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted">
                      {w.meaning || '-'}
                    </span>
                  </li>
                ))}
                {fresh.length > 5 && (
                  <li className="text-muted">and {fresh.length - 5} more</li>
                )}
              </ul>
            )}
          </div>
        )}
        <Button
          full
          disabled={!fresh.length || add.isPending}
          onClick={() =>
            add.mutate(
              { termLang, meaningLang, words: fresh },
              {
                onSuccess: (n) => {
                  setText('');
                  onClose();
                  toast.success(`${n} ${n === 1 ? 'word' : 'words'} added`);
                },
              }
            )
          }
        >
          Add {fresh.length} {fresh.length === 1 ? 'word' : 'words'}
        </Button>
      </div>
    </Dialog>
  );
}
