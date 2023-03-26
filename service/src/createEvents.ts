import { actionCreatorFactory } from 'typescript-fsa';
import { ProcessLifecycleActions } from './types';
/**
 *
 * @param type - the action/event/subevent
 * @returns an ActionCreator whose match property is a TS type guard
 * @see https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
 */
export function createEvent<T>(type: string) {
  const [root, ...paths] = type.split('/');
  const isMultipart = paths.length > 0;
  const ns = isMultipart ? root : '';
  const rest = isMultipart ? paths.join('/') : root;

  const actionAF = actionCreatorFactory(ns);
  return actionAF<T>(rest);
}

export function createProcessEvents<TRequest, TNext, TError>(
  ns: string
): ProcessLifecycleActions<TRequest, TNext, TError> {
  return {
    request: createEvent<TRequest>(`${ns}/request`),
    cancel: createEvent<void>(`${ns}/cancel`),
    started: createEvent<void>(`${ns}/started`),
    next: createEvent<TNext>(`${ns}/next`),
    error: createEvent<TError>(`${ns}/error`),
    complete: createEvent<void>(`${ns}/complete`),
    canceled: createEvent<void>(`${ns}/canceled`),
  };
}
