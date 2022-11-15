---
title: The Radcliffe Concurrency Model
published: true
description: A universal way of understanding how a computer resource—or person—can respond to interruption.
tags: rxjs, rxfx, concurrency, javascript
cover_image: https://images.unsplash.com/photo-1502144696405-e84600828d73?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80
---

TL;DR The Radcliffe Concurrency Model is a way of understanding how a computer resource, or person responds to an interruption, which will help us understand multitasking in programming, and in life.

![The Radcliffe Model of Concurrency](https://s3.amazonaws.com/www.deanius.com/RadcliffeConcurrencyModel.png)

Interruptions are a fact of life. Nobody has the luxury of being able to single-task on each thing they start until its sweet completion. No— life is more like this: 

- Kid: "Dad, I want a grilled cheese, please."
- Dad: _starts making a grilled cheese sandwich..._
- Kid: "Dad, can I have chicken nuggets?"

When we ask what we would do as the dad, we are considering which one of our **Concurrency Strategies** should we use? We'll list these out shortly. But first - notice that although everyone makes these strategy choices - _nobody can quickly list what all the choices are!_ It's like we haven't studied this problem space well enough to pin down the options.

So we'll list the options-but first we'll see how much we need them, and how widely they apply, for developers and humans alike :)

## A Lack of Shared Vocabulary Weighs Us Down

If you do something alot, it pays to have concise words to describe it. Some languages have many words for rain or snow or love. Resource schedulers like us need better conceptual tools as well.

What I find today is that async programs —and the humans that make them— do **not** currently reflect the awareness of these modes. They seem to be a mix of defaulting into a strategy like **Immediate** , or using only what's _easiest_ in the features of our programming tools. But now, to be able to make clear, tiny-sized changes that fix timing behavior _declaratively_ is a game changer.

## Interruptions Affect Computers, UX and People

Computers too must decide what to do when they are busy and get a new request. A chain of coffeehouses has a Dropbox into which each coffehouse uploads its daily transactions as a CSV file. The server is now processing a file of 500 transactions, and a new, different file from the same coffeehouse gets dropped there. What should the server do?

In User Interface / UX these strategies must be chosen and used everywhere! A user begins one download while already downloading another. Or a Ring notification sound is triggered but another just started. Or a like button is clicked twice, or two like buttons in close succession. Or a remote control is slow to respond and you press the button again. _What should the app do?_

Front-end development, back-end development, and every person you know depends upon selecting good Concurrency Strategies. Then, why don't we know what they are? Is there a listable set? There is, and the Radcliffe Model of Concurrency makes them available for our understanding, so that we can choose the correct one for each UX, or life situation.

_(Also a JavaScript library [𝗥𝘅𝑓𝑥](https://github.com/deanrad/rxfx) makes them available to program with directly)_

## Knowing Our Options is Empowering

Before they were called The Radcliffe Model, the Concurrency Strategies, _aka modes_, were cheekily called: _The 5 Kinds of Busy._ For the situation of the Dad making dinner, then given another request, the dad could:

1. Start satisfying the 2nd request right away.
1. Make it after the 1st request, to use the same pan.
1. Stop the 1st request, make the 2nd instead.

The other two modes sound funny when applied to humans, but are still relevant sometimes!

1. Ignore the 2nd request—basically the _"Not Now"_ response.
1. Turn off the stove and just quit. "I cant keep changing what I make for you— come back when you know what you want!" (This has _never_ happened in the Radcliffe household! 😂)

So, it was out of necessity, that the Radcliffe Model was born!


## The Radcliffe Model of Concurrency

The modes in the Radcliffe Model, in English are:

- **Immediate**
- **Queueing**
- **Replacing**
- **Blocking**
- **Toggling**

![The Radcliffe Model of Concurrency](https://s3.amazonaws.com/www.deanius.com/RadcliffeConcurrencyModel.png)

I recognize these might not be the names you'd call these - you may have used `serial` and `parallel`, for either of the top 2 modes. Fine! But the value is not in what they are called, but the fact _that they are known as an entire set._ 

Sometimes, trying to fulfill every request of you, as **Immediate** and **Queueing** modes do - stretches resources too thin. The **Blocking** mode may smartly reduce concurrency by favoring a prior request, just as an elevator that is already requested does nothing on subsequent calls to the same floor. The **Replacing** mode is seen in how one video playing replaces another when we browse a social site, or how your session timeout keeps starting over after activity. And **Toggling** is what a one-button power switch does - more on **Toggling** later.

The reason to learn this model is that getting a computer program, UX, or human behavior to be correct is often done simply by _choosing the best mode from the list!_

I'll save an elaboration and derivation of each mode for another article. The graphic arranges them spatially to show how they relate, and at the end of the article are some trading-card-style images you can even print as a reference! (And play Oblique Strategies with them if you like) 

## Yes, Toggling is a Real Thing!

Some of you inquire why **Toggling** is in this list, since it's actually a failure to do anything concurrent. That's true. Yet still - sometimes it is the called-for response to an interruption.

Sometimes the presence of a 2nd request - like a second nightly file put into the Dropbox on the same night - indicates an exception or error condition.

**Toggle** and kin are analyzed more in the next post

## Go Forth and Be Concurrent!

You can use this model to further your or your colleagues' understandings of multitasking strategies. Or if you program asynchronous systems like User Interfaces, you can use [𝗥𝘅𝑓𝑥](https://github.com/deanrad/rxfx/tree/main/bus), to have the easiest, framework-free async programming experience you could have.

To share it, just consult the [Attribution-Share-alike license](https://creativecommons.org/licenses/by-sa/4.0/), which generally says it is free to share,provided you attribute the author and maintain the same terms.

Folks with translation skills - would you propose your languages' names for the modes in the comments?

Thanks, I'd love to hear how you've found this model to apply to you!

Dean Radcliffe ([@DeanDevDad](https://twitter.com/DeanDevDad))

---

![RxFx Strategy Cards](https://s3.amazonaws.com/www.deanius.com/cards-4-icons.png)