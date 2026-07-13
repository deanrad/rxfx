import { createTogglingEffect, Observable } from '@rxfx/effect';

type Request = void;
type Response = boolean;

const handleToggleRecording = (req: Request): Observable<Response> => {
  return new Observable(subscriber => {
    subscriber.next(true);
    subscriber.complete();
  });
};

export const toggleRecording = createTogglingEffect<Request, Response>(handleToggleRecording);
