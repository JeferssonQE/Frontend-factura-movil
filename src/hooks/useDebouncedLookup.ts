// hooks/useDebouncedLookup.ts
import { useEffect, useRef } from 'react';

const DEFAULT_DELAY_MS = 500;

export function useDebouncedLookup(
  value: string,
  expectedLength: number,
  onMatch: (value: string) => void,
  delayMs: number = DEFAULT_DELAY_MS
): void {
  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;

  useEffect(() => {
    if (value.length !== expectedLength) return;

    const timer = setTimeout(() => onMatchRef.current(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, expectedLength, delayMs]);
}
