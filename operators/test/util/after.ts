import { firstValueFrom, from, Observable, of, timer } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
interface AwaitableObservable<T> extends PromiseLike<T>, Observable<T> {}

export interface Thunk<T> {
  (): T;
}
/**
 * `after` is a composable `setTimeout`, based on Observables.
 * `after` returns an Observable of the value, or result of the function call, after the Promise, or the number of milliseconds given.
 * For a delay of 0, the function is executed synchronously when `.subscribe()` is called.
 * `after` is 'thenable' - and can be awaited like a Promise.
 * However, since underneath it is an Observable, `after` is both lazy and cancelable!
 *
 * @returns An Observable of the object or thunk return value, which can be the target of an `await`.
 */
export function after<T>(
  delaySpec: number | Promise<unknown> | typeof setTimeout,
  objOrFn?: T | Thunk<T> | Observable<T>
): AwaitableObservable<T> {
  const resultMapper =
    typeof objOrFn === 'function' ? (objOrFn as () => any) : () => objOrFn;

  let delay =
    typeof delaySpec === 'number'
      ? delaySpec <= 0
        ? of(0)
        : timer(delaySpec)
      : // @ts-ignore
      delaySpec.then
      ? // @ts-ignore
        from(delaySpec)
      : delaySpec === setTimeout
      ? from(new Promise((resolve) => setTimeout(resolve, 0)))
      : timer(1); // async, just a little;

  function isObservable<T>(obj: any): obj is Observable<T> {
    return obj?.subscribe !== undefined;
  }

  const ops = [
    isObservable<T>(objOrFn)
      ? // then replace the delay emission with the observable's
        mergeMap(() => objOrFn)
      : // otherwise emit the single value
        map(resultMapper),
  ];
  // @ts-ignore
  const resultObs: Observable<T> = delay.pipe(...ops.filter(Boolean));

  // after is a 'thenable, thus usable with await.
  // ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await
  // @ts-ignore
  resultObs.then = function (resolve, reject) {
    return firstValueFrom(resultObs).then(resolve, reject);
  };

  return resultObs as AwaitableObservable<T>;
}
// #endregion
