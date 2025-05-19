# 𝗥𝘅𝑓𝑥 `effect`
![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)

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
  /* returns a Promise or Observable for playing a bell sound */
};

// The RxFx effect with no concurrency control
const ringEffect = createEffect(ringBell);
// An RxFx effect that queues ringing, with the same API as createEffect
const queuedRing = createQueueingEffect(ringBell);

queuedRing(); // ring it now
queuedRing(); // ring after the first
queuedRing.request(); // alternate way to ring

queuedRing.cancelCurrent(); // cancels this ring, begins the next
queuedRing.cancelCurrentAndQueued(); // cancels this ring, empties the queue

// Query if active now, or subscribe to all activity updates
queuedRing.isActive.value;
queuedRing.isActive.subscribe(fn)

// The current error, or all errors
queuedRing.currentError.value;
queuedRing.errors.subscribe(fn);
```

- Play with the [React CodeSandbox.](https://codesandbox.io/p/sandbox/rxfx-bell-effect-1-1-zk6289)

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

# Errors

If the effect function returns a rejected Promise, throws an exception, or returns an Observable which emits an error, there is no risk to your app as a whole. The error goes onto `.errors`, and you can respond to them or log them via the `.errors` Observable.

```ts
// See errors in the console
queuedRing.errors.subscribe(console.error);
```

The most recent error is on the `currentError` property, which can be checked via
`queuedRing.currentError.value`. In React, the `useService` hook returns a live-updating `currentError` value for rendering. See [@rxfx/react](https://github.com/deanrad/rxfx/tree/main/react) for more details on the `useService` hook.

# Cancelability

Since Promises are not generally cancelable, the primary way to create a cancelable effect is to make it from a function that returns an Observable.

```ts
import { ajax } from 'rxjs/ajax';

const userFetcher = createEffect((id) => {
  return ajax.getJSON({ url: 'http://...' + id });
});

userFetcher(1); // starts a fetch
userFetcher.cancelCurrent(); // cancels it
```

Otherwise, if your effect's Promise can abort on an `AbortSignal`, use `makeAbortableHandler` in `@rxfx/ajax`.

```ts
import { makeAbortableHandler } from '@rxfx/ajax';

const cancelableFetch = (cat, signal) => {
  return fetch('http://cat.pet?t=500' + cat, { signal });
};

const userFetcher = createEffect(makeAbortableHandler(cancelableFetch));

userFetcher(1); // starts a fetch
userFetcher.cancelCurrent(); // cancels it
```

If running in Queued mode, `cancelCurrent()` will cancel the current, and immediately begin executing the next queued effect handling. If you want to cancel with the entire queue, use `cancelCurrentAndQueued()`.

For an even more complete cancelation, call `shutdown()` on an EffectRunner, which will cancel all AND stop handling new events.

```
userFetcher.shutdown()
```

Finally, the strongest cancelation, allows every effect to be shutdown at the same time, like for program termination, using `shutdownAll()`.

```ts
import { shutdownAll } from '@rxfx/effect';

// To cancel all and stop listening to future effects.
shutdownAll();
```

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
import { Subject } from 'rxjs';
import { concatMap } from 'rxjs/operators';

const ringer = new Subject();
ringer.pipe(concatMap(ringBell)).subscribe(fn);

ringer.next(); // immediate 1st ring
ringer.next(); // queued 2nd ring
```

But this would not allow cancelation of the current ring! To add cancelation you need more imports and another `Subject`

```ts
import { Subject } from 'rxjs';
import { concatMap, takeUntil } from 'rxjs/operators';

const cancels = new Subject();
const ringer = new Subject();

const bellEffect = ringer
  .pipe(
    concatMap(() => {
      return defer(ring).pipe(takeUntil(cancels));
    })
  )
  .subscribe();

ringer.next(); // immediate 1st ring
ringer.next(); // queued 2nd ring
```

And to be able to cancel the whole queue:

```ts
const ringer = new Subject<void>();
const cancels = new Subject<void>();
const restartEntireQueue = new Subject<void>();

restartEntireQueue
  .pipe(
    switchMap(() =>
      ringer.pipe(
        concatMap(() =>
          defer(playBellWebAudio).pipe(
            // Allow single-cancelation
            takeUntil(cancels)
          )
        )
      )
    )
  )
  .subscribe();

ringer.next(); // Add ring to the queue
cancels.next(); // Cancel the current ring playing
restartEntireQueue.next(); // Cancels the current, and queued
```

So it works, but the happy path is very obscured, and it would take quite a lot of mastery of RxJS to read or write that code.
In short — while you _could_ use raw RxJS, all the awkwardness of it goes away when you use an 𝗥𝘅𝑓𝑥 service or an effect.

- No calls to `subscribe`
- Fewer imports
- No awkward `pipe`s.

For comparison, the RxFx is just:

```ts
import { createEffect } from '@rxfx/effect';
const bellRinger = createQueueingEffect(playBellWebAudio);

bellRinger.cancelCurrent(); // cancels one
bellRinger.cancelCurrentAndQueued(); // also empties the queue
```

So stop fighting the tools, and climb up a level of abstraction - it's nice up here!
