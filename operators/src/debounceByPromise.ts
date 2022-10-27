import { Observable } from 'rxjs';
import { debounce, distinctUntilChanged } from 'rxjs/operators';

/** Takes an Observable that may emit multiple times in a single frame/tick
 *  (like for a synchronous array), and returns one emitting only the final
 * emission of each frame. */
export function debounceByPromise<T>(obs: Observable<T>) {
  return obs.pipe(
    debounce(() => Promise.resolve()),
    distinctUntilChanged()
  );
}
