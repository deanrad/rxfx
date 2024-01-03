# 𝗥𝘅𝑓𝑥 `service`

Part of the [𝗥𝘅𝑓𝑥](https://github.com/deanrad/rxfx) family of libraries.

30 years after `setTimeout` introduced the world to the asynchronous nature of JavaScript, effect execution is still clumsy at best, and broken in many cases. And none of the popular front-end solutions (Angular, React, RxJS) present a complete solution that deals with all the concerns of async effects in a framework-agnostic way. Still lacking are:

- Error handling that is predictable, and does not compromise the integrity of the app the more effects you add.
- Automatic `loading`/`active` state tracking.
- Automatic tracability of all lifecycle events of effects (`started`,`next`,`complete`,`error`, `canceled`, etc.)
- Simple effect cancelation from anywhere inside or outside the component tree.
- Seamless interopation with Promises, Observables, Iterables and generators.
- Easily reduced or adjustable concurrency (immediate, queueing, throttling, etc) without introducing complication or additional variables.

## How is 𝗥𝘅𝑓𝑥 a solution?
An 𝗥𝘅𝑓𝑥 service (or a bus) is a view-framework-agnostic, pure JS container for Effect Management and State Mangement, based on RxJS. An 𝗥𝘅𝑓𝑥 Service supports all the above pain points in an easy API.


## When is it time to introduce 𝗥𝘅𝑓𝑥?

- You notice you are introducing `loading` state fields which must be set and unset manually
- You are manually outputting logging messages, and there is no standard convention between them.
- You are using framework-specific constructs (`useEffect`, async pipe) to manage asynchrony.
- You want a better separation of the View Layer from the async layer.
- You are dealing with race conditions
- You are using RxJS, but want fewer imports and operators, and you're feeling it clumsy to manage subscriptions in addition to Observables.
- You are using React, and want to heed the warnings in their docs about `useEffect` being used often in the wrong ways.
- You are tired of async errors breaking the view layer, or the app as a whole, as more effects get added to your app.
- You find tests take too long to run when they have to be called through the view layer, and you want something that is testable independent of the view.

In short - if you believe there is a more concise, more airtight, race-condition-proof way to do async, you may have found it right here in an  𝗥𝘅𝑓𝑥 service or bus listener.

# Example Usage

This will create a counter that incremements after 1000 msec, queueing up future increments if one is already in progres.

```js
import { createQueueingService } from '@rxfx/service'

const initialState = 0

const asyncCounter = createQueueingService<void, void, Error, number>(
  'count', 
  () => after(1000),
  ({ isResponse }) => (state = initialState, event) => {
    if (isResponse(event)) {
      return state + 1
    }
    return state;
  }
);
```

Although there are APIs for framework integration (see [`@rxfx/react`](https://github.com/deanrad/rxfx/tree/main/react)), in pure JS the service is used like this:

```ts
// Request a counter increment (will complete after 1000 msec)
asyncCounter.request();

// Request a counter increment, with a Promise for when done
asyncCounter.send().then(() => /* ... */)

// Cancel any current executions of the effect, and/or queued 
asyncCounter.cancelCurrent()
asyncCounter.cancelCurrentAndQueued()

// Update your UI state
asyncCounter.state.subscribe(count => /* ... */)

// Update your loading indicator
asyncCounter.isActive.subscribe(isActive => /*  ... */)

// Display an error which is self-clearing
asyncCounter.currentError.subscribe(e => /*  ... */)

// Consume returned values, or progress notifications of the effect
asyncCounter.responses.subscribe(resp => /*  ... */)
```


<!-- Building upon a normal bus listener, a **Service**:

- Knows whether an effect is active without any need to set up and populate `loading` state variables.
- Turn errors into events, emitting them as events `count/error` and preventing runtime errors.
- Emits events (e.g. `count/started`, `count/complete`) on all lifecycle events of the effect.
- Allows a reducer to populate an Observable of state by responding to lifecycle events.
- Allows for cancelation of in-flight, or queued requests. 

In comparison to `createAsyncThunk` from Redux Toolkit, except concurrency-controlled and cancelable.

# UX Benefits of using a service



# Architectural benefits of using a Service

You'll notice an `@rxfx/service` touches the UI framework in only two places:

1. UI event handlers will make requests of the service, or cancel the work of the service.
1. UI state fields subscribe to each new state of the service.

In both cases: _It is the UI which speaks to the service, not the other way around!_  Each component is generally a source of requests, or a consumer of values. 

Service logic can be independently tested, because it is never dependent on the UI. The result is being able to port the same core code to any Web or Native platform without re-tooling. This also enables continued operation in the face of major-version updates to UI frameworks.

-->

# Examples
The following examples and tutorials will give you a feel for what UX you can build, and the ease of DX you'll find.

## Example: Asynchronous Counter

It doesn't take more than a simple time-delayed async counter to show all the subtleties of async, and how 𝗥𝘅𝑓𝑥 lets you control them:

- [Synchronous Counter](https://codesandbox.io/p/sandbox/7guis-counter-sync-rxfx-service-53wttk) - By having an empty effect, and a reducer that increments the count upon _a request_, this synchronous service has the exact same architecture as an asynchronous one.

- [Asynchronous Counter with loading and cancelability, default concurrency](https://codesandbox.io/p/sandbox/7guis-1-counter-async-rxfx-service-4w82wc). This service shows a loading state, and allows cancelation. It allows multiple increments concurrently, and the reducer increments on the _response_ side of the delay.

- [Asynchronous Counter, queued, with cancel-on-unmount](https://codesandbox.io/p/sandbox/7guis-counter-async-unmount-safe-rxfx-service-j456mr) By simply modifying `createService`  to `createQueueingService`, this service guarantees no more than one increment is in progress at a time. On unmount, all current and queued increments are canceled.

- [Asynchronous Counter, with progress indicator](https://codesandbox.io/p/sandbox/7guis-counter-async-progress-rxfx-service-wr4hhq). By wrapping the handler in `monitorHandler`, we can update the UI with the percent completed, without affecting what's been written previously. Note: this is a compatibility-approach for when an effect doesn't provide its own progress updates - for example any Promise returning function

- [Asynchronous Counter, with cancelable fetch](https://codesandbox.io/p/sandbox/7guis-counter-async-abortable-rxfx-service-ywjvtx) Instead of a mere delay, this service awaits a real `fetch` to a delayed endpoint at httpbin.org. It uses `makeAbortableHandler` to obtain and pass a `signal` that will fully cancel the fetch when the service is told to cancel.

## Examples: 7 GUIs

The counter is one example of the 7 GUIs benchmark for building UI applications. In the 7 GUIs, different frameworks can be compared against how elegantly they solve the building of 7 GUIs of increasing complexity. 

𝗥𝘅𝑓𝑥 has been used to build all 7 GUIs, the counter being the first one. The remaining, with links to live versions are:

- [Temperature](https://codesandbox.io/p/sandbox/7guis-temperature-rxfx-service-1k1dgf). Two-way binding between fields.
- [Flight Booker](https://codesandbox.io/p/sandbox/7guis-flight-rxfx-service-h25v6y) Constraints, validating inputs.
- [Timer](https://codesandbox.io/p/sandbox/7guis-timer-rxfx-service-tyty4i) Concurrency, competing user/signal interactions, responsiveness.
- [CRUD](https://codesandbox.io/p/sandbox/7guis-5-crud-rxfx-service-mgzcxx) Managing a list, mutation.
- [Circles](https://codesandbox.io/p/sandbox/7guis-6-circles-rxfx-bus-d8jppt) Canvas drawing, modal interaction
- [Spreadsheet](https://codesandbox.io/p/sandbox/7guis-cells-rxfx-bus-m98c5p) Change propogation, a mini-language the user can input.

# Concurrency Modes

Race conditions are terrible losses of productivity which are easily prevented when code is set to run in the correct Concurrency Mode for its use case. With 𝗥𝘅𝑓𝑥, its easily named and tested modes (which use RxJS operators underneath) allow you to keep your code readable, and you can eliminate race conditions in a 1-line code diff.

The modes, pictorially represented here with use cases and descriptions, are utilized just by calling `createService`, `createQueueingService`, `createSwitchingService`, or `createBlockingService` accordingly. Your effect stays the same, only the concurrency is different.

Choose your mode by answering this question:

_If the effect is running, and a new request arrives, should the service:_

- Begin the new effect at once, allowing both to finish in any order. (`createService`)
- Begin the new effect only after any currently running effects, preserving order. (`createQueueingService`)
- Prevent/throttle the new effect from beginning. (`createBlockingService`)
- Cancel the currently running effect and begin the new effect at once. (`createSwitchingService`)

And one final mode, seldom used, but included for completion:

- Cancel the currently running effect, and don't begin a new effect. (`createTogglingService`)

Here are representations of each mode:

![immediate mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-immediate-sm.png)
![queueing mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-queueing-sm.png)
![switching mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-switching-sm.png)
![blocking mode](https://d2jksv3bi9fv68.cloudfront.net/rxfx/mode-blocking-sm.png)


# Resources

For more information about what went into 𝗥𝘅𝑓𝑥, the following are great reads.

- [CQRS](https://en.wikipedia.org/wiki/Command%E2%80%93query_separation) - The architectural separation that makes 𝗥𝘅𝑓𝑥 possible
- [RxJS](https://rxjs.dev) - the awesomely-capable async library that 𝗥𝘅𝑓𝑥 is built from, and neatly abstracts away for most use cases.
- [Ember Concurrency](https://ember-concurrency.com/docs/task-concurrency) - The most elegant API to concurrency the EmberJS universe ever produced, and which inspired 𝗥𝘅𝑓𝑥.

---

# More Examples

## Example Application - API Data Fetcher
With concurrency, cancelation, animation, user feedback, and other best UX practices.
[CodeSandbox](https://codesandbox.io/s/rxfx-service-cat-fetcher-nweq0h)

![](https://s3.amazonaws.com/www.deanius.com/rxfx-data-fetcher-static.png)

## Example Application - Alarm Clock

Here we build an Alarm Clock _(of a variety you may already know!)_ . Pushing a time/set button down is the request, and the responses are all the updates of hour or minute we get from the H or M keypress events.

![](https://d2jksv3bi9fv68.cloudfront.net/rxfx/alarm_clock.jpg)

Because 𝗥𝘅𝑓𝑥 ensures your services don't depend upon your view, you can port the same service to any UI framework, Web or Native, trivially. These ports of the Alarm Clock to major UI frameworks took under half an hour each to do:

 - React [Code Sandbox](https://codesandbox.io/s/rxfx-bus-alarm-clock-react-sesc51)
- Angular [Code Sandbox](https://codesandbox.io/s/rxfx-service-alarm-clock-angular-sdenc1)
- Svelte [Code Sandbox](https://codesandbox.io/s/rxfx-service-alarm-clock-svelte-d0bejx)
- Vue [Code Sandbox](https://codesandbox.io/s/rxfx-service-alarm-clock-vue-hk916l)