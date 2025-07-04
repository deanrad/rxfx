// prettier-ignore
import { BehaviorSubject, EMPTY, firstValueFrom, from, merge, Observable, Observer, of, race, Subject, Subscription, throwError } from 'rxjs';
// prettier-ignore
import { concatMap, distinctUntilChanged, endWith, exhaustMap, filter, map, mergeMap, scan, switchMap, takeUntil, tap } from 'rxjs/operators';

import { Action, ActionCreator, createProcessEvents } from '@rxfx/fsa';

import { Bus, defaultBus } from '@rxfx/bus';
import type { EventHandler } from '@rxfx/bus';
import type { ProcessLifecycleActions } from '@rxfx/fsa';

import { toggleMap } from '@rxfx/operators';
import {
  ReducerProducer,
  ProcessLifecycleCallbacks,
  Service,
  Stoppable,
  EventActionCreators,
  LifecycleEventMatchers,
  ConcurrencyMode,
  ServiceReducer,
} from './types';

/** @example bus.listen(matchesAny(Actions.complete, Actions.error), handler) */
export function matchesAny(...acs: ActionCreator<any>[]) {
  return (e: any) => {
    return !!acs.find((ac) => ac.match(e));
  };
}

/** Returns the RxJS operator corresponding to the plain English concurrency mode.
 * Useful for creating a service whose (fixed) concurrency is known just at runtime.
 */
export function operatorForMode(mode?: ConcurrencyMode) {
  return mode === 'immediate'
    ? mergeMap
    : mode === 'queueing'
    ? concatMap
    : mode === 'switching'
    ? switchMap
    : mode === 'blocking'
    ? exhaustMap
    : mode === 'toggling'
    ? toggleMap
    : mergeMap;
}

/**
 * Creates a Service - a concurrency-controlled wrapper around an effect, which tracks state over the effect's lifecycle events.
 * The effect can be a Promise-or-Observable returning function, and is cancelable if Observable.
 * By default its concurrency is to run handlers immediately, but this is overridable with a 5th parameter - an RxJS operator implmenting the desired concurrency.
 *
 * @param actionNamespace - Prefix of all actions: The 'search' in search/request
 * @param bus - The Bus event bus triggered to and listened on
 * @param handler - A function returning a Promise, Observable, or Promise thunk from whose life-cycle events are triggered.
 * @param reducerProducer - A function returning a reducer which populates `.state`. Recieves ProcessLifecycleActions as its argument. Defaults to producing state which is always the most recently returned response from the handler.
 * @param concurrencyOperator - RxJS Operator to control what to do when an existing handler is in progress. Defaults to `mergeMap` (Immediate)
 * @returns A service in immediate mode, or the mode implemented by its `concurrencyOperator` argument
 * @summary ![immediate mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-immediate-sm.png)
 */
export function createServiceListener<
  TRequest,
  TNext = void,
  TError = Error,
  TState = TNext | null
>(
  actionNamespace: string,
  bus: Bus<Action<TRequest | TNext | TError | void>>,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer: ReducerProducer<TRequest, TNext, TError, TState> = (
      EVENTS
    ) =>
    // @ts-ignore
    (state = null, lifeCycleEvent: any) => {
      if (EVENTS.next.match(lifeCycleEvent)) {
        return lifeCycleEvent.payload;
      }
      return state;
    },
  concurrencyOperator = mergeMap
): Service<TRequest, TNext, TError, TState> {
  const ACs = createProcessEvents<TRequest, TNext, TError>(actionNamespace);

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
  const onceInactive = () => {
    return firstValueFrom(
      isActive.pipe(filter((x) => x === false))
    ) as Promise<false>;
  };

  const onceSettled = () => {
    if (isActive.value === true) return onceInactive();

    return firstValueFrom(isActive.pipe(filter(Boolean))).then(() =>
      onceInactive()
    );
  };

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

  // Define convenience functions for testing in reducers
  const matchers: LifecycleEventMatchers<TRequest, TNext, TError> = {
    isRequest: (e: any): e is Action<TRequest> => ACs.request.match(e),
    isCancel: (e: any): e is Action<void> => ACs.cancel.match(e),
    isStart: (e: any): e is Action<TRequest> => ACs.started.match(e),
    isResponse: (e: any): e is Action<TNext> => ACs.next.match(e),
    isError: (e: any): e is Action<TError> => ACs.error.match(e),
    isCompletion: (e: any): e is Action<void> => ACs.complete.match(e),
    isCancelation: (e: any): e is Action<void> => ACs.canceled.match(e),
  };

  // ACs should only enumerate ACs
  Object.entries(matchers).forEach(([name, fn]) => {
    Object.defineProperty(ACs, name, {
      enumerable: false,
      value: fn,
    });
  });

  const reducer = reducerProducer(
    ACs as ProcessLifecycleActions<TRequest, TNext, TError> &
      LifecycleEventMatchers<TRequest, TNext, TError>
  );

  function getInitialState(
    reducer: ServiceReducer<TRequest, TNext, TError, TState>
  ) {
    return reducer.getInitialState
      ? reducer.getInitialState()
      : // @ts-ignore
        reducer(undefined as TState, NULL_ACTION);
  }

  const state = new BehaviorSubject<TState>(getInitialState(reducer));
  const safeReducer = (previous: TState, e: Action<any>) => {
    try {
      return reducer(previous, e);
    } catch (ex: any) {
      bus.errors.next(ex);
      return previous;
    }
  };
  const RESET = {}; // a 'symbol' so we know its from our Subject
  const stateResets = new Subject<[TState, typeof RESET]>();

  // Populate .state
  allSubscriptions.add(
    merge(bus.query(matchesAny(...Object.values(ACs))), stateResets)
      .pipe(
        scan((stateOrReset, event) => {
          if (Array.isArray(event) && event[1] === RESET) {
            const resetState = event[0];
            return resetState;
          }
          return safeReducer(stateOrReset, event as unknown as Action<any>);
        }, state.value),
        distinctUntilChanged()
      )
      .subscribe(state)
  );

  let cancelCounter = new BehaviorSubject<number>(0);
  const completions = new Subject<TNext | void>();

  // The base return value
  const requestor = (req: TRequest) => {
    const action = ACs.request(req);
    action.meta = { cancelIdxAtCreation: cancelCounter.value };
    bus.trigger(action);
  };

  const wrappedHandler = (e: Action<TRequest>) => {
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
          takeUntil(completions.pipe(tap(final => {
            if(typeof final !=="undefined") {
              bus.trigger(ACs.next(final))
            }
          }))),
          tap({ 
            subscribe: () => {bus.trigger(ACs.started(e.payload))},
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
      next: ACs.next,
      // @ts-ignore
      error: ACs.error,
    }),
    concurrencyOperator
  );

  // Enhance and return
  const controls: Stoppable<TNext> = {
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
    completeCurrent(final?: TNext) {
      completions.next(final);
    },
    reset() {
      this.cancelCurrentAndQueued();
      stateResets.next([getInitialState(reducer), RESET]);
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
    starts: bus.query(ACs.started.match) as Observable<Action<TRequest>>,
    cancelations: bus.query(ACs.canceled.match) as Observable<Action<void>>,
    acks: bus.query(matchesAny(ACs.started, ACs.canceled)) as Observable<
      Action<void>
    >,
    updates: bus.query(
      matchesAny(ACs.started, ACs.next, ACs.complete, ACs.error, ACs.canceled)
    ) as Observable<Action<TNext | TError | void>>,
    responses: bus
      .query(ACs.next.match)
      .pipe(map((e) => e.payload)) as Observable<TNext>,
    errors: bus
      .query(ACs.error.match)
      .pipe(map((e) => e.payload)) as Observable<TError>,
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

  const EventACs: EventActionCreators<TRequest, TNext, TError> = {
    REQUEST: ACs.request,
    CANCEL: ACs.cancel,
    STARTED: ACs.started,
    NEXT: ACs.next,
    ERROR: ACs.error,
    COMPLETE: ACs.complete,
    CANCELED: ACs.canceled,
  };

  // prettier-ignore
  const returnValue = Object.assign(requestor, { actions: ACs }, controls, {
    // Native
    bus,
    namespace: actionNamespace,
    // Requestable
    send(arg: TRequest, matcher = (_arg: TRequest, _resp: TNext) => true) {
      const resultOrError = race(
        queries.responses.pipe(filter((res) => matcher(arg, res))),
        merge(
          queries.errors.pipe(mergeMap((e) => throwError(() => e)))),
          queries.cancelations.pipe(map(() => { throw new Error(`Error: canceled (${this.namespace}) can never resolve`);})
        )
      );

      bus.trigger(ACs.request(arg));
      return firstValueFrom(resultOrError);
    },
    request: requestor,
    // Queryable
    ...queries,
    isActive,
    onceInactive,
    onceSettled,
    isHandling,
    currentError,
    observe,
    ...EventACs,
  });

  return returnValue;
}

/**
 * Creates a Service - a concurrency-controlled wrapper around an effect, which tracks state over the effect's lifecycle events.
 * The effect can be a Promise-or-Observable returning function, and is cancelable if Observable.
 * Its concurrency mode is to run handlers immediately.
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument. Defaults to producing state which is always the most recently returned response from the handler.
 * @returns A service in immediate mode.
 * @summary ![immediate mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-immediate-sm.png)
 */
export function createService<
  TRequest,
  TNext = void,
  TError = Error,
  TState = TNext | null
>(
  actionNamespace: string,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer?: ReducerProducer<TRequest, TNext, TError, TState>
): Service<TRequest, TNext, TError, TState> {
  return createServiceListener(
    actionNamespace,
    defaultBus,
    handler,
    reducerProducer
  );
}
/**
 * Creates a Service - a concurrency-controlled wrapper around an effect, which tracks state over the effect's lifecycle events.
 * The effect can be a Promise-or-Observable returning function, and is cancelable if Observable.
 * Its concurrency mode is to queue up handlers.
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param bus - The Bus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument. Defaults to producing state which is always the most recently returned response from the handler.
 * @returns A service in queueing mode.
 * @summary ![queueing mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-queueing-sm.png)
 */
export function createQueueingServiceListener<
  TRequest,
  TNext = void,
  TError = Error,
  TState = TNext | null
>(
  actionNamespace: string,
  bus: Bus<Action<TRequest | TNext | TError | void>>,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer?: ReducerProducer<TRequest, TNext, TError, TState>
): Service<TRequest, TNext, TError, TState> {
  return createServiceListener(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    concatMap
  );
}

/**
 * Creates a Service - a concurrency-controlled wrapper around an effect, which tracks state over the effect's lifecycle events.
 * The effect can be a Promise-or-Observable returning function, and is cancelable if Observable.
 * Its concurrency mode is to queue up handlers.
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param bus - The Bus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument. Defaults to producing state which is always the most recently returned response from the handler.
 * @returns A service in queueing mode.
 * @summary ![queueing mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-queueing-sm.png)
 */
export function createQueueingService<
  TRequest,
  TNext = void,
  TError = Error,
  TState = TNext | null
>(
  actionNamespace: string,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer?: ReducerProducer<TRequest, TNext, TError, TState>
): Service<TRequest, TNext, TError, TState> {
  return createServiceListener(
    actionNamespace,
    defaultBus,
    handler,
    reducerProducer,
    concatMap
  );
}
/**
 * Creates a Service - a concurrency-controlled wrapper around an effect, which tracks state over the effect's lifecycle events.
 * The effect can be a Promise-or-Observable returning function, and is cancelable if Observable.
 * Its concurrency mode is to cancel a running effect, and switch to a new one.
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param bus - The Bus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument. Defaults to producing state which is always the most recently returned response from the handler.
 * @returns A service in switching mode.
 * @summary ![switching mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-switching-sm.png)
 */
export function createSwitchingServiceListener<
  TRequest,
  TNext = void,
  TError = Error,
  TState = TNext | null
>(
  actionNamespace: string,
  bus: Bus<Action<TRequest | TNext | TError | void>>,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer?: ReducerProducer<TRequest, TNext, TError, TState>
): Service<TRequest, TNext, TError, TState> {
  return createServiceListener(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    switchMap
  );
}

/**
 * Creates a Service - a concurrency-controlled wrapper around an effect, which tracks state over the effect's lifecycle events.
 * The effect can be a Promise-or-Observable returning function, and is cancelable if Observable.
 * Its concurrency mode is to cancel a running effect, and switch to a new one.
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param bus - The Bus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument. Defaults to producing state which is always the most recently returned response from the handler.
 * @returns A service in switching mode.
 * @summary ![switching mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-switching-sm.png)
 */
export function createSwitchingService<
  TRequest,
  TNext = void,
  TError = Error,
  TState = TNext | null
>(
  actionNamespace: string,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer?: ReducerProducer<TRequest, TNext, TError, TState>
): Service<TRequest, TNext, TError, TState> {
  return createServiceListener(
    actionNamespace,
    defaultBus,
    handler,
    reducerProducer,
    switchMap
  );
}

/**
 * Alias for createSwitchingServiceListener
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param bus - The Bus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument. Defaults to producing state which is always the most recently returned response from the handler.
 * @returns A service in switching mode.
 * @summary ![switching mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-switching-sm.png)
 */
export function createReplacingServiceListener<
  TRequest,
  TNext = void,
  TError = Error,
  TState = TNext | null
>(
  actionNamespace: string,
  bus: Bus<Action<TRequest | TNext | TError | void>>,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer?: ReducerProducer<TRequest, TNext, TError, TState>
): Service<TRequest, TNext, TError, TState> {
  return createSwitchingServiceListener(
    actionNamespace,
    bus,
    handler,
    reducerProducer
  );
}

/**
 * Alias for createSwitchingService
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param bus - The Bus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument. Defaults to producing state which is always the most recently returned response from the handler.
 * @returns A service in switching mode.
 * @summary ![switching mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-switching-sm.png)
 */
export function createReplacingService<
  TRequest,
  TNext = void,
  TError = Error,
  TState = TNext | null
>(
  actionNamespace: string,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer?: ReducerProducer<TRequest, TNext, TError, TState>
): Service<TRequest, TNext, TError, TState> {
  return createSwitchingServiceListener(
    actionNamespace,
    defaultBus,
    handler,
    reducerProducer
  );
}

/**
 * Creates a Service - a concurrency-controlled wrapper around an effect, which tracks state over the effect's lifecycle events.
 * The effect can be a Promise-or-Observable returning function, and is cancelable if Observable.
 * Its concurrency mode is to prevent a new handler from starting, if one is in progress.
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param bus - The Bus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument. Defaults to producing state which is always the most recently returned response from the handler.
 * @returns A service in blocking mode.
 * @summary ![blocking mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-blocking-sm.png)
 */
export function createBlockingServiceListener<
  TRequest,
  TNext = void,
  TError = Error,
  TState = TNext | null
>(
  actionNamespace: string,
  bus: Bus<Action<TRequest | TNext | TError | void>>,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer?: ReducerProducer<TRequest, TNext, TError, TState>
): Service<TRequest, TNext, TError, TState> {
  return createServiceListener(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    exhaustMap
  );
}

/**
 * Creates a Service - a concurrency-controlled wrapper around an effect, which tracks state over the effect's lifecycle events.
 * The effect can be a Promise-or-Observable returning function, and is cancelable if Observable.
 * Its concurrency mode is to prevent a new handler from starting, if one is in progress.
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param bus - The Bus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument. Defaults to producing state which is always the most recently returned response from the handler.
 * @returns A service in blocking mode.
 * @summary ![blocking mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-blocking-sm.png)
 */
export function createBlockingService<
  TRequest,
  TNext = void,
  TError = Error,
  TState = TNext | null
>(
  actionNamespace: string,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer?: ReducerProducer<TRequest, TNext, TError, TState>
): Service<TRequest, TNext, TError, TState> {
  return createServiceListener(
    actionNamespace,
    defaultBus,
    handler,
    reducerProducer,
    exhaustMap
  );
}

/**
 * Creates a Service - a concurrency-controlled wrapper around an effect, which tracks state over the effect's lifecycle events.
 * The effect can be a Promise-or-Observable returning function, and is cancelable if Observable.
 * Its concurrency mode is if a handler is running, terminates it, and does not begin a new handling.
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param bus - The Bus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument. Defaults to producing state which is always the most recently returned response from the handler.
 * @returns A service in toggling mode.
 * @summary ![toggling mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-toggling-sm.png)
 */
export function createTogglingServiceListener<
  TRequest,
  TNext = void,
  TError = Error,
  TState = TNext | null
>(
  actionNamespace: string,
  bus: Bus<Action<TRequest | TNext | TError | void>>,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer?: ReducerProducer<TRequest, TNext, TError, TState>
): Service<TRequest, TNext, TError, TState> {
  return createServiceListener(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    // @ts-ignore
    toggleMap
  );
}

/**
 * Creates a Service - a concurrency-controlled wrapper around an effect, which tracks state over the effect's lifecycle events.
 * The effect can be a Promise-or-Observable returning function, and is cancelable if Observable.
 * Its concurrency mode is if a handler is running, terminates it, and does not begin a new handling.
 *
 * @param actionNamespace - Prefix of all actions eg fetch/request
 * @param bus - The Bus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ProcessLifecycleActions as its argument. Defaults to producing state which is always the most recently returned response from the handler.
 * @returns A service in toggling mode.
 * @summary ![toggling mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-toggling-sm.png)
 */
export function createTogglingService<
  TRequest,
  TNext = void,
  TError = Error,
  TState = TNext | null
>(
  actionNamespace: string,
  handler: EventHandler<TRequest, TNext>,
  reducerProducer?: ReducerProducer<TRequest, TNext, TError, TState>
): Service<TRequest, TNext, TError, TState> {
  return createServiceListener(
    actionNamespace,
    defaultBus,
    handler,
    reducerProducer,
    // @ts-ignore
    toggleMap
  );
}

/** A safe-to-ignore action used to get the initial state. */
export const NULL_ACTION = { type: '__', payload: {} };
