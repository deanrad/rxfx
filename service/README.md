# 𝗥𝘅𝑓𝑥 `service`

A typesafe, concurrency-controlled, stateful service over an `@rxfx/bus`. Part of the 𝗥𝘅𝑓𝑥 family of libraries.
For help consuming services in React, check out [`@rxfx/react`](https://github.com/deanrad/rxfx/tree/main/react).

# Example Usage

```js
const reducer = (count=0, {type}) => {
  if (type === 'count/next') {
    return count++
  }
  return count;
}

const asyncCounter = createQueueingService<void, void, Error, number>(
  'count', 
  bus, 
  () => after(1000),
  () => reducer
);

asyncCounter(); /* request a count (will complete after 1000 msec) */

asyncCounter.state.subscribe(count:number => /* update your UI state */)
asyncCounter.isActive.subscribe(isActive:boolean => /* update your UI state */)
asyncCounter.responses.subscribe(resp:undefined => /* consume returned values of the effect */)
asyncCounter.errors.subscribe(err:Error => /* consume returned errors of the effect */)

asyncCounter.cancelCurrent() /* cancel the effect - eg upon route change */ 
```

Building upon a normal bus listener, a **Service**:

- Turn errors into events, rescuing them
- Has a naming convention for events
- Allows a reducer to populate an Observable of state
- Has an Observable of whether a request handling is active
- Allows for cancelation of in-flight, or queued requests

In comparison to `createAsyncThunk` from Redux Toolkit, except concurrency-controlled and cancelable.

# Benefits of using a service

You'll notice an `@rxfx/service` touches the UI framework in only two places:

1. UI event handlers will make requests of the service, or cancel the work of the service.
1. UI 'live' state fields subscribe to each new state of the service.

In both cases: _It is the UI which speaks to the service, not the other way around!_ 

This keeps our service logic code from being dependent on the UI - it inverts the dependency. The result is being able to port the same core code to any Web or Native platform without re-tooling. This also enables continued operation in the face of major-version updates to UI frameworks.
Fields `state` and `isActive` are explicit Observables which can be consumed in your UI framework:

# Example Application - API Data Fetcher
With concurrency, cancelation, other best-practices and UX tweaks.
[CodeSandbox](https://codesandbox.io/s/rxfx-service-cat-fetcher-nweq0h)

![](https://s3.amazonaws.com/www.deanius.com/rxfx-data-fetcher-static.png)

# Example Application - Alarm Clock
Though we usually think about Effect Management as calling an endpoint for a single response - in general an effect may deliver multiple events.
This means, instead of returning a Promise from an effect, we can return an entire Observable.

In our alarm clock, pushing a time/set button down is the request, and the responses are all the updates of hour or minute we get from the H or M keypresses.

So this service architecture is very useful. Here we apply it an Alarm Clock _(of a variety you may already know!)_ . [This statechart](https://s3.amazonaws.com/www.deanius.com/rxfx-alarm-clock-xstate.png) models its flow as a statechart, but I think the request-responses model of cause-and-effect is just as effective a model.

![](https://m.media-amazon.com/images/I/71fHRhzQnML._AC_SL1500_.jpg)

Most importantly, because RxFx ensures your services don't depend upon your view, you can port the same service to any UI framework, Web or Native, trivially.

These ports of the Alarm Clock to major UI frameworks took under half an hour each to do - they have only to integrate with the framework at event handlers and state subscription!

 - React [Code Sandbox](https://codesandbox.io/s/rxfx-bus-alarm-clock-react-sesc51)
- Angular [Code Sandbox](https://codesandbox.io/s/rxfx-service-alarm-clock-angular-sdenc1)
- Svelte [Code Sandbox](https://codesandbox.io/s/rxfx-service-alarm-clock-svelte-d0bejx)
- Vue [Code Sandbox](https://codesandbox.io/s/rxfx-service-alarm-clock-vue-hk916l)