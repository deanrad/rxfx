import { after } from '@rxfx/after';
import {
  from,
  interval,
  Observable,
  ObservableInput,
  race,
  Subscription,
  throwError,
} from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';

interface TimeoutOptions<TRequest, TError> {
  duration: number;
  errorFactory?: (req: TRequest) => TError;
}

interface MonitorOptions {
  duration: number;
  progressCallback: (elapsed: number) => unknown;
}

/** Given timeout options, and a process (event Handler) to wrap, returns a handler which
 * times out with the specified duration and errorFactory.
 */
export function timeoutHandler<TRequest, TNext, TError = Error>(
  opts: TimeoutOptions<TRequest, TError>,
  handler: (req: TRequest) => ObservableInput<TNext> // type of arg2 of .listen
): (req: TRequest) => ObservableInput<TNext> {
  const timeout = opts.duration;
  if (!timeout) return handler;

  const duration = timeout;

  const errFactory = opts.errorFactory
    ? opts.errorFactory
    : (_req: TRequest) => {
        return new Error(`Rxfx process timed out in ${duration} ms`);
      };

  return (req: TRequest) => {
    const handlingResult = handler(req);
    const timerOut = after(
      duration,
      throwError(() => errFactory(req))
    ) as typeof handlingResult;

    return race(handlingResult, timerOut);
  };
}

/** Decorates a handler such that when it is running, the given callback is invoked at the specified
 * interval, passing the elapsed number of ms as an argument.
 * Useful for Observables that don't notify of progress intrinsically.
 */
export function monitorHandler<TRequest, TNext>(
  opts: MonitorOptions,
  handler: (req: TRequest) => ObservableInput<TNext>
) {
  const { duration, progressCallback } = opts;
  return (req: TRequest) => {
    const monitorElapsed = interval(duration).pipe(
      map((i) => (i + 1) * duration),
      startWith(0)
    );

    let monitorSub = new Subscription();
    const handlingResult = from(handler(req)).pipe(
      tap({
        subscribe() {
          monitorSub = monitorElapsed.subscribe({ next: progressCallback });
        },
        finalize() {
          monitorSub.unsubscribe();
        },
      })
    );

    return handlingResult;
  };
}
