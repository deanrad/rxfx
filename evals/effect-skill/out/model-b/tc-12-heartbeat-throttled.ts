import { createThrottledEffect } from '@rxfx/effect';

type Request = void; // the heartbeat trigger carries no data
type Response = void; // fire-and-forget; the ping returns nothing meaningful

/** Send a heartbeat ping, throttled to at most once per 5 seconds (rate-limit). */
const handleHeartbeat = (_req: Request): Promise<Response> => {
  // TODO: send the heartbeat ping to the server
  return Promise.resolve();
};

export const heartbeat = createThrottledEffect(5000)<Request, Response>(
  handleHeartbeat
);
