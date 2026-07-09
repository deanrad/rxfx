import { createSwitchingEffect, Observable } from '@rxfx/effect';

type Request = string; // the query text
type Response = string[]; // suggestions

/** Autocomplete list: fetch suggestions as the user types; a new keystroke cancels the in-flight request. */
const handleAutocomplete = (query: Request): Observable<Response> => {
  // TODO: fetch suggestions for `query`
  return new Observable((sub) => {
    sub.complete();
  });
};

export const autocomplete = createSwitchingEffect<Request, Response>(handleAutocomplete);
