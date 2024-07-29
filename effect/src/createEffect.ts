import { after } from '@rxfx/after';
import { defaultBus } from '@rxfx/bus';
import {
  createBlockingServiceListener,
  createQueueingServiceListener,
  createServiceListener,
  createSwitchingServiceListener,
  createTogglingServiceListener,
} from '@rxfx/service';
import {
  EMPTY,
  Observable,
  ObservableInput,
  Subject,
  concat,
  from,
} from 'rxjs';
import { concatMap, mergeMap, takeUntil, tap } from 'rxjs/operators';

/**
 * Returns a random hex string, like a Git SHA. Not guaranteed to
 * be unique - just to within about 1 in 10,000.
 */
export const randomId = (length: number = 7) => {
  return Math.floor(Math.pow(2, length * 4) * Math.random())
    .toString(16)
    .padStart(length, '0');
};

interface EffectFn extends Function {
  stop: () => void;
  cancelCurrent: () => void;
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createEffect` runs in concurrency mode: "immediate" aka `mergeMap`.
 *  @summary ![immediate mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-immediate-sm.png) */
export function createEffect<Request, Response>(
  handler: (args: Request) => ObservableInput<Response>,
  namespace = randomId(),
  bus = defaultBus
): EffectFn {
  const handlings = new Subject<Observable<void>>();
  const requests = new Subject<Request>();
  const cancels = new Subject<void>();

  // TODO Concurrency Mode
  const combiner = mergeMap;

  const wrappedHandler = (request: Request) => {
    const oneResult = handler(request);

    // prettier-ignore
    const obsResult = from(oneResult ?? EMPTY).pipe(
      takeUntil(cancels)
    );

    return obsResult;
  };

  // prettier-ignore
  // Executes and serializes handlings processes
  const mainSub = handlings.pipe(
    concatMap(h => h)
  ).subscribe();

  // Executes handler impls under the combiner concurrency mode
  // prettier-ignore
  const handlerSub = requests
    .pipe(
      combiner(wrappedHandler),
      takeUntil(bus.resets)
    )
    .subscribe();

  mainSub.add(handlerSub);

  const handlerFunction = function Effect(req: Request) {
    handlings.next(
      new Observable((notify) => {
        requests.next(req);
        notify.complete();
      })
    );
  };

  const effectFn: EffectFn = Object.assign(handlerFunction, {
    stop() {
      mainSub.unsubscribe();
    },
    cancelCurrent() {
      cancels.next();
    },
  });

  return effectFn;
}

export const noopReducerProducer = () => (s: any) => s;

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createCustomEffect` runs in the concurrency mode of the
 * RxJS operator it is passed as its 2nd argument */
export function createCustomEffect<Req>(
  fn: (args: Req) => void,
  concurrencyOperator = mergeMap,
  namespace = randomId(),
  bus = defaultBus
) {
  return createServiceListener<Req, void>(
    namespace,
    bus,
    fn,
    noopReducerProducer,
    concurrencyOperator
  );
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createQueueingEffect` runs in concurrency mode: "queueing" aka `concatMap`.
 * @summary ![queueing mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-queueing-sm.png) */
export function createQueueingEffect<Req>(
  fn: (args: Req) => void,
  namespace = randomId(),
  bus = defaultBus
) {
  return createQueueingServiceListener<Req>(namespace, bus, fn);
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createSwitchingEffect` runs in concurrency mode: "switching" aka `switchMap`.
 * @summary ![switching mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-switching-sm.png) */
export function createSwitchingEffect<Req>(
  fn: (args: Req) => void,
  namespace = randomId(),
  bus = defaultBus
) {
  return createSwitchingServiceListener<Req>(namespace, bus, fn);
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createBlockingEffect` runs in concurrency mode: "blocking" aka `exhaustMap`.
 * @summary ![blocking mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-blocking-sm.png)
 */
export function createBlockingEffect<Req>(
  fn: (args: Req) => void,
  namespace = randomId(),
  bus = defaultBus
) {
  return createBlockingServiceListener<Req>(namespace, bus, fn);
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is throttled to within `msec`, meaning an existing execution or delay blocks new ones.
 * The effect is cancelable if it returns an Observable. `createThrottledEffect` runs in concurrency mode: "toggling".
 * @summary ![blocking mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-blocking-sm.png)
 */
export function createThrottledEffect(msec: number) {
  return function <Req>(
    fn: (args: Req) => ObservableInput<void>,
    namespace = randomId(),
    bus = defaultBus
  ) {
    return createBlockingServiceListener<Req>(namespace, bus, (args: Req) => {
      return concat(
        // do the work up front
        fn(args),
        // include the throttling interval
        after(msec, EMPTY)
      );
    });
  };
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is debounced for `msec`, meaning a new invocation waits to being, and interrupts any existing delay or execution.
 * The effect is cancelable if it returns an Observable. `createDebouncedEffect` runs in concurrency mode: "toggling".
 * @summary ![switching mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-switching-sm.png)
 */
export function createDebouncedEffect(msec: number) {
  return function <Req, Res = void>(
    fn: (args: Req) => ObservableInput<Res>,
    namespace = randomId(),
    bus = defaultBus
  ) {
    return createSwitchingServiceListener<Req, Res>(
      namespace,
      bus,
      (args: Req) => {
        return concat(
          // wait initially
          after(msec, EMPTY),
          // then do the work - if not yet canceled
          fn(args)
        );
      }
    );
  };
}

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createTogglingEffect` runs in concurrency mode: "blocking" aka `exhaustMap`.
 * @summary ![toggling mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-toggling-sm.png)
 */
export function createTogglingEffect<Req>(
  fn: (args: Req) => void,
  namespace = randomId(),
  bus = defaultBus
) {
  return createTogglingServiceListener<Req>(namespace, bus, fn);
}
