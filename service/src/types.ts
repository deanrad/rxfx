import { ActionCreator } from 'typescript-fsa';

/** The events a process emits or responds to throughout its lifecycle. */
export type ProcessLifecycleEvent =
  | 'request'
  | 'cancel'
  | 'started'
  | 'next'
  | 'error'
  | 'complete'
  | 'canceled';

export interface ProcessEvents<TRequest, TNext, TError> {
  /** invokes the service */
  request: ActionCreator<TRequest>;
  /** cancels the current invocation of the service */
  cancel: ActionCreator<void>;
  /** cancels the current invocation of the service */
  started: ActionCreator<void>;
  next: ActionCreator<TNext>;
  error: ActionCreator<TError>;
  complete: ActionCreator<void>;
  canceled: ActionCreator<void>;
}

/** The processes and corresponding events a data collection emits or responds to throughout its lifecycle. */

export interface CollectionEvents<
  TFetcher = void,
  TRecord = any,
  TResponse extends TRecord = TRecord,
  TError = Error
> {
  load: ProcessEvents<TFetcher, TRecord, TError>;
  refresh: ProcessEvents<TFetcher, TRecord, TError>;
  post: ProcessEvents<TRecord, TResponse, TError>;
  update: ProcessEvents<Partial<TRecord>, TResponse, TError>;
  delete: ProcessEvents<Partial<TRecord>, TResponse, TError>;
}

/** Helpful, optional interface to differentiate service actions. */
export interface HasSubtype<T = string> {
  subtype: T;
}
