---
title: Interview part 2
published: false
description: 
tags: rxjs, rxfx, javascript, react
# cover_image: https://direct_url_to_image.jpg
# Use a ratio of 100:42 for best results.
# published_at: 2023-02-22 16:27 +0000
---

In [Part 1](https://dev.to/deanius/how-an-interview-convinced-me-to-use-an-event-bus-for-rxjs-in-react-396l), I'd had an interview with a developer named Chris that opened my mind to how, and why, to use RxJS in React. In this part I'll explain what I learned about the two most powerful Omnibus-RxJS features- Concurrency Strategies and Cancelation. Both are key for building **U**ser e**X**periences distinguished by their correctness and performance.

## Queue it Up!

We'd built an Image Fetcher like the one below.

![template with cat](https://s3.amazonaws.com/www.deanius.com/cat-success-delay-sm.gif)

I'd innocently asked "How would you handle a click to Fetch Cat while an image was already fetching?". An ordinary answer would have been "Disable the button while a Fetch Cat is in progress". But if I'd learned anything it was that Chris didn't do things the ordinary way!

## Queue it Up!

Chris' reply to my question about an in-progress click was:

_"The Omnibus service has that covered too. Look up `createQueueingService` in the README or docs."_

I found the docs site [Omnibus Docs](https://deanius.gitbook.io/omnibus-documentation/), and saw that services come in 4 main varieties, and one of them was `createQueueingService`. Seemed self-explanatory to me. So I made this change, and then went to try it out..

```diff
-export const gifService = createService(
+export const gifService = createQueueingService(
  "gif",
  bus,
  fetchRandomGIF,
  (ACTIONS) => gifReducer(ACTIONS)
);
```

I clicked on Fetch Cat twice in close succession, and indeed, one cat displayed after the other while I sat back and watched.. Even if errors occurred—as we'd randomly coded them to do—the queue continued happily on!

![cat-queued-service-two-success.gif](https://s3.amazonaws.com/www.deanius.com/cat-queued-service-two-success.gif)

I could see it useful that Omnibus included a Concurrency Strategy like **queueing**. But I couldn't help but wonder, "Is queueing the right strategy for this use case?" I made a note to return to Omnibus' other timing options called [Concurrency Strategies](https://deanius.gitbook.io/omnibus-documentation/fundamentals/concurrency-strategies).

But I had an idea for cancelation too. If cancelation worked well from a button click, could it work transparently on Component unmount?

---

## Cancelation - From Explicit to Implicit

Chris had showed that a cancel button could be created that would call `gifService.cancelCurrent()`. Could we build the cancelation of image retrieval right into the component, so it wouldn't need user interaction to be canceled?

I built a component called an `Unmounter`, which would let me unmount the GIF fetcher while a fetch was in progress, and study the behavior in DevTools.

## Business As Usual: No Cancelation on Unmount

I noticed two things that were sub-optimal:

![inline cat-request-2x-unmount-with-leaks.gif](https://s3.amazonaws.com/www.deanius.com/cat-request-2x-unmount-with-leaks.gif)

1. The bytes of the image continued to load after I unmounted
2. The state of the Cat fetcher seemed to have changed while it was unmounted!

The latter didn't even seem possible, until I remembered that `gifService.state` held the image URL, and it was a static import, living outside of the React tree. So the only real problem was #1 - the XHR wasn't canceled on unmount.

What I wanted was to see a cancelation occur upon unmount. This would guarantee network bandwidth would be saved, and no updates would come through, once unmounted.

Thankfully, this was a light lift. I was able to achieve the below, with only the addition of `useWhileMounted(() => () => gifService.cancelCurrent())`.

![inline cat-image-request-unmount-cancel-statereclaim.gif](https://s3.amazonaws.com/www.deanius.com/cat-image-request-unmount-cancel-statereclaim.gif)

The double arrow-function was just following the `useEffect` syntax to declare a cleanup function, and that's what this was.

Now it seemed Omnibus was doing just as it should. For one cat. Then I tried enqueuing two cats and unmounting. It didn't do as well. I had to dive into the cancelation code of Omnibus-RxJS to understand why..

## How Omnibus/RxJS does Cancelation

In RxJS - there are two ways to do cancelation. The less-preferred way is to work with a Subscription object and call `.unsubscribe()` on it. The more recommended way is to add a `takeUntil` operator into an Observable's pipe. This ensures the criteria for the end of the Observable are defined along with the Observable itself. Inside Omnibus-RxJS were some lines like the following:

```js
// prettier-ignore
export const createQueueingService(namespace, bus, handler) {
    // ...
    bus.listenQueueing(
        ACs.request.match,
        (request) => {
            const wrappedHandler = errorWrap(handler(request));
            return wrappedHandler.pipe(
                takeUntil(bus.query(ACs.cancel.match))
            );
        },
    );
    //...
}
```

I looked up the [RxJS takeUntil docs](https://rxjs.dev/api/operators/takeUntil) , and realized how they applied here.

When you provide `takeUntil` an Observable as its `notifier` argument, the 'outer' Observable is terminated when the `notifier` produces our value. The `notifier` here uses `bus.query` with a predicate that isolates those bus events of `type==='gif/cancel'`. The moment we get one of these, the handling is canceled!

You could explicitly send a cancel action as below, but `cancelCurrent` is usually simpler.

```js
bus.trigger(gifService.actions.cancel()); // also works
```

As I pondered this code, I saw that it was this logic that was the source of the bug: the `gif/cancel` actions can only cancel handlings that have already started! The future-queued handlings don't get the message since they start listening for `gif/cancel` too late!

Like a good Open Source participant, I opened [an Issue](https://github.com/deanrad/omnibus-rxjs/issues/3) on the Omnibus RxJS library.

## Filing an Issue, and an AHA moment:

The issue I wrote was titled:

> `cancelCurrent` does not stop the whole queue - queued handlings beyond the canceled one still run to completion.

Chris must have got a notification about this issue, because a coffee break later and I noticed a new `omnibus-rxjs` release, version **1.1.3** with the comment `createService.cancelCurrentAndQueued()`. ([Commit 604de](https://github.com/deanrad/omnibus-rxjs/commit/604de63dca55ea491b68c445e26974e6b9ca56f1)). It seemed to track every cancelation by incrementing a number in an RxJS subject. Each handling would check to make sure the cancelation number hadn't increased since the request. Looked good to me.. So I changed our unmounting logic slightly to call the new function:

```diff
useWhileMounted(() => {
-  return () => gifService.cancelCurrent();
+  return () => gifService.cancelCurrentAndQueued();
});
```

And voilà, the unmount canceled the one in progress! Also, no additional state changes or network calls were made! When the component was remounted, it was still on the same cat image on the radiator as when it had unmounted.

![inline cat-image-request3x-unmount-cancel-statereclaim.gif](https://s3.amazonaws.com/www.deanius.com/cat-image-request3x-unmount-cancel-statereclaim.gif)

I thought of how lean an app would be if the work of every route would be cleanly shut down, freeing up room for the new route, and reducing race conditions. You could always make exceptions - for example, for an Uploader you could choose to keep it running in the background. But canceling on most routes automatically made a lot of sense to me.

Now, I felt confident I _could_ use **queueing** mode as a Concurrency Strategy, and still have automatic cancelation. But I wasn't content until I investigated alternatives to queueing - what are there?

## Concurrency Strategies

The Omnibus Docs have this image to explain what Concurrency Strategies are possible

![inline strategies](https://s3.amazonaws.com/www.deanius.com/ConcurModes5.png)

They all spoke to what a service does when it's already doing work and a new request comes in.

If you just start eagerly (the top option), you sometimes have stutters or race conditions at the end. But queueing can suffer from a queue being too long! I recognized the **switching** option as one that is useful for typeaheads, so I looked into it.

---

## Switching

Switching stops the in-progress one and begins a new one.

![inline cat-request2x-switching.gif](https://s3.amazonaws.com/www.deanius.com/cat-request2x-switching.gif)

---

![inline cat-switching-analysis.jpg](https://s3.amazonaws.com/www.deanius.com/cat-switching-analysis.jpg)

This was not what I was looking for. Maybe I should just ignore requests to fetch while one is in progress? Like the way my TV remote responds to changing a channel. Or the way an elevator responds to being called to your floor. I wonder what that Strategy is called?

---

## Blocking (aka Modal, Throttling)

I concluded that ignoring a new fetch while one is in progress makes sense to me. This way 'accidental' double-taps by users with less finger control will not result in their confusion - only one update will be done.

It was easy enough to 'block', once I knew the name of the factory. I switched to `createBlockingService`, and wound up with something that felt right for my kind of users.

```diff
-export const gifService = createService(
+export const gifService = createBlockingService(
```

![inline cat-request-2x-blocking.gif](https://s3.amazonaws.com/www.deanius.com/cat-request-2x-blocking.gif)

---

![inline cat-blocking-analysis.jpg](https://s3.amazonaws.com/www.deanius.com/cat-blocking-analysis.jpg)

---

## Ease of Concurrency, Cancelation

Before Omnibus, I never would have explored these concurrency options individually - it was too much work. But when Omnibus made it easy to switch between, I tried more options out, and found what I wanted. And because of the test suite of `omnibus-rxjs` - and the fact that it delegates to the highly tested RxJS operators `switchMap` and friends, I had a high degree of confidence that my changes had no intended consequences.

At this point I was almost ready to recommend that we use Omnibus-RxJS as an effect container. I'd always felt middleware like for Redux 'shoehorned' effect management into state management. Omnibus separated the two again, while preserving cancelation and easy switching of concurrency strategies.

Then I had an idea for a little pet project I'd try tonight, if that went well, I'd recommend the whole team try it!

Stay tuned for that one...
