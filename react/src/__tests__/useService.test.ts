import { act, renderHook } from '@testing-library/react';
import { createService, ProcessLifecycleCallbacks } from '@rxfx/service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { useService } from '../useService';

describe('useService', () => {
  const createTestService = () => {
    const service = createService('test', jest.fn());
    service.cancelCurrent = jest.fn();
    service.cancelCurrentAndQueued = jest.fn();
    return service;
  };

  const createMockService = () => {
    const state = new BehaviorSubject('idle');
    const isActive = new BehaviorSubject(false);
    const currentError = new BehaviorSubject<Error | null>(null);
    const request = jest.fn(function (this: unknown, _req?: string) {
      return this;
    });
    const cancelCurrent = jest.fn();
    const cancelCurrentAndQueued = jest.fn();
    let observers: Partial<ProcessLifecycleCallbacks<string, string, Error>> =
      {};

    return {
      service: {
        request,
        cancelCurrent,
        cancelCurrentAndQueued,
        state,
        isActive,
        currentError,
        observe(
          cbs: Partial<ProcessLifecycleCallbacks<string, string, Error>>
        ) {
          observers = cbs;
          return new Subscription();
        },
      },
      trigger<K extends keyof ProcessLifecycleCallbacks<string, string, Error>>(
        key: K,
        ...args: Parameters<ProcessLifecycleCallbacks<string, string, Error>[K]>
      ) {
        observers[key]?.(...args);
      },
    };
  };

  it('provides state, isActive, and request function', () => {
    const service = createTestService();
    const { result } = renderHook(() => useService(service));

    expect(result.current.state).toBeDefined();
    expect(result.current.isActive).toBe(false);
  });

  it('binds request to the service instance', () => {
    const { service } = createMockService();
    const { result } = renderHook(() => useService(service));

    result.current.request('ping');

    expect(service.request).toHaveBeenCalledWith('ping');
    expect(service.request.mock.results[0]?.value).toBe(service);
  });

  it('updates state when the service state changes', () => {
    const { service } = createMockService();
    const { result } = renderHook(() => useService(service));

    act(() => {
      service.state.next('ready');
    });

    expect(result.current.state).toBe('ready');
  });

  it('updates isActive when the service activity changes', () => {
    const { service } = createMockService();
    const { result } = renderHook(() => useService(service));

    act(() => {
      service.isActive.next(true);
    });

    expect(result.current.isActive).toBe(true);
  });

  it('updates currentError when the service errors', () => {
    const { service } = createMockService();
    const { result } = renderHook(() => useService(service));
    const err = new Error('boom');

    act(() => {
      service.currentError.next(err);
    });

    expect(result.current.currentError).toBe(err);
  });

  it('sets isLoading during started and clears it on next', () => {
    const mock = createMockService();
    const { result } = renderHook(() => useService(mock.service));

    act(() => {
      mock.trigger('started', 'ping');
    });
    expect(result.current.isLoading).toBe(true);

    act(() => {
      mock.trigger('next', 'pong');
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('clears isLoading when the request finalizes without a next value', () => {
    const mock = createMockService();
    const { result } = renderHook(() => useService(mock.service));

    act(() => {
      mock.trigger('started', 'ping');
    });
    expect(result.current.isLoading).toBe(true);

    act(() => {
      mock.trigger('finalized');
    });
    expect(result.current.isLoading).toBe(false);
  });

  describe('unmount behavior', () => {
    it('does not cancel by default', () => {
      const service = createTestService();
      const { unmount } = renderHook(() => useService(service));

      unmount();
      expect(service.cancelCurrent).not.toHaveBeenCalled();
      expect(service.cancelCurrentAndQueued).not.toHaveBeenCalled();
    });

    it('calls cancelCurrent when unmount option is cancelCurrent', () => {
      const service = createTestService();
      const { unmount } = renderHook(() => 
        useService(service, { unmount: 'cancelCurrent' })
      );

      unmount();
      expect(service.cancelCurrent).toHaveBeenCalled();
    });

    it('calls cancelCurrentAndQueued when unmount option is cancelCurrentAndQueued', () => {
      const service = createTestService();
      const { unmount } = renderHook(() => 
        useService(service, { unmount: 'cancelCurrentAndQueued' })
      );

      unmount();
      expect(service.cancelCurrentAndQueued).toHaveBeenCalled();
    });
  });
});
