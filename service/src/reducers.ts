import { Action, ProcessLifecycleActions } from '@rxfx/fsa';

/**
 * Creates a reducer that remembers each `next` lifecycle event (produced as the responses of the handler)
 */
export function createResponseReducer<TNext>(initialState: TNext) {
  return (ACs: ProcessLifecycleActions<any, TNext, any>) =>
    (state = initialState, event: Action<any>) => {
      if (ACs.next.match(event)) {
        return event.payload;
      }
      return state;
    };
}
