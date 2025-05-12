import {
  BehaviorSubject,
  Observable,
  ObservableInput,
  Subscription,
} from 'rxjs';

/** An EffectSource is an async function, or a function with a Promise, Observable, or Iterable return value,
 * whose lifecycle events will be exposed to the EffectRunner.
 */
export type EffectSource<Request, Response> = (
  args: Request
) => ObservableInput<Response>;

export type EffectTriggerer<Request> = (req: Request) => void;

/** The Cancelable interface contains ways to cancel a running effect (if it returns an Observable or AsyncIterable).
 * @see shutdownAll
 */
export interface Cancelable {
  /** Cancels the current effect. */
  cancelCurrent: () => void;
  /** Cancels the current effect, and unqueues any queued effects. */
  cancelCurrentAndQueued: () => void;
  /** Alias for `cancelCurrentAndQueued`. */
  unsubscribe: () => void;
  /** Invokes `cancelCurrentAndQueued`, and stops listening for new requests. */
  shutdown: () => void;
}

/** The Stateful interface represents information the EffectRunner retains about previous or current effect executions.
 */
export interface Stateful<Response, TError, TState> {
  lastResponse: BehaviorSubject<Response | null>;
  currentError: BehaviorSubject<TError | null>;
  isHandling: BehaviorSubject<boolean>;
  isActive: BehaviorSubject<boolean>;
  state: BehaviorSubject<TState | null>;
}

/** The Events interface contains Observables that an effect triggerer may use to get updates on executions. */
export interface Events<Request, Response, TError> {
  starts: Observable<Request>;
  responses: Observable<Response>;
  errors: Observable<TError>;
  completions: Observable<Request>;
  cancelations: Observable<Request>;
}

/**
 * An EffectRunner is a function, enhanced with Observable properties
 */
export interface EffectRunner<
  Request,
  Response,
  TError extends Error = Error,
  TState = Response
> extends EffectTriggerer<Request>,
    Cancelable,
    Events<Request, Response, TError>,
    Stateful<Response, TError, TState> {
  request: (req: Request) => void;

  send: (
    req: Request,
    matcher?: (req: Request, res: Response) => boolean
  ) => Promise<Response>;

  /** Populates #state via the reducer. Meant to be called only once, before  */
  reduceWith: (
    reducer: (
      state: TState,
      evt: LifecycleReducerEvent<Request, Response, Error>
    ) => TState,
    initial: TState
  ) => BehaviorSubject<TState>;

  observe(
    callbacks: Partial<ProcessLifecycleCallbacks<Request, Response, Error>>
  ): Subscription;
}

export type LifecycleReducerEvent<Req, Res, Err> =
  | { type: 'request'; payload: Req }
  | { type: 'started'; payload: Req }
  | { type: 'response'; payload: Res }
  | { type: 'complete'; payload?: Req }
  | { type: 'error'; payload: Err }
  | { type: 'canceled'; payload?: Req };

/** Callbacks corresponding to lifecycle events of a process. */
export interface ProcessLifecycleCallbacks<TRequest, TNext, TError = Error> {
  /** invokes the effects */
  request: (r: TRequest) => void;
  /** an invocation has begun */
  started: (r: TRequest) => void;
  /** an invocation has produced data */
  response: (next: TNext) => void;
  /** an invocation has terminated with an error */
  error: (err: TError) => void;
  /** an invocation has terminated successfully */
  complete: (r: TRequest) => void;
  /** an invocation was canceled by a subscriber */
  canceled: (r: TRequest) => void;
  /** an invocation concluded, in any fashion */
  finalized: () => void;
}
