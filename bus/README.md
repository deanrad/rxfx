# 𝗥𝘅𝑓𝑥 `bus`

A typesafe, concurrency-controlled event bus. Part of the [𝗥𝘅𝑓𝑥](https://github.com/deanrad/rxfx) family of libraries.

- `new Bus, defaultBus`

Built upon RxJS, but with sugar for fewer imports, operators, and errors.

> _If you're from RxJS, a `bus` is like a `Subject`, on which `next` is renamed to `trigger`, `listenBlocking(cond, handler)` is a shortcut for `subject.asObservable().pipe(filter(cond), exhaustMap(handler))`, and with methods for other operators._

# Overview

A bus is a utility to implement pub-sub. Pub-sub can have the following benefits at dev-time and run-time:

- Decouple components statically from each other and frameworks
- Decouple the mapping of one-request-to-one-response allowing concurrency control, cancelation, and multi-part responses.

The first is accomplished by any pubsub. 

The second is the speciality of an 𝗥𝘅𝑓𝑥 `bus` - which can invoke listeners in any concurrency mode of RxJS, without explicit imports.

## Example Calls

The [test suite](https://github.com/deanrad/rxfx/blob/main/bus/test/bus.spec.ts) is the authority on its usage.


(TODO examples here)

## Tutorials

- [Swipe-To-Refresh](https://github.com/deanrad/rxfx-example-swipe-to-refresh-blitz/blob/main/README.md)
