import { useEffect, useRef } from 'react';
import { Subscription } from 'rxjs';

import { defaultBus as bus, EffectObserver, EventHandler } from '@rxfx/bus';

export interface HandlerArgs<TMatchType> {
  matches: {
    match: ((i: TBusItem) => i is TMatchType) | ((i: TBusItem) => boolean);
  };
}

export type TBusItem = any; // because defaultBus is type Bus<any>
export interface ListenerArgs<TConsequence, TMatchType extends TBusItem = TBusItem>
  extends HandlerArgs<TMatchType> {
  handler: EventHandler<TMatchType, TConsequence>;
  observeWith?: EffectObserver<TConsequence>;
}
export interface FilterArgs<TMatchType extends TBusItem = TBusItem>
  extends HandlerArgs<TMatchType> {
  filter: (item: TMatchType) => TBusItem | null | undefined;
}

/**
 * Registers a listener, but un-registers and re-registers it on any change of deps.
 * Existing handlings will be terminated. This may run more often that you expect,
 * given the nature of deps and unstable fucntions.
 * @see https://reactjs.org/docs/hooks-faq.html#what-can-i-do-if-my-effect-dependencies-change-too-often
 */
export function useClosureListener<TConsequence, TMatchType extends TBusItem = TBusItem>(
  args: ListenerArgs<TConsequence, TMatchType>,
  deps: any[] = []
): Subscription {
  const lastSub = useRef(new Subscription()); /* just to make .unsubscribe() safe */
  useEffect(() => {
    // @ts-ignore
    lastSub.current = bus.listen(args.matches.match, args.handler, args.observeWith);

    return () => lastSub.current.unsubscribe();
  }, deps);
  return lastSub.current;
}

/**
 * Registers a filters, but un-registers and re-registers it on any change of deps.
 * This may run more often that you expect, given the nature of deps and unstable fucntions.
 * @see https://reactjs.org/docs/hooks-faq.html#what-can-i-do-if-my-effect-dependencies-change-too-often
 */
export function useClosureFilter<TMatchType extends TBusItem = TBusItem>(
  args: FilterArgs<TMatchType>,
  deps: any[] = []
): Subscription {
  const lastSub = useRef(new Subscription()); /* just to make .unsubscribe() safe */
  useEffect(() => {
    // @ts-ignore
    lastSub.current = bus.filter(args.matches.match, args.filter);

    return () => lastSub.current.unsubscribe();
  }, deps);
  return lastSub.current;
}
