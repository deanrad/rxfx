import { createEffect } from '@rxfx/effect';

type Request = void;
type Response = number;
type State = number;

const handleFetchNotificationCount = (req: Request): Promise<Response> => {
  // Fetch new notification count
  return Promise.resolve(0);
};

export const fetchNotificationCount = createEffect<Request, Response, Error, State>(
  handleFetchNotificationCount,
  undefined,
  0
);

fetchNotificationCount.reduceWith((count, event) => {
  switch (event.type) {
    case 'response':
      return count + event.payload;
    default:
      return count;
  }
}, 0);
