# 𝗥𝘅𝑓𝑥 `effect`

A Vanilla JS container for Effect Management, based on RxJS. Supports cancelation, concurrency modes (queueing, throttling, debouncing), and TypeScript.

Part of the [𝗥𝘅𝑓𝑥](https://github.com/deanrad/rxfx) family of libraries.

# What Is It Good For?

When you have an async effect, embodied in a function that returns a Promise or an Observable, but you want it to:

- not run too often
- be cancelable
- automatically track whether it is active

# Usage

Treat `createEffect` (or a concurrency-controlled version like `createQueueingEffect`) as a higher-order function which returns a concurrency-controlled, cancelable version of that function

```
npm i -S @rxfx/effect
```

```ts
import { createEffect, createQueueingEffect } from '@rxfx/effect';

const ringBell = () => {
  /* returns a Promise for when a bell has completed ringing */
};

// The RxFx effect with no concurrency control
const ringEffect = createEffect(ringBell);
// An RxFx effect that queues ringing, with the same API as createEffect
const queuedRing = createQueueingEffect(ringBell);

queuedRing(); // ring it now
queuedRing(); // ring after the first
queuedRing.request(); // alternate way to ring

queuedRing.cancelCurrent();          // cancels this ring, begins the next 
queuedRing.cancelCurrentAndQueued(); // cancels this ring, empties the queue

// Query if active now, or subscribe to all activity updates
queuedRing.isActive.value
queuedRing.isActive.subscribe

// The current error (cleared when a new execution begins), or all errors
queuedRing.currentError.value
queuedRing.errors.subscribe

// See @rxfx/service for more
```

- Play with the [React CodeSandbox.](https://codesandbox.io/p/sandbox/rxfx-bell-effect-7zfmpc)

# Usage in React

The `useService` hook from `@rxfx/react` brings the current `isActive` status and `currentError` into React.

```ts
function BellComponent() {
  const { isActive, currentError } = useService(queuedRing);
  // render 🛎️ if active
}
```

# Usage in Angular

```ts
import { queuedRing } from '../services/ringer'

export class BellComponent {
  isActive$: Observable<boolean>;

  constructor() {
    this.isActive$ = queuedRing.isActive;
  }

  ring() {
    queuedRing();
  }

}

// html
<button (click)="ring()">
<div>busy: {{ isActive$ | async }}</div>

```


# Relation to `@rxfx/bus` and `@rxfx/service`
Every effect returned by `createEffect` or its variants is an instance of an `@rxfx/service`. You might use `@rxfx/effect` when you only care about the effect in a concurrency-controlled and cancelable fashion, and are not tracking its state.


Compared to creating a service, when you create an effect, you omit the parameters `name`, `bus`, and `reducer`, so RxFx fills them in as shown:

- Name: A randomly assigned ID
- Bus: The `defaultBus` as exposed by `@rxfx/service`
- Reducer: A default reducer whose state is always the most recent response (though if you are interested in state, you probably are using `createService` not `createEffect`)

All the effect's lifecycle events (`request`, `started`, `next`, `complete`, `error`, `cancel`, `canceled`) go on its bus, and can be logged to the console with `bus.spy`, though the names of the events will have the random name assigned:

```
// bus.spy(({type}) => console.log(type));
aed123/request
aed123/next
aed123/complete
```

If `bus.reset()` is called, all existing effects will stop responding to requests, and if their executions are cancelable, those will be canceled too.

# Errors

If the effect function returns a rejected Promise, throws an exception, or returns an Observable which emits an error, there is no risk to your app as a whole. The error goes onto the bus as a regular event, and you can respond to them or log them via the `.errors` Observable.

```ts
// See errors in the console
queuedRing.errors.subscribe(console.error)
```

# Cancelability
Since Promises are not generally cancelable, the primary way to create a cancelable effect is to make it from a function that returns an Observable.

Otherwise, if your effect's Promise can abort on an `AbortSignal`, use `makeAbortableHandler` in `@rxfx/ajax`. [Specs](https://github.com/deanrad/rxfx/blob/main/ajax/test/makeAbortableHandler.spec.ts)

# Concurrency Modes

Race conditions are easily prevented when code is set to run in the correct Concurrency Mode for its use case. With 𝗥𝘅𝑓𝑥, its easily named and tested modes (which use RxJS operators underneath) allow you to keep your code readable, and you can eliminate race conditions in a 1-line code diff.

The modes, pictorially represented here with use cases and descriptions, are utilized just by calling `createEffect`, `createQueueingEffect`, `createSwitchingEffect`, or `createBlockingEffect` accordingly. Your effect stays the same, only the concurrency is different.

Choose your mode by answering this question:

_If the effect is running, and a new request arrives, should we:_

- Begin the new effect at once, allowing both to finish in any order. (`createEffect`)
- Begin the new effect only after any currently running effects, preserving order. (`createQueueingEffect`)
- Prevent/throttle the new effect from beginning. (`createBlockingEffect`)
- Cancel the currently running effect and begin the new effect at once. (`createSwitchingEffect`)

And one final mode, seldom used, but included for completion:

- Cancel the currently running effect, and don't begin a new effect. (`createTogglingEffect`)

Here are representations of each mode:

![immediate, queueing, switching, blocking](https://d2jksv3bi9fv68.cloudfront.net/rxfx/cards-all-2024.png)
Download [SVG](https://d2jksv3bi9fv68.cloudfront.net/rxfx/cards-all-2024.svg)


# Comparison: RxFx vs RxJS

To implement a queued bell ringer with raw RxJS you'd trigger it from a `Subject`, create an `Observable` with a pipe, and call `subscribe` on it:

```ts
import { Subject } from 'rxjs'
import { concatMap } from 'rxjs/operators'

const ringer = new Subject();
ringer.pipe(
  concatMap(ringBell)
).subscribe();

ringer.next() // immediate 1st ring
ringer.next() // queued 2nd ring
```

But this would not allow cancelation of the current ring! To add cancelation you need more imports and another `Subject`

```ts
import { Subject } from 'rxjs'
import { concatMap, takeUntil } from 'rxjs/operators'

const cancels = new Subject();
const ringer = new Subject();

const bellEffect = ringer.pipe(
  concatMap(() => {
    return defer(ring).pipe(
      takeUntil(cancels)
    )
  })
).subscribe()

ringer.next() // immediate 1st ring
ringer.next() // queued 2nd ring
```

So it works, but the happy path is very obscured, and it would take quite a lot of mastery of RxJS to read or write that code. (Also this version doesn't even handle `cancelCurrentAndQueued`).

In short — while you _could_ use raw RxJS, all the awkwardness of it goes away when you use an 𝗥𝘅𝑓𝑥 service or an effect.

- No calls to `subscribe`
- Fewer imports
- No awkward `pipe`s.

So stop fighting the tools, and climb up a level of abstraction - it's nice up here!