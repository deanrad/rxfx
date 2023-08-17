import { Observable, ObservableInput, from } from 'rxjs';

/**
 * Creates a cancelable handler closing over an AbortSignal.
 * @example
 * ```
 * const PET_CAT = createEvent<string>("cat/pet");
 * 
 * const petCat = (cat) => {
 *   return fetch('http://cat.pet?t=500' + cat);
 * }
 * const petCatWithBrush = (cat, signal) => {
 *   return fetch('http://cat.pet?t=500' + cat, { signal });
 * }
 *
 * const petter = bus.listen(
 *   PET_CAT,
 *   makeAbortable(petCatWithBrush)
 * );
 * 
 * // Petting begins
 * bus.trigger( PET_CAT('Morris') )
 * 
 * // But petWithBrush is cancelable
 * petter.unsubscribe();
 * ```
 */
export function makeAbortableHandler<RequestType, NextType>(
  // The handler can return a Promise, or anything `from` can convert to an Observable
  handler: (req: RequestType, signal: AbortSignal) => ObservableInput<NextType>
): (req: RequestType) => Observable<NextType> {
  // Create and return a new Handler that closes over its AbortController
  return (req: RequestType) => {
    // Each handling creates its own AbortController and signal
    const controller = new AbortController();
    const { signal } = controller;

    // Upcast our handler's return value into an Observable, and return it
    return new Observable<NextType>((observer) => {
      // Pass the signal in to the handler
      const handling = handler(req, signal);

      // Get an Observable of its result (which may have been a Promise, generator)
      const handling$ = from(handling);

      // Begin the effect, and pass through all notifications
      handling$.subscribe(observer);

      // Return a cleanup function for when we're unsubscribed (ala useEffect)
      return () => {
        controller.abort();
      };
    });
  };
}
