import { Bus } from '@rxfx/bus';
import { Action, ActionCreator, ProcessLifecycleActions } from '@rxfx/fsa';
import { Subscription, Observable, BehaviorSubject, Subject } from 'rxjs';

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

export interface Stoppable {
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
  /**
   * Adds a function to be called only once when stop() is invoked
   */
  addTeardown(teardownFn: Subscription['add']): void;
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

/** A dictionary of action creators assigned to the service */
export interface EventActionCreators<TRequest, TNext, TError> {
  /** Creates an event which invokes the service. */
  REQUEST: ActionCreator<TRequest>;
  /** Creates an event which cancels the current invocation.  */
  CANCEL: ActionCreator<void>;
  /** Creates an event which signals an invocation has begun. */
  STARTED: ActionCreator<void>;
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
  starts: Observable<Action<void>>;
  /** An Observable of just `canceled` events of this service. */
  cancelations: Observable<Action<void>>;
  /** An Observable of just `start` and `canceled` events of this service. */
  acks: Observable<Action<void>>;
  /** An Observable of just `started`, `next`, `complete`, `error `, and `canceled` events. */
  updates: Observable<Action<TNext | TError | void>>;
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
  /** Creates an independent subscription, invoking callbacks on process lifecycle events */
  observe: (
    cbs: Partial<ProcessLifecycleCallbacks<TRequest, TNext, TError>>
  ) => Subscription;
}

export interface Requestable<TRequest, TResponse> {
  /** Get a promise for the next response or error. Note: works best for a queueing service, otherwise may not be the response/error that was triggered by the request. */
  send(arg: TRequest): Promise<TResponse>;
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
    Stoppable,
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
