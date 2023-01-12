import { firstValueFrom, Observable, of, timer, PartialObserver } from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';

export interface Thunk<T> {
  (): T;
}
type SubscribeObserver = {
  subscribe: () => void;
  unsubscribe: () => void;
};
export type TapObserver<T> = PartialObserver<T> | SubscribeObserver;

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
 * `after` is a better setTimeout, implemented as an `await`-able Observable.
 * `after` is both lazy, cancelable, and 'thenable'— it can be awaited like a Promise.
 * `after` returns an Observable of the value, or result of the function call, or the Observable, after the given delay.
 *  For a delay of 0, the function is executed synchronously when `.subscribe()` is called.
 *
 * @returns An delayed Observable of the object, thunk return value, or Observable's notification(s).
 * @argument delayArg Either a number of milliseconds, a Promise, `setTimeout`, or `requestAnimationFrame`
 * @argument valueProvider Can be a value, a function returning a value, or an Observable.
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
      delay.pipe(mergeMap(() => valueProvider as Observable<T>))
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
