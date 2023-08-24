import { defaultBus } from '@rxfx/bus';
import {
  EventHandler,
  ReducerProducer,
  Service,
  createService,
  randomId,
} from '@rxfx/service';

/**
 *
 * @param handler The Promise-or-Observable returning function to be run on each request.
 * @param reducerProducer A factory for a reducer which aggregates events into `.state`.
 * @param namespace An optional specific namespace for events.
 * @param bus A bus other than the `defaultBus` to run upon.
 * @returns A Service interface upon which to call `.request()`, and `.cancelCurrent()`
 * @see @rxfx/service
 */
export function createStatefulEffect<
  TRequest,
  TNext = void,
  TState = object,
  TError = Error,
>(
  handler: EventHandler<TRequest, TNext>,
  reducerProducer: ReducerProducer<TRequest, TNext, TError, TState> = () =>
    (state: TState, _: any) => {
      return state;
    },
  namespace = randomId(),
  bus = defaultBus
): Service<TRequest, TNext, TError, TState> {
  return createService(namespace, bus, handler, reducerProducer);
}
