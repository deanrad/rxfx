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

export function createEffect<Req>(
  fn: (args: Req) => void,
  namespace = randomId(),
  bus = defaultBus
) {
  return createServiceListener<Req, void>(namespace, bus, fn);
}

export const noopReducerProducer = () => (s: any) => s;

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

export function createQueueingEffect<Req>(
  fn: (args: Req) => void,
  namespace = randomId(),
  bus = defaultBus
) {
  return createQueueingServiceListener<Req>(namespace, bus, fn);
}

export function createSwitchingEffect<Req>(
  fn: (args: Req) => void,
  namespace = randomId(),
  bus = defaultBus
) {
  return createSwitchingServiceListener<Req>(namespace, bus, fn);
}

export function createBlockingEffect<Req>(
  fn: (args: Req) => void,
  namespace = randomId(),
  bus = defaultBus
) {
  return createBlockingServiceListener<Req>(namespace, bus, fn);
}

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

export function createDebouncedEffect(msec: number) {
  return function <Req, Res = void>(
    fn: (args: Req) => ObservableInput<Res>,
    namespace = randomId(),
    bus = defaultBus
  ) {
    return createSwitchingServiceListener<Req, Res>(namespace, bus, (args: Req) => {
      return concat(
        // wait initially
        after(msec, EMPTY),
        // then do the work - if not yet canceled
        fn(args)
      );
    });
  };
}

export function createTogglingEffect<Req>(
  fn: (args: Req) => void,
  namespace = randomId(),
  bus = defaultBus
) {
  return createTogglingServiceListener<Req>(namespace, bus, fn);
}
