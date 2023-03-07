import { Action, Bus, Observable } from '@rxfx/service';
import { filter } from 'rxjs/operators';

/** A generic error Observer that does `console.error` of what it is passed. */
export const handleErrors = {
  error(e: any) {
    console.error(e);
  },
};

/** Syntactic sugar for a pipe between a source and a sink, in which
 * matching events of the source become calls on the sink, after going
 * through the mapper.
 * @example
 * ```ts
 * forward(inbox, EMAIL.match, outbox, ({ payload }) => MAPPED(payload))
 * ```
 * */
export function forward<Subtype, MappedType = Action<Subtype>>(
  source: Observable<any>,
  matcher: Parameters<Bus<Action<Subtype>>['filter']>[0],
  sink: (v: MappedType) => void,
  mapper: (i: Action<Subtype>) => MappedType
) {
  return source.pipe(filter(matcher)).subscribe({
    next(v) {
      sink(mapper(v));
    },
    ...handleErrors,
  });
}
