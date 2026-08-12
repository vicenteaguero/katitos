import { DateTime } from 'luxon';
import { Check, ImagePlus } from 'lucide-react';
import { FilePickerButton, Sheet } from '@kernel/ui';
import { dayKind, type DayKind } from '../lib/polaroid-days';

/**
 * "We forgot, and our days don't line up."
 *
 * The camera button always shoots for YOUR today — that's the muscle memory and
 * it never changes. This is the deliberate, slower path: pick a still-open day
 * and upload from the library. It exists because with eleven hours between us,
 * one of us is regularly living in a day the other hasn't reached yet, and a
 * photo shouldn't be lost just because the clocks disagree.
 *
 * Only days the database would actually accept are listed. Nothing here can
 * talk you into a write that will be refused.
 */
export function CatchUpSheet({
  open,
  onClose,
  days,
  filled,
  selfZone,
  partnerZone,
  partnerName,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  /** Still-writable days, newest first. */
  days: string[];
  /** Days you already have a photo for — offered as "replace". */
  filled: Set<string>;
  selfZone: string | null | undefined;
  partnerZone: string | null | undefined;
  partnerName: string;
  onPick: (day: string, file: File) => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add from your photos"
      size="half"
    >
      <div className="space-y-2">
        <p className="px-1 font-sans text-xs leading-relaxed text-muted">
          Only days that are still today for one of us can be filled. Once
          it&apos;s tomorrow for both, a day closes for good.
        </p>
        {days.map((day) => {
          const kind = dayKind(day, selfZone, partnerZone);
          const already = filled.has(day);
          return (
            <FilePickerButton
              key={day}
              accept="image/*"
              onPick={(file) => onPick(day, file)}
              className="w-full justify-start gap-3 border-0 bg-surface px-4 py-3 text-left"
            >
              <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                <span className="font-sans text-sm font-semibold text-fg">
                  {DateTime.fromISO(day).toFormat('cccc, LLL d')}
                </span>
                <span className="font-sans text-[0.7rem] text-muted">
                  {describe(kind, partnerName)}
                </span>
              </span>
              {already ? (
                <span className="flex shrink-0 items-center gap-1 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-success">
                  <Check className="h-3.5 w-3.5" /> saved
                </span>
              ) : (
                <ImagePlus className="h-4 w-4 shrink-0 text-gold" />
              )}
            </FilePickerButton>
          );
        })}
      </div>
    </Sheet>
  );
}

function describe(kind: DayKind, partnerName: string): string {
  switch (kind) {
    case 'mine':
      return 'today, where you are';
    case 'theirs':
      return `already today for ${partnerName}`;
    case 'grace':
      return 'still open, just';
  }
}
