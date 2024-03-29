# 𝗥𝘅𝑓𝑥 `animation`

Create JS-driven animations without recursive `requestAnimationFrame` calls, and with appropriate cancelation and timeouts.

A TypeScript/Observable version of [TweenJS](https://github.com/tweenjs/tween.js). 

Includes `@rxfx/perception`, `@rxfx/after`.

Example: 
```js
import { tweenToValue, LERP, Easing } from '@rxfx/animation';

const tweens = tweenToValue(
  { x: 1 },     // start
  { x: 100 },   // end
  100,          // duration
  Easing.Exponential.Out // optional - defaults linear
);

tweens.subscribe({
  next(frame) {
    // frame.x increases toward 100 every animationFrame
  },
});

```

Part of the [𝗥𝘅𝑓𝑥](https://github.com/deanrad/rxfx) family of libraries.

