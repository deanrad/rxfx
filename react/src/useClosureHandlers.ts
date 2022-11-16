import { useEffect, useRef } from 'react';
import { Subscription } from 'rxjs';

import { defaultBus as bus, EffectObserver, EventHandler } from '@rxfx/bus';

export interface HandlerArgs<TConsequence, TMatchType> {
  matches: {
    match: ((i: TBusItem) => i is TMatchType) | ((i: TBusItem) => boolean);
  };
  handler: EventHandler<TMatchType, TConsequence>;
}

type TBusItem = any; // todo pull from somewhere
export interface ListenerArgs<
  TConsequence,
  TMatchType extends TBusItem = TBusItem
> extends HandlerArgs<TConsequence, TMatchType> {
  observeWith?: EffectObserver<TConsequence>;
}
/**
 * Registers a listener, but un-registers and re-registers it on any change of deps.
 * Existing handlings will be terminated. This may run more often that you expect,
 * given the nature of deps and unstable fucntions.
 * @see https://reactjs.org/docs/hooks-faq.html#what-can-i-do-if-my-effect-dependencies-change-too-often
 */
export function useClosureListener<
  TConsequence,
  TMatchType extends TBusItem = TBusItem
>(
  args: ListenerArgs<TConsequence, TMatchType>,
  deps: any[] = []
): Subscription {
  const oldDeps = useRef([]);
  const lastSub = useRef(new Subscription());

  // If any changed reference in deps, change over
  //  (we could let useEffect do this, but imperative is easier to read)
  if (
    oldDeps.current.length === 0 ||
    deps.some((dep, idx) => !Object.is(dep, oldDeps.current[idx]))
  ) {
    // unsubscribe the old
    lastSub.current.unsubscribe();
    // start the new one
    lastSub.current = bus.listen(
      args.matches.match,
      args.handler,
      args.observeWith
    );

    return lastSub.current;
  }
  return lastSub.current;
}
