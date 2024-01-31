# Enhancing Usability For Older Users

## For JavaScript developers who code for older or special-needs users.

^ Even with accessibility issues fully addressed in an app or site, there are often usability issues that bother older users, particularly. We recognize and admit they can be issues, but with today's tools, implementing all of them feels almost too challenging. Let's see how we can easily help those who are easily-confused, or on underpowered Consumer Cellular devices - in short, let's help Grandma be able to use our apps!

---

Problems:

- Usability issues are Magnified
- Framework support for usability principles is absent.
- It's not that we don't want to do these things - but it's not easy with current tools.

![right fit](https://d2jksv3bi9fv68.cloudfront.net/kitty-factory-mom.png)

---

<!--
# Interaction Design

> Interaction Design focuses on the interactive behaviors of an app - like displaying loading and error states, progress and activity indicators, and animation.

---

# TL;DR Transparency, Robustness, Efficiency!

---

# 5 Principles of Interaction Design

- Acknowledgement: So the user feels a sense of Progress.
- Animation: So the user feels a sense of continuity.
- Concurrency: So the user feels the app is robust.
- Cancelation: So the user can change their mind.

---
-->

# Example - Kitty Factory ([Live](https://codesandbox.io/s/rxfx-service-example-kitty-factory-initial-8cqsdd))

![right fit](https://d2jksv3bi9fv68.cloudfront.net/kitty-factory-intro-no-cancel.png)

---

# Example - Kitty Factory - Issues!

- Acknowledgement Of Button Press (Activity, Animation)
- Double-taps / Race Conditions (Concurrency)
- Get Stuck or Waste Resources (Cancelation)

---

# Kitty Factory (w/ Affordances)

- [Live Demo](https://zpgdgg.csb.app/)

---

# Coding Objectives

- Use `@rxfx/*` packages for easy, configurable effects. (PureJS, framework-independent)
- Use Observables (RxJS) to create and sequence cancelable behaviors-over-time.
- Use published constants to represent user-centered time durations.
- Implement cancelation 'transparently'.

---

# Issue #1 - No Activity Indicator ⏳

## The `{ isActive }` property of `@rxfx/service`

^ If my mom doesn't see a button react upon a press - should she press it again?

---

# `@rxfx/service` Architecture

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
export const gifService = createService(
  "gif", // namespace for actions requested,started,next,complete,error,etc
  bus, // bus to subscribe and publish to
  fetchRandomGIFPromised, // the Promise-or-Observable-returning effect function
  (ACTIONS) => gifReducer(ACTIONS) // the reducer for accumulating state across events
);

// Bonus:
bus.spy(console.log);
```

---

## Use an Effect Function

```ts
function fetchRandomGIFPromised(): Promise<string> {
  return fetch("https://api.thecatapi.com/v1/images/search")
    .then((res) => res.json())
    .then((data) => data[0].url);
}
```

---

## Use A Reducer for Non-Transient State

```ts
const initialState = { url: "http://somewhere/startup-kitty.png" };

export const gifReducer =
  (ACTIONS) =>
  (state = initialState, e = {}) => {
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

- A duration (`@rxfx/perception`)
- A source of time/animation frames (`@rxfx/animation`)
- An event listener for when to run (`@rxfx/bus`)
- An effect that is scoped to the button's lifetime (`@rxfx/react`)

---

# Kitty Factory Demo - Animating the Button

---

# Kitty Factory Demo - Making the Button Discoverable

---

# Issue #1 Acknowledging Activity/Press - Solved!

---

# Issue #2 - Dead-time during Image Load

^ Will my mom think it's broken if it's not active but still loading?

---

![fit](https://d2jksv3bi9fv68.cloudfront.net/cat-loading-analysis.png)

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
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(url); // <-- the consumer needs the url
    img.src = url;
  });
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

# Queueing?

![right fit](https://d2jksv3bi9fv68.cloudfront.net/cat-queueing-analysis.png)

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

# Prevent double-loading, instead?

- `createQueueingService` => `createBlockingService`
- Block at UI level using `{ isActive }`

---

# Kitty Factory Demo - Queueing Downloads

---

# Issue #3 Solved - The Double Tap Problem!

---

# Issue #4 - Uncancelability

^ On her underpowered Consumer Cellular phone, will long load times be retry-able,
or cancelable?

---

# Cancel on User Button Press - Initiation

```ts
<button onClick={() => gifService.cancelCurrent()}>Cancel</button>
```

_* Cancelation requires the service handler return an Observable_

---

# Issue 4.1 - Cancel during search

---

# Cancelation - Abortable-Promise style
```js
import { makeAbortableHandler } from '@rxfx/ajax';
import { createService } from '@rxfx/service';

function fetchRandomGIF(_req, signal) {
  return fetch("https://api.thecatapi.com/v1/images/search", { signal })  /* <<<<< */
    .then((res) => res.json())
    .then((data) => data[0].url);
}

const gifService = createService("gif", bus, makeAbortableHandler(fetchRandomGIF));

```

---

# Demo - Cancelation During Search

---

# Issue 4.2 - Extend Cancelability to image bytes

---

# Cancelation - From a Promise-returning preloader...

```ts
function preloadImagePromised(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(url); // <-- the consumer needs the url
    img.src = url;
  });
}
```

---

# ... To an Observable Preloader !!!

```ts
export function preloadImageObservable(url) {
  return new Observable((notify) => {
    const img = new Image();

    img.onload = () => {
      notify.next(url);
      notify.complete();
    };

    img.src = url;

    return () => {
      img.src = EMPTY_GIF;
    }; // causes browser to cancel the img load!
  });
}
```

---

# Cancelation - Refactor to Observable 

```ts
import { ajax } from "rxjs/ajax"; // cancelable version of fetch

function fetchGIF() {
  return ajax({
    url: "https://api.thecatapi.com/v1/images/search",
    method: "GET",
  }).pipe(
    map((r) => r.response[0].url)
  );
}

const gifService = createQueueingService("gif", bus, fetchGIF);
```


---

# Cancelation - Chain in Preloader

```js
import { ajax } from "rxjs/ajax"; // cancelable version of fetch

function fetchGIF() {
  return ajax({
    url: "https://api.thecatapi.com/v1/images/search",
    method: "GET",
  }).pipe(
    map((r) => r.response[0].url),
    mergeMap(preloadImageObservable) /* <<<<<<<< */
  );
}

const gifService = createQueueingService("gif", bus, fetchGIF);
```

---

# Kitty Factory Demo - Cancel Through Image Bytes

---

# Issue 4.3 - Cancel on Unmount 

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

# Issue 4.4 - Cancel on Timeout 

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

# Issue #4 Solved - Uncancelability!

---

# Issue #5 - Animate Slide Transition

^ Would it be more calming and soothing if the images slid out ?

---

# Non-Animated Slide Transition

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

# Animated Transition, No Concurrency

```js
export const Figure = ({ url }) => {
  const [currentURL, setCurrentURL] = useState(url);

  useEffect(() => {
    if (url !== currentURL) {
      /************ BEGIN ANIMATION ************/
    }
  }, [url]);

```

---

# Kitty Factory Demo - Slide Transition No Concurrency

##  [Live](https://codesandbox.io/s/rxfx-service-example-kitty-factory-slider-with-race-condition-4sjkyp)

---

# Slide Transition, Queued

```js
function SlideShow({ url }) {
  useWhileMounted(() =>
    bus.listenQueueing(NEW_SLIDE, ({ payload: url }) => {
      const existing = container.current.lastElementChild;

      return tweenToValue( { x: 0 }, { x: 100 }, 250).pipe(
        tap(({ x }) => {
          existing.style.setProperty("transform", `translateX(-${x}vw)`);
        }),
        finalize(() => {/* remove existing from DOM */})
      );
    })
  );

  return <div ref={container}  id="slide-container">...</div>;
};
```

---

# Issue #5 Solved - Animated Slide Transition!

---

# In Conclusion - We Fixed

- Acknowledgement: So the user feels a sense of Progress.
- Animation: So the user feels a sense of continuity.
- Concurrency: So the user feels the app is robust.
- Cancelation: So the user can change their mind.

---

# Thank You! 🎉

## Sources

- Chat GPT: "What are some UX techniques to help elderly users?"
- [Nielsen Usability Heuristics](https://media.nngroup.com/media/articles/attachments/Heuristic_Summary1_A4_compressed.pdf)
- 𝗥𝘅𝑓𝑥 on [Github](https://github.com/deanrad/rxfx/tree/main/bus)

<!--

# Activity

![inline fit](https://d2jksv3bi9fv68.cloudfront.net/kf-activity-button.png)

---

# Animation

![inline](https://d2jksv3bi9fv68.cloudfront.net/kf-animated-button.gif)

---

# Cancelation

![inline fit](https://d2jksv3bi9fv68.cloudfront.net/kitty-factory-cancel-on-unmount.gif)

---

# Timeouts

![inline fit](https://d2jksv3bi9fv68.cloudfront.net/kf-timeout.png)

---

# Animation - Slide Transition

![inline fit](https://d2jksv3bi9fv68.cloudfront.net/kf-slider.gif)

---

-->
