import { createTogglingEffect, Observable } from '@rxfx/effect';

type Request = void; // pressing the button takes no argument
type Response = void; // an ongoing recording, not a discrete value

/** Microphone record button: press to start; press again to stop (toggling). */
const handleToggleRecording = (_req: Request): Observable<Response> => {
  return new Observable((subscriber) => {
    // start the MediaRecorder here
    return () => {
      // teardown stops recording on the next press
    };
  });
};

export const toggleRecording = createTogglingEffect<Request, Response>(
  handleToggleRecording
);
