// Minimal type-declaration shim for `@rxfx/effect`, used ONLY to type-check
// generated effect code inside Waza's isolated eval workspace (the real
// monorepo source is not reachable there). Mirrors the public surface of
// ../../../effect/src — keep in sync if the real API changes.

declare module '@rxfx/effect' {
  export class Observable<T = unknown> {
    constructor(
      subscribe?: (subscriber: {
        next: (value: T) => void;
        error: (err: unknown) => void;
        complete: () => void;
      }) => void | (() => void)
    );
    subscribe(...args: unknown[]): { unsubscribe(): void };
    pipe(...operators: unknown[]): Observable<unknown>;
  }

  export const EMPTY: Observable<never>;
  export function concat<T>(
    ...sources: Array<Observable<T> | PromiseLike<T>>
  ): Observable<T>;
  export function throwError(errorFactory: () => unknown): Observable<never>;
  export function after<T>(
    ms: number,
    value?: T | (() => T)
  ): Observable<T> & PromiseLike<T>;

  /** An async function, or a function returning a Promise / Observable / AsyncIterable / Iterable. */
  export type EffectSource<Request, Response> = (
    args: Request
  ) =>
    | Observable<Response>
    | PromiseLike<Response>
    | AsyncIterable<Response>
    | Iterable<Response>
    | void;

  export type LifecycleReducerEvent<Req, Res, Err = Error> =
    | { type: 'request'; payload: Req }
    | { type: 'started'; payload: Req }
    | { type: 'response'; payload: Res }
    | { type: 'complete'; payload?: Req }
    | { type: 'error'; payload: Err }
    | { type: 'canceled'; payload?: Req };

  export interface EffectRunner<
    Request,
    Response,
    TError extends Error = Error,
    TState = Response
  > {
    (req: Request): void;
    request(req: Request): void;
    send(
      req: Request,
      matcher?: (req: Request, res: Response) => boolean
    ): Promise<Response>;
    cancelCurrent(): void;
    cancelCurrentAndQueued(): void;
    unsubscribe(): void;
    shutdown(): void;
    reset(): void;
    reduceWith(
      reducer: (
        state: TState,
        evt: LifecycleReducerEvent<Request, Response, TError>
      ) => TState,
      initial: TState
    ): { value: TState };
    observe(
      callbacks: Partial<Record<string, (arg: unknown) => void>>
    ): { unsubscribe(): void };
    readonly state: { value: TState | null };
    readonly lastResponse: { value: Response | null };
    readonly currentError: { value: TError | null };
    readonly isHandling: { value: boolean };
    readonly isActive: { value: boolean };
  }

  export function createEffect<
    Request,
    Response = void,
    TError extends Error = Error,
    TState = Response
  >(
    handler: EffectSource<Request, Response>,
    concurrencyOperator?: unknown,
    initialState?: TState
  ): EffectRunner<Request, Response, TError, TState>;

  export function createImmediateEffect<
    Request,
    Response = void,
    TError extends Error = Error,
    TState = Response
  >(
    handler: EffectSource<Request, Response>,
    initialState?: TState
  ): EffectRunner<Request, Response, TError, TState>;

  export function createQueueingEffect<
    Request,
    Response = void,
    TError extends Error = Error,
    TState = Response
  >(
    handler: EffectSource<Request, Response>,
    initialState?: TState
  ): EffectRunner<Request, Response, TError, TState>;

  export function createSwitchingEffect<
    Request,
    Response = void,
    TError extends Error = Error,
    TState = Response
  >(
    handler: EffectSource<Request, Response>,
    initialState?: TState
  ): EffectRunner<Request, Response, TError, TState>;

  export function createBlockingEffect<
    Request,
    Response = void,
    TError extends Error = Error,
    TState = Response
  >(
    handler: EffectSource<Request, Response>,
    initialState?: TState
  ): EffectRunner<Request, Response, TError, TState>;

  export function createTogglingEffect<
    Request,
    Response = void,
    TError extends Error = Error,
    TState = Response
  >(
    handler: EffectSource<Request, Response>,
    initialState?: TState
  ): EffectRunner<Request, Response, TError, TState>;

  export function createThrottledEffect(
    msec?: number
  ): <
    Request,
    Response = void,
    TError extends Error = Error,
    TState = Response
  >(
    handler: EffectSource<Request, Response>,
    initialState?: TState
  ) => EffectRunner<Request, Response, TError, TState>;

  export function createDebouncedEffect(
    msec?: number
  ): <
    Request,
    Response = void,
    TError extends Error = Error,
    TState = Response
  >(
    handler: EffectSource<Request, Response>,
    initialState?: TState
  ) => EffectRunner<Request, Response, TError, TState>;

  export function createCustomEffect<
    Request,
    Response,
    TError extends Error = Error,
    TState = Response
  >(
    handler: EffectSource<Request, Response>,
    concurrencyOperator?: unknown,
    initialState?: TState
  ): EffectRunner<Request, Response, TError, TState>;

  export function shutdownAll(): void;
  export function trace(
    effect: EffectRunner<unknown, unknown, Error, unknown>,
    prefix?: string,
    fn?: (...args: unknown[]) => void
  ): { unsubscribe(): void };
}
