import { after } from '@rxfx/after';
import { concat } from 'rxjs';
import { tweenToValue } from '../src/tweens';
import { LERP } from '../src/';

/**
 * Due to the stochastic nature of requestAnimationFrame,
 * these tests aren't 100% reliable (even with rounding/floor!).
 * So they're skipped for CI, but usable in development.
 */
describe('Tweens', () => {
  describe('tweenToValue', () => {
    describe('Real Animation Frames', () => {
      describe('Return Value- An Observable of interpolations', () => {
        // eslint-disable-next-line  jest/no-disabled-tests
        it.skip('Linear (default)', async () => {
          const frames = [] as any[];
          const tweens = tweenToValue({ x: 1 }, { x: 100 }, 100);
          tweens.subscribe({
            next(frame) {
              for (let k in frame) {
                frame[k] = Math.floor(frame[k] / 16);
              }
              frames.push(frame);
            },
          });

          await after(120);

          // values will vary in practice
          expect(frames.slice(0, 6)).toMatchInlineSnapshot(`
            [
              {
                "x": 1,
              },
              {
                "x": 2,
              },
              {
                "x": 3,
              },
              {
                "x": 4,
              },
              {
                "x": 5,
              },
              {
                "x": 6,
              },
            ]
          `);
        });

        // eslint-disable-next-line  jest/no-disabled-tests
        it.skip('LERP (equal proportion each frame)', async () => {
          const frames = [] as any[];
          const tweens = tweenToValue({ x: 1 }, { x: 100 }, 200, LERP);
          tweens.subscribe({
            next(frame) {
              for (let k in frame) {
                frame[k] = Math.round(frame[k] / 10);
              }
              frames.push(frame);
            },
          });

          await after(220);

          // values will vary in practice
          expect(frames.slice(0, 6)).toMatchInlineSnapshot(`
            [
              {
                "x": 4,
              },
              {
                "x": 7,
              },
              {
                "x": 8,
              },
              {
                "x": 9,
              },
              {
                "x": 9,
              },
              {
                "x": 10,
              },
            ]
          `);
        });
      });
    });
  });
});

const _fakeFrames = concat(
  after(0, { timestamp: 0 }),
  after(20, { timestamp: 20 }),
  after(40, { timestamp: 40 }),
  after(60, { timestamp: 60 }),
  after(80, { timestamp: 80 }),
  after(100, { timestamp: 200 })
);
