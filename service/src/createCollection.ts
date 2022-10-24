import { Bus, ResultCreator } from '@rxfx/bus';
import {
  createBlockingService,
  createQueueingService,
} from '../src/createService';
import { Action } from 'typescript-fsa';
import { CollectionEvents } from './types';
import { Observable, Subscription } from 'rxjs';

type Loader<TRequest, TRecord, TState> = {
  handler: ResultCreator<TRequest, TRecord>;
  reducer: (state: TState, action: Action<any>) => TState;
};
/** All records observed become loader.next */
type Refresher<TRequest, TRecord> = (req: TRequest) => Observable<TRecord>;
/** All responses observed become loader.next */
type Poster<TRecord, TRecordResponse> = {
  handler: (rec: TRecord) => Observable<TRecordResponse>;
};
type Updater<TRecord, TState> = {
  handler: (rec: Partial<TRecord>) => Observable<Partial<TRecord>>;
  merger: (state: TState, action: Action<any>) => TState;
};
/**
 *
 * @param EVENTS The createCollectionEvents(namespace) instance
 * @param bus The bus
 * @param the handler (result creator) - run in Blocking concurrency (throttling)
 * @returns {state: a BehaviorSubject of TState}
 */
export function createCollection<
  TRequest = void,
  TRecord = object,
  TError = Error,
  TState = object
>(
  EVENTS: CollectionEvents,
  bus: Bus<Action<any>>,
  // loader
  { handler, reducer }: Loader<TRequest, TRecord, TState>,
  // refresher
  refresher?: Refresher<TRequest, TRecord>,
  // adder
  poster?: Poster<TRecord, TRecord>,
  updater?: Updater<TRecord, TState>
) {
  const allSubs = new Subscription();

  const loader = createBlockingService<TRequest, TRecord, TError, TState>(
    `${EVENTS.namespace}/load`,
    bus,
    handler,
    () => reducer
  );
  allSubs.add(() => loader.stop());

  const refreshListener = bus.listenBlocking(
    EVENTS.refresh.request.match,
    refresher as ResultCreator<Action<any>, TRecord>,
    {
      subscribe() {
        bus.trigger(EVENTS.refresh.started());
      },
      next(e) {
        bus.trigger(EVENTS.load.next(e));
      },
      complete() {
        bus.trigger(EVENTS.refresh.complete());
      },
    }
  );
  allSubs.add(() => refreshListener.unsubscribe());

  const postService = createQueueingService<TRecord, TRecord, TError, never>(
    `${EVENTS.namespace}/post`,
    bus,
    poster?.handler as ResultCreator<TRecord, TRecord>
  );

  // add confirmations are incremental loads
  allSubs.add(
    postService.responses.subscribe(({ payload: rec }) =>
      bus.trigger(EVENTS.load.next(rec))
    )
  );

  // LEFTOFF Yes, updates and posts should be queued together..
  // const updateService = createQueueingService<TRecord, TRecord, TError, TState>()

  return {
    requestLoad: loader.request,
    requestPost: postService.request,
    refresh() {
      bus.trigger(EVENTS.refresh.request());
    },
    state: loader.state,
    posts: postService,
    stop() {
      allSubs.unsubscribe();
    },
  };
}
