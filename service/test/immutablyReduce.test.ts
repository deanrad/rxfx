// @ts-nocheck
import { immutablyReduce } from '../src/immutablyReduce';

describe('immutablyReduce', () => {
  it('returns a new array with the item appended and does not mutate the original', () => {
    const initial = Object.freeze([1, 2]); // freeze to guard against mutation
    const pushReducer = immutablyReduce<number[], number>(
      (state = [], item) => {
        state.push(item);
      }
    );

    const result = pushReducer(initial, 3);

    // new state has the extra item
    expect(result).toEqual([1, 2, 3]);
    // original remains unchanged
    expect(initial).toEqual([1, 2]);
    // ensure a new object was returned
    expect(result).not.toBe(initial);
  });
});
