import { useEffect, useRef } from 'react';

/** setInterval as a hook. Pass delay=null to pause. */
export function useInterval(callback: () => void, delay: number | null): void {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
