import { createDebouncedEffect } from '@rxfx/effect';

type Request = { query: string };
type Response = string[];

const handleDebounceSearch = (req: Request): Promise<Response> => {
  // Search with 300ms debounce, cancel stale results
  return Promise.resolve([]);
};

export const debounceSearch = createDebouncedEffect(300)<Request, Response>(handleDebounceSearch);
