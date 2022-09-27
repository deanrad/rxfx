import { timer, MonoTypeOperatorFunction, Observable, Subject } from 'rxjs';
import { tap, mergeMap, map } from 'rxjs/operators';

/**
 * Defers all values and the completion until beyond the minimum time from now, if needed.
 * @param minimumMs
 * @returns
 */
export function padToTime<T>(minimumMs: number): MonoTypeOperatorFunction<T> {
  return function (source: Observable<T>) {
    return new Observable((observer) => {
      const delayExpires = Date.now() + minimumMs;

      // Each maybe-delayed event gets put in here via .next(), and the observer gets the result
      const delays = new Subject<Observable<T>>();

      // Act on our delays immediately (mergeMap aka Immediate)
      // Every subscription begun gets added to 'cleanup', preserving cancelability
      const cleanup = delays.pipe(mergeMap((d) => d)).subscribe(observer);

      cleanup.add(
        source.subscribe({
          next(v) {
            const timeLeft = Math.max(0, delayExpires - Date.now());
            const delayedValue = timer(timeLeft).pipe(map(() => v));
            delays.next(delayedValue);
          },
          complete() {
            const timeLeft = Math.max(0, delayExpires - Date.now());
            const delayedComplete = timer(timeLeft).pipe(
              tap(() => delays.complete())
            );
            cleanup.add(delayedComplete.subscribe());
          },
        })
      );

      return cleanup;
    });
  };
}
