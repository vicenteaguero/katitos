import type { ReactNode } from 'react';
import { BUCKETS } from '@kernel/storage';
import { PlayButton } from '@kernel/ui';
import { cn } from '@kernel/lib';
import { headword, meaningOf } from '../../lib/pick';
import type { Lang, Vocab } from '../../types';

/**
 * One word in a list: the headword with its stress, the transliteration
 * beside it, the meaning under it, and her recording if there is one.
 *
 * The dictionary, a lesson's word list and the picker each drew this row;
 * now they draw one. `url` lets a batch-signed list hand the clip in without
 * a request per word; a row that is not given one signs its own.
 */
export function VocabRow({
  word,
  support,
  url,
  onClick,
  selected = false,
  trailing,
  className,
}: {
  word: Vocab;
  support: Lang;
  /** A signed URL from a batch, when the list already has one. */
  url?: string;
  /** Tapping the text does this - choose it, open it. */
  onClick?: () => void;
  selected?: boolean;
  /** Controls on the right: edit, delete, a checkmark. */
  trailing?: ReactNode;
  className?: string;
}) {
  const text = (
    <>
      <span className="block font-display text-base text-fg">
        {headword(word)}
        {word.transliteration && (
          <span className="ml-2 font-sans text-xs text-muted">
            {word.transliteration}
          </span>
        )}
      </span>
      <span className="block truncate font-sans text-xs text-muted">
        {meaningOf(word, support)}
      </span>
    </>
  );
  return (
    <li
      className={cn(
        'flex items-center gap-2 py-2',
        selected && 'text-gold',
        className
      )}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-pressed={selected}
          className="min-w-0 flex-1 text-left"
        >
          {text}
        </button>
      ) : (
        <span className="min-w-0 flex-1">{text}</span>
      )}
      {word.audio_path &&
        (url !== undefined ? (
          <PlayButton url={url} size="sm" />
        ) : (
          <PlayButton
            bucket={BUCKETS.languageAudio}
            path={word.audio_path}
            size="sm"
          />
        ))}
      {trailing}
    </li>
  );
}
