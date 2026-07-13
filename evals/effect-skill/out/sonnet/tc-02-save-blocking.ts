import { createBlockingEffect } from '@rxfx/effect';

type Request = { name: string; email: string };
type Response = void;

const handleFormSubmit = (req: Request): Promise<Response> => {
  // POST form to server, block repeated submissions
  return Promise.resolve();
};

export const formSubmit = createBlockingEffect<Request, Response>(handleFormSubmit);
