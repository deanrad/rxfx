[![Travis CI](https://api.travis-ci.com/deanrad/rxfx-operators.svg?token=jDxJBxYkkXVxwqfuGjmx&branch=master&status=passed)](https://travis-ci.com/deanrad/rxfx-operators)
![Code Coverage](https://shields.io/badge/coverage-100%25-brightgreen)
[![Maintainability](https://api.codeclimate.com/v1/badges/f7c14c5a3bbbf0d803cc/maintainability)](https://codeclimate.com/github/deanrad/rxfx-operators/maintainability)

# rxfx-operators

## What Is It?

An Event Bus for simplifying front-end code, especially in VanillaJS and React codebases. Can serve as its own framework, or an add-on, run in Node, or Deno, and maintain decoupling from frameworks, or downstream services.

## How to Get It?

`npm install rxfx-operators`

Deno: Coming Soon!

## How Big Is It?

Only 8Kb minified, gzipped

## What Front-End problems does it help with?

- Keep components and services testable—since they're specified only in terms of messages they send or respond to - no mocking required!
- Don't need to prop-drill, lift state, or introduce Contexts to do inter-component communication; sharing the bus is sufficient.
- Code UX to handle all edge-cases around API/service communication, by depending only on the messages. Even if those services aren't built yet!
- Keep memory footprint small, and prevent bundle bloat by allowing functionality to load/unload at runtime.

And many more - see How Can I Explain This To My Team.

## Usage with React

```ts
import { bus, CounterIncrement, useWhileMounted } from "./events/"
const CounterDisplay = () => {
  const [count, setCount] = useState(0);
  useWhileMounted(() => {
    return bus.listen(CounterIncrement.match, () => {
      setCount(c => c+1))
    })
  })
}
```

This example invokes a React state-setter each time an event matching `CounterIncrement` is trigger-ed onto the bus. `bus.listen` returns an RxJS `Subscription` object, and the wrapping of it in `useWhileMounted` allows the listener to be removed upon component unmounting.

In an entirely un-coupled component, anywhere in the app, a component (or test framework) will trigger those actions:

```ts
import { bus, CounterIncrement } from './events'
const CounterButton = () => {
  return <button onClick={() => trigger(CounterIncrement())}>
}
```

All that's needed to connect them, is mount each of them - in no particular relation to each other, and sharing no props or state:

```jsx
<App>
  <CounterDisplay />
  <CounterButton />
</App>
```

### Lifecycle

`useWhileMounted` can ensure your effects do not outlive the components that initiate them. This is a good default, and enabled by returning Observables from handlers always. However, if cancelability is not desired, (such as when a response is still desired) simply return a Promise instead, and Omnibus will be unable to cancel it.

```ts
function useWhileMounted(subsFactory: () => Subscription) {
  useEffect(() => {
    const sub = subsFactory();
    return () => sub?.unsubscribe();
  }, []);
}
```

### Testing

Note how the specs read for each component:

```
describe: CounterButton
  it: triggers a CounterIncrement event when clicked

describe: CounterDisplay
  it: increments its number by 1 upon a CounterIncrement event
```

With that specification, no test-framework specific mocks need to be written — `query` can be used to assert what `CounterButton` does, and a test need only `trigger` and examine the output of `CounterDisplay`. No complicated, nested `jest.mock` calls required. Bonus: you can animate your Storybook stories by performing a series of `trigger` calls in your stories.

# Example Applications

There is [TodoMVC](https://codesandbox.io/s/todos-omnibus-rtkquery-mjjwn). The Redux Toolkit [Async Counter](https://codesandbox.io/s/omnibus-async-counter-0q95qz). An RxJS-style [typeahead search](https://codesandbox.io/s/createobservableservice-6zy19). And a rework of the XState Dog Fetcher known as [Cat Fetcher](https://codesandbox.io/s/cat-fetcher-with-omnibus-kr3yw)

The [7 GUIs](https://eugenkiss.github.io/7guis/) are a series of UX challenges which range from a simple counter to a highly dynamic spreadsheet with formulae and cell references.

- [1-Counter](https://codesandbox.io/s/7guis-1-counter-glh0cm)
- [2-Temperature](https://codesandbox.io/s/7guis-2-temperature-n36pf?file=/src/index.tsx)
- 3-Flight Booker
- 4-Timer
- [5-CRUD](https://codesandbox.io/s/7guis-5-crud-omnibus-z99bd0)
- [6-Circles](https://codesandbox.io/s/7guis-6-circles-omnibus-bnfsm)
- [7-Cells (command-line)](https://github.com/deanrad/rxfx-operators/tree/master/example/7guis-cells)

Omnibus solves each challenge, maintaining a uniform, testable architectural style across each one. Other example apps have included IOT, Animation, WebAudio, WebSockets and many more.

# API

The Omnibus API is intentionally simple. Since it has been in use for >4 years (since 2017), its core APIs are stable.

---

> **Constructor**: `new Omnibus<EType>()`

Declares the event bus, and the (super)-type of events it can carry. When used with a library like [Redux Toolkit](), or [`typescript-fsa`](), this will be:

`export const bus = new Omnibus<Action>()`

---

> **trigger**: `bus.trigger<SubType extends EType>(event)`

Triggers an action to the event bus, so that listeners may handle it after passing all pre-processors (guards, filters, and spies). _Triggering has no performance cost if there are no listeners_.

As an example: if you have logging that should only occur in lower environments, the calls to `bus.trigger` can be left in place throughout your app and logging listeners only attached in lower environments. Compare this to actual `console.log` statements which must be removed.

No type-annotation is needed at call-time to ensure typesafety of triggered actions.

```js
// CounterIncrement triggers a subtype of Action onto the bus
handleClick={((e) => bus.trigger(CounterIncrement()))}
```

---

> **query**: `bus.query(predicate: (EType => boolean))`

From a testing perspective, `query` is a way to assert that a `trigger` was called.

More generally, `query` allows you to get a subset of actions of the bus as an RxJS Observable. This allows you create a 'derived stream' to detect certain conditions. A simplistic form of rate limiting could be:

```ts
// Do something when 5 or more bus events occur in one second
const rateLimitViolations = bus
  .query(() => true)
  .pipe(
    bufferTime(1000),
    filter((buffer) => buffer.length >= 5)
  );
rateLimitViolations.subscribe(() => {
  // let this be handled by listeners
  bus.trigger(RateLimitViolation());
  console.log('Slow down!');
});
```

Issues resulting from race conditions could be detected and fixed by using `query` to run a corrective action.

You can get a Promise for the first result of a `query`, using RxJS' `firstValueFrom`:

```ts
import { firstValueFrom } from 'rxjs';
firstValueFrom(rateLimitViolations).then(() => console.log('Game over!'));
```

---

> **reset**: `bus.reset()`

Returns the bus to a state where there are no listeners. Any Observables returned by `query` will complete upon a `reset`. Any listeners will be unsubscribed. If the listeners were defined to support cancelation of their effects (if they return cancelable Observables vs uncancelable Promises), their effects are canceled and resources freed up immediately. See Cancelation for more.

In a Hot-Module-Reloading environment where a bus instance may get the same listeners attached multiple times, adding a call to `reset` can prevent double-listenings.

```ts
bus.reset(); // Be HMR-friendly
```

## Error Handling

---

> **errors**: `bus.errors.subscribe(handler)`

If a listener throws an uncaught error (its `observer` does not have an `error` callback):

- The `error` will appear on the `bus.errors` Observable.
- The listener will be unsubscribed/terminated.

For full transparency, the following code will show all events on the bus, and any errors that occur:

```ts
const bus = new Omnibus<any>();
bus.spy((e) => console.log(e));
bus.errors.subscribe((e) => console.error(e));
```

This error handling differs from RxJS in two ways:

- The code that called `bus.trigger()` and initiated the error will NOT see the exception. This keeps triggerering components from being sensitive to listener exceptions, allowing those components to reach a 'done' state, even when new listeners are added.

- The bus' internal `Subject` will continue to handle events, and keep other listeners alive. No `hostReportError` will be called.

In short, the bus prefers to 'blow a fuse' on a single listener, than to fail entirely, or raise an error or Promise rejection to the top level of the app.

In contrast to listener errors, Guards, Filters and Spies that throw errors will propogate up to the code that called `trigger`. Use this to perform event validation or otherwise tell the triggerer that the event it sent will not be handled. See Sync Handlers for more.

---

## Async Handlers

> **listen**: `bus.listen(matcher, handler, observer)`

> **listenQueueing**: `bus.listenQueueing`

> **listenSwitching**: `bus.listenSwitching`

> **listenBlocking**: `bus.listenBlocking`

Each `bus.listen` method variant takes the same function arguments (explained shortly), and returns a Subscription. This subscription can be thought of as an Actor in the Actor model.

The purpose of using one `listen` variant over another - say `listenQueueing` instead of `listen`, is to specify what the listener does if it already is executing a handling, and a new event comes in. Each method corresponds to an RxJS operator. More detail below in Concurrency.

### **Arguments**

The two required arguments to create a listener are:

- `matcher` - A predicate function. Each event of the bus is run through each listener's predicate function. If the matcher returns `true` then the bus invokes that listener's handler.
- `handler` - A function to do some work when a matching event appears on the bus. The handler recieves the event as its argument. It can perform the work:
  - Synchronously
  - Immediately, by returning a Promise
  - Deferred, by returning a Promise-returning function
  - Deferred, and cancelable by returning an Observable

The most powerful and performant of these is the Observable, whose cancelability prevents resource leaks and helps tame race conditions. **Note:** You do not need to call `subscribe()` when returning an Observable- Omnibus does that automatically on any Observable you return. When returning a Promise, there's no need to `await` it or declare the handler `async`.

```ts
// Sync
bus.listen(matcher, (e) => console.log('event: ', e));

// Immediate Promise
bus.listen(matcher, (e) => fetch(url).then((res) => res.json()));

// Deferred Promise (needed if you want to queue handlings)
bus.listen(matcher, (e) => () => fetch(url).then((res) => res.json()));

// Observable (cancelable w/o AbortController!)
bus.listen(matcher, (e) => ajax.getJSON(url));
```

### **Concurrency**

By default, a listener will perform its handlings ASAP - corresponding to `mergeMap` mode in RxJS. However, race conditions or resource usage often demand switching strategies. Omnibus makes this trivial - just call a different `listen` variant with the same arguments. The async concurrency strategy (**How**) is entirely decoupled from the criteria for triggering (**When**), and the async behavior definition (**What**). This allows those changes to the UX that really make a difference to users, without requiring large code changes:

| Variant           | RxJS operator | Use Cases                    |
| ----------------- | ------------- | ---------------------------- |
| `listen`          | `mergeMap`    | Independent "Like" buttons   |
| `listenQueueing`  | `concatMap`   | File upload / analytics      |
| `listenSwitching` | `switchMap`   | Autocomplete/session timeout |
| `listenBlocking`  | `exhaustMap`  | Form submission              |

These variants suffice for 99.9% of the use cases you'll encounter in web development. For custom handling (example: a maximum of 2 in progress handlings), pass a custom operator of your own design as the last argument to `listen`. See `toggleMap` for an example.

### **Handler Lifecycle Events**

For any individual handling, there are events of interest - such as when it starts, errors, or produces a value successfully. The final, optional argument in constructing a listener is `observer`— an object with any of these callbacks:

- `error(e)` - A Promise `reject` or Observable `error` occurred.
- `complete()` - A Promise `resolve` or Observable `complete` occurred.
- `next(value)` - Conveys the resolved Promise value, or an Observable `next` value.
- `subscribe()` - The deferred Promise was begun, or the Observable was subscribed to.
- `unsubscribe()` - The Observable was unsubscribed before it completed. Aborted Promises are handled as `error` instead.

If you are using the `observer` simply to trigger further events (like Redux Toolkit's `createAsyncThunk` but with different names), you can create a triggering Observer out of action creators using `bus.observeWith`:

```ts
// Import Action Creators for the lifecycle events
import { SearchRequest, SearchResult, SearchComplete SearchError } from './events';

// And trigger these events as the handler runs
bus.listen(
  SearchRequest.match,
  (req) => fetch(`https://url?req=${req}`),
  bus.observeWith({
    next: SearchResult,
    complete: SearchComplete,
    error: SearchError
  })
);
```

See [`createObservableService`](https://codesandbox.io/s/createobservableservice-6zy19) for a utility that resembles `createAsyncThunk`, but without Redux or middleware, saving bundle size.

### **Unregistering a Listener**

To unregister the listener, simply call `unsubscribe()` on the return value. Any work being done by a listener will be canceled when the listener's subscription is unsubscribed, or if `bus.reset()` is called.

```ts
const sub = bus.listen(when, () => work); // sets up
bus.trigger(startsWork); // begins work
sub.unsubscribe(); // ends, including work
```

---

## Pre-Processors/Sync Handlers: Guards, Filters, Spies

The bus allows for various forms of pre-processors - functions which run on every `trigger`-ed action, before any listener sees the action. These are not intended to begin any async process, but more commonly to:

- Throw an exception to the caller of `bus.trigger()` (Listeners, by design do not do this - see Error Handling)
- Validate, sign, timestamp or otherwise modify the event before any listener can see it.
- Call a state setter (as in React useState), or dispatch an action (as in useReducer)
- `console.log` or write to another log synchronously.

> **guard**: `bus.guard(matcher, handler)`

Guard functions are run in the callstack of the triggerer. Their return value is unimportant, but may throw an exception to prevent further processing.

```js
// Prevent negative increments
bus.guard(CounterIncrement.match, ({ payload: { increment = 0 } }) => {
  if (increment < 0) throw new Error('Cant go backward');
});
bus.trigger(CounterIncrement(-1)); // throws
```

A fun debugging technique is to open a debugger upon an action of your choosing, to find out where in the code it was triggered (since `grep` doesnt always find dynamic event creation):

```js
bus.guard(CounterIncrement.match, () => {
  debugger; /* i see you! */
});
```

> **filter**: `bus.filter(matcher, handler)`

If you are intending to change the contents of an event on the bus, a handler passed to `filter` is the place to do it. Either mutate the event directly in the handler, or if you prefer immutability, return a new event. This is useful to centralize functionality like timestamps, making it not the responsibility of the trigger-er.

```ts
bus.filter(CounterIncrement.match, (e) => {
  e.createdAt = Date.now()
}
```

If an event requires further authorization, a `filter` may substitute an authenitcation event in its place:

```ts
bus.filter(CounterIncrement.match, (event) => {
  return RequestAuth({ attempted: event })
}
bus.listen(RequestAuth.match, ({payload: { attempted }}) => {
  if (window.sessionId) {
    perform(attempted)
  }
})
```

If a set of timing conditions requires that an event be disregarded by all downstream handlers, a filter can change its event to not be seen by those handlers:

```ts
// Increments will be missed by handlers matching on type
bus.filter(CounterIncrement.match, (e) => {
  if (count > 99) {
    e.type = "__ignored__" + e.type
  }
}
```

> **spy**: `bus.spy(handler)`

A spy handler runs synchronously for all runtime events, just before the listeners. The results of any `filter` is visible to any `spy`. Spies should not mutate events, and as long as they don't, they will see exactly what each listener will see.

---

# How Can I Explain Why We Should Use This to My Team?

The main benefits of Omnibus are:

- Allows you to architect your application logic around events of interest to your application, not around volatile or error-prone framework-specific APIs.
- Provides an execution container for typesafe, leak-proof async processes with reliable concurrency options to squash race conditions and prevent resource leaks.

To the first point - framework-specific issues like "prop-drilling" and "referential instability" disappear when an event bus transparently connects components anywhere in the tree through a single, stable bus instance.

To the reliability point - just as XState is a predictable, safe, leak-proof state-container, Omnibus is that for async processes, because it uses the >10 year old, tested options of RxJS: Observables and concurrency operators.

With Omnibus inside React, you can:

- Keep components and services testable—simply specify them in terms of messages they send or respond to, and listen - no mocking required!
- Prevent the need to prop-drill, lift state, or introduce Contexts to do inter-component communication; sharing the bus is sufficient.
- Develop UX to handle all edge-cases around API/service communication, even if those services aren't built yet, by decoupling from them with the event bus!
- Keep memory footprint small, and prevent bundle bloat by allowing functionality to load/unload at runtime.

With Omnibus over RxJS, you can:

- Compose your app one listener/handler at a time, never building a giant, unreadable chain.
- Do little-to-no management of `Subscription` objects
- Preserve readability of operator code: `concatMap` => `listenQueueing`
- Type `pipe()` and `import ... from 'rxjs/operators'` less

You can start with Omnibus with no RxJS logic at all - just handlers returning Promises. Then as you require capabilities that Observables offer—like cancelation— you can change what those handlers return. _Leaving the rest of your app unchanged!_ No `async/await` is required. And you need not mix several types of async code like: middlewares, async/await, Promise chaining and framework-specific APIs. Just use events and listeners.

In short - the kinds of upgrades one must do in web development, such as migrating code from uncancelable to cancelable, from REST endpoint to Web Socket, are made easy with Omnibus. And the UX can be made tight and responsive against any downstream behavior because of its modular, decoupled nature.

# Inspirations, References

- RxJS
- Redux-Observable
- XState
