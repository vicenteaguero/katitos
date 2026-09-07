import type { ReactNode } from 'react';
import { ChevronRight, Mic } from 'lucide-react';
import { BUCKETS } from '@kernel/storage';
import { PlayButton } from '@kernel/ui';
import { cn } from '@kernel/lib';
import { headword, meaningOf } from '../../lib/pick';
import type { Lang, Vocab } from '../../types';

/**
 * One word in a list: the headword with its stress, the transliteration
 * beside it, the meaning under it, and ONE control for her voice - play it
 * when there is a recording, a dashed mic to make one when there is not.
 *
 * The dictionary, a lesson's word list and the picker each drew this row;
 * now they draw one. `url` lets a batch-signed list hand the clip in without
 * a request per word; a row that is not given one signs its own. Everything
 * else about a word (edit, tags, delete) lives on its card, behind `onOpen`.
 */
export function VocabRow({
  word,
  support,
  url,
  onClick,
  onOpen,
  onRecord,
  selected = false,
  leading,
  trailing,
  className,
}: {
  word: Vocab;
  support: Lang;
  /** A signed URL from a batch, when the list already has one. */
  url?: string;
  /** Tapping the text does this - choose it, open it. */
  onClick?: () => void;
  /** A chevron on the right that opens the word's card. */
  onOpen?: () => void;
  /** Offered when the word has no recording: a dashed mic. */
  onRecord?: () => void;
  selected?: boolean;
  /** A checkbox, in select mode. */
  leading?: ReactNode;
  /** Anything else on the right. */
  trailing?: ReactNode;
  className?: string;
}) {
  const text = (
    <>
      <span className="block truncate font-display text-[17px] leading-tight text-fg">
        {headword(word)}
        {word.transliteration && (
          <span className="ml-1.5 font-sans text-xs font-medium text-muted">
            {word.transliteration}
          </span>
        )}
      </span>
      <span className="block truncate font-sans text-xs font-medium text-muted">
        {meaningOf(word, support)}
      </span>
    </>
  );
  return (
    <li
      className={cn(
        'flex min-h-[56px] items-center gap-2.5 py-1.5',
        selected && 'text-gold',
        className
      )}
    >
      {leading}
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-pressed={selected}
          className="min-h-[44px] min-w-0 flex-1 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {text}
        </button>
      ) : (
        <span className="min-w-0 flex-1">{text}</span>
      )}
      {word.audio_path ? (
        url !== undefined ? (
          <PlayButton url={url} size="md" label={`Hear ${headword(word)}`} />
        ) : (
          <PlayButton
            bucket={BUCKETS.languageAudio}
            path={word.audio_path}
            size="md"
            label={`Hear ${headword(word)}`}
          />
        )
      ) : (
        onRecord && (
          <button
            type="button"
            aria-label={`Record ${headword(word)}`}
            onClick={onRecord}
            className="lift-press flex h-10 w-10 shrink-0 items-center justify-center rounded border border-dashed border-gold/40 bg-surface-2 text-muted outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <Mic className="h-[15px] w-[15px]" />
          </button>
        )
      )}
      {trailing}
      {onOpen && (
        <button
          type="button"
          aria-label={`Open ${headword(word)}`}
          onClick={onOpen}
          className="flex h-10 w-7 shrink-0 items-center justify-center rounded text-muted/60 outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-gold"
        >
          <ChevronRight className="h-[15px] w-[15px]" />
        </button>
      )}
    </li>
  );
}
