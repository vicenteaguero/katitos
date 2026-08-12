import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DateTime } from 'luxon';
import { usePartner } from '@kernel/auth';
import { useUpdateMember } from '@kernel/couple';
import { Button } from '@kernel/ui';
import {
  CHANGELOG,
  LATEST,
  LATEST_KEY,
  type ChangelogEntry,
} from '../changelog';
import { sendLoveBurst } from './love-channel';
import './changelog-modal.css';

const SPARKS = 16;

/**
 * "CHANGES ARE MADE!"
 *
 * She asked to be told what her Katito adds — so this is a small occasion
 * rather than a release note: the gilt rays and the slam from the Date Cards
 * reveal, a burst of hearts, and the list in plain words. Shown once per
 * changelog, and again the moment the changelog text changes.
 */
export function ChangelogModal() {
  const { self } = usePartner();
  const update = useUpdateMember();
  const [out, setOut] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const closing = useRef(false);

  const seen = self?.changelog_seen_key ?? null;
  // Wait for the member row before deciding — otherwise it flashes on every
  // boot while `self` is still loading.
  const show = !!self && seen !== LATEST_KEY && !dismissed;

  // A few hearts to go with it, the same burst as Send love.
  useEffect(() => {
    if (!show) return;
    navigator.vibrate?.([0, 30, 40, 30]);
    const t = window.setTimeout(() => sendLoveBurst(''), 380);
    return () => window.clearTimeout(t);
  }, [show]);

  const dismiss = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setOut(true);
    // Remember it server-side so it stays read on every device.
    update.mutate({ changelog_seen_key: LATEST_KEY });
    window.setTimeout(() => setDismissed(true), 300);
  }, [update]);

  if (!show) return null;

  return createPortal(
    <div
      className={`cl-reveal${out ? ' cl-reveal--out' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="What's new"
    >
      <div className="cl-backdrop" aria-hidden="true" />
      <span className="cl-rays-wrap" aria-hidden="true">
        <span className="cl-rays" />
      </span>
      {Array.from({ length: SPARKS }, (_, i) => {
        const angle = (i / SPARKS) * Math.PI * 2 + (i % 2 ? 0.32 : 0);
        const dist = 120 + (i % 5) * 28;
        const size = 5 + (i % 3) * 4;
        return (
          <span
            key={i}
            aria-hidden="true"
            className="cl-spark"
            style={
              {
                width: size,
                height: size,
                background: i % 4 === 0 ? '#fff1c9' : 'var(--gold)',
                '--tx': `${Math.cos(angle) * dist}px`,
                '--ty': `${Math.sin(angle) * dist}px`,
                '--d': `${0.5 + (i % 4) * 0.06}s`,
              } as React.CSSProperties
            }
          />
        );
      })}

      <p className="cl-word relative z-[2] mb-4 text-center">
        CHANGES ARE MADE!
      </p>

      <div className="cl-card marble shadow-loge px-5 py-5">
        <span className="cl-foil" aria-hidden="true" />
        <ChangelogBody entry={LATEST} />
      </div>

      <div className="cl-sign relative z-[2] mt-5 flex flex-col items-center gap-3">
        <p className="font-display text-sm italic text-gold/90">
          By your nerd Katito 🤍
        </p>
        <Button onClick={dismiss}>Show me</Button>
      </div>
    </div>,
    document.body
  );
}

/** The list itself — reused by Settings, so it can never drift from the modal. */
export function ChangelogBody({ entry }: { entry: ChangelogEntry }) {
  return (
    <div className="relative z-[1]">
      <p className="font-sans text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-copper">
        {DateTime.fromISO(entry.date).toFormat('d LLLL yyyy')}
      </p>
      <h2 className="mt-1 font-display text-2xl font-semibold text-brown">
        {entry.title}
      </h2>
      <ul className="mt-3 space-y-2.5">
        {entry.lines.map((line, i) => (
          <li
            key={line}
            className="cl-line flex gap-2 font-sans text-[0.82rem] leading-relaxed text-brown/90"
            style={{ '--i': i } as React.CSSProperties}
          >
            <span aria-hidden="true" className="shrink-0 text-copper">
              ✦
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Everything we've ever added, for the Settings screen. */
export function ChangelogHistory() {
  return (
    <div className="space-y-4">
      {CHANGELOG.map((entry) => (
        <div key={entry.date} className="marble rounded-lg px-4 py-4">
          <ChangelogBody entry={entry} />
          <p className="mt-3 text-right font-display text-xs italic text-brown/70">
            By your nerd Katito 🤍
          </p>
        </div>
      ))}
    </div>
  );
}
