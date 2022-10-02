# 𝗥𝘅𝑓𝑥 `service`

A typesafe, concurrency-controlled, stateful service over an `@rxfx/bus`. Part of the 𝗥𝘅𝑓𝑥 family of libraries.

Going on a normal bus listener, a **Service**:

- Turn errors into events, rescuing them
- Has a naming convention for events
- Allows a reducer to populate an Observable of state
- Has an Observable of whether a request handling is active
- Allows for cancelation of in-flight, or queued requests

In comparison to `createAsyncThunk` from Redux Toolkit, except concurrency-controlled.

# Benefits of using a service

You'll notice an `@rxfx/service` touches the UI framework in only two places:

1. UI event handlers will make requests of the service, or cancel the work of the service.
1. UI 'live' state fields subscribe to each new state of the service.

In both cases: _It is the UI which speaks to the service, not the other way around!_ 

This keeps our service logic code from being dependent on the UI - it inverts the dependency. The result is being able to port the same core code to any Web or Native platform without re-tooling. This also enables continued operation in the face of major-version updates to UI frameworks.
Fields `state` and `isActive` are explicit Observables which can be consumed in your UI framework:

# Example Application - Alarm Clock
The following application is an Alarm Clock _(of a variety you may already know!)_ built in an `@rxfx/service`, with [this statechart](https://s3.amazonaws.com/www.deanius.com/rxfx-alarm-clock-xstate.png) modeling its flow.


Now here it is live, running a demo upon reload, and interactive for you:

<iframe src="https://codesandbox.io/embed/rxfx-service-alarm-clock-vue-hk916l?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="rxfx/service alarm clock - Vue"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>


# Alarm Clock ports

These ports took under half an hour each to do - they have only to integrate with the framework at event handlers and state subscription!

 - React
[Code Sandbox](https://codesandbox.io/s/rxfx-bus-alarm-clock-react-8or1oq)
- Angular [Code Sandbox](https://codesandbox.io/s/rxfx-service-alarm-clock-angular-sdenc1)
- Svelte [Code Sandbox](https://codesandbox.io/s/rxfx-service-alarm-clock-svelte-d0bejx)
- Vue [Code Sandbox](https://codesandbox.io/s/rxfx-service-alarm-clock-vue-hk916l)