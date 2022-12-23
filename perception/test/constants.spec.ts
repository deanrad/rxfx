import { DEBOUNCE_DELAY, THRESHOLD, THROTTLE_DELAY } from '../src/constants';

describe('UX Constants', () => {
  it('defines thresholds of perception', () => {
    expect(THRESHOLD).toMatchSnapshot();
  });
  it('defines an ideal debounce delay', () => {
    expect(DEBOUNCE_DELAY).toMatchSnapshot();
  });
  it('defines an ideal throttle delay', () => {
    expect(THROTTLE_DELAY).toMatchSnapshot();
  });
});
