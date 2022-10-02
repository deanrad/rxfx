import { useRef, useState } from 'react';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Action, ActionCreator } from 'typescript-fsa';
import { useWhileMounted } from './useWhileMounted';

/** Maintains a React state  and isActive fields populated from the service.
 */
 export function useService<TRequest, TNext, TError, TState>(
  service: any
) {
  // hook fields
  const [serviceState, setServiceState] = useState<object>();
  const [isActive, setIsActvive] = useState<boolean>(false);
  const request = service.request.bind(service)

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
