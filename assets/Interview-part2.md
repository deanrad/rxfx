---
title: Excellent Effect Management in React with 𝗥𝘅𝑓𝑥 and RxJS 
published: false
description: 
tags: rxjs, rxfx, javascript, react
cover_image: https://images.unsplash.com/photo-1574720187210-421b34c9cf01?ixlib=rb-1.2.1&raw_url=true&q=80&fm=jpg&crop=entropy&cs=tinysrgb&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1064

# Use a ratio of 100:42 for best results.
# published_at: 2023-02-22 16:27 +0000
---

In [Part 1](https://dev.to/deanius/how-an-interview-convinced-me-to-use-an-event-bus-for-rxjs-in-react-396l), I'd shared an interview that opened my mind to how, and why, to use 𝗥𝘅𝑓𝑥 in React. 

In this final installment part we take the UX of the Cat Fetcher to the extreme by adding these features:

- Preload images as a chained part of the `gifService`.
- Cancel an image preload when canceled.
- Send out Analytics events, without coupling to existing code.
- Apply a timeout to the Ajax load and overall load. 
- Pad the loading spinner to a minimum duration.

We'll even build a cancelable image preloader along the way. So let's dive right in!

---

## Chained Loading Of the Image Bytes

There was an issue with our service. `isActive` would become `false` at the time where we knew the URL of the cat image-  but didn't yet have its bytes:

![loading indicator analysis](https://s3.amazonaws.com/www.deanius.com/cat-loading-analysis.jpg)

This led to the loading indicator turning off, and the UI looks like it's doing nothing - until the image bytes arrive. And that image could take a while to load, if over a slow pipe!

![template with loading state, with delay](https://s3.amazonaws.com/www.deanius.com/cat-loading-delay.gif)


## Image Preloading

This old trick always worked to preload an image:

```js
function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.src = url;
  });
}
```

This is a Promise-returning function that resolves (with the img `url`) only once the image has loaded. Perfect! But how would we chain/compose that with the Observable? Simple - one line, like this:

```diff
  return
     ajax.getJSON("https://api.thecatapi.com/v1/images/search", {...})
     .pipe(
        map((data) => data[0].url),
+        mergeMap(preloadImage)
     );
```

Perfect! We've used the fact that a function which returns `Promise<string>` can be composed onto an Observable with `mergeMap` - because a `Promise<string>` is a subset of an `ObservableInput<string>`. That's all we needed.

But for comparison purposes, and to get ready for cancelation, let's return an Observable instead:

```js
function preloadImage(url) {
  return new Observable((notify) => {
    const img = new Image();
    img.onload = () => {
      notify.next(url);
      notify.complete();
    };
    img.src = url;
  };
};
```

So we change our Promise-returning function into an Observable-returning one - sending out a single `next` notification (like a Promise's singular resolution) - followed by a single `complete` notification. Now we're ready for cancelation.

## Cancelation

This chaining, or 'composition', is convenient, but not yet optimal. If a cancelation occurs while the image bytes are loading  - the loading of the image itself is not canceled. 

![not canceled](https://camo.githubusercontent.com/848f567ba25b79138ef70b1d7c7139645544ee3fc617d7adc13ffc4ddd0db617/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f7777772e6465616e6975732e636f6d2f6361742d726571756573742d32782d756e6d6f756e742d776974682d6c65616b732e676966)

The strength of the Observable is you can define one with any arbitrary cleanup/cancelation logic. For example, we started loading the gif into the DOM when we set the `src` property of an Image element. We could cancel the DOM's loading by switching the `src` property to an image that doesn't need downloading. The DOM would then cancel itself..

Lastly return a cancelation function:

```diff
function preloadImage(url) {
  return new Observable((notify) => {
    const img = new Image();
    img.onload = () => {
      notify.next(url);
      notify.complete();
    };
    img.src = url;
+
+   return () => img.src = "data:image/gif;base64,R0lGOD...Ow==";
  };
};
```

Now, even when cancelation occurs during image bytes downloading, the Observable teardown can stop it mid-request! Cool and performant!

![Cancelable Image Download](https://camo.githubusercontent.com/9ba133a6ba0b9fd0577fdadb87e43d0dc7e25ebf11fe8f63ef3bb7088f69478a/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f7777772e6465616e6975732e636f6d2f6361742d696d6167652d726571756573742d756e6d6f756e742d63616e63656c2d73746174657265636c61696d2e676966)

## Other Subscribers - Analytics

Now, a request arrives that we log clicks to the Analytics Service whenever the Fetch Cat button is pressed.

You might be wondering now whether the UI `onClick` handler, or the `gifService` Observable ought to change. 𝗥𝘅𝑓𝑥 says - change neither, they're done already! 

Handle it by observing the service's requests, and firing off there:


```js
const analyticsSender = gifService.observe({
  request(){ logAnalytics('fetch cat clicked') }
})
// to turn off
// analyticsSender.unsubscribe();
```

For light-weight fire-and-forget functions you don't need to chain or concurrency-control, this mechanism will decouple sections of your codebase, and allow you to keep the code intact (and tests!) of existing components.

## Timeouts

Users don't want to wait forever without feedback, and even a spinner gets old. In [this post](https://dev.to/deanius/the-thresholds-of-perception-in-ux-435g), I set out some thresholds that are handy to reference in timing constants - they are published in the `@rxfx/perception` library. Whatever values we choose, we need to pass them into code somewhere, and there are a few places this may happen.

For the AJAX to get the URL of the next cat image, we can specify a timeout directly in its options:

```diff
function fetchRandomGIF() {
  return ajax({
    url: "https://api.thecatapi.com/v1/images/search",
+    timeout: TIMEOUTS.URL
  }).pipe(
```

The `gifService` will trigger a `gif/error` to the bus if it fails to get the url within that timeout. 

But we must ask if overall our `gif/request` handler might exceed the user's patience. For that, we can wrap the handler in a `withTimeout` modifier from `@rxfx/service`.

```diff
export const gifService = createQueueingService(
  "gif", // namespace for actions requested,started,next,complete,error,etc
  bus, // bus to read consequences and requests from
-  fetchRandomGIF,
+  timeoutHandler({ duration: TIMEOUTS.OVERALL }, fetchRandomGIF),
  (ACTIONS) => gifReducer(ACTIONS) // the reducer to aggregate non-transient state
);

```

This way, our `gif/error` bus message and `currentError` property of the service will contain information about the timeout.

## Fine-Tune Timing

So we handled what happens when the connection is too slow - and we ensured that users get feedback rather than wait forever. But can it ever trouble users if their connection is too fast? Imagine - a user performs 3 quick clicks to queue up 3 kitty downloads - and they could be displayed, and gone before they have a chance to be admired if they download too fast. Here we can pad the download with just another RxJS operator:

```diff
function fetchRandomGIF() {
  return ajax({
    url: "https://api.thecatapi.com/v1/images/search",
    timeout: TIMEOUTS.URL
  }).pipe(
    mergeMap(preloadImage),
+   padToTime(TIMEOUTS.KITTY_MINIMUM)
  )
}
```

While we may decide this amount of padding isn't necessary in every app, for these cute kitties it's probably worth it 😀 🐈 The lesson, of course, is that any RxJS or 𝗥𝘅𝑓𝑥 operator can be used to modify timing with usually no change to surrounding code - whether it's for timeout or time padding. This lets our UX be more intentional in its experience, and less vulnerable to random network conditions.

----

## Conclusion

If there's one thing this code example showed, it's that there's never anything as simple as 'async data fetching'. Timing, timeouts, cancelation, and chained and related effects are requirements that swiftly come on the heels of making a simple `fetch`. Excellence in UX depends upon handling these 'edge cases' in the very core of your product.

𝗥𝘅𝑓𝑥 has the features you need so that the app can scale in functionality without ballooning in complexity.