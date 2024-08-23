# 𝗥𝘅𝑓𝑥: Bus Listener vs Service for Effect/State Management

In 𝗥𝘅𝑓𝑥, when should you use a **bus listener** vs. a **service**? The **service** adds some features to a **bus listener**, primarily providing:

- An Observable of **state**, and
- A standard convention for lifecycle events.

If those features sound desirable for your application, go with a **service** - it is the "batteries-included" event-handling style, and suitable for apps with stateful UI.

If you've used [NgRx](), [Redux Saga](), or [Redux Toolkit](), a **service** will provide a similar DX to that, while a **bus listener** is a low-level tool that is just a little syntactic sugar over the underlying [**RxJS**](). (Upon which 𝗥𝘅𝑓𝑥 tools are built, and owe a debt of gratitude 😀)

To understand more, the differences are broken down into [Architecture](#architecture), [Unhandled Errors](#unhandled-errors), [Effect Observers](#effect-observers), and [Effect Cancelation](#effect-cancelation) and elaborated upon below the chart.

Legend: ∅ = not included, but possible to do manually

|                                    | Bus Listener |      Service      |
| ---------------------------------- | :----------: | :---------------: |
| Architecture                       |              |                   |
| ‣ Pub-Sub (decoupling)             |      ✅      |        ✅         |
| ‣ Responses from a Request         |      ∞       |         ∞         |
| ‣ Simple Testing                   |      ✅      |        ✅         |
| ‣ Framework-Independence           |      ✅      |        ✅         |
| ‣ Portability Client/Server/Mobile |      ✅      |        ✅         |
| ‣ Bus Items                        |    `any`     | `{type, payload}` |
| ‣ Naming Convention                |      ∅       |        ✅         |
| ‣ State Management                 |      ∅       |        ✅         |
| Unhandled Errors                   |              |                   |
| ‣ Safety, Independence             |      ✅      |        ✅         |
| ‣ Triggered as Bus Event           |      ∅       |        ✅         |
| ‣ Automatic Recovery               |      ∅       |        ✅         |
| Effect Observers                   |              |
| ‣ How Many                         |      1       |         ∞         |
| ‣ Re-triggering                    |      ∅       |        ✅         |
| ‣ `isActive`                       |      ✅      |        ✅         |
| ‣ `next`,`complete`,`error`        |      ✅      |        ✅         |
| ‣ `subscribe`,`unsubscribe`        |      ✅      |        ✅         |
| Effect Cancelation                 |              |                   |
| ‣ All                              |      ✅      |        ✅         |
| ‣ Single                           |      ∅       |        ✅         |
| ‣ Single + Queue                   |      ∅       |        ✅         |

We'll break down these differences section by section.
Please refer to the [Form Upload Example](https://stackblitz.com/edit/rxjs-ajax-with-progress-updates-rhsrrr?file=index.tsx) to illustrate the similarities and differences in code. In this example, there would be a service, or listener for uploading, and another for sending analytics events.

---

## Architecture

| Architecture                       | Bus Listener |      Service      |
| ---------------------------------- | :----------: | :---------------: |
| ‣ Pub-Sub (decoupling)             |      ✅      |        ✅         |
| ‣ Responses from a Request         |      ∞       |         ∞         |
| ‣ Simple Testing                   |      ✅      |        ✅         |
| ‣ Framework-Independence           |      ✅      |        ✅         |
| ‣ Portability Client/Server/Mobile |      ✅      |        ✅         |
| ‣ Bus Items                        |    `any`     | `{type, payload}` |
| ‣ Naming Convention                |      ∅       |        ✅         |
| ‣ State Management                 |      ∅       |        ✅         |

A **service** requires a **bus**. For a **service**, your bus should be typed to carry Flux Standard Actions - serializable JS Objects resembling `{type: string, payload: any}`. Consider that a prerequisite to using a **service**.

With regards to state management, a **service** allows you to provide a reducer at creation time, which can aggregate all matching events. This would be useful to keep a count, for the form upload example, of how many successes, how many errors, etc.

---

## Unhandled Errors

| Unhandled Errors         | Bus Listener | Service |
| ------------------------ | :----------: | :-----: |
| ‣ Safety, Independence   |      ✅      |   ✅    |
| ‣ Triggered as Bus Event |      ∅       |   ✅    |
| ‣ Automatic Recovery     |      ∅       |   ✅    |

Unhandled errors can arise from an event handler/effect creator as either:

- Synchronous exceptions
- Promise rejections
- Observable `error` notifications
- EventEmitter `error` events

These errors, left unchecked, can generally terminate your program, or at least fail up to your framework's error mechanisms.

Both 𝗥𝘅𝑓𝑥 handler styles prevent these errors from killing your application. Compare to [RxJS](https://github.com/tc39/proposal-observable/issues/178), or NodeJS [UnhandledPromiseRejection](https://nodejs.org/api/events.html#capture-rejections-of-promises).

A **bus listener** will simply die upon one of these, just as a fuse in a fusebox will, to prevent further damage to your app, safely emitting the error on the [`bus.errors`](https://d2w8thuilcrsfd.cloudfront.net/api/bus/classes/Bus.html#errors) Observable.

A **service** will continue to operate and handle requests, but will trigger a `${namespace}/error` event to the bus.

Think of a **service** instance as an error-recoverable \*bus listener\*\*. This is a logical choice for any networking endpoint, where occasional failure is just part of regular execution.

---

## Effect Observers

| Effect Observers            | Bus Listener | Service |
| --------------------------- | :----------: | :-----: |
| ‣ How Many                  |      1       |    ∞    |
| ‣ Re-triggering             |      ∅       |   ✅    |
| ‣ `isActive`                |      ✅      |   ✅    |
| ‣ `next`,`complete`,`error` |      ✅      |   ✅    |
| ‣ `subscribe`,`unsubscribe` |      ✅      |   ✅    |

A **service** has a naming convention for effect life-cycle events (`request`,`started`, `next`, etc..) and triggers these events back to the bus automatically. With a **bus listener** you are on your own for naming, and a **bus listener** only triggers further events if you configure it with [`observeWith()`](https://d2w8thuilcrsfd.cloudfront.net/api/bus/classes/Bus.html#observeAll) or [`observeAll()`](https://d2w8thuilcrsfd.cloudfront.net/api/bus/classes/Bus.html#observeAll).

A **bus listener** can have an observer passed in as the 3rd argument to [`bus.listen`](https://d2w8thuilcrsfd.cloudfront.net/api/bus/classes/Bus.html#listen), and this becomes part of the listener's `Subscription`.

A **service** can provide an object of callbacks at any time via `service.observe({})`, and each `observe` call creates its own independent `Subscription`.

Both handler styles provide a default observer `isActive`, which is an Observable of `true|false` values indicating whether a handling is in progress. And both handler styles follow the [TC39 Observable Proposal](https://github.com/tc39/proposal-observable)'s convention of separating `next(value)` and `complete()` events. When a Promise-returning function is used as an effect creator, the `resolve(value)` is emitted as a `next(value)` followed by a `complete()`. This separation allows a handler to return a multi-value Observable — such as one returning progress notifications — to easily upgrade the Promise-based one.

---

## Effect Cancelation

| Effect Cancelation | Bus Listener | Service |
| ------------------ | :----------: | :-----: |
| ‣ All              |      ✅      |   ✅    |
| ‣ Single           |      ∅       |   ✅    |
| ‣ Single + Queue   |      ∅       |   ✅    |

A **bus listener** can be terminated, (including any in-flight handlings if they were returned as Observables) by calling `.unsubscribe()`. However, a **service** has `.stop()` to emulate a full unsubscribe, and in addition it has `cancelCurrent()`, and `cancelCurrentAndQueued()` methods. After calling those, the **service** will continue to handle requests, unlike the **bus listener**.

---

 <!-- ‣ ∅  ✅ 🚫 ⛔️ ∞ -->

---

## Quiz

### Architectural Choice

Question: What are benefits of using a **service**, that are _not_ achievable with a **bus listener**?

1. Have an `isActive` Observable to control a spinner in the UX.
2. Manage state across multiple events.
3. Allow for effects that produce progress notifications.
4. Keep an app from terminating on unhandled errors.

Answers: [2]

### Service Error Handling

Question: What is the behavior of a **service** named `upload`, which returns a Promise rejection upon uploading its file?

1. The error is emitted on `bus.errors`.
2. The error is triggered as `upload/error`.
3. The service will no longer upload files.
4. The application is terminated with `UnhandledPromiseRejection`.

Answers: [2]

### Service Effect Cancelation

Question: Which invocation does _not_ cancel an effect by a service defined as below?

```
const uploadService = createService('upload', bus, uploadFile);
```

1. `uploadService.cancelCurrent()`
2. `uploadService.stop()`
3. `bus.reset()`
4. None - they all cancel the upload.

Answers: [4]

### Service Effect Observation

Question: Which event type(s) are triggered at the _successful_ conclusion of a service named `analytics` that returns a Promise for an `HTTP POST`?

1. `analytics/resolve`
2. `analytics/next`
3. `analytics/complete`
4. `analytics/end`

Answers: [2,3]
