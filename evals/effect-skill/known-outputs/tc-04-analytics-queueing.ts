import { createQueueingEffect } from '@rxfx/effect';

type Request = { name: string; props?: Record<string, unknown> };
type Response = void;

/** Send analytics events; run them one-at-a-time in order (serial). */
const handleSendAnalytics = (req: Request): Promise<Response> => {
  // TODO: POST the analytics event `req`
  return Promise.resolve();
};

export const sendAnalytics = createQueueingEffect<Request, Response>(handleSendAnalytics);
