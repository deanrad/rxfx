import { useState } from 'react';
import { Subscription } from 'rxjs';
import type { Service } from '@rxfx/service';
import { useWhileMounted } from './useWhileMounted';

type UseServiceOptions = {
  /** What to do when component unmounts */
  unmount?: 'cancelCurrent' | 'cancelCurrentAndQueued';
};

/** Provides updates to state, isActive, and currentError populated from the service.
 * Allows requesting of the service via `request`. Optionally cancels requests on unmount.
 * @param service - The service to connect to
 * @param options - Configuration including unmount behavior
 */
export function useService<TRequest, TNext, TError, TState>(
  service: Service<TRequest, TNext, TError, TState>,
  options: UseServiceOptions = {}
) {
  // hook fields
  const [serviceState, setServiceState] = useState<TState>(service.state.value);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentError, setCurrentError] = useState<TError | null>(null);
  const request = service.request.bind(service);

  useWhileMounted(() => {
    const cleanup = new Subscription();
    cleanup.add(service.state.subscribe({ next: setServiceState }));
    cleanup.add(service.isActive.subscribe({ next: setIsActive }));
    cleanup.add(service.currentError.subscribe({ next: setCurrentError }));

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
    currentError,
  };
}
