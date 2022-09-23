// @ts-nocheck
import {
  Observable,
  OperatorFunction,
  ObservableInput,
  from,
  of,
  Subscription,
  PartialObserver,
  withLatestFrom,
} from 'rxjs';

/**
 * Implements the Ember-Concurrency strategy [keepLatest](https://ember-concurrency.com/docs/task-concurrency#keepLatest).
 * Like queueing, but with a maximum queue size of 1. In the event of multiple conflicting events,
 * only the latest will trigger a handling, after the current handling is complete.
 * @param workCreator The Observable-factory whose latest subscription is to be enqueued
 * @param mapper A function to combine each emission of the togglable with the trigger itself, making it the new value of the togglable.
 */
export function queueOnlyLatest<T, R, S = R>(
  workCreator: (event: T) => ObservableInput<R>,
  mapper?: (_: T, inner: R) => S
): OperatorFunction<T, S> {
  return function (source: Observable<T>) {
    return new Observable((notify) => {
      let handlerSub: Subscription;

      let work: Observable<R>;
      // each new concurrent request overwrites this
      let nextWork: Observable<R> | null;
      const nextViaMapper = ([result, trigger]: [R, T]) => {
        const _result = (mapper ? mapper(trigger, result) : result) as S;
        notify.next(_result);
      };

      let workObserver: PartialObserver<[R, T]> = {
        complete() {
          handlerSub = nextWork?.subscribe({
            next: nextViaMapper,
          });
        },
        next: nextViaMapper,
        error: (e) => notify.next(e),
      };

      function makeWork(trigger: T) {
        return from(workCreator(trigger)).pipe(withLatestFrom(of(trigger)));
      }

      return source.subscribe({
        next(trigger) {
          if (!handlerSub || handlerSub.closed) {
            // clear our queue
            nextWork = null;
            // start this work
            work = makeWork(trigger);
            handlerSub = work.subscribe(workObserver);
          } else {
            // let the existing handlerSub call nextWork, which we'll populate
            nextWork = makeWork(trigger);
          }
        },
        error(e) {
          notify.error(e);
        },
        complete() {
          notify.complete(e);
        },
      });
    });
  };
}
