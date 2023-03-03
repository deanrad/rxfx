import {
  firstValueFrom,
  Observable,
  of,
  timer,
  PartialObserver,
  Observer,
} from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';

export interface Thunk<T> {
  (): T;
}

export interface SubscribeObserver<T> extends Observer<T> {
  subscribe: () => void;
  unsubscribe: () => void;
  finalize: () => void;
}

export type TapObserver<T> = PartialObserver<T> | SubscribeObserver<T>;

function makeAwaitable<T>(obs: Observable<T>, observer?: TapObserver<T>) {
  const obsTapped = observer ? obs.pipe(tap(observer)) : obs;
  const thenHandler = (
    resolve: (v: T) => any,
    reject: (e: unknown) => unknown
  ) => {
    return (firstValueFrom(obsTapped) as PromiseLike<T>).then(resolve, reject);
  };
  Object.assign(obsTapped, {
    then: thenHandler,
    catch(rejectHandler: (e: unknown) => unknown) {
      return thenHandler((result: any) => result, rejectHandler);
    },
  });
  return obsTapped as Observable<T> & Promise<T>;
}

/**
 * `after` is a more readable version of `setTimeout`, implemented as an `await`-able Observable.
 * `after` is lazy, and cancelable like an Observable, and `then`-able and `await`-able like a Promise.
 *
 * `after` is single-valued if a primitive or thunk is its 2nd argument, multivalued if an Observable.
 *  For a delay of 0, the value is given synchronously when `.subscribe()` is called.
 *
 * @returns An `await`-able Observable of the object, thunk return value, or Observable's notification(s).
 * @argument `delayArg` Either a number of milliseconds, a Promise, `setTimeout`, or `requestAnimationFrame`
 * @argument `valueProvider` Can be a value, a function returning a value, or an Observable.
 * @argument `observer` A `TapObserver` that can handle subscription or value events.
 * @see https://www.youtube.com/watch?v=Bvsb9Qy1V9g for how `after` can be thought of as a 2-dimensional value, a
 * composable vector in the 2-D space of time and values.
 * @example
 * ```typescript
 * after(0, value)            # sync value
 * after(N, value)            # delayed value
 * after(N, ()=>value))       # delayed call
 * after(N, Observable))      # delayed Obs.
 * after(Promise, ()=>value)) # chained Promise
 * after(N, value, {next})    # with Observer
 * after(setTimeout, v)       # setTimeout(0)
 * after(rAF, v)              # ani. frame
 * ```
 */
export function after<T>(
  delayArg: number | Promise<any> | typeof setTimeout,
  valueProvider?: T | ((v?: T) => T) | Observable<T>,
  observer?: TapObserver<T>
) {
  const resultFn = (
    typeof valueProvider === 'function' ? valueProvider : () => valueProvider
  ) as (v?: T) => T;

  // case: synchronous
  if (delayArg === 0) {
    return makeAwaitable(of(resultFn()), observer);
  }

  // case: 1st argument Promise. Errors if last argument is an Observable.
  if (typeof delayArg === 'object' && (delayArg as PromiseLike<T>).then) {
    const obs = new Observable((notify) => {
      let canceled = false;
      (delayArg as Promise<T>).then((resolved) => {
        if (!canceled) {
          const result = resultFn(resolved);
          notify.next(result);
          notify.complete();
        }
      });
      return () => {
        canceled = true;
      };
    });
    // @ts-ignore
    return makeAwaitable(obs, observer);
  }

  // Case: 2nd argument Observable. Errors unless first arg is a number.
  if ((valueProvider as Observable<T>)?.subscribe) {
    const delay: Observable<number> = timer(delayArg as unknown as number);
    return makeAwaitable(
      delay.pipe(mergeMap(() => valueProvider as Observable<T>)),
      observer
    );
  }

  // Case: 1st argument requestAnimationFrame
  if (isRaF(delayArg)) {
    const nextFrame = new Observable<T>((notify) => {
      const reqId = requestAnimationFrame(() => {
        const retVal = resultFn();
        notify.next(retVal);
        notify.complete();
      });
      return cancelAnimationFrame(reqId);
    });
    return makeAwaitable(nextFrame, observer);
  }

  // Default - a value or thunk and a number of milliseconds
  const obs = new Observable<T>((notify) => {
    const id = setTimeout(
      () => {
        try {
          const retVal = resultFn();
          notify.next(retVal);
          notify.complete();
        } catch (ex) {
          notify.error(ex);
        }
      },
      delayArg === setTimeout ? 0 : (delayArg as number)
    );
    return () => {
      id && clearTimeout(id);
    };
  });

  return makeAwaitable(obs, observer);
}

function isRaF(fn: any) {
  return (
    typeof requestAnimationFrame === 'function' && fn === requestAnimationFrame
  );
}
