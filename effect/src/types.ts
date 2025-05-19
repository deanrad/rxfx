import { BehaviorSubject, Observable, ObservableInput } from 'rxjs';

/** An EffectSource is an async function, or a function with a Promise, Observable, or Iterable return value,
 * whose lifecycle events will be exposed to the EffectRunner.
 */
export type EffectSource<Request, Response> = (
  args: Request
) => ObservableInput<Response>;

export type EffectTriggerer<Request> = (req: Request) => void;

/** The Cancelable interface contains ways to cancel a running effect (if it returns an Observable or AsyncIterable).
 * @see shutdownAll
 */
export interface Cancelable {
  /** Cancels the current effect. */
  cancelCurrent: () => void;
  /** Cancels the current effect, and unqueues any queued effects. */
  cancelCurrentAndQueued: () => void;
  /** Alias for `cancelCurrentAndQueued`. */
  unsubscribe: () => void;
  /** Invokes `cancelCurrentAndQueued`, and stops listening for new requests. */
  shutdown: () => void;
}

/** The Stateful interface represents information the EffectRunner retains about previous or current effect executions.
 */
export interface Stateful<Response, TError> {
  lastResponse: BehaviorSubject<Response | null>;
  currentError: BehaviorSubject<TError | null>;
  isHandling: BehaviorSubject<boolean>;
  isActive: BehaviorSubject<boolean>;
  /** Reserved for future use. */
  state: BehaviorSubject<null>;
}

/** The Events interface contains Observables that an effect triggerer may use to get updates on executions. */
export interface Events<Request, Response, TError> {
  errors: Observable<TError>;
  responses: Observable<Response>;
  starts: Observable<Request>;
  completions: Observable<Request>;
  cancelations: Observable<Request>;
}

/**
 * An EffectRunner is a function, enhanced with Observable properties
 */
export interface EffectRunner<Request, Response, TError = Error>
  extends EffectTriggerer<Request>,
    Cancelable,
    Events<Request, Response, TError>,
    Stateful<Response, TError> {
  request: (req: Request) => void;

  /** Returns a Promise for the next result. CAUTION: In concurrent situations this is usually not what you want! */
  send: (
    req: Request,
    matcher?: (req: Request, res: Response) => boolean
  ) => Promise<Response>;
}
