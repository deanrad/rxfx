import { after } from '@rxfx/after';
import { toggleMap } from '@rxfx/operators';

import {
  EMPTY,
  Observable,
  Subject,
  BehaviorSubject,
  concat,
  from,
  merge,
  of,
  firstValueFrom,
} from 'rxjs';
import {
  catchError,
  concatMap,
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  mergeMap,
  scan,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import {
  EffectRunner,
  EffectSource,
  LifecycleReducerEvent,
  ProcessLifecycleCallbacks,
} from './types';
export { EffectRunner } from './types';

const allShutdowns = new Subject<void>();

/** Used to terminate all running Effects. Call when an application is shutting down. For individual effect control, see its Cancelable interface.
 */
export function shutdownAll() {
  allShutdowns.next();
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createEffect` by default runs in concurrency mode: "immediate" aka `mergeMap`.
 * @param handler The Promise or Observable-returning effect function - the EffectSource
 * @param concurrencyOperator The concurrency-control function (defaults to `mergeMap` aka Immediate)
 * @summary ![immediate mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-immediate-sm.png) */
export function createEffect<
  Request,
  Response = void,
  TError extends Error = Error,
  TState = Response
>(
  handler: EffectSource<Request, Response>,
  concurrencyOperator = mergeMap,
  initialState?: TState
): EffectRunner<Request, Response, TError, TState> {
  const errors = new Subject<TError>();

  const currentError = new BehaviorSubject<TError | null>(null);
  const lastResponse = new BehaviorSubject<Response | null>(null);
  // seed `state` with initialState or null
  const state = new BehaviorSubject<TState | null>(initialState ?? null);

  const incoming = new Subject<Request>();
  const requests = new Subject<Request>();
  const responses = new Subject<Response>();
  const starts = new Subject<Request>();
  const ends = new Subject<Request>();
  const completions = new Subject<Request>();
  const cancelations = new Subject<Request>();

  const currentCancel = new Subject<void>();
  const batch = new Subject<void>();
  const handlings = new Subject<Observable<void>>();
  const isHandling = new BehaviorSubject<boolean>(false);
  const isActive = new BehaviorSubject<boolean>(false);

  const singleRequestHandler = (request: Request) => {
    let oneResult: any = [];

    currentError.next(null);

    try {
      oneResult = handler(request);
    } catch (e) {
      errors.next(e as TError);
    }

    // prettier-ignore
    const obsResult = from(oneResult ?? EMPTY).pipe(
      tap({
        subscribe(){ starts.next(request) },
        finalize(){ ends.next(request) },
        next(v){ responses.next(v as Response)},
        complete(){ completions.next(request) },
        unsubscribe(){ cancelations.next(request)  }
      }),
      catchError(e => {
        // handle here rather than tap to stop propogation
        errors.next(e) 
        return EMPTY // We've already put it on #errors
      }),
      takeUntil(currentCancel)
    )

    return obsResult;
  };

  // Executes and serializes handlings processes
  // prettier-ignore
  const mainSub = handlings.pipe(
    concatMap(h => h)
  ).subscribe();

  // The main driver of EffectSource execution
  // prettier-ignore
  const handlerSub = batch.pipe(
    switchMap(() => requests.pipe(
      concurrencyOperator(singleRequestHandler),
    )),
    takeUntil(allShutdowns)
  ).subscribe();
  mainSub.add(handlerSub);

  // Populate currentError
  mainSub.add(errors.subscribe(currentError));

  // Populate lastResponse
  mainSub.add(responses.subscribe(lastResponse));

  // Tracks activity in isHandling
  // prettier-ignore
  const handlingSub = merge(
    starts.pipe(map(() => 1)),
    ends.pipe(map(() => -1))
  ).pipe(
    scan((all, one) => all + one, 0),
    map(Boolean),
    distinctUntilChanged()
  ).subscribe(isHandling);
  mainSub.add(handlingSub);

  // Tracks activity in isActive
  const activitySub = isHandling
    .asObservable()
    .pipe(
      // The switchMap/Promise magic ensures isActive stays true even when moving between queued handlings.
      switchMap((status) => (status ? of(status) : Promise.resolve(status))),
      distinctUntilChanged()
    )
    .subscribe(isActive);
  mainSub.add(activitySub);

  // Allows global shutdown
  const shutdownSub = allShutdowns.subscribe(() => {
    shutdownSelf();
  });

  function shutdownSelf() {
    currentCancel.next(); // terminate us
    batch.next(); // terminate current batch
    // terminates all our subs in one fell swoop!
    mainSub.unsubscribe();
    shutdownSub.unsubscribe();

    isActive.next(false);
    isActive.complete();
    isHandling.complete();
    state.complete();
  }

  // Exposes the function to trigger the effect
  const executor = function Effect(req: Request) {
    handlings.next(
      new Observable((notify) => {
        incoming.next(req);
        requests.next(req);
        notify.complete();
      })
    );
  };

  const extensions = {
    request(req: Request) {
      executor(req);
    },
    send(req: Request, matcher = (_arg: Request, _resp: Response) => true) {
      const firstResult = responses.pipe(filter((res) => matcher(req, res)));

      executor(req);
      return firstValueFrom(firstResult);
    },
    // Cancelable
    cancelCurrent() {
      currentCancel.next();
    },
    cancelCurrentAndQueued() {
      batch.next();
    },
    unsubscribe() {
      batch.next();
    },
    shutdown: shutdownSelf,
    // Events
    requests: incoming.asObservable(),
    errors: errors.asObservable(),
    responses: responses.asObservable(),
    starts: starts.asObservable(),
    completions: completions.asObservable(),
    cancelations: cancelations.asObservable(),

    // Stateful
    lastResponse,
    currentError,
    isHandling,
    isActive,
    state,

    reduceWith(
      reducer: (
        state: TState,
        evt: LifecycleReducerEvent<Request, Response, Error>
      ) => TState,
      initial: TState
    ) {
      const events$ = merge(
        incoming.pipe(
          map((payload) => ({ type: 'request' as const, payload }))
        ),
        starts.pipe(map((payload) => ({ type: 'started' as const, payload }))),
        responses.pipe(
          map((payload) => ({ type: 'response' as const, payload }))
        ),
        completions.pipe(
          map((payload) => ({ type: 'complete' as const, payload }))
        ),
        cancelations.pipe(
          map((payload) => ({ type: 'canceled' as const, payload }))
        )
      );
      state.next(initial);
      mainSub.add(events$.pipe(scan(reducer, initial)).subscribe(state));
      return state as BehaviorSubject<TState>;
    },
    observe(fns: Partial<ProcessLifecycleCallbacks<Request, Response, Error>>) {
      const streams = [
        tap(fns.request ? fns.request : noop)(incoming),
        tap(fns.started ? fns.started : noop)(starts),
        tap(fns.response ? fns.response : noop)(responses),
        tap(fns.complete ? fns.complete : noop)(completions),
        tap(fns.canceled ? fns.canceled : noop)(cancelations),
        tap(fns.error ? fns.error : noop)(errors),
      ];
      const allEvents = merge(...streams).pipe(
        tap({
          finalize: fns.finalized,
        })
      );
      const sub = allEvents.subscribe();
      sub.add(
        merge(completions, cancelations)
          .pipe(tap(fns.finalized ?? noop))
          .subscribe()
      );

      return sub;
    },
  };

  // The first batch starts us listening
  batch.next();

  return Object.assign(executor, extensions);
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createQueueingEffect` runs in concurrency mode: "immediate" aka `mergeMap`.
 * @summary ![immediate mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-immediate-sm.png) */
export function createImmediateEffect<
  Request,
  Response = void,
  TError extends Error = Error,
  TState = Response
>(
  handler: EffectSource<Request, Response>,
  initialState?: TState
): EffectRunner<Request, Response, TError, TState> {
  return createEffect(handler, mergeMap, initialState);
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createQueueingEffect` runs in concurrency mode: "queueing" aka `concatMap`.
 * @summary ![queueing mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-queueing-sm.png) */
export function createQueueingEffect<
  Request,
  Response = void,
  TError extends Error = Error,
  TState = Response
>(
  handler: EffectSource<Request, Response>,
  initialState?: TState
): EffectRunner<Request, Response, TError, TState> {
  return createEffect(handler, concatMap, initialState);
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createSwitchingEffect` runs in concurrency mode: "switching" aka `switchMap`.
 * @summary ![switching mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-switching-sm.png) */
export function createSwitchingEffect<
  Request,
  Response = void,
  TError extends Error = Error,
  TState = Response
>(
  handler: EffectSource<Request, Response>,
  initialState?: TState
): EffectRunner<Request, Response, TError, TState> {
  return createEffect(handler, switchMap, initialState);
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createBlockingEffect` runs in concurrency mode: "blocking" aka `exhaustMap`.
 * @summary ![blocking mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-blocking-sm.png)
 */
export function createBlockingEffect<
  Request,
  Response = void,
  TError extends Error = Error,
  TState = Response
>(
  handler: EffectSource<Request, Response>,
  initialState?: TState
): EffectRunner<Request, Response, TError, TState> {
  return createEffect(handler, exhaustMap, initialState);
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createTogglingEffect` runs in concurrency mode: "blocking" aka `exhaustMap`.
 * @summary ![toggling mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-toggling-sm.png)
 */
export function createTogglingEffect<
  Request,
  Response = void,
  TError extends Error = Error,
  TState = Response
>(
  handler: EffectSource<Request, Response>,
  initialState?: TState
): EffectRunner<Request, Response, TError, TState> {
  return createEffect(handler, toggleMap as typeof mergeMap, initialState);
}

/** @see rxfx/perception for why this duration */
export const DEFAULT_DEBOUNCE_INTERVAL = 330;

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is throttled to within `msec`, meaning an existing execution or delay blocks new ones.
 * The effect is cancelable if it returns an Observable. `createThrottledEffect` runs in concurrency mode: "toggling".
 * @summary ![blocking mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-blocking-sm.png)
 */
export function createThrottledEffect(
  msec: number = DEFAULT_DEBOUNCE_INTERVAL
) {
  return function <
    Request,
    Response = void,
    TError extends Error = Error,
    TState = Response
  >(
    handler: EffectSource<Request, Response>,
    initialState?: TState
  ): EffectRunner<Request, Response, TError, TState> {
    return createEffect(
      (args: Request) => {
        return concat(
          // do the work up front
          // @ts-ignore
          handler(args),
          // include the throttling interval
          after(msec, EMPTY)
        );
      },
      exhaustMap,
      initialState
    );
  };
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is debounced for `msec`, meaning a new invocation waits to being, and interrupts any existing delay or execution.
 * The effect is cancelable if it returns an Observable. `createDebouncedEffect` runs in concurrency mode: "toggling".
 * @summary ![switching mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-switching-sm.png)
 */
export function createDebouncedEffect(
  msec: number = DEFAULT_DEBOUNCE_INTERVAL
) {
  return function <
    Request,
    Response = void,
    TError extends Error = Error,
    TState = Response
  >(
    handler: EffectSource<Request, Response>,
    initialState?: TState
  ): EffectRunner<Request, Response, TError, TState> {
    return createEffect(
      (args: Request) => {
        return concat(
          // wait initially
          after(msec, EMPTY),
          // then do the work - if not yet canceled
          // @ts-ignore
          handler(args)
        );
      },
      switchMap,
      initialState
    );
  };
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createCustomEffect` runs in the concurrency mode of the
 * RxJS operator it is passed as its 2nd argument */
export function createCustomEffect<
  Request,
  Response,
  TError extends Error = Error,
  TState = Response
>(
  handler: EffectSource<Request, Response>,
  concurrencyOperator = mergeMap,
  initialState?: TState
): EffectRunner<Request, Response, TError, TState> {
  return createEffect(handler, concurrencyOperator, initialState);
}

function noop() {}
