import { useState } from 'react';
import { Subscription, BehaviorSubject } from 'rxjs';
import { useWhileMounted } from './useWhileMounted';
import { ProcessLifecycleCallbacks } from '@rxfx/service';

type UseServiceOptions = {
  /** What to do when component unmounts */
  unmount?: 'cancelCurrent' | 'cancelCurrentAndQueued';
};

/** Only the bits of Service that useService actually needs */
export interface UsableAsService<TRequest, TState, TError, TNext = unknown> {
  /** fire off a request */
  request(req: TRequest): void;
  /** cancel only the in-flight request */
  cancelCurrent(): void;
  /** cancel in-flight + queued requests */
  cancelCurrentAndQueued(): void;
  /** the current value + subscription */
  state: BehaviorSubject<TState>;
  /** whether any handler is active */
  isActive: BehaviorSubject<boolean>;
  /** last error or null */
  currentError: BehaviorSubject<TError | null>;
  /** allows callbacks to be run upon ProcessLifecycleEvents */
  observe(cbs: Partial<ProcessLifecycleCallbacks<TRequest, TNext, TError>>): Subscription;
}

/** Provides updates to state, isActive, and currentError populated from the service.
 * Allows requesting of the service via `request`. Optionally cancels requests on unmount.
 * Works with both Services and Effects.
 * @param service - The service to connect to
 * @param options - Configuration including unmount behavior
 * @returns An object with fields to access the state and status of the Service/Effect
 */
export function useService<TRequest, TState, TError>(
  service: UsableAsService<TRequest, TState, TError, unknown>,
  options: UseServiceOptions = {}
) {
  // hook fields
  const [serviceState, setServiceState] = useState<TState>(service.state.value);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [currentError, setCurrentError] = useState<TError | null>(null);
  const request = service.request.bind(service);

  useWhileMounted(() => {
    const cleanup = new Subscription();
    cleanup.add(service.state.subscribe({ next: setServiceState }));
    cleanup.add(service.isActive.subscribe({ next: setIsActive }));
    cleanup.add(service.currentError.subscribe({ next: setCurrentError }));
    cleanup.add(
      service.observe({
        started: () => setIsLoading(true),
        next: () => setIsLoading(false),
        // @ts-expect-error
        response: () => setIsLoading(false), // only for an effect
        finalized: () => setIsLoading(false),
      })
    );

    return () => {
      cleanup.unsubscribe();
      if (options.unmount === 'cancelCurrent') {
        service.cancelCurrent();
      } else if (options.unmount === 'cancelCurrentAndQueued') {
        service.cancelCurrentAndQueued();
      }
    };
  });

  return {
    state: serviceState,
    request,
    isActive,
    isLoading,
    currentError,
  };
}

/** Alias for useService, for working with an @rxfx/effect
 * @see useService
 */
export function useFx<TRequest, TState, TError, TNext = unknown>(
  service: UsableAsService<TRequest, TState, TError, TNext>,
  options: UseServiceOptions = {}
) {
  return useService(service, options);
}
