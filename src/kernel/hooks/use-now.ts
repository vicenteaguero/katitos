import { useState } from 'react';
import { DateTime } from 'luxon';
import { useInterval } from './use-interval';

/** A ticking `DateTime.now()` that re-renders every `intervalMs`. */
export function useNow(intervalMs = 1000): DateTime {
  const [now, setNow] = useState(() => DateTime.now());
  useInterval(() => setNow(DateTime.now()), intervalMs);
  return now;
}
