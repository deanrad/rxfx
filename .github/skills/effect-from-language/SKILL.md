---
name: effect-from-language
description: Turn a plain-language description of a side-effect (HTTP call, streaming chat, animation, autocomplete, upload, polling, etc.) into typed @rxfx/effect code. Infers the request/response/state types, the return kind (Promise / Observable / AsyncIterator), the concurrency mode, and any initial state — asking a short clarifying question ONLY when a required detail cannot be inferred. Use when the user describes an async or streaming side-effect in words and wants the @rxfx/effect implementation, or says "effect from this", "make an rxfx effect for", "turn this into an effect".
---

# effect-from-language

Translate a natural-language side-effect description into a single, type-correct
`@rxfx/effect` module. Prefer **inference** over interrogation: read the
description, decide each dimension below, and emit code. Ask a question only when
a dimension is genuinely undecidable from the text.

## What to produce

A `.ts` module that:

1. Imports the chosen factory (and `Observable` if the handler returns one) from
   `@rxfx/effect`.
2. Declares `Request`, `Response`, and (when needed) `State` types.
3. Defines a typed handler function.
4. Exports the effect created by the chosen factory.
5. Adds a `reduceWith` reducer **only** when the description implies accumulated
   state.

Write the file to the path the user gives. In a non-interactive/eval context,
if a filename is specified in the request (e.g. "save to `effect.ts`"), write
exactly there. Otherwise default to `./src/effects/<camelCaseName>Effect.ts`.

## Decide four things

### 1. Concurrency mode → factory

Map the concurrency intent in the description to a factory. Look for these cues:

| Intent / cues in the description | Factory | Operator |
|----------------------------------|---------|----------|
| "in parallel", "fire-and-forget", "all at once", independent, order doesn't matter | `createEffect` (default) or `createImmediateEffect` | `mergeMap` |
| "queue", "one at a time", "in order", "serial", "after the previous finishes" | `createQueueingEffect` | `concatMap` |
| "ignore new while busy", "prevent double submit", "while one is in flight", "only one at a time" | `createBlockingEffect` | `exhaustMap` |
| "cancel the previous / old one", "latest wins", "autocomplete", "typeahead", "cancel and restart" | `createSwitchingEffect` | `switchMap` |
| "toggle", "press again to stop", "start/stop the same action" | `createTogglingEffect` | `toggleMap` |
| "wait until they stop typing", "after N ms of inactivity", "debounce" | `createDebouncedEffect(ms)` | debounce + switch |
| "at most once per N ms", "throttle", "rate-limit" | `createThrottledEffect(ms)` | throttle + block |
| a specific RxJS operator is named | `createCustomEffect` | (that operator) |

If the description gives **no** concurrency cue and the mode materially changes
behavior, ASK — one concise question offering the five core modes
(immediate / queueing / blocking / switching / toggling). Do not silently guess.

### 2. Return kind → handler shape

| Signals in the description | Handler returns | Why |
|----------------------------|-----------------|-----|
| streams / emits multiple values / "token-by-token" / progress | `AsyncGenerator` (`async function*`) or `Observable` | multiple values over time |
| must be cancelable (switching / toggling / blocking-with-cancel) | `Observable` | cancelation propagates |
| single result, not cancelable, fire-and-forget | `Promise` | simplest |

Repo convention: **prefer Observable or AsyncIterator over Promise** when the
effect is cancelable or streaming. Use Promise only for simple, non-cancelable,
single-value effects.

### 3. Request / Response / State types

- **Request** — the input needed to run the effect (an id, a query string, a
  form object). Use `void` if the effect takes no argument.
- **Response** — what a single run yields. For streams, the type of ONE emission
  (e.g. a token is `string`). Use `void` for fire-and-forget.
- **State** — defaults to `Response`. Only introduce a distinct `State` type when
  the description implies accumulation ("running count", "keep a list",
  "total so far", "history"). If types are named but ambiguous, pick the obvious
  shape and note your assumption in a comment; ask only if a type is essential
  and unguessable.

### 4. Initial state → `reduceWith`

If (and only if) the description implies accumulated state, pass the initial
value as the factory's 3rd argument and add a `reduceWith` reducer that folds
lifecycle events into `State`. The initial value comes from the wording
("starting at 0" → `0`, "an empty list" → `[]`).

## Templates

**Promise handler (non-cancelable, single value):**

```ts
import { __FACTORY__ } from '@rxfx/effect';

type Request = __REQUEST__;
type Response = __RESPONSE__;

/** __SCENARIO__ */
const __HANDLER__ = (req: Request): Promise<Response> => {
  // TODO: implement
  return Promise.resolve(/* ... */);
};

export const __NAME__ = __FACTORY__<Request, Response>(__HANDLER__);
```

**Observable handler (cancelable / streaming):**

```ts
import { __FACTORY__, Observable } from '@rxfx/effect';

type Request = __REQUEST__;
type Response = __RESPONSE__;

/** __SCENARIO__ */
const __HANDLER__ = (req: Request): Observable<Response> => {
  // TODO: implement
  return new Observable((sub) => {
    /* sub.next(...) */
    sub.complete();
  });
};

export const __NAME__ = __FACTORY__<Request, Response>(__HANDLER__);
```

**AsyncIterator handler (streaming, token-by-token):**

```ts
import { __FACTORY__ } from '@rxfx/effect';

type Request = __REQUEST__;
type Response = __RESPONSE__;

/** __SCENARIO__ */
async function* __HANDLER__(req: Request): AsyncGenerator<Response> {
  // TODO: implement
  yield /* ... */;
}

export const __NAME__ = __FACTORY__<Request, Response>(__HANDLER__);
```

**Timed factory** (`createDebouncedEffect` / `createThrottledEffect`) — call the
factory with the interval, then apply the generics:

```ts
export const __NAME__ = createDebouncedEffect(300)<Request, Response>(__HANDLER__);
```

**With accumulated state** (`reduceWith`):

```ts
import { createEffect, Observable } from '@rxfx/effect';

type Request = __REQUEST__;
type Response = __RESPONSE__;
type State = __STATE__;

/** __SCENARIO__ */
const __HANDLER__ = (req: Request): Observable<Response> => {
  return new Observable((sub) => sub.complete());
};

export const __NAME__ = createEffect<Request, Response, Error, State>(
  __HANDLER__,
  undefined,
  __INITIAL_STATE__
);

__NAME__.reduceWith((state, event) => {
  switch (event.type) {
    case 'response':
      return /* fold event.payload into state */ state;
    default:
      return state;
  }
}, __INITIAL_STATE__);
```

## Naming

- `__NAME__` = camelCase verb phrase from the scenario (`submitForm`,
  `autocomplete`, `streamChat`, `fetchNotifications`).
- `__HANDLER__` = `handle` + PascalCase name (`handleSubmitForm`).

## Asking questions (last resort)

Only ask when a **required** dimension is undecidable. Keep it to one short
message. For concurrency, offer the five modes explicitly:

> This effect could run in several concurrency modes. If a new request arrives
> while one is running, should we: (1) run both in parallel, (2) queue it,
> (3) ignore it while busy, (4) cancel the old and start the new, or
> (5) cancel the old and not start a new one?

Do not ask about details you can reasonably infer.
