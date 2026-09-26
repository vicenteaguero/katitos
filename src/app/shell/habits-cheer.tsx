import { useEffect, useRef } from 'react';
import { useDayDone } from '@features/habits';
import { sendCheerBurst } from './love-channel';

const NOTES_HER = [
  "I'm brownie of you 🤎",
  "All of them today. I'm brownie of you 🤎",
  "Day done, Liubimaya. I'm brownie of you 🤎",
];
const NOTES_HIM = [
  "I'm brownie of you 🤎",
  "All of them today. I'm brownie of you 🤎",
  "Day done, Liubimonkey. I'm brownie of you 🤎",
];

/**
 * The surprise: the tick that finishes someone's day sets off a festival, on
 * both screens. Only a real finish counts, never a day that was already whole
 * when the app opened, and only once a day however often they untick.
 */
export function HabitsCheer() {
  const me = useDayDone();
  const was = useRef<{ day: string; done: boolean } | null>(null);
  // A finish is a tap on this phone. Without this, a stale cached "not done"
  // painted at launch and then corrected by the server looked like one.
  const lastTap = useRef(0);
  useEffect(() => {
    const onTap = () => (lastTap.current = Date.now());
    window.addEventListener('pointerdown', onTap, { passive: true });
    return () => window.removeEventListener('pointerdown', onTap);
  }, []);

  useEffect(() => {
    if (!me) return;
    const prev = was.current;
    was.current = me;
    if (!prev || prev.day !== me.day || prev.done || !me.done) return;
    if (Date.now() - lastTap.current > 5000) return;
    const key = `habits-cheered:${me.day}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch {
      /* no storage, so it may cheer twice: harmless */
    }
    const notes = me.isHim ? NOTES_HIM : NOTES_HER;
    sendCheerBurst(notes[Math.floor(Math.random() * notes.length)], me.isHim);
  }, [me?.day, me?.done]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
