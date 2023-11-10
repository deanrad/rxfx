import { useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { useWhileMounted } from './useWhileMounted';

/** Gets the value of an RxJS BehaviorSubject, and rerenders when the subject gets a new value via `subject.next(value)`
 */
export function useSubject<T>(subject: BehaviorSubject<T>) {
  const [value, setValue] = useState<T>(subject.value);
  useWhileMounted(() => subject.subscribe(setValue));
  return value;
}
