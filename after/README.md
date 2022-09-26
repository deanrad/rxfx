# 𝗥𝘅𝑓𝑥 `after`

An insanely utility for introducing delays, or creating scripts of delays. Part of the [𝗥𝘅𝑓𝑥](https://github.com/deanrad/rxfx) family of libraries.

- `after(0, value)`
- `after(N, value)`
- `after(N, ()=>value))`
- `after(N, Observable))`
- `after(Promise, ()=>value))`
- `after(Promise, ()=>value))`

`after` returns an Observable that you can use in a context expecting a Promise because it has a `then` method for the first value of the Observable.