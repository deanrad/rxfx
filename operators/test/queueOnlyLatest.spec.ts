import { Subject, concat } from 'rxjs';
import { after } from './util/after';
import { queueOnlyLatest } from '../src/queueOnlyLatest';

describe('queueOnlyLatest', () => {
  beforeEach(() => {
    i = 0;
  });
  let i = 0;
  let checkForUpdate = (i) => {
    return concat(after(0, 'begin:' + i), after(10, 'end:' + i));
  };

  describe('mapper', () => {
    it('should map', async () => {
      const updateChecks = [] as string[];
      const queries = new Subject<number>();

      const mapper = (t: number, r: string) => `${t}: ${r}`;
      queries.pipe(queueOnlyLatest(checkForUpdate, mapper)).subscribe({
        next(u) {
          updateChecks.push(u);
        },
      });

      queries.next(++i); // 1
      queries.next(++i); // 2
      await after(50);
      expect(updateChecks).toEqual([
        '1: begin:1',
        '1: end:1',
        '2: begin:2',
        '2: end:2',
      ]);
    });
  });

  describe('with no running subscription', () => {
    it('starts one', async () => {
      const updateChecks = [] as string[];
      const queries = new Subject<number>();

      queries.pipe(queueOnlyLatest(checkForUpdate)).subscribe({
        next(u) {
          updateChecks.push(u);
        },
      });

      queries.next(++i); // turn on

      expect(updateChecks).toEqual(['begin:1']);
      await after(10);
      expect(updateChecks).toEqual(['begin:1', 'end:1']);
    });
  });

  describe('with an already running subscription', () => {
    it('enqueues at most one of the concurrent requests - the latest', async () => {
      let updateChecks = [] as string[];
      const queries = new Subject<number>();

      queries.pipe(queueOnlyLatest(checkForUpdate)).subscribe({
        next: (u) => updateChecks.push(u),
        error: console.error,
      });

      // 1 request
      queries.next(++i);
      await after(50);
      expect(updateChecks).toEqual(['begin:1', 'end:1']);
      updateChecks = [];

      // 2 requests - breaks down to queueing
      i = 0;
      queries.next(++i);
      queries.next(++i);
      await after(50);
      expect(updateChecks).toEqual(['begin:1', 'end:1', 'begin:2', 'end:2']);
      updateChecks = [];

      // // 3 requests - queuesOnlyLatest
      i = 0;
      queries.next(++i);
      queries.next(++i);
      queries.next(++i);
      await after(50);
      expect(updateChecks).toEqual(['begin:1', 'end:1', 'begin:3', 'end:3']);
      updateChecks = [];

      // // 4 requests - just verifying!
      i = 0;
      queries.next(++i);
      queries.next(++i);
      await after(1);
      queries.next(++i);
      queries.next(++i);
      await after(50);
      expect(updateChecks).toEqual(['begin:1', 'end:1', 'begin:4', 'end:4']);
      updateChecks = [];
    });
    it('propogates cancelation of running', async () => {
      let updateChecks = [] as string[];
      const queries = new Subject<number>();

      let masterSub = queries.pipe(queueOnlyLatest(checkForUpdate)).subscribe({
        next: (u) => updateChecks.push(u),
        error: console.error,
      });

      i = 0;
      queries.next(++i);
      await after(2);
      masterSub.unsubscribe();
      await after(50);
      expect(updateChecks).toEqual(['begin:1']);
      updateChecks = [];
    });

    it('propogates cancelation of queued', async () => {
      let updateChecks = [] as string[];
      const queries = new Subject<number>();

      let masterSub = queries.pipe(queueOnlyLatest(checkForUpdate)).subscribe({
        next: (u) => updateChecks.push(u),
        error: console.error,
      });

      i = 0;
      queries.next(++i);
      await after(2);
      queries.next(++i);
      await after(2);
      queries.next(++i);
      masterSub.unsubscribe();
      await after(60);
      expect(updateChecks).toEqual(['begin:1']);
      updateChecks = [];
    });
  });
});
