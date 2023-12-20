import { useState } from 'react';
import { Subscription } from 'rxjs';
import type { Service } from '@rxfx/service';
import { useWhileMounted } from './useWhileMounted';

/** Provides updates to state, isActive, and currentError populated from the service.
 * Allows requesting of the service via `request`. Does not call cancelCurrent
 */
export function useService<TRequest, TNext, TError, TState>(
  service: Service<TRequest, TNext, TError, TState>
) {
  // hook fields
  const [serviceState, setServiceState] = useState<TState>(service.state.value);
  const [isActive, setIsActvive] = useState<boolean>(false);
  const [currentError, setCurrentError] = useState<TError | null>(null);
  const request = service.request.bind(service);

  // prettier-ignore
  useWhileMounted(() => {
    const cleanup = new Subscription();
    cleanup.add(service.state.subscribe({next(s) { setServiceState(s);  }}));
    cleanup.add(service.isActive.subscribe({next(a) { setIsActvive(a);  }}));
    cleanup.add(service.currentError.subscribe({next(e) { setCurrentError(e)  }}));
    return cleanup;
  });

  return {
    state: serviceState,
    request,
    isActive,
    currentError,
  };
}
