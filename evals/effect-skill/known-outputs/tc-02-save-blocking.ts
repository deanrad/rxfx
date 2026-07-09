import { createBlockingEffect } from '@rxfx/effect';

type Request = { name: string; email: string };
type Response = void;

/** Submit a form to the server; ignore repeat submits while one is in flight. */
const handleSubmitForm = (req: Request): Promise<Response> => {
  // TODO: POST `req` to the server
  return Promise.resolve();
};

export const submitForm = createBlockingEffect<Request, Response>(handleSubmitForm);
