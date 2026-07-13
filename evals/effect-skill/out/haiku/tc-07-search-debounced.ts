import { createDebouncedEffect } from '@rxfx/effect';

type Request = { query: string };
type Response = string[];

const handleSearch = (req: Request): Promise<Response> => {
  // Search with 300ms debounce
  return Promise.resolve([]);
};

export const search = createDebouncedEffect(300)<Request, Response>(handleSearch);
