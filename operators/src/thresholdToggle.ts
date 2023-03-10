import {
  from,
  Observable,
  ObservableInput,
  OperatorFunction,
  Subscription,
} from 'rxjs';

/**
 🔘 Toggles a new subscription to the mapped Observable, once a threshold of events has been detected.
 * Any current Subscription is terminated.
 * Use when cancelability is important, like a video player tapped both to start and stop.
 *
 * @param workCreator The Observable-factory whose subscription is to be toggled
 * @example ```
 * const momentary = new Subject();
 * const light = momentary.pipe(thresholdToggle(1, () => new Observable(o => {
 *   console.log('connected: true');
 *   return () => console.log('connected: false');
 * }))).subscribe()
 *
 * switch.next(); // connected: true
 * switch.next(); // connected: false
 * ```
 */
 export function thresholdToggle<T, R, S = R>(
  workCreator: (event: T) => ObservableInput<R>,
  threshold: number = 2,
  mapper?: (_: T, inner: R) => S
): OperatorFunction<T, S> {
  type NewType = Observable<T>;

  return function (source: NewType) {
    return new Observable((notify) => {
      let innerSub: Subscription | null;
      let hitsTowardThreshold = 0;

      return source.subscribe({
        next(trigger) {
          hitsTowardThreshold += 1;

          if (hitsTowardThreshold >= threshold) {
            if (!innerSub || innerSub?.closed) {
              innerSub = from(workCreator(trigger)).subscribe({
                next: (inner) => {
                  const result = (mapper ? mapper(trigger, inner) : inner) as S;
                  notify.next(result);
                },
                error: (e) => notify.error(e)
              });
            } else {
              console.log(innerSub?.closed, hitsTowardThreshold);
              innerSub.unsubscribe();
              innerSub = null;
            }

            hitsTowardThreshold = 0;
          }
        },
        error(e) {
          notify.error(e);
        },
        complete() {
          notify.complete();
        }
      });
    });
  };
}
