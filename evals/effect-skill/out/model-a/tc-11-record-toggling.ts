import { createTogglingEffect, Observable } from '@rxfx/effect';

type Request = void; // a button press carries no argument
type Response = void; // recording is an ongoing action, not a single value

/** Record button: press to start recording; press again to stop (toggle on/off). */
const handleToggleRecording = (_req: Request): Observable<Response> => {
  return new Observable((sub) => {
    // begin capturing audio...
    return () => {
      // stop recording when toggled off (second press) / canceled
    };
  });
};

export const toggleRecording = createTogglingEffect<Request, Response>(handleToggleRecording);
