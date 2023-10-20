import { renderHook } from '@testing-library/react';
import { useStableValue, useStableCallback } from '../src/stabilityHooks';
describe('Stability Hooks', () => {
  describe('useStableValue', () => {
    const producer = () => ({ hello: () => null });

    it('preserves value and types', () => {
      const { result, rerender } = renderHook(() => useStableValue(producer));
      const result1 = result.current;

      rerender();
      const result2 = result.current;
      expect(result1).toBe(result2);
    });
  });

  describe('useStableCallback', () => {
    const cb = () => ({ hello: () => 'world' });

    it('preserves value and types', () => {
      const { result, rerender } = renderHook(() => useStableCallback(cb));
      const result1 = result.current;

      rerender();
      const result2 = result.current;
      expect(result1).toBe(result2);
    });

    it('works with argument-accepting functions', () => {
      const takesArgs = (where) => ({ hello: () => where });
      const { result, rerender } = renderHook(() => useStableCallback(takesArgs));
      const result1 = result.current;

      rerender();
      const result2 = result.current;
      expect(result1).toBe(result2);
    });
  });
});
