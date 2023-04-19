// prettier-ignore
import { BehaviorSubject, EMPTY, firstValueFrom, from, merge, Observable, Observer, of, Subscription } from 'rxjs';
// prettier-ignore
import { concatMap, distinctUntilChanged, endWith, exhaustMap, map, mergeMap, scan, switchMap, takeUntil, tap } from 'rxjs/operators';

import { Action, ActionCreator, actionCreatorFactory } from '@rxfx/fsa';

import { Bus } from '@rxfx/bus';
import type { EventHandler } from '@rxfx/bus';

import { toggleMap } from '@rxfx/operators';
import {
  ProcessLifecycleCallbacks,
  ProcessLifecycleActions,
  ReducerProducer,
} from './types';

interface Stoppable {
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

interface Queryable<TRequest, TNext, TError, TState> {
  /** An Observable of just `request`, `cancel` events. */
  commands: Observable<Action<TRequest | void>>;
  /** An Observable of just `started` events. */
  starts: Observable<Action<void>>;
  /** An Observable of just `canceled` events. */
  cancelations: Observable<Action<void>>;
  /** An Observable of just `start` and `canceled`. */
  acks: Observable<Action<void>>;
  /** An Observable of just the `next` events of this service. */
  responses: Observable<Action<TNext>>;
  /** An Observable of just the `error` events of this service. */
  errors: Observable<Action<TError>>;
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

interface Requestable<TRequest, TResponse> {
  send(arg: TRequest): Promise<Action<TResponse>>;
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
    Stoppable {
  /** The ActionCreator factories this service listens for, and responds with. */
  actions: ProcessLifecycleActions<TRequest, TNext, TError>;
  /** An untyped reference to the bus this service listens and triggers on */
  bus: Bus<any>;
  /** The namespace given at construction time */
  namespace: string;
}

/** @example bus.listen(matchesAny(Actions.complete, Actions.error), handler) */
export function matchesAny(...acs: ActionCreator<any>[]) {
  return (e: any) => {
    return !!acs.find((ac) => ac.match(e));
  };
}

/**
 * Creates a Service - a managed bus listener - for an effect and optionally state.
 * The effect can be a Promise-or Observable returning function, and is cancelable if Observable.
 * By default its concurrency is to run handlers immediately, but this is overridable with a 5th parameter - an RxJS operator implmenting the desired concurrency.
 *
 * @param actionNamespace - Prefix of all actions: The 'search' in search/request
 * @param bus - The Bus event bus triggered to and listened on
 * @param handler - A function returning a Promise, Observable, or Promise thunk from whose life-cycle events are triggered.
 * @param reducerProducer - A function returning a reducer which populates `.state`. Recieves ProcessLifecycleActions as its argument.
 * @param concurrencyOperator - RxJS Operator to control what to do when an existing handler is in progress. Defaults to `mergeMap` (Immediate)
 * @returns A service in immediate mode, or the mode implemented by its `concurrencyOperator` argument
 * @summary ![immediate mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-immediate-sm.png)
 */
export function createService<TRequest, TNext, TError = Error, TState = object>(
  actionNamespace: string,
  bus: Bus<Action<TRequest | TNext | TError | void>>,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer: ReducerProducer<TRequest, TNext, TError, TState> = () =>
    (state: TState, _: any) => {
      return state;
    },
  concurrencyOperator = mergeMap
): Service<TRequest, TNext, TError, TState> {
  const namespacedAction = actionCreatorFactory(actionNamespace);

  const ACs: ProcessLifecycleActions<TRequest, TNext, TError> = {
    request: namespacedAction<TRequest>('request'),
    cancel: namespacedAction<void>('cancel'),
    started: namespacedAction<void>('started'),
    next: namespacedAction<TNext>('next'),
    error: namespacedAction<TError>('error'),
    complete: namespacedAction<void>('complete'),
    canceled: namespacedAction<void>('canceled'),
  };

  const allSubscriptions = new Subscription();

  const isHandling = new BehaviorSubject(false);
  allSubscriptions.add(
    bus
      .query(matchesAny(ACs.started, ACs.error, ACs.complete, ACs.canceled))
      .pipe(
        scan((all, e) => all + (ACs.started.match(e) ? 1 : -1), 0),
        map(Boolean),
        distinctUntilChanged(),
        endWith(false)
      )
      .subscribe(isHandling)
  );

  const isActive = new BehaviorSubject(false);
  allSubscriptions.add(
    isHandling
      .asObservable()
      .pipe(
        // The switchMap/Promise magic ensures isActive stays true even when moving between queued handlings.
        switchMap((status) => (status ? of(status) : Promise.resolve(status))),
        distinctUntilChanged()
      )
      .subscribe(isActive)
  );

  const currentError = new BehaviorSubject<TError | null>(null);
  allSubscriptions.add(
    bus
      .query(matchesAny(ACs.error, ACs.started))
      .pipe(map((e) => (ACs.error.match(e) ? e.payload : null)))
      .subscribe(currentError)
  );

  const reducer = reducerProducer(ACs);
  const state = new BehaviorSubject<TState>(
    reducer.getInitialState
      ? reducer.getInitialState()
      : // @ts-ignore
        reducer(undefined as TState, NULL_ACTION)
  );
  const safeReducer = (previous: TState, e: Action<any>) => {
    try {
      return reducer(previous, e);
    } catch (ex: any) {
      bus.errors.next(ex);
      return previous;
    }
  };

  allSubscriptions.add(
    bus
      .query(matchesAny(...Object.values(ACs)))
      .pipe(scan(safeReducer, state.value), distinctUntilChanged())
      .subscribe(state)
  );

  let cancelCounter = new BehaviorSubject<number>(0);

  // The base return value
  const requestor = (req: TRequest) => {
    const action = ACs.request(req);
    action.meta = { cancelIdxAtCreation: cancelCounter.value };
    bus.trigger(action);
  };

  const wrappedHandler = (e: Action<TRequest | TNext | TError>) => {
    const oneResult = handler(e.payload as TRequest);
    /* istanbul ignore next */
    const obsResult: Observable<TNext> =
      typeof oneResult === 'function'
        ? new Observable(oneResult)
        : from(oneResult ?? EMPTY);

    const { cancelIdxAtCreation } = e.meta || {};
    delete e.meta;

    return new Observable((observer) => {
      // cancelCurrentAndQueued has been called so exit immediately, complete()-ing so others can queue later.
      if (cancelCounter.value > cancelIdxAtCreation) {
        observer.complete();
        return;
      }

      // prettier-ignore
      const sub = obsResult
        .pipe(
          tap({ 
            complete: () => {bus.trigger(ACs.complete()); observer.complete()}, 
            unsubscribe: () => {bus.trigger(ACs.canceled()); observer.complete()}
          }),
          takeUntil(bus.query(ACs.cancel.match))
        )
        .subscribe({
          error(e) { observer.error(e); },
          next(next) { observer.next(next); }          
        });

      return () => sub.unsubscribe();
      //@ts-ignore
    }).pipe(takeUntil(bus.resets)) as Observable<TNext>;
  };

  /** The main bus listener of this service */
  const mainListener = bus.listen(
    ACs.request.match,
    wrappedHandler,
    bus.observeWith({
      // @ts-ignore
      subscribe: ACs.started,
      // @ts-ignore
      next: ACs.next,
      // @ts-ignore
      error: ACs.error,
    }),
    concurrencyOperator
  );

  // Enhance and return
  const controls: Stoppable = {
    stop() {
      mainListener.unsubscribe();
      allSubscriptions.unsubscribe();
      isHandling.complete(); // make isStopped = true
      state.complete(); // make isStopped = true
      return allSubscriptions;
    },
    addTeardown(teardownFn: Subscription['add']) {
      allSubscriptions.add(teardownFn);
    },
    cancelCurrent() {
      bus.trigger(ACs.cancel());
    },
    cancelCurrentAndQueued() {
      cancelCounter.next(cancelCounter.value + 1);
      bus.trigger(ACs.cancel());
    },
  };

  const observe = (
    cbs: Partial<ProcessLifecycleCallbacks<TRequest, TNext, TError>>,
    subscriber?: Observer<any>
  ) => {
    // prettier-ignore
    const eventStreams = [
      // @ts-ignore
      cbs.request && bus.query(ACs.request.match).pipe(tap(({payload}) => cbs.request(payload as TRequest))),
      // @ts-ignore
      cbs.started && bus.query(ACs.started.match).pipe(tap(() => cbs.started())),
      // @ts-ignore
      cbs.next && bus.query(ACs.next.match).pipe(tap(({payload}) => cbs.next(payload as TNext))),
      // @ts-ignore
      cbs.complete && bus.query(ACs.complete.match).pipe(tap(() => cbs.complete())),
      // @ts-ignore
      cbs.cancel && bus.query(ACs.cancel.match).pipe(tap(() => cbs.cancel())),
      // @ts-ignore
      cbs.canceled && bus.query(ACs.canceled.match).pipe(tap(() => cbs.canceled())),
      // @ts-ignore
      cbs.error && bus.query(ACs.error.match).pipe(tap(({payload}) => cbs.error(payload as TError))),
      // @ts-ignore
      cbs.finalized && bus.query(matchesAny(ACs.canceled, ACs.complete, ACs.error)).pipe(tap(() => cbs.finalized())),
    ].filter(Boolean)

    const invocations = merge(...eventStreams);
    return invocations.subscribe(subscriber);
  };

  const queries = {
    commands: bus.query(matchesAny(ACs.request, ACs.cancel)) as Observable<
      Action<TRequest | void>
    >,
    starts: bus.query(ACs.started.match) as Observable<Action<void>>,
    cancelations: bus.query(ACs.canceled.match) as Observable<Action<void>>,
    acks: bus.query(matchesAny(ACs.started, ACs.canceled)) as Observable<
      Action<void>
    >,
    responses: bus.query(ACs.next.match) as Observable<Action<TNext>>,
    errors: bus.query(ACs.error.match) as Observable<Action<TError>>,
    endings: bus.query(matchesAny(ACs.complete, ACs.error)) as Observable<
      Action<TError | void>
    >,
    finalizers: bus.query(
      matchesAny(ACs.complete, ACs.error, ACs.canceled)
    ) as Observable<Action<TError | void>>,
    state,
    events: bus.query(matchesAny(...Object.values(ACs))) as Observable<
      Action<void | TRequest | TNext | TError>
    >,
  };
  const returnValue = Object.assign(requestor, { actions: ACs }, controls, {
    // Native
    bus,
    namespace: actionNamespace,
    // Requestable
    send(arg: TRequest) {
      const result = firstValueFrom(bus.query(ACs.next.match));
      bus.trigger(ACs.request(arg));
      return result as Promise<Action<TNext>>;
    },
    request: requestor,
    // Queryable
    ...queries,
    isActive,
    isHandling,
    currentError,
    observe,
  });

  return returnValue;
}

/**
 * Creates a Service - a managed bus listener - for an effect and optionally state.
 * The effect can be a Promise-or Observable returning function, and is cancelable if Observable.
 * Its concurrency mode is to queue up handlers.
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param bus - The Bus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument.
 * @returns A service in queueing mode.
 * @summary ![queueing mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-queueing-sm.png)
 */
export function createQueueingService<TRequest, TNext, TError, TState = object>(
  actionNamespace: string,
  bus: Bus<Action<TRequest | TNext | TError | void>>,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer: (
    acs: ProcessLifecycleActions<TRequest, TNext, TError>
  ) => (state: TState, action: Action<any>) => TState = () =>
    (state: TState, _: any) => {
      return state;
    }
): Service<TRequest, TNext, TError, TState> {
  return createService(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    concatMap
  );
}

/**
 * Creates a Service - a managed bus listener - for an effect and optionally state.
 * The effect can be a Promise-or Observable returning function, and is cancelable if Observable.
 * Its concurrency mode is to cancel a running effect, and switch to a new one.
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param bus - The Bus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument.
 * @returns A service in switching mode.
 * @summary ![switching mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-switching-sm.png)
 */
export function createReplacingService<
  TRequest,
  TNext,
  TError,
  TState = object
>(
  actionNamespace: string,
  bus: Bus<Action<TRequest | TNext | TError | void>>,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer: (
    acs: ProcessLifecycleActions<TRequest, TNext, TError>
  ) => (state: TState, action: Action<any>) => TState = () =>
    (state: TState, _: any) => {
      return state;
    }
): Service<TRequest, TNext, TError, TState> {
  return createService(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    switchMap
  );
}

/**
 * Creates a Service - a managed bus listener - for an effect and optionally state.
 * The effect can be a Promise-or Observable returning function, and is cancelable if Observable.
 * Its concurrency mode is to prevent a new handler from starting, if one is in progress.
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param bus - The Bus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument.
 * @returns A service in blocking mode.
 * @summary ![blocking mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-blocking-sm.png)
 */
export function createBlockingService<TRequest, TNext, TError, TState = object>(
  actionNamespace: string,
  bus: Bus<Action<TRequest | TNext | TError | void>>,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer: (
    acs: ProcessLifecycleActions<TRequest, TNext, TError>
  ) => (state: TState, action: Action<any>) => TState = () =>
    (state: TState, _: any) => {
      return state;
    }
): Service<TRequest, TNext, TError, TState> {
  return createService(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    exhaustMap
  );
}

/**
 * Creates a Service - a managed bus listener - for an effect and optionally state.
 * The effect can be a Promise-or Observable returning function, and is cancelable if Observable.
 * Its concurrency mode is if a handler is running, terminates it, and does not begin a new handling.
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param bus - The Bus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument.
 * @returns A service in toggling mode.
 * @summary ![toggling mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-toggling-sm.png)
 */
export function createTogglingService<TRequest, TNext, TError, TState = object>(
  actionNamespace: string,
  bus: Bus<Action<TRequest | TNext | TError | void>>,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer: (
    acs: ProcessLifecycleActions<TRequest, TNext, TError>
  ) => (state: TState, action: Action<any>) => TState = () =>
    (state: TState, _: any) => {
      return state;
    }
): Service<TRequest, TNext, TError, TState> {
  return createService(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    // @ts-ignore
    toggleMap
  );
}

/** A safe-to-ignore action used to get the initial state. */
export const NULL_ACTION = { type: '__', payload: {} };
