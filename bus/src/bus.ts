//#region imports
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import symbol_Observable from 'symbol-observable';
import { toggleMap } from '@rxfx/operators';
import {
  BehaviorSubject,
  EMPTY,
  from,
  Observable,
  ObservableInput,
  of,
  OperatorFunction,
  PartialObserver,
  Subject,
  Subscriber,
  Subscription,
  TeardownLogic,
} from 'rxjs';
import {
  catchError,
  concatMap,
  distinctUntilChanged,
  exhaustMap,
  filter,
  first,
  map,
  mergeMap,
  retry,
  scan,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
//#endregion

//#region types
export type Predicate<T> = (item: T) => boolean;

/** A function accepting an item and returning a value, an Observable constructor, an ObservableInput, or void */
export type EventHandler<T, HandlerReturnType> = (
  item: T
) =>
  | ((
      this: Observable<HandlerReturnType>,
      subscriber: Subscriber<HandlerReturnType>
    ) => TeardownLogic)
  | ObservableInput<HandlerReturnType>
  | void;

/** Handles events of an effects' subscription, distinct from its Observable's notifications. */
export type SubscriptionObserver = {
  subscribe: () => void;
  unsubscribe: () => void;
  finalize: () => void;
};

/** An object of callbacks for `next`,`complete`,`error`,`subscribe` (started), `unsubscribe` (canceled), and `finalize` events of an effect's lifecycle. */
export type EffectObserver<T> = PartialObserver<T> | SubscriptionObserver;
export type ObserverKey =
  | keyof PartialObserver<any>
  | keyof SubscriptionObserver;

export type MapFn<T, U> = (t?: T) => U;
export type Mapper<T, U> = Partial<Record<ObserverKey, MapFn<T, U>>>;

const thunkTrue = () => true;
//#endregion

/**
 * A Bus instance provides transportation of events across any part of a browser, server,
 * mobile or native app. The 𝗥𝘅𝑓𝑥 bus also allows type-safe ways of triggering,
 * concurrency controlling, and canceling async side-effects in a framework-independent,
 * pure JavaScript way, akin to RxJS.
 */
export class Bus<EventType> {
  private events: Subject<EventType>;
  /** A Subject that notifies each time `bus.reset()` is called */
  public resets: Subject<void>;
  private guards: Array<[Predicate<EventType>, (item: EventType) => void]>;
  private filters: Array<
    [Predicate<EventType>, (item: EventType) => EventType | null | undefined]
  >;
  private spies: Array<[Predicate<EventType>, (item: EventType) => void]>;
  private handlings: Subject<Observable<void>>;

  /** Contains any un-rescued sync or async errors from listeners.
   * Listener errors terminate their listener when unrescued, but are not propogated back
   * to the trigger call that prompted them, rather they are consumable via `bus.errors`.
   * Errors in one listener do not affect the trigger-er, or any other listener.
   * In contrast, guard errors are raised to the trigger-er.
   * @see {@link Bus.listen}  {@link Bus.trigger}  {@link Bus.guard}
   * @example `bus.errors.subscribe(ex => { console.error(ex) })`
   */
  public errors: Subject<string | Error>;

  constructor() {
    this.resets = new Subject();
    this.events = new Subject();
    this.errors = new Subject();
    this.guards = new Array();
    this.filters = new Array();
    this.spies = new Array();
    this.handlings = new Subject<Observable<void>>();
    // Fires each actions' handlers in triggering order, with error reporting/recovery
    this.handlings
      .pipe(
        concatMap((handling) => handling),
        tap({
          error: (e) => this.errors.next(e),
        }),
        retry()
      )
      .subscribe();

    const bus = this;

    Object.assign(bus, {
      [symbol_Observable]: () => bus.query(() => true),
    });
  }

  /**
   * Returns an Observable of events for which the predicate returns `true`.
   * The returned Observable completes upon a `bus.reset`.
   * If the predicate is a type guard, the returned Observable will be narrowed to the matching type.
   * @param matcher A predicate to select events for which it returns `true`.
   * @see { @link Bus.reset }
   * @example `bus.query(() => true).subscribe(console.log)`
   */
  public query<MatchType extends EventType = EventType>(
    matcher: ((i: EventType) => i is MatchType) | ((i: EventType) => boolean)
  ) {
    return this.events
      .asObservable()
      .pipe(filter(matcher), takeUntil(this.resets));
  }

  /**
   * Returns a Promise for the first event for which the predicate returns `true`.
   * The returned Promise will be rejected upon a `bus.reset`.
   * If the predicate is a type guard, the returned Promise will be narrowed to the matching type.
   * @param matcher A predicate to select the first event for which it returns `true`.
   */
  public nextEvent<MatchType extends EventType = EventType>(
    matcher: ((i: EventType) => i is MatchType) | ((i: EventType) => boolean)
  ) {
    return new Promise<MatchType>((resolve, reject) => {
      // first() errors if stream completes (which resets cause)
      const errsIfNotFirst = this.query(matcher).pipe(first());
      // @ts-ignore
      errsIfNotFirst.subscribe({
        error() {
          reject('Bus was reset.');
        },
        next(v: MatchType) {
          resolve(v);
        },
      });
    });
  }

  /**
   * Puts an event onto the bus, firing any listeners whose predicate returns `true`.
   * Events go first through guards, then filters, then spies, then listeners.
   *
   * @param item The item to send to listeners, once it clears guards, filters, and spies.
   * @throws if a guard, or filter throws an exception. Listener exceptions or errors do not throw, but
   * appear on `bus.errors`, and terminate that listener.
   * @see { @link Bus.errors } { @link Bus.filter } { @link Bus.guard } { @link Bus.spy } { @link Bus.listen }
   */
  public trigger(item: EventType) {
    this.guards.forEach(([predicate, guard]) => {
      predicate(item) && guard(item);
    });

    let filteredItem = item;
    let canceled = false;

    const handling = new Observable<void>((notify) => {
      this.filters.forEach(([predicate, filter]) => {
        if (!predicate(item)) return;

        const filterResult = filter(filteredItem);

        if (filterResult !== null && filterResult !== undefined) {
          filteredItem = filterResult;
        } else {
          canceled = true;
        }
      });
      if (canceled) {
        notify.complete();
        return;
      }

      this.spies.forEach(([predicate, handler]) => {
        predicate(filteredItem) && handler(filteredItem);
      });
      this.events.next(filteredItem);

      notify.complete();
    });

    this.handlings.next(handling);
  }

  /** Alias for { @link Bus.trigger } */
  public next(item: EventType) {
    this.trigger(item);
  }

  /** Assigns a side-effect producing function to matching events in Concurrency Mode "Immediate".
   * Newly returned effects are begun immediately, and so may complete in any order (ala `mergeMap`), or consume resources unboundedly.
   * @param matcher A predicate run upon every event on the bus. The handler function is only executed if the predicate returns `true`. If the matcher provides a type guard, the handler will see its events as narrowed to that type.
   * @param handler The side-effect producing function which will _"Return The Work"_, as an `ObservableInput` (A Promise, Observable, or async generator)
   * @param observer An { @link EffectObserver } which provides functions to be called upon notifications of the handler
   * @param operator Allows a custom RxJS operator to be passed to use its own ConcurrencyMode.
   * @returns A Subscription that can be used to unsubscribe the listener from future events. If the handler returned an Observable of work, any in-progress work will be canceled upon `unsubscribe()`.
   * @summary ![immediate mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-immediate-sm.png)
   */
  public listen<HandlerReturnType, MatchType extends EventType = EventType>(
    matcher: ((i: EventType) => i is MatchType) | ((i: EventType) => boolean),
    handler: EventHandler<MatchType, HandlerReturnType>,
    observer?: EffectObserver<HandlerReturnType>,
    /** @ignore */
    operator = mergeMap
  ): Subscription & { isActive: BehaviorSubject<boolean> } {
    const activityCounter = new Subject<number>();
    const isActive = new BehaviorSubject<boolean>(false);

    // @ts-ignore dynamic
    const consequences = this.query(matcher).pipe(
      operator((event) => {
        // @ts-ignore
        const obsResult = this.getHandlingResult(handler, event);

        // @ts-ignore
        const errorCallback = observer?.error;
        const errLessObserver = { ...observer, error: undefined };

        // prettier-ignore
        const activityObserver = {
          subscribe() { activityCounter.next(1); },
          complete() { activityCounter.next(-1); },
          error() { activityCounter.next(-1); },
          unsubscribe() { activityCounter.next(-1); },
        };

        const pipes: OperatorFunction<HandlerReturnType, unknown>[] = [
          tap(errLessObserver),
          tap(activityObserver),
        ];
        if (errorCallback) {
          pipes.push(
            catchError((e) => {
              errorCallback(e);
              return EMPTY;
            })
          );
        }
        // @ts-ignore
        return obsResult.pipe(...pipes);
      })
    );
    const errorNotifier: PartialObserver<unknown> = {
      error: (e: Error) => {
        this.errors.next(e);
      },
    };
    const sub = consequences.subscribe(errorNotifier);
    sub.add(
      activityCounter
        .pipe(
          scan((all, inc) => all + inc, 0),
          map(Boolean),
          // Spare saying 'false' until we've flushed any pending handlings
          switchMap((status) =>
            status ? of(status) : Promise.resolve(status)
          ),
          distinctUntilChanged()
        )
        .subscribe(isActive)
    );
    return Object.assign(sub, { isActive });
  }

  /** Assigns a side-effect producing function to matching events in Concurrency Mode "Queueing".
   * Newly returned effects are enqueued and always complete in the order they were triggered (ala `concatMap`).
   * @param matcher A predicate run upon every event on the bus. The handler function is only executed if the predicate returns `true`. If the matcher provides a type guard, the handler will see its events as narrowed to that type.
   * @param handler The side-effect producing function which will _"Return The Work"_, as an `ObservableInput` (A Promise, Observable, or async generator)
   * @param observer An { @link EffectObserver } which provides functions to be called upon notifications of the handler
   * @returns A Subscription that can be used to unsubscribe the listener from future events. If the handler returned an Observable of work, any in-progress work will be canceled upon `unsubscribe()`.
   * @summary ![queueing mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-queueing-sm.png)
   */
  public listenQueueing<
    HandlerReturnType,
    MatchType extends EventType = EventType
  >(
    matcher: ((i: EventType) => i is MatchType) | ((i: EventType) => boolean),
    handler: EventHandler<MatchType, HandlerReturnType>,
    observer?: EffectObserver<HandlerReturnType>
  ) {
    return this.listen(matcher, handler, observer, concatMap);
  }

  /** Assigns a side-effect producing function to matching events in Concurrency Mode "Switching".
   * Any existing effect is canceled (if it is an Observable, not a Promise) before the new effect is begun (ala `switchMap`).
   * @param matcher A predicate run upon every event on the bus. The handler function is only executed if the predicate returns `true`. If the matcher provides a type guard, the handler will see its events as narrowed to that type.
   * @param handler The side-effect producing function which will _"Return The Work"_, as an `ObservableInput` (A Promise, Observable, or async generator)
   * @param observer An { @link EffectObserver } which provides functions to be called upon notifications of the handler
   * @returns A Subscription that can be used to unsubscribe the listener from future events. If the handler returned an Observable of work, any in-progress work will be canceled upon `unsubscribe()`.
   * @summary ![switching mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-switching-sm.png)
   */
  public listenSwitching<
    HandlerReturnType,
    MatchType extends EventType = EventType
  >(
    matcher: ((i: EventType) => i is MatchType) | ((i: EventType) => boolean),
    handler: EventHandler<MatchType, HandlerReturnType>,
    observer?: EffectObserver<HandlerReturnType>
  ) {
    return this.listen(matcher, handler, observer, switchMap);
  }

  /** Assigns a side-effect producing function to matching events in Concurrency Mode "Blocking" (aka singleton).
   * A new effect is not begun if one is in progress. (ala `exhaustMap`).
   * @param matcher A predicate run upon every event on the bus. The handler function is only executed if the predicate returns `true`. If the matcher provides a type guard, the handler will see its events as narrowed to that type.
   * @param handler The side-effect producing function which will _"Return The Work"_, as an `ObservableInput` (A Promise, Observable, or async generator)
   * @param observer An { @link EffectObserver } which provides functions to be called upon notifications of the handler
   * @returns A Subscription that can be used to unsubscribe the listener from future events. If the handler returned an Observable of work, any in-progress work will be canceled upon `unsubscribe()`.
   * @summary ![blocking mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-blocking-sm.png)
   */
  public listenBlocking<
    HandlerReturnType,
    MatchType extends EventType = EventType
  >(
    matcher: ((i: EventType) => i is MatchType) | ((i: EventType) => boolean),
    handler: EventHandler<MatchType, HandlerReturnType>,
    observer?: EffectObserver<HandlerReturnType>
  ) {
    return this.listen(matcher, handler, observer, exhaustMap);
  }

  /** Triggers effects upon matching events, using a Toggling (gate) Concurrency Strategy.
   * A new effect is not begun if one is in progress, and the existing effect is canceled.
   * @param matcher A predicate run upon every event on the bus. The handler function is only executed if the predicate returns `true`. If the matcher provides a type guard, the handler will see its events as narrowed to that type.
   * @param handler Called for each matching event, returns an ObservableInput (an Iterable,Promise,Observable)
   * @param observer An { @link EffectObserver } which provides functions to be called upon notifications of the handler
   * @returns A subscription that can be used to unsubscribe the listener, thereby canceling work in progress.
   * @summary ![toggling mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-toggling-sm.png)
   */
  public listenToggling<
    HandlerReturnType,
    MatchType extends EventType = EventType
  >(
    matcher: ((i: EventType) => i is MatchType) | ((i: EventType) => boolean),
    handler: EventHandler<MatchType, HandlerReturnType>,
    observer?: EffectObserver<HandlerReturnType>
  ) {
    // @ts-ignore
    return this.listen(matcher, handler, observer, toggleMap);
  }

  /** Run a function synchronously for all runtime events, prior to all filters, spies and listeners.
   * Throwing an exception will raise to the triggerer, but not terminate the guard.
   * @returns A subscription that can be used to deactivate the guard.
   * */
  public guard<MatchType extends EventType = EventType>(
    matcher: ((i: EventType) => i is MatchType) | ((i: EventType) => boolean),
    fn: (item: MatchType) => void
  ) {
    // @ts-ignore
    this.guards.push([matcher, fn]);
    return this.createRemovalSub(matcher, fn, this.guards);
  }

  /** Run a function synchronously for all runtime events, after guards, and prior to spies and listeners.
   * A filter may modify, or replace an event. However the filter _must_ return an event, or that
   * event will not be seen by spies or listeners, and it will be as if the event was never triggered.
   * This is what is meant to 'filter' out events.
   * Throwing an exception will raise to the triggerer, but not terminate the filter.
   * @returns A subscription that can be used to deactivate the filter.
   */
  public filter<MatchType extends EventType = EventType>(
    matcher: ((i: EventType) => i is MatchType) | ((i: EventType) => boolean),
    fn: (item: MatchType) => EventType | null | undefined
  ) {
    // @ts-ignore
    this.filters.push([matcher, fn]);
    return this.createRemovalSub(matcher, fn, this.filters);
  }

  /** Run a function (synchronously) for all runtime events, prior to all listeners. Throwing an exception will terminate the spy.
   * @returns A subscription that can be used to deactivate the spy.
   */
  public spy(fn: (item: EventType) => void) {
    this.spies.push([thunkTrue, fn]);
    return this.createRemovalSub(thunkTrue, fn, this.spies);
  }

  /** Unsubscribes all guards, filters, spies and listeners, canceling handlings-in-progress if they were returned Observables,
   * and reverting the bus to how it was when newly constructed.  */
  public reset(): void {
    this.resets.next();
  }

  /** Creates an {@link EffectObserver} which triggers each value from the handler back onto the bus.
   * Use this when the listener returns items suitable for putting directly onto the bus.
   */
  public observeAll<
    HandlerReturnType extends EventType
  >(): EffectObserver<HandlerReturnType> {
    return {
      next: (c: HandlerReturnType) => {
        this.trigger(c);
      },
    };
  }

  /** Creates an {@link EffectObserver} which triggers the handlers' lifecycle events, after running through a mapping function.
   * Use this when the listener's values are not compatible with the bus, or to capture lifecycle events.
   * @example ```
   * bus.listen(
   *   isSearchRequest,
   *   () => from([{ result: 'foo' }]),
   *   bus.observeWith({ subscribe: () => ({ type: 'search/started' }) })
   * );
   * ```
   **/
  public observeWith<HandlerReturnType>(
    mapper: Mapper<HandlerReturnType, EventType>
  ) {
    // invariant - at least one key
    // @ts-ignore
    const observer: PartialObserver<HandlerReturnType> & SubscriptionObserver =
      {};
    ['next', 'error'].forEach((key) => {
      // @ts-ignore
      if (mapper[key]) {
        // prettier-ignore
        // @ts-ignore
        observer[key] = (valueOrError) => this.trigger(mapper[key](valueOrError));
      }
    });

    ['complete', 'subscribe', 'unsubscribe'].forEach((key) => {
      // @ts-ignore
      if (mapper[key]) {
        // @ts-ignore
        observer[key] = () => this.trigger(mapper[key]());
      }
    });
    return observer;
  }

  private getHandlingResult<HandlerReturnType>(
    handler: EventHandler<EventType, HandlerReturnType>,
    event: EventType
  ) {
    const oneResult = handler(event);
    const obsResult: Observable<HandlerReturnType> =
      typeof oneResult === 'function'
        ? new Observable(oneResult)
        : from(oneResult ?? EMPTY);
    return obsResult;
  }

  private createRemovalSub(
    matcher: Function,
    fn: Function,
    all: Array<[Predicate<EventType>, (item: EventType) => unknown]>
  ) {
    return new Subscription(() => {
      const whereamI = all.findIndex((pp) => pp[0] === matcher && pp[1] === fn);
      all.splice(whereamI, 1);
    });
  }
}

export const defaultBus = new Bus<any>();

/** A predicate returning true for any event.
 * @example bus.query(ANY).subscribe(...)
 */
export const ANY = (_: any) => true;
/** A predicate returning true for any event.
 * @example bus.query(ALL).subscribe(...)
 */
export const ALL = (_: any) => true;
