import { animationFrames, Observable } from 'rxjs';
import { share } from 'rxjs/operators';

import { Easing, Group, Tween } from './tweenjs/';
import { UnknownProps } from './tweenjs/Tween';

/** Returns an Observable, increasing from startValue
 * @see https://github.com/tweenjs/tween.js
 */
export function tweenToValue<Start extends UnknownProps, End extends Start>(
  startValue: Start,
  finalValue: End,
  duration: number,
  easing: (value: number) => number = Easing.Linear.None,
  frames: Observable<{ timestamp: number }> = sharedAniFrames
) {
  // avoid mutation of arguments
  const fromValue = { ...startValue };
  const group = new Group();

  return new Observable<End>((notify) => {
    // fromValue is mutated
    const tween = new Tween(fromValue, group)
      .to(finalValue, duration)
      .easing(easing)
      .onComplete(() => {
        framesSub.unsubscribe();
        notify.complete();
      })
      .onUpdate(function (update) {
        notify.next({ ...update } as End);
      });

    const framesSub = frames.subscribe({
      next({ timestamp }) {
        group.update(timestamp);
      },
    });

    // Ensure this instance is started
    tween.start();
    framesSub.add(() => {
      tween.stop();
      tween.stopChainedTweens();
    });

    // Subtract one from the sharedAniFrames Refco
    return framesSub;
  });
}

// A shared instance that can service any number of tweens
const sharedAniFrames = animationFrames().pipe(
  // makes a single instance
  share()
);
