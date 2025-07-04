import { Bus } from '@rxfx/bus';
import { Action, ActionCreator, ProcessLifecycleActions } from '@rxfx/fsa';
import { Subscription, Observable, BehaviorSubject, Subject } from 'rxjs';

/** The interface for a reducer with an optional getInitialState synchronous property. */
export interface ServiceReducer<
  TRequest,
  TNext = void,
  TError = Error,
  TState = {}
> {
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
  acs: ProcessLifecycleActions<TRequest, TNext, TError> &
    LifecycleEventMatchers<TRequest, TNext, TError>
) => ServiceReducer<TRequest, TNext, TError, TState>;

/** Helpful, optional interface to differentiate service actions. */
export interface HasSubtype<T = string> {
  subtype: T;
}

export interface Stoppable<TNext> {
  /** Terminates the listener, any of its Observable handlings.
   * @returns The closed subscription.
   */
  stop(): Subscription;
  /** Cancels the current handling by triggering service.actions.cancel.
   * The effect is truly canceled if it was started from an Observable.
   * The canceled event will appear on the bus, and no more next events.
   */
  cancelCurrent(): void;
  /** Cancels the current handling by triggering service.actions.cancel.
   * In addition, any operations enqueued will not be begun. (Safe to call even if not a queueing service.)
   */
  cancelCurrentAndQueued(): void;
  /** Completes the current handling, triggering actions.complete. If a value for `final` is provided,
   * that is emitted via actions.next first. Useful to end the handling but signal a successful completion
   * to any observers/listeners.
   */
  completeCurrent(final?: TNext): void;

  /**
   * Adds a function to be called only once when stop() is invoked
   */
  addTeardown(teardownFn: Subscription['add']): void;

  /**
   * Cancels current and queued effects, and returns the state to its initial value
   */
  reset(): void;
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

/** A dictionary of matchers for use in reducers */
export interface LifecycleEventMatchers<TRequest, TNext, TError> {
  isRequest: (e: Action<any>) => e is Action<TRequest>;
  isCancel: (e: Action<any>) => e is Action<void>;
  isStart: (e: Action<any>) => e is Action<TRequest>;
  isResponse: (e: Action<any>) => e is Action<TNext>;
  isError: (e: Action<any>) => e is Action<TError>;
  isCompletion: (e: Action<any>) => e is Action<void>;
  isCancelation: (e: Action<any>) => e is Action<void>;
}

/** A dictionary of action creators assigned to the service */
export interface EventActionCreators<TRequest, TNext, TError> {
  /** Creates an event which invokes the service. */
  REQUEST: ActionCreator<TRequest>;
  /** Creates an event which cancels the current invocation.  */
  CANCEL: ActionCreator<void>;
  /** Creates an event which signals an invocation has begun. */
  STARTED: ActionCreator<TRequest>;
  /** Creates an event which indicates an invocation has produced data. */
  NEXT: ActionCreator<TNext>;
  /** Creates an event which indicates an invocation has terminated with an error. */
  ERROR: ActionCreator<TError>;
  /** Creates an event which indicates an invocation has terminated successfully. */
  COMPLETE: ActionCreator<void>;
  /** Creates an event which indicates an invocation was canceled by a subscriber. */
  CANCELED: ActionCreator<void>;
}

export interface Queryable<TRequest, TNext, TError, TState> {
  /** An Observable of just `request`, `cancel` events. */
  commands: Observable<Action<TRequest | void>>;
  /** An Observable of just `started` events. */
  starts: Observable<Action<TRequest>>;
  /** An Observable of just `canceled` events of this service. */
  cancelations: Observable<Action<void>>;
  /** An Observable of just `start` and `canceled` events of this service. */
  acks: Observable<Action<TRequest | void>>;
  /** An Observable of just `started`, `next`, `complete`, `error `, and `canceled` events. */
  updates: Observable<Action<TRequest | TNext | TError | void>>;
  /** An Observable of just the `next` events of this service. */
  responses: Observable<TNext>;
  /** An Observable of just the `error` events of this service. */
  errors: Observable<TError>;
  /** An Observable of just the `complete` and `error` events of this service. */
  endings: Observable<Action<TError | void>>;
  /** An Observable of just the `complete`, `error`, and `canceled` events of this service. */
  finalizers: Observable<Action<TError | void>>;
  /** An Observable of all events of this service. */
  events: Observable<Action<void | TRequest | TNext | TError>>;
  /** Uses the reducer to aggregate the events that are produced from its handlers, emitting a new state for each action (de-duping is not done). Use `.value`, or `subscribe()` for updates. */
  state: BehaviorSubject<TState>;
  /** Becomes false the Promise after isHandling becomes false, when no more requests are scheduled to start. */
  isActive: BehaviorSubject<boolean>;
  /** Indicates whether a handling is in progress. Use `.value`, or `subscribe()` for updates.  */
  isHandling: BehaviorSubject<boolean>;
  /** Contains the last error object, but becomes `null` at the start of the next handling. */
  currentError: BehaviorSubject<TError | null>;
  /** The next time (including the present) this service is inactive. Represents the completion of an already-running service. */
  onceInactive: () => Promise<false>;
  /** The next time isActive turns from true to false. Represents the completion of a not-yet-running service. */
  onceSettled: () => Promise<false>;
  /** Creates an independent subscription, invoking callbacks on process lifecycle events.
   * Caveat: Not useful for indefinitely running effects like subscriptions, as it will not resolve.
   * @example ```
   * const fx = createEffect(...)
   * const whenSettled = fx.whenSettled();
   * fx.request(...)
   * await whenSettled
   * ```
   */
  observe: (
    cbs: Partial<ProcessLifecycleCallbacks<TRequest, TNext, TError>>
  ) => Subscription;
}

export interface Requestable<TRequest, TResponse> {
  /** Get a promise for the next response or error. Note: works best for a queueing service, otherwise may not be the response/error that was triggered by the request.
   * @argument matcher If an immediate mode (mergeMap) service, and you need a promise for a specific result,
   * not just the first one, provide a function that takes a request and a response and returns true
   * if the response belongs to that request.
   */
  send(
    arg: TRequest,
    matcher?: (req: TRequest, res: TResponse) => boolean
  ): Promise<TResponse>;
  /** Invoke the service as a function directly (RTK style). */
  (req: TRequest): void;
  /** Explicitly pass a request object */
  request(req: TRequest): void;
}

/**
 * A service is a listener over a bus, which triggers responses in some combination to
 * the requests it recieves. On each request it runs a handler
 *  (subject to its concurrency strategy) then triggers events based on that handler's lifecycle.
 *  For a service defined with the prefix "time", its event schema would be:
 *
 * - `time/request` - client: requests the time
 * - `time/cancel` - client: cancel the current request for the time
 * - `time/started` - server: time resolution has begun
 * - `time/next` - server: contains the time as a payload
 * - `time/complete` - server: no more times will be sent
 * - `time/error` - server: an error occurred (the listener remains alive due to internal rescueing)
 * - `time/canceled` - server: has canceled the current request for the time
 */
export interface Service<TRequest, TNext, TError, TState>
  extends Requestable<TRequest, TNext>,
    Queryable<TRequest, TNext, TError, TState>,
    Stoppable<TNext>,
    EventActionCreators<TRequest, TNext, TError> {
  /** The ActionCreator factories this service listens for, and responds with. */
  actions: ProcessLifecycleActions<TRequest, TNext, TError>;
  /** An untyped reference to the bus this service listens and triggers on */
  bus: Bus<any>;
  /** The namespace given at construction time */
  namespace: string;
}

/**
 * Infers the type of the service's request, so callers can typecheck their requests.
 * @example `let req: ServiceRequestType<typeof mathService> = // type-checked `
 */
export type ServiceRequestType<
  ServiceType extends Service<any, any, any, any>
> = ServiceType['actions']['request'] extends ActionCreator<
  infer ActionPayloadType
>
  ? ActionPayloadType
  : never;

/**
 * Infers the type of the `.state` Subject, to which callers of the service may subscribe.
 * @example `let state : ServiceStateType<typeof mathService>;`
 */
export type ServiceStateType<ServiceType extends Service<any, any, any, any>> =
  ServiceType['state'] extends Subject<infer StateType> ? StateType : never;

/** The 5 possible strategies for a listener which is handling when a new request comes in.
 * The existing one can live or be canceled, the new one can begin or not, and if both
 * are run, they can queue or run immediately.
 * ![immediate mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-immediate-sm.png)
 * ![queueing mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-queueing-sm.png)
 * ![switching mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-switching-sm.png)
 * ![blocking mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-blocking-sm.png)
 * ![toggling mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-toggling-sm.png)
 */
export type ConcurrencyMode =
  | 'immediate'
  | 'queueing'
  | 'switching'
  | 'blocking'
  | 'toggling';
