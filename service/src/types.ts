import { Action, ActionCreator } from '@rxfx/fsa';

/** A dictionary of ActionCreators corresponding to lifecycle events of a process. */
export interface ProcessLifecycleActions<TRequest, TNext, TError> {
  /** Invokes the service. */
  request: ActionCreator<TRequest>;
  /** Cancels the current invocation.  */
  cancel: ActionCreator<void>;
  /** Notifies an invocation has begun. */
  started: ActionCreator<void>;
  /** Notifies an invocation has produced data. */
  next: ActionCreator<TNext>;
  /** Notifies an invocation has terminated with an error. */
  error: ActionCreator<TError>;
  /** Notifies an invocation has terminated successfully. */
  complete: ActionCreator<void>;
  /** Notifies an invocation was canceled by a subscriber. */
  canceled: ActionCreator<void>;
}

/** A dictionary of callbacks corresponding to lifecycle events of a process. */
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

/** The interface for a reducer with an optional getInitialState synchronous property. */
interface ServiceReducer<TRequest, TNext = void, TError = Error, TState = {}> {
  (state: TState, action: Action<TRequest | TNext | TError | void>): TState;
  getInitialState?: () => TState;
}

/** Signature for a function that closes over action creators and returns a Producer */
export type ReducerProducer<
  TRequest,
  TNext = void,
  TError = Error,
  TState = {}
> = (
  acs: ProcessLifecycleActions<TRequest, TNext, TError>
) => ServiceReducer<TRequest, TNext, TError, TState>;

/** Helpful, optional interface to differentiate service actions. */
export interface HasSubtype<T = string> {
  subtype: T;
}
