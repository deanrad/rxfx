import { createBlockingEffect } from '@rxfx/effect';

type Request = { name: string; email: string };
type Response = void;

const handleSaveForm = (req: Request): Promise<Response> => {
  // TODO: POST form data to server
  return Promise.resolve();
};

export const saveForm = createBlockingEffect<Request, Response>(handleSaveForm);
