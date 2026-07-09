import { createTogglingEffect, Observable } from '@rxfx/effect';

type Request = void; // a button press carries no argument
type Response = void; // recording is an ongoing action, not a single value

/** Record button: press to start recording; press again to stop (toggle on/off). */
const handleToggleRecording = (_req: Request): Observable<Response> => {
  // TODO: start capturing audio; teardown stops the recorder on the next press
  return new Observable((sub) => {
    // begin recording...
    return () => {
      // stop recording on cancel (second press)
    };
  });
};

export const toggleRecording = createTogglingEffect<Request, Response>(handleToggleRecording);
