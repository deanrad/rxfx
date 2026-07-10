import { createThrottledEffect } from '@rxfx/effect';

type Request = void; // a heartbeat trigger carries no payload
type Response = void; // fire-and-forget ping; nothing to return

/** Send a heartbeat ping to the server, at most once every 5 seconds (rate-limit). */
const handleSendHeartbeat = (_req: Request): Promise<Response> => {
  // TODO: POST the heartbeat ping to the server
  return Promise.resolve();
};

export const sendHeartbeat = createThrottledEffect(5000)<Request, Response>(
  handleSendHeartbeat
);
