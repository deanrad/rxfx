import { createSwitchingEffect, Observable } from '@rxfx/effect';

type Request = { query: string };
type Response = string[];

const handleFetchSuggestions = (req: Request): Observable<Response> => {
  return new Observable(subscriber => {
    // Fetch suggestions, cancel on new query
    subscriber.next([]);
    subscriber.complete();
  });
};

export const fetchSuggestions = createSwitchingEffect<Request, Response>(handleFetchSuggestions);
