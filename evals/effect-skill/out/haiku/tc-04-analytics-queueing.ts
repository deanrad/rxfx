import { createQueueingEffect } from '@rxfx/effect';

type Request = { event: string; data: Record<string, unknown> };
type Response = void;

const handleSendAnalytics = (req: Request): Promise<Response> => {
  // TODO: Send analytics event to server
  return Promise.resolve();
};

export const sendAnalytics = createQueueingEffect<Request, Response>(handleSendAnalytics);
