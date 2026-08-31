import { DateTime } from 'luxon';
import { Check, Clock, ImagePlus } from 'lucide-react';
import { FilePickerButton, Sheet } from '@kernel/ui';
import { cn } from '@kernel/lib';
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
  partnerName,
  urgentDay,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  /** Still-writable days, newest first. */
  days: string[];
  /** Days you already have a photo for — offered as "replace". */
  filled: Set<string>;
  selfZone: string | null | undefined;
  partnerName: string;
  /**
   * The day a last-call notification sent us here for. Its row arrives lit and
   * breathing, so the thing you were told about is the thing under your thumb —
   * arriving at a list and hunting for the date would waste the warning.
   */
  urgentDay?: string | null;
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
          const kind = dayKind(day, selfZone);
          const already = filled.has(day);
          const urgent = day === urgentDay && !already;
          return (
            <FilePickerButton
              key={day}
              accept="image/*"
              onPick={(file) => onPick(day, file)}
              className={cn(
                'w-full justify-start gap-3 border-0 px-4 py-3 text-left',
                urgent ? 'catchup-urgent bg-surface-2' : 'bg-surface'
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                <span className="font-sans text-sm font-semibold text-fg">
                  {DateTime.fromISO(day).toFormat('cccc, LLL d')}
                </span>
                <span
                  className={cn(
                    'flex items-center gap-1 font-sans text-[0.7rem]',
                    urgent ? 'text-gold' : 'text-muted'
                  )}
                >
                  {urgent && <Clock className="h-3 w-3 shrink-0" />}
                  {urgent
                    ? `closing soon — ${describe(kind, partnerName)}`
                    : describe(kind, partnerName)}
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
  return kind === 'mine'
    ? 'today, where you are'
    : `already today for ${partnerName}`;
}
