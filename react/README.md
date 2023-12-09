# 𝗥𝘅𝑓𝑥 — `@rxfx/react`

An insanely good utility for readable React. Part of the [𝗥𝘅𝑓𝑥](https://github.com/deanrad/rxfx) family of libraries.

TL;DR `useService` is analgous to Apollo Client's `useQuery` hook, but for any async effect, not just GraphQL calls. It provides state, activity indication, and error reporting in one hook call, compared to making and syncing several state variables. While State machines or `useReducer` can help synchronize bundles of state variables, they don't also help with effect execution.

# For What?

Let's face it - effect execution in React sucks. Between the React core team advising against using `useEffect`, strict mode executing your effects twice, and the inherent complexity of managing loading states, errors and cancelation, it's enough to make you want to throw up your hands. Until now.

The `useService` hook from `@rxfx/react` lets you define a Service (from `@rxfx/service`) that wraps any async function, and brings all of the features you tend to need with an async function, without having to code them yourself:

 - State tracking of effect results, errors, requests and all combinations
 - Loading indicators synced to the effect itself
 - Incremental progress notifications
 - Timeouts
 - Cancelation of in-flight effects
 - Concurrency control to skip new executions or cancel old
 
 Compare any React invocation of a Promise-returning function with `useEffect` with a `useService` call and you'll see usually _half of the code_, with fewer edge cases, and an easy growth path to adding new features like cancelation, or progress reporting as the needs arise.

 # What's inside?


### useService
`useService(service: Service)` - helps consume a `@rxfx/service` by syncing its `state` and `isActive` Observables with React component state. 

Example: [CodeSandbox](https://codesandbox.io/s/rxfx-react-counter-example-lfgxfm)

```js
// A framework-free, pure-JS reducer
const reducer = (count = 0, e = {} as Action<any>) => {
  if (e.type === "count/next") {
    return count + 1;
  }
  return count;
};

// A service to tie the reducer to an async effect
const asyncCounter = createService(
  "count",
  bus,
  () => after(1000),
  () => reducer
);

// A component using the service for state, activity tracking
export const Counter = () => {
  // useWhileMounted(fn) equals useEffect(fn, []);
  useWhileMounted(() => {
    asyncCounter.request();
  });

  const { state: count, isActive } = useService(asyncCounter);
  const buttonLabel = isActive ? "⏳" : "Increment";

  return (
    <div>
      <h1> ⚛️ Count is {count} </h1>
      <button onClick={() => asyncCounter.request()}>
        {buttonLabel}
      </button>
    </div>
  );
};
```

### useWhileMounted
`useWhileMounted(fn => EffectCallback|Observable|Subscription)` - a readable version of `useEffect(fn, [])` that works with RxJS Observables and Subscriptions too.

### useStableValue
Equivalent to useMemo(producer, []). Makes the stability more readable.

### useStableCallback
Equivalent to useCallback(producer, []). Makes the  stability more readable.

### useSubject
Exposes each latest value of an RxJS `BehaviorSubject` to React, rerendering when it changes.

### useObservable
Exposes each latest value of an RxJS `Observable` to React, rerendering when it changes, subscribing on mount, and unsubscribing on unmount.

### useMyMountEvent
Returns a stable Promise for when a component has mounted, suitable for passing down to child components.