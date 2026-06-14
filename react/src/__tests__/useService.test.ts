import { act, renderHook } from '@testing-library/react';
import { createEffect } from '@rxfx/effect';
import { Subject, throwError } from 'rxjs';
import { useService } from '../useService';

describe('useService', () => {
  const createCancelableEffect = () => {
    const fx = createEffect<string, string>(() => new Subject<string>());
    jest.spyOn(fx, 'cancelCurrent');
    jest.spyOn(fx, 'cancelCurrentAndQueued');
    return fx;
  };

  it('provides state, isActive, and request function', () => {
    const fx = createEffect<string, string>(() => new Subject<string>());
    const { result } = renderHook(() => useService(fx));

    expect(result.current.state).toBe(null);
    expect(result.current.isActive).toBe(false);
    expect(typeof result.current.request).toBe('function');
  });

  it('binds request to the effect instance and invokes the handler', async () => {
    const handler = jest.fn(() => new Subject<string>());
    const fx = createEffect<string, string>(handler);
    const { result } = renderHook(() => useService(fx));

    await act(async () => {
      result.current.request('ping');
      await Promise.resolve();
    });

    expect(handler).toHaveBeenCalledWith('ping');
  });

  it('updates state when the effect reducer emits a response', async () => {
    const responses = new Subject<string>();
    const fx = createEffect<string, string>(() => responses);
    fx.reduceWith(
      (state, evt) => (evt.type === 'response' ? evt.payload : state),
      'idle'
    );

    const { result } = renderHook(() => useService(fx));

    await act(async () => {
      result.current.request('ready');
      await Promise.resolve();
      responses.next('ready');
    });

    expect(result.current.state).toBe('ready');
  });

  it('updates currentError when the effect errors', async () => {
    const err = new Error('boom');
    const fx = createEffect<string, string>(() => throwError(() => err));
    const { result } = renderHook(() => useService(fx));

    await act(async () => {
      result.current.request('ping');
      await Promise.resolve();
    });

    expect(result.current.currentError).toBe(err);
  });

  it('sets isActive when a request is in flight', async () => {
    const responses = new Subject<string>();
    const fx = createEffect<string, string>(() => responses);
    const { result } = renderHook(() => useService(fx));

    await act(async () => {
      result.current.request('ping');
      await Promise.resolve();
    });

    expect(result.current.isActive).toBe(true);
  });

  it('sets isLoading during started and clears it on next', async () => {
    const responses = new Subject<string>();
    const fx = createEffect<string, string>(() => responses);
    const { result } = renderHook(() => useService(fx));

    await act(async () => {
      result.current.request('ping');
      await Promise.resolve();
    });
    expect(result.current.isLoading).toBe(true);

    act(() => {
      responses.next('pong');
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('clears isLoading when the request finalizes without a next value', async () => {
    const responses = new Subject<string>();
    const fx = createEffect<string, string>(() => responses);
    const { result } = renderHook(() => useService(fx));

    await act(async () => {
      result.current.request('ping');
      await Promise.resolve();
    });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      responses.complete();
      await Promise.resolve();
    });
    expect(result.current.isLoading).toBe(false);
  });

  describe('unmount behavior', () => {
    it('does not cancel by default', () => {
      const fx = createCancelableEffect();
      const { unmount } = renderHook(() => useService(fx));

      unmount();
      expect(fx.cancelCurrent).not.toHaveBeenCalled();
      expect(fx.cancelCurrentAndQueued).not.toHaveBeenCalled();
    });

    it('calls cancelCurrent when unmount option is cancelCurrent', () => {
      const fx = createCancelableEffect();
      const { unmount } = renderHook(() =>
        useService(fx, { unmount: 'cancelCurrent' })
      );

      unmount();
      expect(fx.cancelCurrent).toHaveBeenCalled();
    });

    it('calls cancelCurrentAndQueued when unmount option is cancelCurrentAndQueued', () => {
      const fx = createCancelableEffect();
      const { unmount } = renderHook(() =>
        useService(fx, { unmount: 'cancelCurrentAndQueued' })
      );

      unmount();
      expect(fx.cancelCurrentAndQueued).toHaveBeenCalled();
    });
  });
});
