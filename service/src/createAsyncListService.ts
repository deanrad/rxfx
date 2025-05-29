// @ts-nocheck
import { after } from '@rxfx/after';
import { createQueueingService } from './createService';
import { THRESHOLD } from '@rxfx/perception';
import { immutablyReduce } from './immutablyReduce';

export type ListRequest<T> =
  | {
      method: 'push';
      item: T;
    }
  | { method: 'pop'; item?: never }
  | {
      method: 'remove';
      item: T;
    }
  | {
      method: 'reset';
      item: null;
      items: T[];
    };

export interface AsyncState<T> {
  items: T[];
  entering: T[];
  leaving: T[];
}

let anonListCount = 1;

export function createAsyncListService<T>(
  namespace: string = `list/${anonListCount++}`,
  delay: number = THRESHOLD.AnimationShort,
  finder: (obj1: T, obj2: T) => boolean = (obj1, obj2) => obj1 === obj2
) {
  const initialState: AsyncState<T> = {
    items: [],
    entering: [],
    leaving: [],
  };

  const delayFn = (req: ListRequest<T>) => {
    const duration = req.method === 'reset' ? 0 : delay;
    return after(duration, req);
  };

  return createQueueingService<
    ListRequest<T>,
    ListRequest<T>,
    Error,
    AsyncState<T>
  >(namespace, delayFn, (ACs) =>
    immutablyReduce((state = initialState, event) => {
      // Request updates entering only
      if (ACs.started.match(event)) {
        const { item, method } = event.payload;

        if (method === 'push') {
          state.items.push(item);
          state.entering.push(item);
        }
        if (method === 'pop') {
          const last = state.items[state.items.length - 1];
          state.leaving.push(last);
        }
        if (method === 'remove') {
          const leaver = state.items.find((obj) => finder(obj, item))!;
          state.leaving.push(leaver);
        }
        if (method === 'reset') {
          state.items = event.payload.items;
          state.entering = [];
          state.leaving = [];
        }
      }
      // Next removes from entering or leaving, and becomes member of items
      if (ACs.next.match(event)) {
        const { item, method } = event.payload;
        if (method === 'push') {
          state.entering = state.entering.filter((obj) => !finder(obj, item));
        }
        if (method === 'pop') {
          const lessThan = (_, idx) => idx < state.items.length - 1;
          const rest = state.items.filter(lessThan);
          state.items = rest;
          state.leaving = state.leaving.filter(lessThan);
        }
        if (method === 'remove') {
          const rest = state.items.filter((obj) => !finder(obj, item));
          state.items = rest;
          state.leaving = state.leaving.filter((obj) => !finder(obj, item));
        }
      }
      return state;
    })
  );
}
