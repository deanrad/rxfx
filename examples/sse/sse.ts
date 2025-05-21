// LEFTOFF - making true effect out of it
import { createEventSourceObservable } from "../../ajax/dist/rxfx-ajax.esm";
import { createEffect } from "@rxfx/effect";

const SSE_URL = "https://sse.dev/test";

// raw Observable
// const obs = createEventSourceObservable({ url: SSE_URL });
// obs.subscribe(console.log);

// Fx
const fx = createEffect<void>(() =>
  createEventSourceObservable({ url: SSE_URL })
);
fx.responses.subscribe(console.log);
fx.request();
