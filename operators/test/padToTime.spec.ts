import { concat, timer } from 'rxjs';
import { padToTime } from '../src/padToTime';
import { after } from './util/after';

describe('padToTime', () => {
  const FAST_TIME = 50;
  const PAD_TIME = 100;
  const SLOW_TIME = 150;

  describe('Enforcing a minimum time', () => {
    it('pads if under the minimum', async () => {
      let seen = [] as number[];
      // prettier-ignore
      const observe = {next: v => {seen.push(v)} };

      const subject = timer(FAST_TIME).pipe(padToTime(PAD_TIME));
      const subs = subject.subscribe(observe);
      expect(seen).toEqual([]);

      await after(FAST_TIME);
      expect(seen).toEqual([]);

      await after(PAD_TIME);
      expect(seen).toEqual([0]);
      expect(subs.closed).toBeTruthy(); // still closes
    });

    it('does not pad if over the minimum', async () => {
      let seen = [] as number[];
      // prettier-ignore
      const observe = {next: v => {seen.push(v)} };

      const subject = timer(SLOW_TIME).pipe(padToTime(PAD_TIME));
      subject.subscribe(observe);
      expect(seen).toEqual([]);

      await after(SLOW_TIME + 10); // a fudge factor
      expect(seen).toEqual([0]);
    });

    describe('Multiple notifications', () => {
      it('pads if over the minimum', async () => {
        let seen = [] as number[];
        // prettier-ignore
        const observe = {next: v => {seen.push(v)} };

        const subject = concat(after(0, 1.1), after(0, 2.2)).pipe(
          padToTime(PAD_TIME)
        );
        const subs = subject.subscribe(observe);
        expect(seen).toEqual([]);

        await after(PAD_TIME + 10); // a fudge factor
        expect(seen).toEqual([1.1, 2.2]);
        expect(subs.closed).toBeTruthy();
      });

      it('does not pad if over the minimum', async () => {
        let seen = [] as number[];
        // prettier-ignore
        const observe = {next: v => {seen.push(v)} };

        const subject = concat(after(PAD_TIME + 1, 1.1), after(0, 2.2)).pipe(
          padToTime(PAD_TIME)
        );
        subject.subscribe(observe);
        expect(seen).toEqual([]);

        await after(PAD_TIME + 10); // a fudge factor
        expect(seen).toEqual([1.1, 2.2]);
      });
    });
  });
});
