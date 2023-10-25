import { createQueueingService } from './createService';

export type ListRequest<T> =
  | {
      method: 'push';
      item: T;
    }
  | { method: 'pop'; item?: never }
  | {
      method: 'remove';
      item: T;
    };

export interface AsyncState<T> {
  items: T[];
  entering: T[];
  leaving: T[];
}

export function createAsyncListService<T>(
  namespace: string,
  delay: (req: ListRequest<T>) => Promise<ListRequest<T>>,
  finder: (obj1: T, obj2: T) => boolean = (obj1, obj2) => obj1 === obj2
) {
  const initialState: AsyncState<T> = {
    items: [],
    entering: [],
    leaving: [],
  };

  return createQueueingService<
    ListRequest<T>,
    ListRequest<T>,
    Error,
    AsyncState<T>
  >(namespace, delay, (ACs) => (state = initialState, event) => {
    // Request updates entering only
    if (ACs.started.match(event)) {
      const { item, method } = event.payload;

      if (method === 'push') {
        return {
          items: [...state.items, item],
          entering: [...state.entering, item],
          leaving: state.leaving,
        };
      }
      if (method === 'pop') {
        const last = state.items[state.items.length - 1];
        return {
          items: state.items,
          entering: state.entering,
          leaving: [...state.leaving, last],
        };
      }
      if (method === 'remove') {
        const leaver = state.items.find((obj) => finder(obj, item))!;

        return {
          items: state.items,
          entering: state.entering,
          leaving: [...state.leaving, leaver],
        };
      }
    }
    // Next removes from entering or leaving, and becomes member of items
    if (ACs.next.match(event)) {
      const { item, method } = event.payload;
      if (method === 'push') {
        return {
          items: state.items,
          entering: state.entering.filter((obj) => !finder(obj, item)),
          leaving: state.leaving,
        };
      }
      if (method === 'pop') {
        const rest = state.items.filter(
          (_, idx) => idx < state.items.length - 1
        );
        return {
          items: rest,
          entering: state.entering,
          leaving: state.leaving.filter(
            (_, idx) => idx < state.items.length - 1
          ),
        };
      }
      if (method === 'remove') {
        const rest = state.items.filter((obj) => !finder(obj, item));
        return {
          items: rest,
          entering: state.entering,
          leaving: state.leaving.filter((obj) => !finder(obj, item)),
        };
      }
    }
    return state;
  });
}
