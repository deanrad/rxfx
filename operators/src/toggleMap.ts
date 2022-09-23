import {
  OperatorFunction,
  Observable,
  ObservableInput,
  Subscription,
  from,
} from 'rxjs';

/**
 ⏯ Begins a new subscription to the mapped Observable, only if there is no current subscription.
 * Any current Subscription is terminated.
 * Use when cancelability is important, like a video player tapped both to start and stop.
 *
 * @param workCreator The Observable-factory whose subscription is to be toggled
 * @example ```
 * const switch = new Subject();
 * const light = switch.pipe(toggleMap(() => new Observable(o => {
 *   console.log('connected: true');
 *   return () => console.log('connected: false');
 * }))).subscribe()
 *
 * switch.next(); // connected: true
 * switch.next(); // connected: false
 * ```
 */
export function toggleMap<T, R, S = R>(
  workCreator: (event: T) => ObservableInput<R>,
  mapper?: (_: T, inner: R) => S
): OperatorFunction<T, S> {
  return function (source: Observable<T>) {
    return new Observable((notify) => {
      let innerSub: Subscription;

      return source.subscribe({
        next(trigger) {
          if (!innerSub || innerSub.closed) {
            innerSub = from(workCreator(trigger)).subscribe({
              next: (inner) => {
                const result = (mapper ? mapper(trigger, inner) : inner) as S;
                notify.next(result);
              },
              error: (e) => notify.error(e),
            });
          } else {
            innerSub.unsubscribe();
          }
        },
        error(e) {
          notify.error(e);
        },
        complete() {
          notify.complete();
        },
      });
    });
  };
}
