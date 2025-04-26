import type { EventHandler } from '@rxfx/bus';
import { createService } from '../src/createService';
import type {
  Service,
  ServiceReducerWithACs,
  LifecycleEventMatchers,
  LifecycleEventFlags,
} from '../src/types';
import { produce } from 'immer';

import { Action } from '@rxfx/fsa';

interface ServiceWithFluidReducer<S, Req, Res>
  extends Service<Req, Res, Error, S> {
  withReducer: (
    r: ServiceReducerWithACs<Req, Res, Error, S>
  ) => Service<Req, Res, Error, S>;
}

interface Config {
  name?: string;
}
type State = { count: number; items: string[] };

const initialState = { count: 0, items: [] };

describe(createStatefulService, () => {
  it('infers state from reducer without explicit typing', () => {
    const service = createStatefulService<State, number, string>(
      // Handler with inferred request/response types
      (id: number) => Promise.resolve(`Item ${id}`),
      { name: 'items' }
    ).withReducer((state = initialState, event, { isRequest, isResponse }) => {
      if (isRequest) {
        return { ...state, count: state.count + 1 };
      }
      if (isResponse) {
        return { ...state, items: [...state.items, event.payload as string] };
      }
      return state;
    });

    service.responses; // Observerable<string> yay!
    service.state; // BS<State> yay
    service;

    // Prevent unused var warning
    expect(service).toBeDefined();
  });

  it('infers state from reducer when explicitly defined earlier ', () => {
    type State = { count: number; items: string[] };

    const reducer = (
      state: State = { count: 0, items: [] },
      event: Action<number | string | void | Error>,
      { isRequest, isResponse }: LifecycleEventFlags
    ): State => {
      if (isRequest) {
        return { ...state, count: state.count + 1 };
      }
      if (isResponse) {
        return { ...state, items: [...state.items, event.payload as string] };
      }
      return state;
    };

    const service = createStatefulService<State, number, string>(
      // Handler with inferred request/response types
      (id: number) => Promise.resolve(`Item ${id}`),
      { name: 'items' }
    ).withReducer(reducer);

    // Prevent unused var warning
    expect(service).toBeDefined();
  });

  it('infers complex state shape from handler response', () => {
    interface UserData {
      id: number;
      name: string;
      roles: string[];
    }

    const service = createStatefulService<UserData | null, string, UserData>(
      // Handler returning complex type
      (_userId: string): Promise<UserData> =>
        Promise.resolve({
          id: 1,
          name: 'Test User',
          roles: ['admin'],
        }),
      { name: 'users' }
    ).withReducer(
      (
        state,
        event,
        { isResponse }: LifecycleEventFlags
      ): UserData | null => {
        if (isResponse) {
          return event.payload;
        }
        return state;
      }
    );

    // Prevent unused var warning
    expect(service).toBeDefined();
  });

  it('infers types when using request/response matchers', () => {
    interface SearchState {
      searchTerm: string;
      results: string[];
    }

    interface SearchRequest {
      searchTerm: string;
    }

    interface SearchResponse {
      results: string[];
    }

    const service = createStatefulService<
      SearchState,
      SearchRequest,
      SearchResponse
    >(
      (_query: SearchRequest) =>
        Promise.resolve({ results: ['result1', 'result2'] }),
      { name: 'search' }
    ).withReducer(
      (
        state: SearchState = { searchTerm: '', results: [] },
        event: Action<SearchRequest | SearchResponse | void | Error>,
        {
          isRequest,
          isResponse,
        }: LifecycleEventMatchers<SearchRequest, SearchResponse, Error>
      ): SearchState => {
        if (isRequest(event)) {
          return { ...state, searchTerm: event.payload.searchTerm };
        }
        if (isResponse(event)) {
          return { ...state, results: event.payload.results };
        }
        return state;
      }
    );

    // Prevent unused var warning
    expect(service).toBeDefined();
  });

  it.todo('infers types when using request/response matchers');
});

// Base implementation
// ALMOST has it - just - needs to attach the reducer..
function createStatefulService<State, Req, Res>(
  handler: EventHandler<Req, Res>,
  config?: Config
): ServiceWithFluidReducer<State, Req, Res> {
  const name = config?.name ?? '__default';

  const service = createService<Req, Res, Error, State>(name, handler);

  return {
    ...service,
    withReducer: (_fn) => {
      // TODO: implement reducer attachment
      return service;
    },
  } as ServiceWithFluidReducer<State, Req, Res>;
}
