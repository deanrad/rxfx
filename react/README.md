# 𝗥𝘅𝑓𝑥 — `@rxfx/react`

An insanely good utility for readable React. Part of the [𝗥𝘅𝑓𝑥](https://github.com/deanrad/rxfx) family of libraries.

TL;DR `useService` is analgous to Apollo Client's `useQuery` hook, but for any async effect, not just GraphQL calls. You don't need to write explicit loading state variables, and the service allows for cancelation and error tracking.

```ts
// Apollo style — fetches automatically, deduping fetches
const { data, loading, error } = useQuery(GET_DATA);

// RxFx style — fetches when you call dataService.request())
const { state, isActive, currentError } = useService(dataService)
```

_Note: See [`@rxfx/service`](https://github.com/deanrad/rxfx/tree/main/service) for more on what a service is, which you will probably use with this library._

# For What?

Let's face it - effect execution in React sucks. Between the React core team advising against using `useEffect` ([link](https://react.dev/learn/synchronizing-with-effects#you-might-not-need-an-effect)), strict mode executing your effects twice, and the inherent complexity of managing loading states, errors and cancelation, it's enough to make you want to throw up your hands. Until now.

The `useService` hook from `@rxfx/react` lets you define a Service (from `@rxfx/service`) that wraps any async function, and brings all of the features you tend to need with an async function, without having to code them yourself:

 - State tracking of effect results, errors, requests and all combinations
 - Loading indicators synced to the effect itself
 - Incremental progress notifications
 - Timeouts
 - Cancelation of in-flight effects
 - Concurrency control to skip new executions or cancel old
 
 Compare any React invocation of a Promise-returning function with `useEffect` with a `useService` call and you'll see usually _half of the code_, with fewer edge cases, and an easy growth path to adding new features like cancelation, or progress reporting as the needs arise.

In short, an 𝗥𝘅𝑓𝑥 service provides a separation that keeps your components simple, and your async effects testable. And `useService` is the way to bring the service into your component.

 # What's inside?


### useService
`useService(service: Service)` - helps consume a `@rxfx/service` by syncing its `state` and `isActive` Observables with React component state. 

Example: [CodeSandbox](https://codesandbox.io/p/sandbox/7guis-1-counter-async-rxfx-service-4w82wc)

```js
// A service to count asynchronously
const asyncCounter = createService(
  "count",
  bus,
  () => after(1000),
  ({ isResponse }) => (count=0, event) => {
    return isResponse(event) ? count + 1 : count
  }
);

// A component using the service for state, activity tracking
export const Counter = () => {
  const { state: count, isActive } = useService(asyncCounter);
  const buttonLabel = isActive ? "⏳" : "Increment";

  return (
    <div>
      <h1> Count is {count} </h1>
      <button onClick={() => asyncCounter.request()}>
        {buttonLabel}
      </button>
    </div>
  );
};
```

### useWhileMounted
A readable version of `useEffect(fn, [])` that works with RxJS Subscriptions and Observables as well as React style.

```ts
// Canceling any service calls on unmount
useWhileMounted(() => {
  return () => countService.cancelCurrent()
})

// React style, for compatibility
useWhileMounted(() => {
  console.log('mount')
  return () => console.log('unmounted')
})

// With an RxJS Observable
useWhileMounted(() => {
  return new Observable(() => {
    console.log('mount')
    return () => console.log('unmounted')
  })
})

// With an RxJS Subscription 
useWhileMounted(() => {
  console.log('mount')
  return new Subscription(() => console.log('unmounted'))
})


```

### useSubject
Exposes each latest value of an RxJS `BehaviorSubject` to React, rerendering when it changes.

```tsx
let i=0;
const countSubject = new BehaviorSubject(0);

function CounterButton() {
  const count = useSubject(countSubject)
  return <Button onClick={() => countSubject.next(i++)}>
    { count }
  <Button>
}
```

See this [CodeSandbox](https://codesandbox.io/p/sandbox/rxfx-react-use-subject-w6sxf9) for how `useSubject` can reduce component coupling, much like Signals.

### useStableValue
Equivalent to `useMemo(producer, [])``. Makes the stability more readable.

```ts
function Wordle() {
  const wordList = useStableValue(() => createWordList())
  // ... render ...
}
```

`useStableValue` should only be used in cases when you need to close over something in React.
Otherwise, prefer to use a static import:

```ts
// wordList.ts
export const wordList = createWordList();

// component
import { wordList } from './wordList'
function Wordle() {
   // ... render ...
}
```

### useStableCallback
Equivalent to `useCallback(producer, [])`. Makes the stability more readable.

```ts
const sendAnalytics = useStableCallback(() => sendPing());
```


### useObservable
Exposes each latest value of an RxJS `Observable` to React, rerendering when it changes, subscribing on mount, and unsubscribing on unmount.

### useMyMountEvent
Returns a stable Promise for when a component has mounted, suitable for passing down to child components.