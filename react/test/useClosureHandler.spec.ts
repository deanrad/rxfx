import { renderHook } from '@testing-library/react-hooks';
import { ListenerArgs, useClosureListener } from '../src/useClosureHandlers';
import { createEvent } from '@rxfx/service';
import { defaultBus } from '@rxfx/bus';
import { Subscription } from 'rxjs';

const UPLOAD_COMPLETE = createEvent<void>('upload/complete');

describe('useClosureListener', () => {
  const mockResultValue = 2;
  const handlerSpy = jest.fn().mockResolvedValue(mockResultValue);
  const nextSpy = jest.fn();

  describe('First invocation', () => {
    it('subscribes its listener the first time', async () => {
      const { result } = renderHook(() =>
        useClosureListener<number>({
          matches: UPLOAD_COMPLETE,
          handler: handlerSpy,
          observeWith: {
            next: nextSpy,
          },
        })
      );
      defaultBus.trigger(UPLOAD_COMPLETE());

      expect(handlerSpy).toBeCalledWith(UPLOAD_COMPLETE());
      await Promise.resolve();
      expect(nextSpy).toBeCalledWith(mockResultValue);
    });
  });
  describe('When deps change', () => {
    it('subscribes the new listener instead', async () => {
      // LEFTOFF
    //   let firstCall: Subscription;

    //   const { result, rerender } = renderHook(
    //     ({ matches, handler, observeWith, deps }) => {
    //       firstCall = useClosureListener(
    //         { matches, handler, observeWith },
    //         deps
    //       );
    //       return firstCall;
    //     },
    //     {
    //       initialProps: {
    //         matches: UPLOAD_COMPLETE,
    //         handler: handlerSpy,
    //         observeWith: {
    //           next: nextSpy,
    //         },
    //         deps: [1],
    //       },
    //     }
    //   );

    //   expect(result.current.closed).toBeFalsy();
    //   rerender({
    //     matches: UPLOAD_COMPLETE,
    //     handler: handlerSpy,
    //     observeWith: {
    //       next: nextSpy,
    //     },
    //     deps: [17.1],
    //   });
    //   expect(result.current.closed).toBeFalsy();
    // });
  });
});
