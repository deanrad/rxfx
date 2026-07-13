import { createQueueingEffect } from '@rxfx/effect';

type Request = { prompt: string };
type Response = string;

async function* handleStreamChat(req: Request): AsyncGenerator<Response> {
  // TODO: Stream chat completion from API
  yield req.prompt;
}

export const streamChat = createQueueingEffect<Request, Response>(handleStreamChat);
