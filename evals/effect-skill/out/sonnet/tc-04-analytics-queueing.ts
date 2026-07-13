import { createQueueingEffect } from '@rxfx/effect';

type Request = { event: string; payload: Record<string, unknown> };
type Response = void;

const handleTrackEvent = (req: Request): Promise<Response> => {
  // Send analytics event serially, one at a time
  return Promise.resolve();
};

export const trackEvent = createQueueingEffect<Request, Response>(handleTrackEvent);
