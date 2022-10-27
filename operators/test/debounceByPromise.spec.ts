import { concat, from } from 'rxjs';
import { debounceByPromise } from '../src/debounceByPromise';

describe(debounceByPromise, () => {
  describe('used in pipe()', () => {
    it('should debounce to the final within a frame', async () => {
      const isBetweenRequests = concat(
        from([false, true]),
        from(Promise.resolve(false))
      );
      const activities = [] as boolean[];

      const subject = debounceByPromise(isBetweenRequests); // (isBetweenRequests).pipe(debounceByPromise);
      subject.subscribe((n) => activities.push(n));
      expect(activities).toMatchInlineSnapshot(`[]`);
      await Promise.resolve();
      expect(activities).toMatchInlineSnapshot(`
      [
        true,
        false,
      ]
    `);
    });
  });
  describe('wrapping an Observable', () => {
    it('should debounce to the final within a frame', async () => {
      const isBetweenRequests = concat(
        from([false, true]),
        from(Promise.resolve(false))
      );
      const activities = [] as boolean[];

      const subject = debounceByPromise(isBetweenRequests); // (isBetweenRequests).pipe(debounceByPromise);
      subject.subscribe((n) => activities.push(n));
      expect(activities).toMatchInlineSnapshot(`[]`);
      await Promise.resolve();
      expect(activities).toMatchInlineSnapshot(`
      [
        true,
        false,
      ]
    `);
    });
  });
});
