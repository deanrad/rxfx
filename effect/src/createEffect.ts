import { after } from '@rxfx/after';
import { toggleMap } from '@rxfx/operators';

import {
  EMPTY,
  Observable,
  ObservableInput,
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
  endWith,
  exhaustMap,
  filter,
  map,
  mergeMap,
  scan,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';

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
  cancelCurrent: () => void;
  cancelCurrentAndQueued: () => void;
  shutdown: () => void;
}

/**
 * Reserved
 */
export interface Stateful<Response, TError> {
  lastResponse: BehaviorSubject<Response | null>;
  currentError: BehaviorSubject<TError | null>;
  state: BehaviorSubject<null>;
}
export interface Events<Request, Response, TError> {
  errors: Observable<TError>;
  responses: Observable<Response>;
  starts: Observable<Request>;
  completions: Observable<Request>;
  cancelations: Observable<Request>;
  isHandling: BehaviorSubject<boolean>;
  isActive: BehaviorSubject<boolean>;
}

/**
 * An EffectRunner is a function, enhanced with Observable properties
 */
export interface EffectRunner<Request, Response, TError = Error>
  extends EffectTriggerer<Request>,
    Cancelable,
    Stateful<Response, TError>,
    Events<Request, Response, TError> {
  request: (req: Request) => void;

  send: (
    req: Request,
    matcher?: (req: Request, res: Response) => boolean
  ) => Promise<Response>;
}

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
export function createEffect<Request, Response = void, TError = Error>(
  handler: EffectSource<Request, Response>,
  concurrencyOperator = mergeMap
): EffectRunner<Request, Response, TError> {
  const errors = new Subject<TError>();

  const currentError = new BehaviorSubject<TError | null>(null);
  const lastResponse = new BehaviorSubject<Response | null>(null);
  const state = new BehaviorSubject(null);

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
    let oneResult: ObservableInput<Response> = [];

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
        next(v){ responses.next(v)},
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
      concurrencyOperator(singleRequestHandler)
    ))
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
    endWith(false),
    distinctUntilChanged()
  ).subscribe(isHandling);
  mainSub.add(handlingSub);

  // Tracks activity in isActive
  const activitySub = isHandling
    .asObservable()
    .pipe(
      // The switchMap/Promise magic ensures isActive stays true even when moving between queued handlings.
      switchMap((status) => (status ? of(status) : Promise.resolve(status))),
      endWith(false),
      distinctUntilChanged()
    )
    .subscribe(isActive);
  mainSub.add(activitySub);

  // Allows global shutdown
  const shutdownSub = allShutdowns.subscribe(() => {
    mainSub.unsubscribe();
    shutdownSub.unsubscribe();
  });

  // Exposes the function to trigger the effect
  const executor = function Effect(req: Request) {
    handlings.next(
      new Observable((notify) => {
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
    shutdown() {
      // terminates all our subs in one fell swoop!
      mainSub.unsubscribe();
    },
    // Events
    errors: errors.asObservable(),
    responses: responses.asObservable(),
    starts: starts.asObservable(),
    completions: completions.asObservable(),
    cancelations: cancelations.asObservable(),
    isHandling,
    isActive,
    lastResponse,
    currentError,
    // Stateful
    state,
  };

  // The first batch starts us listening
  batch.next();

  return Object.assign(executor, extensions);
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createQueueingEffect` runs in concurrency mode: "queueing" aka `concatMap`.
 * @summary ![queueing mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-queueing-sm.png) */
export function createQueueingEffect<Req, Res>(
  fn: (args: Req) => ObservableInput<Res>
) {
  return createEffect(fn, concatMap);
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createSwitchingEffect` runs in concurrency mode: "switching" aka `switchMap`.
 * @summary ![switching mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-switching-sm.png) */
export function createSwitchingEffect<Req, Res>(
  fn: (args: Req) => ObservableInput<Res>
) {
  return createEffect(fn, switchMap);
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createBlockingEffect` runs in concurrency mode: "blocking" aka `exhaustMap`.
 * @summary ![blocking mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-blocking-sm.png)
 */
export function createBlockingEffect<Req, Res>(
  fn: (args: Req) => ObservableInput<Res>
) {
  return createEffect(fn, exhaustMap);
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createTogglingEffect` runs in concurrency mode: "blocking" aka `exhaustMap`.
 * @summary ![toggling mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-toggling-sm.png)
 */
export function createTogglingEffect<Req, Res>(
  fn: (args: Req) => ObservableInput<Res>
) {
  return createEffect(fn, toggleMap as typeof mergeMap);
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is throttled to within `msec`, meaning an existing execution or delay blocks new ones.
 * The effect is cancelable if it returns an Observable. `createThrottledEffect` runs in concurrency mode: "toggling".
 * @summary ![blocking mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-blocking-sm.png)
 */
export function createThrottledEffect(msec: number) {
  return function <Req>(fn: (args: Req) => ObservableInput<void>) {
    return createEffect((args: Req) => {
      return concat(
        // do the work up front
        fn(args),
        // include the throttling interval
        after(msec, EMPTY)
      );
    }, exhaustMap);
  };
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is debounced for `msec`, meaning a new invocation waits to being, and interrupts any existing delay or execution.
 * The effect is cancelable if it returns an Observable. `createDebouncedEffect` runs in concurrency mode: "toggling".
 * @summary ![switching mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-switching-sm.png)
 */
export function createDebouncedEffect(msec: number) {
  return function <Req, Res = void>(fn: (args: Req) => ObservableInput<Res>) {
    return createEffect((args: Req) => {
      return concat(
        // wait initially
        after(msec, EMPTY),
        // then do the work - if not yet canceled
        fn(args)
      );
    }, switchMap);
  };
}
/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createCustomEffect` runs in the concurrency mode of the
 * RxJS operator it is passed as its 2nd argument */
export function createCustomEffect<Req, Res>(
  fn: (args: Req) => ObservableInput<Res>,
  concurrencyOperator = mergeMap
) {
  return createEffect(fn, concurrencyOperator);
}
