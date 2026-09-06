import { useMemo, useState } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { Button, Dialog, Kicker, Textarea, toast } from '@kernel/ui';
import { useAddVocabMany } from '../api/vocab';
import { parseWordList, splitKnown } from '../lib/import-words';
import { LANG_LABELS, type Lang, type Vocab } from '../types';

/**
 * Paste a list, get a dictionary.
 *
 * Whatever she has - a spreadsheet column pair, a note, a message - one word
 * per line, meaning beside it. The preview says what will go in and what is
 * already here before anything is written.
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
      title={`Words in ${LANG_LABELS[termLang]}, many at once`}
      size="md"
    >
      <div className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          spellCheck={false}
          autoFocus
          placeholder={`стол = table\nстул\tchair\tstul #furniture\nокно - window`}
          className="font-display"
        />
        <p className="font-sans text-xs text-muted">
          One a line. A tab, “=”, “, ”, “;” or “:” between the word and its
          meaning; a third part is how it sounds; #tags anywhere.
        </p>
        {parsed.length > 0 && (
          <div className="space-y-1.5 rounded-lg bg-surface px-3 py-2">
            <Kicker as="p">
              {fresh.length} new
              {known.length ? ` - ${known.length} already here` : ''}
            </Kicker>
            <ul className="max-h-40 space-y-0.5 overflow-y-auto font-sans text-sm">
              {fresh.slice(0, 40).map((w, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-display text-fg">{w.term}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">
                    {w.meaning || '-'}
                  </span>
                </li>
              ))}
              {fresh.length > 40 && (
                <li className="text-muted">… and {fresh.length - 40} more</li>
              )}
            </ul>
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
          <ClipboardPaste size={15} /> Add {fresh.length}{' '}
          {fresh.length === 1 ? 'word' : 'words'}
        </Button>
      </div>
    </Dialog>
  );
}
