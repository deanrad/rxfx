import { createTogglingEffect, Observable } from '@rxfx/effect';

type Request = void;
type Response = boolean;

const handleRecordToggle = (req: Request): Observable<Response> => {
  return new Observable(subscriber => {
    // Toggle recording state
    subscriber.next(true);
    subscriber.complete();
  });
};

export const recordToggle = createTogglingEffect<Request, Response>(handleRecordToggle);
