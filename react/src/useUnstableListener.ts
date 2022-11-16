import { useEffect, useRef } from 'react';
import { Subscription } from 'rxjs';

import { defaultBus as bus } from '@rxfx/bus';

export interface HandlerArgs {
  matches: () => boolean;
  handler: () => null;
}
export interface ListenerArgs extends HandlerArgs {
  observeWith: {};
}
/**
 * Registers a listener, but un-registers and re-registers it on any change of deps.
 * Existing handlings will be terminated. This may run more often that you expect,
 * given the nature of deps and unstable fucntions.
 * @see https://reactjs.org/docs/hooks-faq.html#what-can-i-do-if-my-effect-dependencies-change-too-often
 */
export function useUnstableListener(args: ListenerArgs, deps = []): void {
  const oldDeps = useRef([]);
  const lastSub = useRef(new Subscription());

  // If any changed reference in deps, change over
  //  (we could let useEffect do this, but imperative is easier to read)
  if (deps.some((dep, idx) => !Object.is(dep, oldDeps.current[idx]))) {
    // unsubscribe the old
    lastSub.current.unsubscribe();
    // start the new one
    lastSub.current = bus.listen(args.matches, args.handler, args.observeWith);
  }
}
