import { useState } from 'react';
import { Subscription } from 'rxjs';
import type { Service } from '@rxfx/service';
import { useWhileMounted } from './useWhileMounted';

/** Maintains a React state  and isActive fields populated from the service.
 */
export function useService<TRequest, TNext, TError, TState>(
  service: Service<TRequest, TNext, TError, TState>
) {
  // hook fields
  const [serviceState, setServiceState] = useState<TState>(service.state.value);
  const [isActive, setIsActvive] = useState<boolean>(false);
  const request = service.request.bind(service);

  // prettier-ignore
  useWhileMounted(() => {
    const cleanup = new Subscription();
    cleanup.add(service.state.subscribe({next(s) { setServiceState(s);  }}));
    cleanup.add(service.isActive.subscribe({next(a) { setIsActvive(a);  }}));
    
    return cleanup;
  });

  return {
    state: serviceState,
    isActive,
    request,
  };
}
