# 𝗥𝘅𝑓𝑥 `bus`

A typesafe, concurrency-controlled event bus. Part of the [𝗥𝘅𝑓𝑥](https://github.com/deanrad/rxfx) family of libraries.

If you're from React/Redux, NgRx, or generally want to use a reducer to keep track of state across events, have a look at [`@rxfx/service`](https://github.com/deanrad/rxfx/tree/main/service).

# Minimal Bus Example

Explore this example for yourself on [Repl.it](https://replit.com/@deanius/Hello-World-rxfxbus#index.js)

```ts
import { Bus } from '@rxfx/bus';
import { after } from '@rxfx/after';

const bus = new Bus<string>(); // or Redux FSA, etc.

/////// Listen and limit events (critera, handler) ////////
const listener = bus.listen(
  () => true, 
  (event) => after(1000, () => console.log(event))
);
bus.guard(e => !e.length, () => {
  throw new Error('non-empty strings!')}
);

/////// Then trigger them /////////////////////////////////
bus.trigger('Hello');
bus.trigger('World');

/////// Turn off listener (upon unmount, for example) /////
after(2000).then(() => listener.unsubscribe());
```

# Overview

𝗥𝘅𝑓𝑥 is built upon RxJS, but with sugar for fewer imports, operators, and errors.

Mainly, a bus is a utility to implement the Publish-Subscribe pattern, aka "pub-sub".

 Pub-sub can have the following benefits at dev-time and run-time:

- Decouple components statically from each other and frameworks
- Decouple the mapping of one-request-to-one-response allowing concurrency control, cancelation, and multi-part responses.

The first is accomplished by any pub-sub, or Redux. 

The second is the speciality of an 𝗥𝘅𝑓𝑥 `bus` - which can invoke listeners in any concurrency mode of RxJS, without explicit imports for them.

## Supported Concurrency Modes

Each of these RxJS-based concurrency modes can be achieved more easily by 𝗥𝘅𝑓𝑥, with fewer imports and easier switching.

![](https://d2jksv3bi9fv68.cloudfront.net/rxfx/cards-all-2024.png)

Explore [a live visualization](https://bdmytq.csb.app/) of these and several custom modes, if you like.

To invoke them, just call `bus.listenQueueing`, for example. The default mode, Immediate, is invoked by `bus.listen`. For a custom mode, pass an operator that implements it as the final argument to `bus.listen`.

## Examples
The following apps are built on bus events and listeners:

- [Basic REPL](https://replit.com/@deanius/HelloTypedBus#index.ts) - A basic tour of the type-safe bus methods.

- [7GUIs Circles](https://codesandbox.io/p/sandbox/7guis-6-circles-rxfx-bus-d8jppt) - A drawing tool, challenge 6 in the [7GUIs](https://eugenkiss.github.io/7guis/tasks) suite.

- [7GUIs Cells](https://github.com/deanrad/rxfx/tree/main/examples/7guis-cells) - A reactive spreadsheet, challenge 7 in the [7GUIs](https://eugenkiss.github.io/7guis/tasks) suite.

For richer, stateful examples, see [`@rxfx/service`](https://github.com/deanrad/rxfx/tree/main/service).