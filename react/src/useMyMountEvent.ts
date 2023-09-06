import { useMemo } from 'react';
import { Subject, firstValueFrom } from 'rxjs';
import { useWhileMounted } from './useWhileMounted';

/** Returns a stable Promise for when we're mounted, suitable for passing down to child components.
* @example
 * ```
* const Child = ({ parentMounted }) => {
*   useWhileMounted(() => {
*      parentMounted.then(() => ...)
*   })
* }
 
* const Parent = () => {
*   const myMountEvent = useMyMountEvent();
*   return <Child parentMounted={myMountEvent}/>
* ```
*/
export function useMyMountEvent() {
  const mounter = useMemo(() => new Subject<void>(), []);
  const mountPromise = useMemo(() => firstValueFrom(mounter), []);
  useWhileMounted(() => {
    mounter.next();
  });
  return mountPromise;
}
