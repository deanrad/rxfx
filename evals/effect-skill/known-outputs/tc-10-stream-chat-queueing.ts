import { createQueueingEffect } from '@rxfx/effect';

type Request = { prompt: string };
type Response = string; // one streamed token

/** Stream a chat completion token-by-token; add new prompts to a queue. */
async function* handleStreamChat(req: Request): AsyncGenerator<Response> {
  // TODO: call the streaming chat API for `req.prompt` and yield tokens
  yield req.prompt;
}

export const streamChat = createQueueingEffect<Request, Response>(handleStreamChat);
