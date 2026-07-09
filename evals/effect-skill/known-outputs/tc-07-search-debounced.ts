import { createDebouncedEffect, Observable } from '@rxfx/effect';

type Request = string; // the search text
type Result = { id: string; label: string };
type Response = Result[];

/** Search as the user types; wait 300ms after they stop and cancel stale searches. */
const handleSearch = (text: Request): Observable<Response> => {
  // TODO: perform the search for `text`
  return new Observable((sub) => {
    sub.complete();
  });
};

export const search = createDebouncedEffect(300)<Request, Response>(handleSearch);
