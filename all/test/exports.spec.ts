import { timeoutHandler } from '../src';
import { timeoutHandler as effectTimeoutHandler } from '../src/effect';

describe('package exports', () => {
  it('exports the effect timeoutHandler without ambiguity', () => {
    expect(timeoutHandler).toBe(effectTimeoutHandler);
  });
});
