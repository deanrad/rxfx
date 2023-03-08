import {
  Observable,
  BehaviorSubject,
  Subscription,
  distinctUntilChanged,
  NEVER,
} from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { Action, createEvent } from '@rxfx/service';
import { after } from '@rxfx/after';

import { forward, handleErrors } from './forward';

/** The kinds of roles a peer may serve */
export enum Role {
  LEAD,
  FOLLOW,
}

// Originated by user or browser events
export const PROMOTE = createEvent<{ origin: string }>('lead/promote');
export const DEMOTE = createEvent<{ target: string }>('lead/demote');
export const LEAVE = createEvent<{ origin: string }>('lead/leave');

/* The parameters of any LeadPeer */
export interface LeadPeerProps<T = any> {
  initialRole?: Role;
  whoami: () => string;
  delayTillClaim?: () => number;
  shouldLeave: Observable<any>;
  inbox: Observable<Action<T>>; // must not include outbox messages
  outbox: (event: Action<T>) => void;
}

/**
 * Helps a mesh of agents coordinate a single leader, even as some come and go.
 * @param props - The options — including inbox and outbox — with which the peer will negotiate lead.
 * @see https://codesandbox.io/s/rxfx-peer-example-fk32ds
 */
export const createPeer = (
  props: LeadPeerProps
): Subscription & { role: BehaviorSubject<Role> } => {
  // The followable role
  const role = new BehaviorSubject(Role.LEAD);
  const {
    whoami,
    inbox,
    outbox,
    delayTillClaim = () => 500 + 500 * Math.random(),
    shouldLeave = NEVER,
  } = props;

  ////// The implementations

  const leadRules = new Observable(() => {
    const allSubs = new Subscription();

    console.log(`lead/role: LEAD`);

    // Event: PROMOTE({ origin, FOREIGN_ID })
    //   Outbox: DEMOTE({ target, FOREIGN_ID })
    allSubs.add(
      forward<{ origin: string }, ReturnType<typeof DEMOTE>>(
        inbox,
        (e) => PROMOTE.match(e) && e.payload.origin !== whoami(),
        outbox,
        ({ payload: { origin } }) => DEMOTE({ target: origin })
      )
    );

    // Event: DEMOTE({ origin, MY_ID })
    // Set: role: FOLLOW
    allSubs.add(
      forward(
        inbox,
        DEMOTE.match,
        () => role.next(Role.FOLLOW),
        () => Role.FOLLOW
      )
    );

    return allSubs;
  });

  const followRules = new Observable(() => {
    const allSubs = new Subscription();

    console.log(`lead/role: FOLLOW`);

    // Event: LEAVE({ origin })
    // Sequence:
    //   It: Delay random > 500ms
    //   Set: role: LEAD
    //   Outbox: PROMOTE({ origin, MY_ID })
    const claimIfUnclaimed = inbox
      .pipe(
        filter(LEAVE.match),
        switchMap(() => {
          return after(delayTillClaim(), () => {
            role.next(Role.LEAD);
            outbox(PROMOTE({ origin: whoami() }));
          });
        })
      )
      .subscribe(handleErrors);
    allSubs.add(claimIfUnclaimed);

    return allSubs;
  });

  // Activate the corresponding set of rules on role switches.
  const switcher = role
    .asObservable()
    .pipe(
      distinctUntilChanged(),
      switchMap((role) => {
        return role === Role.LEAD ? leadRules : followRules;
      })
    )
    .subscribe();

  // On: Startup
  // Set: role: LEAD
  // Outbox:  PROMOTE({ origin, MY_ID })
  role.next(props.initialRole || Role.LEAD);
  props.outbox(PROMOTE({ origin: whoami() }));

  // On: Exit
  // Condtion: role: LEAD
  //   Outbox: LEAVE({ origin })
  const leaver = shouldLeave.subscribe(() => {
    if (role.value === Role.LEAD) {
      props.outbox(LEAVE({ origin: whoami() }));
    }
  });
  switcher.add(leaver); // bundle cancelation

  // Surrender the means to unsubscribe, thus canceling
  return Object.assign(switcher, { role });
};
