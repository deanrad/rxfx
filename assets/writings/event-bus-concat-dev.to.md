---
title: Ordering Event Bus Events with RxJS and concatMap
published: true
description: Stack-based recursion can introduce event-ordering issues that RxJS concatMap can fix.
tags: RxJS, async, operators, eventbus
cover_image: https://images.unsplash.com/photo-1583078379333-e34d6569c406?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=774&q=80
---

An Event Bus can help our app by providing a single source of truth for the relative timing of events. If `trigger('B')`  follows `trigger('A')` , then we we expect listeners will receive events in `A, B` order. Any other order would certainly lead to bugs.

Strangely enough, with a simple implementation of an Event Bus in RxJS (a Subject, and some Observers that `tap` in a function), one can accidentally introduce a bug in which listeners don't hear events in the same order! Both the buses Luis Aviles made  [here](https://www.thisdot.co/blog/how-to-implement-an-event-bus-in-typescript) and the one I built in [this post](https://dev.to/deanius/a-typesafe-event-bus-with-rxjs-5972) suffer from this bug. In this post we will use `concatMap` to fix that, learning the "Return The Work" principle of Observables.

## Your Thoughts?
The library that implements this bus fully today is called `omnibus-rxjs`. I'm thinking of putting it up as `@rxfx/bus`, and extracting out a family of libraries under that namespace. Which name do you like? Leave a comment below.

---

## Trigger and Listen
In [part 1](https://dev.to/deanius/a-typesafe-event-bus-with-rxjs-5972) we constructed an Event Bus that let us:

1.  Call  `bus.trigger`  to trigger an event to the bus
2.  Use `bus.listen` to register a function to be run on matching events.

On this bus, what happens if a handler function run by `bus.listen` contains a call to `bus.trigger`? Could this confuse the event ordering?

```js
bus.listen(
  (item) => item === "hello-dave",
  () => { bus.trigger("hello-HAL") }
);
```

On the surface there's nothing suspicious here. And to review our bus code at this point, it's nothing more than this:

```js
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
```

So, assuming 3 events are triggered, how could 2 listeners disagree on what order the events arrived?

```js
// Listener 1 heard: ["hello-world", "hello-Dave", "hello-HAL"]
// Listener 2 heard: ["hello-world", "hello-HAL", "hello-Dave"]
```

## The Stack is The Culprit
JavaScript is a stack-based language, where each synchronous function call begins and ends inside its parents'. How is this relevant? Allow me to illustrate..

Suppose there are 3 listeners on a bus carrying strings. First we create a logger called L1. Then our 'Dave listener' which will re-trigger. Then another logger called L2 will be attached. If we fire an event that re-triggers, like `"hello-dave"`, this shows the sequence of calls to the listeners that results in the problem:

```js
 trigger('hello-Dave')
  - L1 listener
  - Dave listener
     - trigger('hello-HAL')
	    - L1 listener
	    - L2 listener
  - L2 listener
```

At runtime, the `trigger('hello-HAL')` from inside the "Dave" listener started firing each matching listener sequentially. But L2 hadn't yet processed `hello-Dave`, so L2 sees `hello-HAL` even before `hello-Dave`. This is what we want to prevent. Our answer will be to not begin the re-triggering immediately, but to "Return the Work"

## Observables - Units of Work

Of all the definitions of Observables out there, the one I like is that an Observable represents the potential for some work to be done, or resource to be used. Like the command-line string `ls -l` encodes the *potential* of a memory-occupying, data-emitting process. So wherever you did work immediately before, you can now do it in an Observable. Like React VDOM is for DOM elements, Observables are to effects.

Now, if we have a stream of these work Observables, we can strictly serialize them with the RxJS operator `concatMap`.

## The Fix 
If you suspected some kind of queueing was the solution you're right. But if you didn't know about`concatMap`, you may have imagined building some data structure to hold the queue. But the `concatMap` operator actually does this internally already. Let's give our bus an RxJS  `Subject`  for the triggerings we want to serialize.

```diff
class Bus<T> {
  private events: Subject<T>;
+  private triggerings: Subject<Observable<void>>;

  constructor() {
    this.events = new Subject();
+    this.triggerings = new Subject();
+    this.triggerings.pipe(
+      concatMap((t) => t)
+    ).subscribe();
  }
}
```
When the constructor is run, the `triggerings`Subject begins listening for work items—Observables—which it passes to `concatMap` to execute only serially. Now, we change the implementation of `trigger` to push one of these work items to that Subject:

```diff
  trigger(item: T) {
-    this.events.next(item);  
+    this.triggerings.next(
+      new Observable((notify) => {
+        this.events.next(item);
+        notify.complete();
+      })
+    );
  }
```
The Observable's work is to run each listener for the item completely and synchronously with `events.next(item)`, and only then call `notify.complete()`.

And voila! `concatMap` can serialize the calls now! We no longer violate causality, and our logs show each listener agrees on the same event ordering.

```
// Listener 1 heard: ["hello-world", "hello-Dave", "hello-HAL"]
// Listener 2 heard: ["hello-world", "hello-Dave", "hello-HAL"]
```

And we can see this is because triggerings—the execution of those Observables—always finishes notifying listeners for one event before processing the next one.

```js
 trigger('hello-dave')
  - L1 listener
  - Dave listener (queues hello HAL)
  - L2 listener
 trigger('hello-HAL')
  - L1 listener
  - L2 listener
```

## Decoupling For The Win

Where we're going with this bus is to make it usable for a Pub-Sub implementation. This bug we just fixed was a kind of coupling, where "Dave listener" was interfering with L2's event order. This is normal when making sync calls in a stack-based language, but we can bring order back to it again with RxJS.

Now that we've decoupled this runtime behavior of listeners from each other, it's time to look at another important way listeners should be decoupled: errors. And that will be the topic of the next post.

## Links
- [CodeSandbox with error](https://codesandbox.io/s/minibus-2-sequence-error-1f1enf?file=/src/index.ts)
- [CodeSandbox, fixed with `concatMap`](https://codesandbox.io/s/minibus-3-sequence-fixed-w2jv53?file=/src/bus.ts)



