---
title: From RxJS to 𝗥𝘅𝑓𝑥, building an Event Bus for reliable async on any platform.
published: true
description:
tags: RxJS, eventbus, cqrs, pubsub
cover_image: https://www.sarathi.org/images/articles/telegraph-operator.jpg
---


<!--
Update: Even more type-safety explained in [the next post in the Omnibus series!](https://dev.to/deanius/how-to-use-type-guards-for-type-safe-events-in-typescript-3bap)
-->

## Intro

In the This Dot Labs post titled 
[How To Implement An Event Bus in Typescript](https://www.thisdot.co/blog/how-to-implement-an-event-bus-in-typescript), Luis Aviles showed us a type-safe implementation of an event bus. He also did a great job elaborating on how and when you can one: for reliable passing of information around an application, and triggering effects in a framework-free way that works, _with or without a DOM, in Node, or React Native_!  𝗥𝘅𝑓𝑥 can be the platform for async and data-sharing that does not dictate the rest of your application structure.

For a React application I was developing, my team could realize benefits of less prop-drilling by using a bus. So, I thought that with Luis' article as a reference, I might detail how an implementation might go, from scratch, starting only with an RxJS Subject. The code below gives only a glimpse of what an event bus can do, and weighs in at only 6Kb!

So let's dive in!

## Instance management
An event bus will frequently be a singleton object within an app. To manage a singleton instance, we _could_ write typical OO singleton code.

```ts
export class EventBus {
  private static instance?: EventBus = undefined;

  private constructor() {}

  public static getInstance(): EventBus {
    if (this.instance === undefined) {
      this.instance = new EventBus();
    }

    return this.instance;
  }
}
```
Then the usage of it everywhere would look like:
```ts
EventBus.getInstance().some-method()
```
But that's a bit verbose. Let's instead use the ES2015 module system to export a single object from a `bus.ts` file

```ts
// bus.ts
export const bus = EventBus.getInstance()
```
and then callers could simply do:

```ts
import { bus } from './bus'
bus.some_method()
```

No matter from which file you import `bus`, you get the same reference, so we are effectively using the module system to enforce a single reference without complicating callers.

Now, what should callers have as the interface to our EventBus?

## To listen or not to listen?

Event Buses implement the pub-sub (publish-subscribe) metaphor, so there are two sides to them. First we'll create a fresh API for for the side that responds to events. In Luis' article, the method name was `register`. In the DOM, you listen for events with `addEventListener`. Let's shorten that to just `listen`. Let's assume strings are on the bus for now, and assume that TypeScript knows this. When the `bus` is in scope we have:

```ts
bus.listen(
  item => item.startsWith('hello-'),
  (item) => {
     const who = item.replace('hello-','');
     console.log('Hello '+ who);
  }
);
```

The first argument is a function that returns true or false - called a Predicate. A predicate function is the most flexible way to match an item, and allows for any synchronous function which returns a Boolean. Here we use the nice string method `startsWith`, from ES2015. Never again do we have to test with `indexOf`, whew! Now let's see how to put an event on the bus.

## Trigger Me!

While `dispatch` is a popular term from Redux (and the DOM) for sending an action, it's definition implies an action is _directed_ at something or someone. However, the essence of an event bus is that the sender of an event doesn't know who or what is listening. So let's name our method for sending an _undirected_ event `trigger`.

The argument to trigger should be the type of item the bus allows. Assuming the bus instance was already typed to `string`, then the code to trigger is simply:

```ts
bus.trigger('hello-dave');
```

Notice you don't have to provide a type argument at the moment of triggering, because the bus knows it. Now- what about when a listener needs to be unregistered?

## Will You Stop Listening, Already?
Just as the DOM has `removeEventListener`, an Event Bus should be able to stop listening - for cleanup purposes at least. In Luis' article, he demonstrated a style of un-listening like this:

```ts
const registry = EventBus.getInstance().register(matcher, fn);
registry.unregister();
```

It's an improvement over `removeEventListener` because the return value lets you cancel without the original arguments. I like how it resembles getting a Subscription object from an RxJS Observable, on which you can call `unsubscribe`. So in our example, let's actually return a Subscription:

```ts
const listener:Subscription = bus.listen(matcher, fn);
listener.unsubscribe();
```

This gives us some things for free such as a `.closed` property on `listener`, and the ability to shut down several listeners at once by creating an aggregate Subscription via `Subscription#add`. Since a  Subscription object can represent any process that can be shut down, it's actually a great fit for a listener that can be shut down to stop listening.

## Implementation
Although a production-ready library that implements this pattern is at [`@rxfx/bus`](https://github.com/deanrad/rxfx/tree/main/bus),  the code that implements only what's shown in this article is simply this:

```ts
class Bus<T> {
  private events: Subject<T>;
  constructor() {
    this.events = new Subject();
  }
  listen(matcher: Predicate<T>, handler: (item: T) => void): Subscription {
    return this.events
      .asObservable()
      .pipe(filter(matcher), tap(handler))
      .subscribe();
  }
  trigger(item: T) {
    this.events.next(item);
  }
}
export const bus = new Bus<string>();
// now bus.listen / bus.trigger
```

Play with a working version of this in the [𝗥𝘅𝑓𝑥 Repl at Repl.it](https://replit.com/@deanius/Hello-World-rxfxbus)

## Next Steps

To truly be useful, an event bus needs:
- True error isolation (between listeners, between triggerers and listeners)
- Async listeners which return Promises or Observables
- The ability to re-trigger from listeners' results
- The ability to queue, or otherwise deal with listeners that overlap
- To be able to tie listeners to component lifetimes as in React 
- A way to validate what events are allowed on the bus at runtime
 
 You can read about them more in the documentation and source  on [Github](https://github.com/deanrad/rxfx/tree/main/bus).

I hope you enjoyed seeing this use of Typescript to create a powerful, simple Event Bus, with a friendly and interoperable API. Let me know what more you'd like an Event Bus to do for you!