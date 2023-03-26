# 𝗥𝘅𝑓𝑥 `react`

An insanely good utility for readable React. Part of the [𝗥𝘅𝑓𝑥](https://github.com/deanrad/rxfx) family of libraries.

### useWhileMounted
`useWhileMounted(fn => EffectCallback|Observable|Subscription)` - a readable version of `useEffect(fn, [])` that works with RxJS Observables and Subscriptions too.

### useService

`useService(service: Service)` - helps consume a `@rxfx/service` by syncing its `state` and `isActive` Observables with React component state. 

Example: 

```js
const {request, state, isActive} = useService(someService); 
// then render state and invoke request() to run effects and ultimately change state 
```

### useStableValue
Equivalent to useMemo(producer, []). Makes the stability more readable.

### useStableCallback
 Equivalent to useCallback(producer, []). Makes the  stability more readable.