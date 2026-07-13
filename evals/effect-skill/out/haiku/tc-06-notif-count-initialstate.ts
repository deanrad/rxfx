import { createEffect } from '@rxfx/effect';

type Request = void;
type Response = number;
type State = number;

const handleFetchNotifications = (req: Request): Promise<Response> => {
  // Fetch notification count
  return Promise.resolve(0);
};

export const fetchNotifications = createEffect<Request, Response, Error, State>(
  handleFetchNotifications,
  undefined,
  0
);

fetchNotifications.reduceWith((count, event) => {
  switch (event.type) {
    case 'response':
      return count + event.payload;
    default:
      return count;
  }
}, 0);
