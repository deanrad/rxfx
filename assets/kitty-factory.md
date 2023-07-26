# Implementing UX to help Elderly Users

## For JavaScript developers who code for elderly or special-needs users.

--- 

Problems:

- Usability Issues are Magnified for the Elderly.
- Framework support for usability principles is absent.
- Code changes are difficult.

---

<!--
# Interaction Design

> Interaction Design focuses on the interactive behaviors of an app - like displaying loading and error states, progress and activity indicators, and animation.

---

# TL;DR Transparency, Robustness, Efficiency!

---

# 5 Principles of Interaction Design

- Acknowledgement: So the user feels a sense of Progress.
- Concurrency: So the user feels the app is robust.
- Cancelation: So the user can change their mind.
- Animation: So the user feels a sense of continuity.
- Errors/Timeouts: So the user retains a sense of control, even with errors.


---
-->

# Example - Kitty Factory ([Live](https://codesandbox.io/s/rxfx-service-example-kitty-factory-initial-8cqsdd))

![right fit](./kitty-factory-intro-no-cancel.png)

---

# Example - Kitty Factory - Issues!

- Acknowledgement Of Button Press (Activity, Animation)
- Dead-time on Image Loading (Sequence Preloading)
- Double-taps / Race Conditions (Concurrency)
- Long load times - not cancelable, or timed out (Cancelabilty, Timeout, Unmounting)
- Discoverability

---
# Finished Product

- Activity Indicator
- Animated Buttons
- Preloaded Images
- Queued Downloads
- Cancelable (by user, unmount, timeout)
- Slide Transitions
- Timeouts

---
# Activity
![inline fit](https://d2jksv3bi9fv68.cloudfront.net/kf-activity-button.png)

---
# Animation
![inline](https://d2jksv3bi9fv68.cloudfront.net/kf-animated-button.gif)

---
# Animation - Slide Transition
![inline fit](https://d2jksv3bi9fv68.cloudfront.net/kf-slider.gif)

---
# Cancelation
![inline fit](https://d2jksv3bi9fv68.cloudfront.net/kitty-factory-cancel-on-unmount.gif)

---
# Timeouts
![inline fit](https://d2jksv3bi9fv68.cloudfront.net/kf-timeout.png)

---

# Coding Techniques (novel, useful ones!)

- Use `@rxfx/bus` and `@rxfx/service` for easy, configurable effects. (Framework agnostic)
- Use Observables (RxJS) to create and sequence behaviors-over-time.
- Use published constants to represent user-centered time durations.
- Implement cancelation 'transparently'

---
# Issue #1 - No Activity Indicator ⏳
## The `{ isActive }` property of `@rxfx/service`

^ If my mom doesn't see a button react upon a press - should she press it again? 


---

#  `@rxfx/service` Architecture
![inline fit](https://d2jksv3bi9fv68.cloudfront.net/KittyFetcherGraph.png)

---

## The `.isActive` property

```ts
import { useService } from "@rxfx/react";
import { gifService } from "./services/gifService";

export function NextCatButton() {
  const { isActive } = useService(gifService);
  return (
    <button
      onClick={() => gifService.request()}
    >
      {isActive ? "Fetching." : "Next Cat >>️"}
    </button>
    <HourglassSpinner show={isActive} />
  );
}

export function App() {
  const { state: { url } } = useService(gifService);
  return ...
      <Figure url={url} />
      <NextCatButton/>
}
```

---
## Service: An API to an Effect and its State

```ts
import { createService, createQueueingService } from "@rxfx/service";
import { defaultBus as bus } from "@rxfx/bus";
import { gifReducer } from "./gifReducer";

// A service will handle errors, activity, loading, cancelation
// Provides gifService.request(), .isActive and .state Observables
export const gifService = createService("gif", bus,
  "gif", // namespace for actions requested,started,next,complete,error,etc
  bus, // bus to read consequences and requests from
  fetchRandomGIFPromised, // the Promise-or-Observable-returning effect function
  (ACTIONS) => gifReducer(ACTIONS) // the reducer for non-transient state
);

// Bonus: bus.spy(console.log)
```

---
## Use an Effect Function

```ts
function fetchRandomGIFPromised() : Promise<string> {
  return fetch("https://api.thecatapi.com/v1/images/search")
    .then((res) => res.json())
    .then((data) => data[0].url);
}
```

---
## Use A Reducer for Non-Transient State

```ts
const initialState = { url: 'http://somewhere/startup-kitty.png' }

export const gifReducer = (ACTIONS) => (state = initialState, e = {}) => {
  switch (e.type) {
    case ACTIONS.next.type:
      return { ...state, url: e.payload };
    default:
      return state;
  }
};
```

--- 

# Kitty Factory Demo - Activity Indicator

---
# Issue #1.1 - Animating the Button on Press

---

### Animate <NextCatButton/> on `gifService` requests

```ts
const nextCatButton = useRef();

useWhileMounted(() =>
  // listenSwitching acknowledges each click anew
  gifService.bus.listenSwitching(gifService.actions.request.match, () => {
    return bounceInAndOut(1.0, 1.3).pipe(
      tap(({ scale }) => {
        const btn = nextCatButton.current;
        btn.style.setProperty("transform", `scale(${scale})`);
      })
    );
  })
);
```

--- 

# Kitty Factory Demo - Animating the Button

---

# Issue #1 Acknowledging Activity/Press - Solved!

---
# Issue #2 - Dead-time during Image Load

^ Will my mom think it's broken if it's not active but still loading?

---

![fit](./cat-loading-analysis.png)

--- 
# Factor a preloader into `.isActive`

```diff
function fetchRandomGIFPromised() : Promise<string> {
  return fetch("https://api.thecatapi.com/v1/images/search")
    .then((res) => res.json())
    .then((data) => data[0].url)
+   .then(preloadImagePromised)
```

---
# Write the Promise-returning preloader

```ts
function preloadImagePromised(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(url); // <-- the consumer needs the url
    img.src = url;
  })
}
```

---
# Kitty Factory Demo - Preloaded Images

---
# Issue #2 Solved - Preloaded to remove 'dead' time

---
# Issue #3 - Double Taps and Race Conditions

^ If my mom double-taps accidentally (or on purpose), will the result be confusing?



---

# Option 1 - Blocking*
![inline fit](./cat-blocking-analysis.png)

* Can also disable at UI level


---
# Option 2 - Queueing

![inline fit](./cat-queueing-analysis.png)

^ But how hard will it be to add to my code?

---
# Change to Queueing

```diff
- export const gifService = createService("gif", bus,
+ export const gifService = createQueueingService("gif", bus,
  "gif", // namespace for actions requested,started,next,complete,error,etc
  bus, // bus to read consequences and requests from
  fetchRandomGIFPromised, // the Promise-or-Observable-returning effect function
  (ACTIONS) => gifReducer(ACTIONS) // the reducer for non-transient state
);
```

---
# Kitty Factory Demo - Queueing Downloads

---
# Issue #3 Solved - The Double Tap Problem!

---
# Issue #4 - Long, Uncancelable Load Times

^ On her underpowered Consumer Cellular phone, will long load times be retry-able,
or cancelable?

---

# Cancel on User Button Press*

```ts
<button
  onClick={() => gifService.cancelCurrent()}
>
  Cancel
</button>
```

* (Cancelation requires the service handler return an Observable)

---

# Cancel on User Button Press - Observable endpoint
```ts
import { ajax } from "rxjs/ajax"; // cancelable version of fetch

function fetchGIF() {
  return ajax({
    url: "https://api.thecatapi.com/v1/images/search",
    method: "GET"
  }).pipe(
    map((r) => r.response[0].url)
  );
}

// Define the service around this function
const gifService = createQueueingService('gif', bus, fetchAndPreloadGIF)

```

---
# Cancel on User Button Press - Observable Preloader

```ts
export function preloadImage(url) {
  return new Observable((notify) => {
    const img = new Image();

    img.onload = () => {
      notify.next(url);
      notify.complete();
    };

    img.src = url;

    return () => { img.src = EMPTY_GIF }; // causes browser to cancel the img load!
  });
}
```

---
# Cancel on User Button Press - Chain Preloader

```diff
function fetchAndPreloadGIF() {
  return ajax({
    url: "https://api.thecatapi.com/v1/images/search",
    method: "GET"
  }).pipe(
    map((r) => r.response[0].url)
+   mergeMap(preloadImage)
  );
}
```

---
# Kitty Factory Demo - Cancel Button

---

# Canceling at Unmount

```ts
// useWhileMounted is same as useEffect with []
useWhileMounted(() => {
  // trigger demo upon mount
  gifService.request();

  // clean up fully on unmount
  return () => {
    gifService.cancelCurrentAndQueued();
  };
});
```

---
# Kitty Factory Demo - Cancel at Unmount

---

# Canceling on a Timeout (2 Deep Breaths)

```diff
export const gifService = createService(
  "gif", // namespace for actions requested,started,next,complete,error,etc
  bus, // bus to read consequences and requests from
-  fetchRandomGIF,  
+  timeoutHandler({ duration: THRESHOLD.DeepBreath * 2 }, fetchRandomGIF),
  (ACTIONS) => gifReducer(ACTIONS) // the reducer to aggregate non-transient state
);

```

---
# Kitty Factory Demo - Cancel on Timeout

---
# Issue #4 Solved - Long load times - Allow Cancelation

---
# Issue #5 - Did it get my click?

---
# An animation

```ts
```

---
# Kitty Factory Demo - Button Animation

---
# Issue #5 Solved - Animated Button acknowledgement


---
# Issue #6 - Animate Slide Transition

^ Would it be more calming and soothing if the images slid out ?

---
# Non-Animated

```ts
export const Figure = ({ url }) => {
  return (
    <div id="slide-container">
      <div className="slide cat">
        <img src={url} alt="fun cat" />
      </div>
    </div>
  );
};

```

---
# Kitty Factory Demo - Slide Transition

## Find the race condition!

---
# Animated, Queued

```ts

const SlideShow = ({ url }) => {
  useWhileMounted(() =>
    bus.listenQueueing(NEW_SLIDE.match, ({ payload: url }) => {
      // ...
       existing.current.style.setProperty("transform", `translateX(-${x}vw)`);
    })
  );

  return (
    <div id="slide-container">
      <div ref={existing} className="slide cat">
        <img
          src={url}
          alt="fun cat"
        />
      </div>
    </div>
  );
};
```


---
# Issue #6 Solved - Animate Slide Transition

--- 

# In Conclusion - Usability Requires

- Acknowledgement: So the user feels a sense of Progress.
- Animation: So the user feels a sense of continuity.
- Concurrency: So the user feels the app is robust.
- Cancelation: So the user can change their mind.
- Errors/Timeouts: So the user retains a sense of control, even with errors.

---

# Thank You! 🎉

## Sources

- Chat GPT: "What are some UX techniques to help elderly users?"
- [Nielsen Usability Heuristics](https://media.nngroup.com/media/articles/attachments/Heuristic_Summary1_A4_compressed.pdf)
- 𝗥𝘅𝑓𝑥 on [Github](https://github.com/deanrad/rxfx/tree/main/bus)