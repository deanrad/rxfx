import { randomizePreservingAverage } from '../src/randomizer';

describe('randomizePreservingAverage', () => {
  const AVE = 200,
    NUM_SAMPLES = 1000;

  it('Skews individual durations', () => {
    const samples = Array.from({ length: 3 }, () =>
      randomizePreservingAverage(AVE)
    );
    const sumDiffs = samples
      .map((s) => Math.abs(s - AVE))
      .reduce((a, b) => a + b, 0);

    // non-trivial skew individually
    expect(sumDiffs).toBeGreaterThan(AVE / 2);
  });

  it('Preserves the average over the long run', () => {
    const samples = Array.from({ length: NUM_SAMPLES }, () =>
      randomizePreservingAverage(AVE)
    );
    const ave = samples.reduce((a, b) => a + b, 0) / NUM_SAMPLES;

    // very little aggregate skew
    expect(Math.abs(ave - AVE)).toBeLessThan(0.1 * AVE);
  });
});
