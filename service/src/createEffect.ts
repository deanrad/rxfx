import { defaultBus } from '@rxfx/bus';
import {
  createService,
  createQueueingService,
  createSwitchingService,
  createBlockingService,
  createTogglingService,
} from './createService';
import { mergeMap } from 'rxjs/operators';

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
  return createService<Req, void>(namespace, bus, fn);
}

export const noopReducerProducer = () => (s: any) => s;

export function createCustomEffect<Req>(
  fn: (args: Req) => void,
  concurrencyOperator = mergeMap,
  namespace = randomId(),
  bus = defaultBus
) {
  return createService<Req, void>(
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
  return createQueueingService<Req>(namespace, bus, fn);
}

export function createSwitchingEffect<Req>(
  fn: (args: Req) => void,
  namespace = randomId(),
  bus = defaultBus
) {
  return createSwitchingService<Req>(namespace, bus, fn);
}

export function createBlockingEffect<Req>(
  fn: (args: Req) => void,
  namespace = randomId(),
  bus = defaultBus
) {
  return createBlockingService<Req>(namespace, bus, fn);
}

export function createTogglingEffect<Req>(
  fn: (args: Req) => void,
  namespace = randomId(),
  bus = defaultBus
) {
  return createTogglingService<Req>(namespace, bus, fn);
}
