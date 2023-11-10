import { renderHook, act } from '@testing-library/react-hooks';
import { useSubject } from '../src/useSubject';
import { BehaviorSubject } from 'rxjs';

const isLoggedIn = new BehaviorSubject(false);
// Do this upon login: isLoggedIn.next(true);

describe('useSubject', () => {
  it('is callable', () => {
    const { result } = renderHook(() => useSubject(isLoggedIn));
    expect(result.current).toBe(false);

    act(() => {
      isLoggedIn.next(true);
    });

    expect(result.current).toBe(true);
  });
});
