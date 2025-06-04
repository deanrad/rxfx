import * as React from 'react';
import { useEffect, useMemo } from 'react';
import { Observable, Subscription } from 'rxjs';

/**
 * Represents a factory function that can return an effect cleanup function,
 * a Subscription, or an Observable
 */
export type SubscriptionFactory =
  | React.EffectCallback
  | (() => Subscription)
  | (() => Observable<any>);

/**
 * A function that returns a Subscription
 */
export type SubscriptionMaker = () => Subscription;

/**
 * Synonym for `useEffect(fn, [])`, but works with Subscriptions and Observbles.
 * Ties a resources to the lifetime of the component that invokes it.
 * Given a function which is either a useEffect-style callback, or returns an Observable or Subscription,
 * runs/subscribes to sit at component mount time, and runs the cleanup callback/unsubscribes at unmount time.
 */
export function useWhileMounted(sourceFactory: SubscriptionFactory) {
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
 * Synonym for `useEffect(fn, [])`, but works with Subscriptions and Observbles.
 * An alias for `useWhileMounted`.
 */
export function useWhenMounted(sourceFactory: SubscriptionFactory) {
  useWhileMounted(sourceFactory);
}

/**
 * Synonym for `useEffect(fn, [])`, but works with Subscriptions and Observbles.
 * An alias for `useWhileMounted`.
 */
export function useAtMountTime(sourceFactory: SubscriptionFactory) {
  useWhileMounted(sourceFactory);
}

/**
 * Ties multiple subscriptions to the lifetime of the component that calls useAllWhileMounted.
 * Given spread args of subscription-returning functions, gets the subscriptions from each
 * subscription factory at component mount time, and unsubscribes them all at unmount time.
 */
export function useAllWhileMounted(...subFactories: SubscriptionMaker[]) {
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
export function useWhileRendered(listenerMaker: SubscriptionMaker) {
  // invoke the listenerMaker once, immediately
  const sub = useMemo(() => listenerMaker(), []);
  useWhileMounted(() => sub);
}

/**
 * Executes a callback function when the component unmounts.
 * Useful for cleanup operations that need to run only at unmount time.
 *
 * @example
 * ```
 * useAtUnmount(() => {
 *   analytics.trackComponentClosed();
 *   return saveUserState();
 * });
 * ```
 */
export function useAtUnmount(unmountCallback: () => void) {
  useWhileMounted(() => {
    // Return the callback to be executed at unmount time
    return unmountCallback;
  });
}
