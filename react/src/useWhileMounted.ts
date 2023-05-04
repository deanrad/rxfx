import * as React from 'react';
import { useEffect, useMemo } from 'react';
import { Observable, Subscription } from 'rxjs';

/**
 * Ties a subscription to the lifetime of the component that calls useWhileMounted.
 * Given a function which is either a useEffect-style callback, or returns an Observable of subscription,
 * runs/subscribes it at component mount time, and runs the cleanup callback/unsubscribes at unmount time.
 */
export function useWhileMounted(
  sourceFactory: React.EffectCallback | (() => Subscription) | (() => Observable<any>)
) {
  useEffect(() => {
    const source = sourceFactory();
    const teardown = (source as Observable<any>)?.subscribe
      ? (source as Observable<any>).subscribe()
      : source || new Subscription();

    return (teardown as Subscription)?.unsubscribe
      ? () => (teardown as Subscription).unsubscribe()
      : () => {
          (teardown as () => void)?.();
        };
  }, []);
}

/**
 * Ties multiple subscriptions to the lifetime of the component that calls useAllWhileMounted.
 * Given spread args of subscription-returning functions, gets the subscriptions from each
 * subscription factory at component mount time, and unsubscribes them all at unmount time.
 */
export function useAllWhileMounted(...subFactories: Array<() => Subscription>) {
  useEffect(() => {
    const allSubs = new Subscription();
    for (let subFactory of subFactories) {
      allSubs.add(subFactory());
    }
    return () => allSubs.unsubscribe();
  }, []);
}

/** Initiates a subscription (for listening) on the first render, and shuts it down on unmount.
 * Allows parents to hear events from their children's renders and mounts.
 * @description React renders parent-to-child, but mounts child-to-parent, 
 * so for a parent to hear a child's mount event, the parent must start listening before
 * it renders the children - that's what useWhileRendered is for.
 * @example `useWhileRendered(() => bus.listen(CHILD_EVENT.match, log))`
 */
export function useWhileRendered(listenerMaker: () => Subscription) {
  // invoke the listenerMaker once, immediately
  const sub = useMemo(() => listenerMaker(), []);
  useWhileMounted(() => sub);
}
