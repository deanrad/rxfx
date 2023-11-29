import { useEffect, useState } from 'react';
import { Observable } from 'rxjs';

/**
 * Subscribes to an Observable and returns the latest value, completion status, and loading status.
 * Resets the subscription and completed/loading states if the observable reference changes.  
 *
 * @param {Observable<T>} observable The Observable to subscribe to.
 * @returns {{ value: T | undefined, isComplete: boolean, loading: boolean }} An object containing the latest value emitted by the Observable, the completion status, and the loading status.
 */
export function useObservable<T>(observable: Observable<T>) {
  const [value, setValue] = useState<T>();
  const [completed, setCompleted] = useState(false);
  const [loadingFirst, setLoadingFirst] = useState(true);

  useEffect(() => {
    setCompleted(false);
    setLoadingFirst(true);
    const subscription = observable.subscribe({
      next: (newValue) => {
        setLoadingFirst(false);
        setValue(newValue);
      },
      complete: () => {
        setCompleted(true);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [observable]);

  return { value, isComplete: completed, loading: loadingFirst };
}
