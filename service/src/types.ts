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
  /** cancels the current invocation  */
  cancel: ActionCreator<void>;
  /** an invocation has begun */
  started: ActionCreator<void>;
  /** an invocation has produced data */
  next: ActionCreator<TNext>;
  /** an invocation has terminated with an error */
  error: ActionCreator<TError>;
  /** an invocation has terminated successfully */
  complete: ActionCreator<void>;
  /** an invocation was canceled by a subscriber */
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
