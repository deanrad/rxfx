import { createEffect, Observable } from '@rxfx/effect';

type Request = void;
type Notification = { id: string; text: string };
type Response = Notification[];
type State = number; // running count of notifications seen

/** Fetch notifications and keep a running count starting at 0. */
const handleFetchNotifications = (): Observable<Response> => {
  // TODO: fetch notifications
  return new Observable((sub) => {
    sub.complete();
  });
};

export const fetchNotifications = createEffect<Request, Response, Error, State>(
  handleFetchNotifications,
  undefined,
  0
);

fetchNotifications.reduceWith((count, event) => {
  switch (event.type) {
    case 'response':
      return count + event.payload.length;
    default:
      return count;
  }
}, 0);
