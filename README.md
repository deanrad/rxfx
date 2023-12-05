# 𝗥𝘅𝑓𝑥

Read the fine docs at: [https://rxfx.gitbook.io/docs/](https://rxfx.gitbook.io/docs/), or in the READMEs of the libraries below.

𝗥𝘅𝑓𝑥 is effect and state management made simple, safe, and framework independent. Implemented as a family of libraries:

- [`@rxfx/service`](https://github.com/deanrad/rxfx/tree/main/service) - UI Framework-independent effect manager and state manager, ala NgRx, Redux Saga, or Redux Toolkit. Execute and cancel effects, and provide reactive state changes on their lifecycle events.

- [`@rxfx/effect`](https://github.com/deanrad/rxfx/tree/main/effect) - UI Framework-independent effect execution, progress notification and cancelation - a subset of `@rxfx/service` focused on effects, not state.

- [`@rxfx/bus`](https://github.com/deanrad/rxfx/tree/main/bus) - A Low-level effect execution and event observation with ordering, concurrency, and error isolation.

- [`@rxfx/react`](https://github.com/deanrad/rxfx/tree/main/react) Hooks for using bus or listeners, or general RxJs Observables inside of React Components.

- [`@rxfx/after`](https://github.com/deanrad/rxfx/tree/main/after) A utility for introducing delays, or creating scripts of delays. 

- [`@rxfx/perception`](https://github.com/deanrad/rxfx/tree/main/perception) - Constants and functions related to human response times and perception thresholds of our various senses.

- [`@rxfx/animation`](https://github.com/deanrad/rxfx/tree/main/fsa) - A TypeScript/Observable version of [TweenJS](https://github.com/tweenjs/tween.js). 

- [`@rxfx/fsa`](https://github.com/deanrad/rxfx/tree/main/fsa) - A re-publish of https://github.com/aikoven/typescript-fsa 

- [`@rxfx/operators`](https://github.com/deanrad/rxfx/tree/main/operators) A collection of supplemental RxJS operators.

- [`@rxfx/ajax`](https://github.com/deanrad/rxfx/tree/main/ajax) `fetchMany` - gives you a Streaming Observable of a plural endpoint (e.g. `users/`) instead of the all-at-the-end delivery of Promises. (Is Cancelable too).

- [`@rxfx/peer`](https://github.com/deanrad/rxfx/tree/main/peer) - Can help a mesh of peers coordinate a single LEAD, even as peers come and go.
