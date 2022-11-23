# 𝗥𝘅𝑓𝑥 `after`

A hybrid of Promise and Observable, useful for introducing delays, or creating scripts of delays, which are cancelable or `await`-able. Part of the [𝗥𝘅𝑓𝑥](https://github.com/deanrad/rxfx) family of libraries.

`after` makes common use-cases of deferred values and function calls more readable, and works in an Observable or Promise context (eg with `await`).


Call styles
- `after(0, value)`
- `after(N, value)`
- `after(N, ()=>value)) `
- `after(N, Observable))`         
- `after(Promise, ()=>value))`
- `after(Promise, ()=>value, { unsubscribe(){ console.log('canceled'); })`
- `after(setTimeout, ()=>value))`

Behaviors:
Assuming `const fn = ()=>value;`

- `after(0, value).subscribe(next: console.log)`
  - Logs `value` synchronously
- `const result = await after(N, value)`
  - Populates `result` with `value` after `N` milliseconds
- ` const result = await after(N, fn)`
  - Invokes synchronous `fn` and populates `result` with `value` after `N` milliseconds
- `after(N, obs:Observable))`         
  - Creates an `AwaitableObservable` whose notifications _and_ subscription are delayed by `N`. Note this differs from `obs.pipe(delay(N))` which delays only notifications.
- `after(promise, fn))`
  - Creates an `AwaitableObservable` of the invocation of `fn` with the resolution of `promise`. But it is cancelable: `after(Promise.resolve(), console.log).subscribe().unsubscribe()` will not invoke `console.log`.
- `after(setTimeout, fn))`
  - Invokes `fn` ala `setTimeout(fn, 0)` to schedule `fn()` on the macro-task queue. 
- `after(..., { unsubscribe(){ console.log('canceled'); })`
  - Invoke a callback f the subscription of the `after` has its `unsubscribe()` method called: 
  - `const sub = after(...).subscribe(); /* later */ sub.unsubscribe();`

`after` also re-exports `concat` from RxJS, so several `after`s can be sequenced:

```js
concat(
  after(0, () => console.log("started")),
  after(250, () => console.log("complete"))
).subscribe();
console.log("work is in progress")

// "started"               // synchronously
// "work is in progress" 
// "complete"              // after 250 msec
```

## Details

Technically, `after` returns an Observable with both `subscribe` and `then` methods on it, meaning it acts as either a Promise or an Observable! We call this type `AwaitableObservable`, and when awaited, it resolves to the `firstValueFrom` of the Observable.

Keep in mind, however, that since it is an Observable underneath, it is _lazy_. Unless you call `subscribe` or `then`, a function arg passed to it will _not_ be invoked. Think of `after` as creating an _unstarted process_ for a zero or a non-zero delay. And which produces a return value, not only calling a function.

`await after(100, ()=>console.log('done'))` _will_ work however, because of the `.then` method.

A subscription to `after(..)` is of course cancelable, so the latter part can remain un-invoked. This benefit is only available with `.subscribe()`, not with `await`.

## Where Is it Most Useful

Mock behavior - in Storybook, tests, etc. If you have a system that depends on async values, you can swap in an `after`-returning function for either a Promise-returning or Observable-returning function.

For example, in this example of a batch-lookup script, you can approximate the timing with an `after`, and in tests, then switch to a real endpoint, and the timing and sequencing will work the same, _guaranteed_.

```js
const mockLookup = id => after(1000, ()=>({id, username: 'foo'}));
const realLookup = id => fetch(`/someurl?id=${id}`).then(r=>r.json())

const idsToProcess = [1,2,3...];
const process = from(idsToProcess).pipe(
  concatMap(mockLookup),
  // concatMap(realLookup),
  tap(console.log)
);
const execution = process.subscribe({complete(){ console.log('done') });
// execution.unsubscribe()  // if you need to cancel
```

## 3rd argument - Observer

You can pass an Observer as the 3rd argument. This is most useful for detecting when the `after` is canceled.

```js
after(
   Promise.resolve(),
   () => console.log("complete"),
   { unsubscribe(){ console.log("canceled")} }
)
 .subscribe()  
 .unsubscribe();

// "canceled"
```
