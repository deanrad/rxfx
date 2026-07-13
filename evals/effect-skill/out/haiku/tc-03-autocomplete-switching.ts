import { createSwitchingEffect, Observable } from '@rxfx/effect';

type Request = { query: string };
type Response = string[];

const handleAutocomplete = (req: Request): Observable<Response> => {
  // TODO: Fetch suggestions from API, cancel on new input
  return new Observable(subscriber => {
    subscriber.next([]);
    subscriber.complete();
  });
};

export const autocomplete = createSwitchingEffect<Request, Response>(handleAutocomplete);
