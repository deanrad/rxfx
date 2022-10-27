//#region imports
// @ts-ignore // i cant workspace :)
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
export type ResultCreator<T, TConsequence> = (
  item: T
) =>
  | ((
      this: Observable<TConsequence>,
      subscriber: Subscriber<TConsequence>
    ) => TeardownLogic)
  | ObservableInput<TConsequence>
  | void;

type SubscribeObserver = {
  subscribe: () => void;
  unsubscribe: () => void;
};
export type TapObserver<T> = PartialObserver<T> | SubscribeObserver;
export type ObserverKey = keyof PartialObserver<any> | keyof SubscribeObserver;
export type MapFn<T, U> = (t?: T) => U;
export type Mapper<T, U> = Partial<Record<ObserverKey, MapFn<T, U>>>;

const thunkTrue = () => true;
//#endregion

/**
 * An instance of a Bus provides type-safe ways of triggering
 * and canceling side-effects, in response to events triggered upon it.
 *
 * In addition, a Bus instance allows delcarative concurrency
 * control, and provides ample means to dispose of resources at the
 * callers' control. When the side-effects are implemented as Observables,
 * cancelation and declarative concurrency control can be applied,
 * harnessing the power of RxJS operators.
 */
export class Bus<TBusItem> {
  private channel: Subject<TBusItem>;
  private resets: Subject<void>;
  private guards: Array<[Predicate<TBusItem>, (item: TBusItem) => void]>;
  private filters: Array<
    [Predicate<TBusItem>, (item: TBusItem) => TBusItem | null | undefined]
  >;
  private spies: Array<[Predicate<TBusItem>, (item: TBusItem) => void]>;
  private handlings: Subject<Observable<void>>;

  /** While unhandled listener errors terminate the listener,
   * the cause of that error is available on channel.errors
   */
  public errors: Subject<string | Error>;

  constructor() {
    this.resets = new Subject();
    this.channel = new Subject();
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
  }

  /**
   * Returns an Observable of events matching the given predicate
   * @param matcher A predicate to filter only events for which it returns true
   * @returns
   */
  public query<TMatchType extends TBusItem = TBusItem>(
    matcher: ((i: TBusItem) => i is TMatchType) | ((i: TBusItem) => boolean)
  ) {
    return this.channel
      .asObservable()
      .pipe(filter(matcher), takeUntil(this.resets));
  }

  /**
   * Returns a Promise for the first event for which the predicate returns true
   * @param matcher A predicate which selects the resolved event
   */
  public nextEvent<TMatchType extends TBusItem = TBusItem>(
    matcher: ((i: TBusItem) => i is TMatchType) | ((i: TBusItem) => boolean)
  ) {
    return new Promise<TMatchType>((resolve, reject) => {
      // first() errors if stream completes (which resets cause)
      const errsIfNotFirst = this.query(matcher).pipe(first());
      // @ts-ignore
      errsIfNotFirst.subscribe({
        error() {
          reject('Bus was reset.');
        },
        next(v: TMatchType) {
          resolve(v);
        },
      });
    });
  }

  /**
   *
   * @param item The Event or other object to place onto the event bus, once it passes all filters.
   */
  public trigger(item: TBusItem) {
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
      this.channel.next(filteredItem);

      notify.complete();
    });

    this.handlings.next(handling);
  }

  /** Triggers effects upon matching events, using an ASAP Concurrency Strategy.
   * Newly returned effects are begun immediately, without regard to resource constraints, and may complete in any order (ala `mergeMap`).
   *
   * @param matcher A predicate (returning Boolean) function to determine the subset of Event Bus events the handler will be invoked for.
   * @param handler Called for each matching event, returns an ObservableInput (an Iterable,Promise,Observable)
   * @param observer Provides functions to be called upon notifications of the handler
   * @returns a subscription that can be used to unsubscribe the listener, thereby canceling work in progress.
   */
  public listen<TConsequence, TMatchType extends TBusItem = TBusItem>(
    matcher: ((i: TBusItem) => i is TMatchType) | ((i: TBusItem) => boolean),
    handler: ResultCreator<TMatchType, TConsequence>,
    observer?: TapObserver<TConsequence>,
    operator = mergeMap
  ): Subscription & { isActive: BehaviorSubject<boolean> } {
    /* A listener is basically: 
      this.channel.pipe(
        filter(matcher),
        combiner(errWrappedHandler)
      ).subscribe(errorNotifier);
    */
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

        const pipes: OperatorFunction<TConsequence, unknown>[] = [
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

  /** Triggers effects upon matching events, using a Queueing Concurrency Strategy.
   * Newly returned effects are enqueued and always complete in the order they were triggered (ala `concatMap`).
   * @param matcher A predicate (returning Boolean) function to determine the subset of Event Bus events the handler will be invoked for.
   * @param handler Called for each matching event, returns an ObservableInput (an Iterable,Promise,Observable)
   * @param observer Provides functions to be called upon notifications of the handler
   * @returns a subscription that can be used to unsubscribe the listener, thereby canceling work in progress.
   */
  public listenQueueing<TConsequence, TMatchType extends TBusItem = TBusItem>(
    matcher: ((i: TBusItem) => i is TMatchType) | ((i: TBusItem) => boolean),
    handler: ResultCreator<TMatchType, TConsequence>,
    observer?: TapObserver<TConsequence>
  ) {
    return this.listen(matcher, handler, observer, concatMap);
  }

  /** Triggers effects upon matching events, using a Queueing Concurrency Strategy.
   * Any existing effect is canceled (if it is an Observable, not a Promise) before the new effect is begun (ala `switchMap`).
   * @param matcher A predicate (returning Boolean) function to determine the subset of Event Bus events the handler will be invoked for.
   * @param handler Called for each matching event, returns an ObservableInput (an Iterable,Promise,Observable)
   * @param observer Provides functions to be called upon notifications of the handler
   * @returns a subscription that can be used to unsubscribe the listener, thereby canceling work in progress.
   */
  public listenSwitching<TConsequence, TMatchType extends TBusItem = TBusItem>(
    matcher: ((i: TBusItem) => i is TMatchType) | ((i: TBusItem) => boolean),
    handler: ResultCreator<TMatchType, TConsequence>,
    observer?: TapObserver<TConsequence>
  ) {
    return this.listen(matcher, handler, observer, switchMap);
  }

  /** Triggers effects upon matching events, using a Blocking (Modal/Singleton) Concurrency Strategy.
   * A new effect is not begun if one is in progress. (ala `exhaustMap`).
   * @param matcher A predicate (returning Boolean) function to determine the subset of Event Bus events the handler will be invoked for.
   * @param handler Called for each matching event, returns an ObservableInput (an Iterable,Promise,Observable)
   * @param observer Provides functions to be called upon notifications of the handler
   * @returns a subscription that can be used to unsubscribe the listener, thereby canceling work in progress.
   */
  public listenBlocking<TConsequence, TMatchType extends TBusItem = TBusItem>(
    matcher: ((i: TBusItem) => i is TMatchType) | ((i: TBusItem) => boolean),
    handler: ResultCreator<TMatchType, TConsequence>,
    observer?: TapObserver<TConsequence>
  ) {
    return this.listen(matcher, handler, observer, exhaustMap);
  }

  /** Triggers effects upon matching events, using a Toggling (gate) Concurrency Strategy.
   * A new effect is not begun if one is in progress, and the existing effect is canceled.
   * @param matcher A predicate (returning Boolean) function to determine the subset of Event Bus events the handler will be invoked for.
   * @param handler Called for each matching event, returns an ObservableInput (an Iterable,Promise,Observable)
   * @param observer Provides functions to be called upon notifications of the handler
   * @returns a subscription that can be used to unsubscribe the listener, thereby canceling work in progress.
   */
  public listenToggling<TConsequence, TMatchType extends TBusItem = TBusItem>(
    matcher: ((i: TBusItem) => i is TMatchType) | ((i: TBusItem) => boolean),
    handler: ResultCreator<TMatchType, TConsequence>,
    observer?: TapObserver<TConsequence>
  ) {
    // @ts-ignore
    return this.listen(matcher, handler, observer, toggleMap);
  }

  /** Run a function (synchronously) for all runtime events, prior to all spies and listeners.
   * Throwing an exception will raise to the triggerer, but not terminate the guard.*/
  public guard<TMatchType extends TBusItem = TBusItem>(
    matcher: ((i: TBusItem) => i is TMatchType) | ((i: TBusItem) => boolean),
    fn: (item: TBusItem) => void
  ) {
    this.guards.push([matcher, fn]);
    return this.createRemovalSub(matcher, fn, this.guards);
  }

  /** Run a function (synchronously) for all runtime events, prior to all spies and listeners.
   * Throwing an exception will raise to the triggerer, but not terminate the guard.*/
  public filter<TMatchType extends TBusItem = TBusItem>(
    matcher: ((i: TBusItem) => i is TMatchType) | ((i: TBusItem) => boolean),
    fn: (item: TBusItem) => TBusItem | null | undefined
  ) {
    this.filters.push([matcher, fn]);
    return this.createRemovalSub(matcher, fn, this.filters);
  }

  /** Run a function (synchronously) for all runtime events, prior to all listeners. Throwing an exception will terminate the spy.*/
  public spy(fn: (item: TBusItem) => void) {
    this.spies.push([thunkTrue, fn]);
    return this.createRemovalSub(thunkTrue, fn, this.spies);
  }

  public reset(): void {
    this.resets.next();
  }

  /** Turns each value from the listener's return value into a new triggered event.
   * Use this when the listener returns items suitable for putting directly onto the bus.
   */
  public observeAll<
    TConsequence extends TBusItem
  >(): TapObserver<TConsequence> {
    return {
      next: (c: TConsequence) => {
        this.trigger(c);
      },
    };
  }

  /** Turns the specified events (next, error, complete, subscribe and unsubscribe)
   * of the listeners' observable lifetime into triggered events.
   * Uses a map with of mapping functions, like FSA action creators, to wrap the listener's notifications.
   * Use this when the listener's values are not compatible with the bus, or to capture lifetime events.
   *  **/
  public observeWith<TConsequence>(mapper: Mapper<TConsequence, TBusItem>) {
    // invariant - at least one key
    // @ts-ignore
    const observer: PartialObserver<TConsequence> & SubscribeObserver = {};
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

  private getHandlingResult<TConsequence>(
    handler: ResultCreator<TBusItem, TConsequence>,
    event: TBusItem
  ) {
    const oneResult = handler(event);
    const obsResult: Observable<TConsequence> =
      typeof oneResult === 'function'
        ? new Observable(oneResult)
        : from(oneResult ?? EMPTY);
    return obsResult;
  }

  private createRemovalSub(
    matcher: Function,
    fn: Function,
    all: Array<[Predicate<TBusItem>, (item: TBusItem) => unknown]>
  ) {
    return new Subscription(() => {
      const whereamI = all.findIndex((pp) => pp[0] === matcher && pp[1] === fn);
      all.splice(whereamI, 1);
    });
  }
}

export const defaultBus = new Bus<any>();
