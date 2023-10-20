import { useCallback, useMemo } from 'react';

// Equivalent to useMemo(producer, []). Makes the stability more readable.
export function useStableValue<T>(producer: (...args: any[]) => T) {
  return useMemo(producer, []);
}

// Equivalent to useCallback(producer, []). Makes the stability more readable.
export function useStableCallback<T>(producer: (...args: any[]) => T) {
  return useCallback(producer, []);
}
