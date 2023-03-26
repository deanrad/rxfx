# 𝗥𝘅𝑓𝑥 `react`

An insanely good utility for readable React. Part of the [𝗥𝘅𝑓𝑥](https://github.com/deanrad/rxfx) family of libraries.

### useWhileMounted
`useWhileMounted(fn => EffectCallback|Observable|Subscription)` - a readable version of `useEffect(fn, [])` that works with RxJS Observables and Subscriptions too.

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

### useStableValue
Equivalent to useMemo(producer, []). Makes the stability more readable.

### useStableCallback
 Equivalent to useCallback(producer, []). Makes the  stability more readable.