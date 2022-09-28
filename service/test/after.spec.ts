import { Observable, of, throwError } from 'rxjs';
import { tap, materialize } from 'rxjs/operators';
import { after } from '../src/after';

describe('after', () => {
  it('is an Observable', () => {
    expect(after(1, 1)).toBeInstanceOf(Observable);
  });
  it('is awaitable', async () => {
    const result = await after(1, '1.1');
    expect(result).toEqual('1.1');
  });
  it('is thenable', async () => {
    return after(1, () => 52).then((result) => {
      expect(result).toEqual(52);
    });
  });

  describe('delay arg', () => {
    describe('when 0', () => {
      it('is synchronous', () => {
        let result;
        after(0, () => {
          result = 3;
        }).subscribe();
        expect(result).toEqual(3);
      });
    });
    describe('when a Promise', () => {
      it('becomes a chained Promise', async () => {
        const result = after(Promise.resolve(1), 2);
        expect(result).toHaveProperty('subscribe');
        let resultVal = await after(Promise.resolve(1), 2);
        expect(resultVal).toEqual(2);
      });

      it('doesnt evaluate the mapper unless subscribed/awaited', async () => {
        let called = false;
        const result = after(Promise.resolve(1), () => {
          called = true;
          return 4;
        });
        expect(called).toBeFalsy();
        await Promise.resolve();
        expect(called).toBeFalsy();

        expect(result).toHaveProperty('subscribe');

        let resultVal = await result;

        expect(resultVal).toEqual(4);
        expect(called).toBeTruthy();
      });
    });
    describe('when setTimeout', () => {
      it('defers till setTimeout(0)', async () => {
        let result = '';
        after(setTimeout, () => {
          result = 'timeout occurred';
        }).subscribe();

        expect(result).toEqual('');

        // flushes only the microtask queue
        await Promise.resolve();
        expect(result).toEqual('');

        // only by now is it good
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(result).toEqual('timeout occurred');
      });
    });
  });

  describe('value arg', () => {
    describe('when a value', () => {
      it('is returned', async () => {
        const result = await after(1, 2.718);
        expect(result).toEqual(2.718);
      });
    });
    describe('when a function', () => {
      it('schedules its execution later', async () => {
        let counter = 0;
        let thenable = after(1, () => counter++);
        expect(counter).toEqual(0);
        await thenable;
        expect(counter).toEqual(1);
      });
      it('returns its return value', async () => {
        let result = await after(1, () => 2.71);
        expect(result).toEqual(2.71);
      });
    });
    describe('when an Observable', () => {
      it('defers subscription', async () => {
        const events: Array<string> = [];
        const toDefer = of(2).pipe(
          tap({
            subscribe() {
              events.push('subscribe');
            },
          })
        );
        const subject = after(1, toDefer);
        subject.subscribe();
        expect(events).toEqual([]);
        await after(2);
        expect(events).toEqual(['subscribe']);
      });
      it('yields the value', async () => {
        return after(1, of(2)).then((v) => {
          expect(v).toEqual(2);
        });
      });
      it('can create an error emitter', async () => {
        const seen = [];
        const errThrower = after(50, throwError('oops')).pipe(
          materialize(),
          tap((i) => seen.push(i))
        );
        errThrower.subscribe();
        expect(seen).toEqual([]);
        await after(100);
        expect(seen).toEqual([
          // Note the lack of a kind:"N" 'next' notification
          { kind: 'E', error: 'oops', hasValue: false, value: undefined },
        ]);
      });
    });
  });

  describe('observer arg', () => {
    describe('#unsubscribe', () => {
      it('is called back on unsubscribe()', () => {
        let unsubbed = false;
        const mini = after(50, 1, {
          unsubscribe: () => {
            unsubbed = true;
          },
        });
        const miniSub = mini.subscribe();
        miniSub.unsubscribe();
        expect(unsubbed).toBeTruthy();
      });
    });
  });
});
