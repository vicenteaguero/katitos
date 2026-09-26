import { useEffect, useRef } from 'react';
import { useHerDayDone } from '@features/habits';
import { sendCheerBurst } from './love-channel';

const NOTES = [
  'All of them, today 🏆',
  'Every habit in 🎉',
  'Day done, Liubimaya 👑',
];

/**
 * The surprise: the tick that finishes her day sets off a festival, on her
 * screen and on his. Only a real finish counts, never a day that was already
 * whole when the app opened, and only once a day however often she unticks.
 */
export function HabitsCheer() {
  const her = useHerDayDone();
  const was = useRef<{ day: string; done: boolean } | null>(null);

  useEffect(() => {
    if (!her) return;
    const prev = was.current;
    was.current = her;
    if (!prev || prev.day !== her.day || prev.done || !her.done) return;
    const key = `habits-cheered:${her.day}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch {
      /* no storage, so it may cheer twice: harmless */
    }
    sendCheerBurst(NOTES[Math.floor(Math.random() * NOTES.length)]);
  }, [her?.day, her?.done]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
