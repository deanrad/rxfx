import { useCallback, useMemo } from 'react';

// Equivalent to useMemo(producer, []). Makes the stability more readable.
export function useStableValue<T>(producer: () => T) {
  return useMemo(producer, []);
}

// Equivalent to useCallback(producer, []). Makes the stability more readable.
export function useStableCallback<T>(producer: () => T) {
  return useCallback(producer, []);
}
