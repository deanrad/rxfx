import { createQueueingEffect } from '@rxfx/effect';

type Request = { prompt: string };
type Response = string;

async function* handleStreamChatCompletion(req: Request): AsyncGenerator<Response> {
  // Stream chat tokens one-by-one from the API
  yield req.prompt;
}

export const streamChatCompletion = createQueueingEffect<Request, Response>(handleStreamChatCompletion);
