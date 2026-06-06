import { usePresenceTracker } from '../hooks/use-presence-tracker';

/** Invisible: runs presence side-effects. Mounted once in the app shell. */
export function PresenceTracker() {
  usePresenceTracker();
  return null;
}
