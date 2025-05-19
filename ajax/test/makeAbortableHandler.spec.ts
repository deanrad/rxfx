import { makeAbortableHandler } from '../src/makeAbortableHandler';
import { createEffect } from '@rxfx/effect';

describe('makeAbortableHandler', () => {
  // Drive by test just for coverage purposes
  it('Creates a cancelable handler closing over an AbortSignal', () => {
    const mockFetch = jest.fn();

    const effect = createEffect(
      makeAbortableHandler((cat: string, signal) => {
        return mockFetch('/cat?' + cat, { signal });
      })
    );

    effect('meow');

    expect(mockFetch).toHaveBeenCalledWith(
      '/cat?meow',
      expect.objectContaining({
        signal: expect.objectContaining({ aborted: false }),
      })
    );
  });
});
