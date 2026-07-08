import { after } from '@rxfx/after';
import { EMPTY, ObservableInput, race, throwError } from 'rxjs';

export interface TimeoutOptions<TRequest, TError> {
  duration: number;
  errorFactory?: (req: TRequest) => TError;
}

/** Given timeout options, and a process (event Handler) to wrap, returns a handler which
 * times out with the specified duration and errorFactory.
 */
export function timeoutHandler<TRequest, TNext, TError = Error>(
  opts: TimeoutOptions<TRequest, TError>,
  handler: (req: TRequest) => ObservableInput<TNext> | void
): (req: TRequest) => ObservableInput<TNext> | void {
  const timeout = opts.duration;
  if (!timeout) return handler;

  const duration = timeout;

  const errFactory = opts.errorFactory
    ? opts.errorFactory
    : (_req: TRequest) => {
        return new Error(`Rxfx process timed out in ${duration} ms`);
      };

  return (req: TRequest) => {
    const handlingResult = handler(req) ?? EMPTY;
    const timerOut = after(
      duration,
      throwError(() => errFactory(req))
    ) as typeof handlingResult;

    return race(handlingResult, timerOut);
  };
}
