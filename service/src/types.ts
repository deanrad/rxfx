import { ActionCreator } from 'typescript-fsa';

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

/** The events a process emits or responds to throughout its lifecycle. */
export enum ProcessLifecycleEvent {
  request = 'request',
  cancel = 'cancel',
  started = 'started',
  next = 'next',
  error = 'error',
  complete = 'complete',
  canceled = 'canceled',
  finalized = 'finalized',
}

export interface ProcessLifecycleCallbacks<TRequest, TNext, TError> {
  /** invokes the service */
  request: (r: TRequest) => void;
  /** cancels the current invocation  */
  cancel: () => void;
  /** an invocation has begun */
  started: () => void;
  /** an invocation has produced data */
  next: (next: TNext) => void;
  /** an invocation has terminated with an error */
  error: (err: TError) => void;
  /** an invocation has terminated successfully */
  complete: () => void;
  /** an invocation was canceled by a subscriber */
  canceled: () => void;
  /** an invocation concluded, in any fashion */
  finalized: () => void;
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
