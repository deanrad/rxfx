import { renderHook } from '@testing-library/react-hooks';
import { createEvent } from '@rxfx/service';
import { defaultBus } from '@rxfx/bus';
import { Subscription } from 'rxjs';
import { useClosureFilter, useClosureListener } from '../src/useClosureHandlers';

const UPLOAD_COMPLETE = createEvent<void>('upload/complete');

describe('useClosureListener', () => {
  let errorSub: Subscription;
  beforeAll(() => (errorSub = defaultBus.errors.subscribe(console.error)));
  afterAll(() => errorSub?.unsubscribe());
  beforeEach(() => jest.clearAllMocks());

  const mockResultValue = 2;
  const handlerSpy = jest.fn().mockResolvedValue(mockResultValue);
  const nextSpy = jest.fn();
  const handlerArgs = {
    matches: UPLOAD_COMPLETE,
    handler: handlerSpy,
    observeWith: { next: nextSpy },
  };

  describe('First invocation', () => {
    it('subscribes its listener the first time', async () => {
      const { result } = renderHook(
        (props = []) => {
          useClosureListener<number>(...props);
        },
        { initialProps: [handlerArgs, []] }
      );
      defaultBus.trigger(UPLOAD_COMPLETE());

      expect(handlerSpy).toBeCalledWith(UPLOAD_COMPLETE());
      await Promise.resolve();
      expect(nextSpy).toBeCalledWith(mockResultValue);
    });
  });

  describe('When deps change', () => {
    it('subscribes the new listener instead', async () => {
      const firstDeps = [1];
      const secondDeps = [2];

      const { result, rerender } = renderHook(
        (props = []) => useClosureListener<number>(...props),
        { initialProps: [handlerArgs, firstDeps] }
      );

      // The first render will call through with the first handler value
      defaultBus.trigger(UPLOAD_COMPLETE());
      await Promise.resolve();
      expect(nextSpy).toBeCalledWith(mockResultValue);

      // The 2nd render will call through with the 2nd handler value - but not both
      // since the subscription was unsubscribed!
      rerender([
        {
          ...handlerArgs,
          handler: jest.fn().mockResolvedValue(3.14),
        },
        secondDeps,
      ]);
      defaultBus.trigger(UPLOAD_COMPLETE());
      await Promise.resolve();
      expect(nextSpy.mock.calls).toEqual([[2], [3.14]]);
    });
  });
});

describe('useClosureFilter', () => {
  it('works just like useClosureListener but for filters', () => {
    const filterSpy = jest.fn();
    const { result } = renderHook(
      (props = []) => {
        useClosureFilter<number>(...props);
      },
      { initialProps: [{ matches: UPLOAD_COMPLETE, filter: filterSpy }, []] }
    );
    defaultBus.trigger(UPLOAD_COMPLETE());
    expect(filterSpy).toHaveBeenCalledWith(UPLOAD_COMPLETE());
  });
});
