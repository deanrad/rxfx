import { defaultBus } from '@rxfx/bus';
import {
  createServiceListener,
  createQueueingServiceListener,
  createSwitchingServiceListener,
  createBlockingServiceListener,
  createTogglingServiceListener,
} from './createService';
import { mergeMap } from 'rxjs/operators';
import { EMPTY, ObservableInput, concat } from 'rxjs';
import { after } from '@rxfx/after';

/**
 * Returns a random hex string, like a Git SHA. Not guaranteed to
 * be unique - just to within about 1 in 10,000.
 */
export const randomId = (length: number = 7) => {
  return Math.floor(Math.pow(2, length * 4) * Math.random())
    .toString(16)
    .padStart(length, '0');
};

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createEffect` runs in concurrency mode: "immediate" aka `mergeMap`.
 *  @summary ![immediate mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-immediate-sm.png)
 * @deprecated This function has moved to `@rxfx/effect`. */
export function createEffect<Req>(
  fn: (args: Req) => void,
  namespace = randomId(),
  bus = defaultBus
) {
  return createServiceListener<Req, void>(namespace, bus, fn);
}

export const noopReducerProducer = () => (s: any) => s;

/** Creates an Effect - A higher-order wrapper around a Promise-or-Observable returning function.
 * The effect is cancelable if it returns an Observable. `createCustomEffect` runs in the concurrency mode of the
 * RxJS operator it is passed as its 2nd argument.
 * @deprecated This function has moved to `@rxfx/effect`.*/
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
 * @deprecated This function has moved to `@rxfx/effect`.
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
 * @deprecated This function has moved to `@rxfx/effect`.
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
 * @deprecated This function has moved to `@rxfx/effect`.
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
 * @deprecated This function has moved to `@rxfx/effect`.
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
 * @deprecated This function has moved to `@rxfx/effect`.
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
 * The effect is cancelable if it returns an Observable. `createTogglingEffect` runs in concurrency mode: "toggling".
 * @deprecated This function has moved to `@rxfx/effect`.
 * @summary ![toggling mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-toggling-sm.png)
 */
export function createTogglingEffect<Req>(
  fn: (args: Req) => void,
  namespace = randomId(),
  bus = defaultBus
) {
  return createTogglingServiceListener<Req>(namespace, bus, fn);
}
