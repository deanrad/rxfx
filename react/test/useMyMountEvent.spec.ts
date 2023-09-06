import { renderHook } from '@testing-library/react-hooks';
import { useMyMountEvent } from '../src/useMyMountEvent';

describe('useMyMountEvent', () => {
  it('is callable - see https://codesandbox.io/s/rxfx-example-listeners-in-a-component-tree-dv8f0h', () => {
    const { result } = renderHook(() => useMyMountEvent());
    expect(result).toBeTruthy();
  });
});
