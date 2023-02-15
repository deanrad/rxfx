// @ts-nocheck
import symbol_Observable from 'symbol-observable';
import {
  asapScheduler as promiseScheduler,
  asyncScheduler as timeoutScheduler,
  concat,
  empty,
  EMPTY,
  from,
  Observable,
  of,
  throwError,
  timer,
} from 'rxjs';
import { tap } from 'rxjs/operators';
import { Action } from 'typescript-fsa';
import {
  completeCreator,
  loadingCreator,
  resultCreator,
  searchRequestCreator,
} from './example/searchService';
import { Bus } from '../src/bus';
import { after } from '@rxfx/after';

export const anyEvent = () => true;

function capturing<T>(bus: Bus<T>, testFn: (arg: T[]) => void | Promise<any>) {
  return function () {
    const seen = new Array<T>();
    // @ts-ignore
    const sub = bus.query(() => true).subscribe((event) => seen.push(event));
    const result: any = testFn(seen);
    // allow async functions to await - but ensure cleanup
    if (result && result.then) {
      return result.finally(() => sub.unsubscribe());
    }
    // unsubscribe is idempotent
    sub.unsubscribe();
    return result;
  };
}

/** Concatenable Observables corresponding to DURATION.
 * Keyed off:
 *   V - a value (synchronous unless preceeded by t/T)
 *   E - an error
 *   t - a microtask tick (Promise resolution)
 *   T - a macrotask tick (setTimeout(fn,0))
 *   C - a completion
 */
export const EXECUTION = {
  V: () => of('V'),
  C: () => EMPTY,
  E: () => throwError(() => new Error('planned error')),
  t: () => empty(promiseScheduler),
  T: () => empty(timeoutScheduler),
};

const withTiming = (events) => {
  return concat(
    ...events.map(([time, valOrFn]) => {
      return after(time, valOrFn);
    })
  );
};
const FSABus = new Bus<Action<any>>();
const StringBus = new Bus<string>();
const miniBus = new Bus<number>();

describe('Bus', () => {
  beforeEach(() => {
    FSABus.reset();
    miniBus.reset();
    StringBus.reset();
  });

  describe('Typings', () => {
    interface Foo {
      foo: string;
      value?: string;
    }
    interface Bar extends Foo {
      bar: string;
      value?: string;
    }

    it('types - can make more actions', async () => {
      const b = new Bus<Foo | Bar>();
      const seen: Array<Foo | Bar> = [];

      b.spy((foo) => seen.push(foo));
      // b.listen<Foo,Bar>(
      b.listen<Bar>(
        (e) => !!e.foo,
        (e) => {
          // return any ObservableInput
          // return of({ bar: e.foo } as Bar);
          return Promise.resolve({ bar: `i was: ${e.foo}` } as Bar);
        },
        b.observeAll()
      );
      b.trigger({ foo: 'im foo' });
      await Promise.resolve();
      expect(seen).toMatchInlineSnapshot(`
        Array [
          Object {
            "foo": "im foo",
          },
          Object {
            "bar": "i was: im foo",
          },
        ]
      `);
    });
  });
  it('can be instantiated with the BusItemType it will accept', () => {
    expect(FSABus).toBeTruthy();
  });

  describe('#query', () => {
    describe('With a Predicate', () => {
      it('Returns an Observable of matching events', () => {
        const events = [];
        miniBus
          .query(anyEvent)
          .pipe(tap((e) => events.push(e)))
          .subscribe();
        miniBus.trigger(3.14);
        miniBus.trigger(2.71828);
        expect(events).toEqual([3.14, 2.71828]);
      });
      it('Returns an Observable of filtered events', () => {
        const events = [];
        miniBus
          .query((n) => n < 3)
          .pipe(tap((e) => events.push(e)))
          .subscribe();
        miniBus.trigger(3.14);
        miniBus.trigger(2.71828);
        expect(events).toEqual([2.71828]);
      });

      it('is canceled by a reset', () => {
        const sub = miniBus.query(() => true).subscribe();
        expect(sub).toHaveProperty('closed', false);
        miniBus.reset();
        expect(sub).toHaveProperty('closed', true);
      });

      describe('Type safety', () => {
        it('Returns a typed Observable of filtered events', () => {
          const events = [];
          type FooEvent = Action<'foo'>;
          function isFoo(a: Action<any>): a is FooEvent {
            return a.type === 'foo';
          }
          // because of its declaration as is FooEvent,
          FSABus.query(isFoo)
            .pipe(tap((e) => events.push(e)))
            .subscribe();

          FSABus.trigger({ type: 'foo' });
          FSABus.trigger({ type: 'bar' });
          expect(events).toEqual([{ type: 'foo' }]);
        });
      });
    });
  });

  describe('#nextEvent', () => {
    describe('With a Predicate', () => {
      it('resolves to the next matching event', async () => {
        const nextEvent = StringBus.nextEvent(() => true);
        StringBus.trigger('iamhere');
        expect(nextEvent).resolves.toBe('iamhere');
      });

      it('rejects on a reset if it hasnt triggered yet', () => {
        const nextEvent = StringBus.nextEvent(() => true);

        StringBus.reset();

        return expect(nextEvent).rejects.toBe('Bus was reset.');
      });

      it('ignores a reset if it has triggered already', () => {
        const nextEvent = StringBus.nextEvent(() => true);

        StringBus.trigger('iamhere');
        StringBus.reset();

        return expect(nextEvent).resolves.toBe('iamhere');
      });
    });
  });

  describe('#trigger', () => {
    it(
      'puts an action on the bus',
      capturing(miniBus, (events) => {
        miniBus.trigger(5);
        expect(events).toEqual([5]);
      })
    );

    it(
      'Is not vulnerable to listener errors',
      capturing(miniBus, async (events) => {
        const sub = miniBus.listen(
          () => true,
          (i) => {
            throw new Error(`${i}`);
          }
        );

        const seenErrors = [];
        // this is how an app can monitor the errors
        miniBus.errors.subscribe((e) => seenErrors.push(e));

        expect(() => {
          miniBus.trigger(5);
        }).not.toThrow();

        // 5 makes it onto the bus regardless
        expect(events).toEqual([5]);

        // and the bus is still alive
        miniBus.trigger(6);
        expect(events).toEqual([5, 6]);

        // but the listener is dead
        expect(sub).toHaveProperty('closed', true);

        // and we can see the errors
        expect(seenErrors).toMatchInlineSnapshot(`
          Array [
            [Error: 5],
          ]
        `);
      })
    );
    describe('Type Safety', () => {
      it('typechecks argument against bus type', () => {
        // Wont be allowed - not a subtype of bus
        // FSABus.trigger(2);
        // allowed - no generic needed on .trigger
        FSABus.trigger({ type: 'foo', payload: null });
      });
    });
  });

  describe('#next', () => {
    it('is an alias for trigger', () => {
      miniBus.next(42);
    });
  });

  describe('#listen', () => {
    describe('Handler', () => {
      describe('Returning Observables', () => {
        describe('retriggering via observeWith', () => {
          it(
            'can send events from effects back through the bus',
            capturing(FSABus, (events) => {
              // Set up the listener:
              // on events of searchRequest
              // return an observable of next:{result: 'foo'}
              FSABus.listen(
                searchRequestCreator.match,
                () => of({ result: 'foo' }),
                FSABus.observeWith({
                  subscribe: loadingCreator,
                  next: resultCreator,
                  complete: completeCreator,
                })
              );
              FSABus.trigger(searchRequestCreator({ query: 'app', id: 3.14 }));

              expect(events).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "payload": Object {
                      "id": 3.14,
                      "query": "app",
                    },
                    "type": "search/request",
                  },
                  Object {
                    "payload": undefined,
                    "type": "search/loading",
                  },
                  Object {
                    "payload": Object {
                      "result": "foo",
                    },
                    "type": "search/result",
                  },
                  Object {
                    "payload": undefined,
                    "type": "search/complete",
                  },
                ]
              `);
            })
          );
        });
        describe('retrigging via observeAll', () => {
          it(
            'puts all return values (not complete/error) directly back on the bus ',
            capturing(StringBus, async (events) => {
              StringBus.listen(
                (s) => s === 'FOO',
                () => Promise.resolve('BAR'),
                StringBus.observeAll()
              );
              StringBus.trigger('FOO');
              StringBus.trigger('NOTFOO');
              await after(1);
              expect(events).toEqual(['FOO', 'NOTFOO', 'BAR']);
            })
          );
        });
      });
      describe('Returning Promises', () => {
        describe('With a callback-based observer', () => {
          it(
            'can trigger new events',
            capturing(StringBus, async (events) => {
              StringBus.listen(
                (a) => a === 'bang',
                () => Promise.resolve('fooP'),
                StringBus.observeWith({
                  next: (v) => v,
                })
              );
              StringBus.trigger('bang');
              await after(setTimeout);
              expect(events).toHaveLength(2);
              expect(events).toMatchInlineSnapshot(`
                Array [
                  "bang",
                  "fooP",
                ]
              `);
            })
          );
        });
      });
      describe('Returning functions', () => {
        it('can return 1-arity function to create Observable via new Observable()', async () => {
          StringBus.listen(
            (s) => s === 'FOO',
            // dont need to import Observable, just return a function
            () => (o) => {
              // my next/error/complete get observed in the next argument
              o.next('BARRR');
              // succeeds
              o.next('BAR2');
              // doesnt come through - WHY?
              Promise.resolve().then(() => {
                o.next('BAR3');
              });
              o.complete();
            },
            // feed responded events back in (optionally mapping)
            StringBus.observeWith({
              next: (x) => x,
            })
          );

          const seen: Array<string> = [];
          StringBus.spy((e) => {
            seen.push(e);
          });

          StringBus.trigger('FOO');
          StringBus.trigger('NOTFOO');
          await Promise.resolve(); //after(200);
          expect(seen).toEqual(['FOO', 'BARRR', 'BAR2', 'NOTFOO']);
        });
      });
      describe('Can return any ObservableInput', () => {
        it(
          'Unpacks strings since theyre Iterable',
          capturing(StringBus, (events) => {
            StringBus.listen(
              (a) => a === 'bang',
              () => 'whoa',
              {
                next(result) {
                  StringBus.trigger(result);
                },
              }
            );
            StringBus.trigger('bang');
            expect(events).toHaveLength(5);
            expect(events).toMatchInlineSnapshot(`
              Array [
                "bang",
                "w",
                "h",
                "o",
                "a",
              ]
            `);
          })
        );
        it(
          'Works with generators',
          capturing(StringBus, async (events) => {
            StringBus.listen(
              (a) => a === 'bang',
              () => {
                const gen = function* () {
                  yield 'one';
                  yield 'two';
                };
                // gotta return the iterator
                return gen();
              },
              {
                next(result) {
                  StringBus.trigger(result);
                },
              }
            );
            await Promise.resolve();
            StringBus.trigger('bang');
            expect(events).toHaveLength(3);
            expect(events).toEqual(['bang', 'one', 'two']);
          })
        );
        it(
          'allows for no/void return value',
          capturing(StringBus, () => {
            const seen = [];
            StringBus.listen(
              () => true,
              function voidReturn(e) {
                seen.push(e);
              }
            );

            StringBus.trigger('FIZZ');
            StringBus.trigger('BUZZ');
            // The listener ran twice (didnt die on no return)
            expect(seen).toEqual(['FIZZ', 'BUZZ']);
          })
        );
      });
    });
    describe('Observer', () => {
      it.todo('contains callbacks attached to the handler lifecycle');
    });
    describe('Return value', () => {
      it.todo('is a Subscription');
      it('has an isActive BehaviorSubject', async () => {
        const DELAY = 10;
        const delayedTaxBus = new Bus();
        const taxResolver = delayedTaxBus.listen(
          () => true,
          (n) => {
            return after(DELAY, n * 1.05);
          }
        );
        const activities = [];
        taxResolver.isActive.subscribe((isActive) => {
          activities.push(isActive);
        });
        expect(taxResolver.isActive.value).toBeFalsy();
        delayedTaxBus.trigger(100);

        expect(taxResolver.isActive.value).toBeTruthy();
        expect(activities).toEqual([false, true]);
        await after(DELAY);
        expect(taxResolver.isActive.value).toBeFalsy();
        expect(activities).toEqual([false, true, false]);
      });

      it('works even with multiple handlings', async () => {
        const DELAY = 100;
        const delayedTaxBus = new Bus();
        // Immediate concurrency mode
        const taxResolver = delayedTaxBus.listenSwitching(
          () => true,
          (n) => {
            return after(DELAY, n * 1.05);
          }
        );
        const activities = [];
        taxResolver.isActive.subscribe((isActive) => {
          activities.push(isActive);
        });

        delayedTaxBus.trigger(100);

        // immediately a yes
        expect(taxResolver.isActive.value).toBeTruthy();
        await after(DELAY * 0.5);
        // trigger 2nd, overlapping handling
        delayedTaxBus.trigger(100);
        await after(DELAY * 0.6);
        expect(taxResolver.isActive.value).toBeTruthy();
        await after(DELAY * 0.6);
        expect(taxResolver.isActive.value).toBeFalsy();
        expect(activities).toEqual([false, true, false]);
      });
    });

    describe('triggering synchronously from within a listener', () => {
      it('preserves listener order', () => {
        const heardViaEarlyListen = [];
        const heardViaLateListen = [];
        const seenViaSpy = [];

        miniBus.spy((e) => {
          seenViaSpy.push(e);
        });

        miniBus.listen(
          () => true,
          (e) => {
            heardViaEarlyListen.push(e);
          }
        );

        const sub = miniBus.listen(
          (e) => e === 1,
          () => {
            miniBus.trigger(2);
          }
        );
        miniBus.listen(
          () => true,
          (e) => {
            heardViaLateListen.push(e);
          }
        );

        miniBus.trigger(1);
        expect(seenViaSpy).toEqual([1, 2]);
        expect(heardViaEarlyListen).toEqual([1, 2]);
        expect(heardViaLateListen).toEqual([1, 2]);
        sub.unsubscribe();
      });

      it('via after(0), ', async () => {
        const heardViaEarlyListen = [];
        const heardViaLateListen = [];
        const seenViaSpy = [];

        miniBus.spy((e) => {
          seenViaSpy.push(e);
        });

        miniBus.listen(
          () => true,
          (e) => {
            heardViaEarlyListen.push(e);
          }
        );

        const sub = miniBus.listen(
          (e) => e === 1,
          () => {
            return after(0, () => miniBus.trigger(2));
          }
        );
        miniBus.listen(
          () => true,
          (e) => {
            heardViaLateListen.push(e);
          }
        );

        miniBus.trigger(1);
        await Promise.resolve();
        expect(seenViaSpy).toEqual([1, 2]);
        expect(heardViaEarlyListen).toEqual([1, 2]);
        expect(heardViaLateListen).toEqual([1, 2]);
        sub.unsubscribe();
      });
    });
  });

  describe('#listenQueueing (same signature as #listen, but with concatMap)', () => {
    it('serializes execution', async () => {
      const calls = [];
      const listenerSpy = jest.fn().mockImplementation((i) => {
        calls.push(`start:${i}`);
        return after(10, () => calls.push(`done:${i}`));
      });
      miniBus.listenQueueing(() => true, listenerSpy);
      miniBus.trigger(1);
      miniBus.trigger(2);

      await after(30 + 1);
      // prettier-ignore
      expect(calls).toEqual([
        'start:1',
        'done:1',
        'start:2',
        'done:2'
      ]);
    });
  });

  describe('#listenSwitching (same signature as #listen, but with switchMap)', () => {
    it('cancels existing, and starts a new Subscription', async () => {
      const calls = [];
      const listenerSpy = jest.fn().mockImplementation((i) => {
        return withTiming([
          [0, () => calls.push(`start:${i}`)],
          [10, () => calls.push(`done:${i}`)],
        ]);
      });
      miniBus.listenSwitching(() => true, listenerSpy);
      miniBus.trigger(1);
      miniBus.trigger(2);

      await after(30 + 1);
      // prettier-ignore
      expect(calls).toEqual([
        'start:1',
        'start:2',
        'done:2'
      ]);
    });
  });

  describe('#listenBlocking (same signature as #listen, but with exhaustMap)', () => {
    it('cancels existing, and starts a new Subscription', async () => {
      const calls = [];
      const listenerSpy = jest.fn().mockImplementation((i) => {
        return withTiming([
          [0, () => calls.push(`start:${i}`)],
          [10, () => calls.push(`done:${i}`)],
        ]);
      });
      miniBus.listenBlocking(() => true, listenerSpy);
      miniBus.trigger(1);
      miniBus.trigger(2);

      await after(30 + 1);
      // prettier-ignore
      expect(calls).toEqual([
        'start:1',
        'done:1',
      ]);
    });
  });

  describe('#listenToggling (same signature as #listen, but with toggleMap)', () => {
    it('calls listen', async () => {
      let on: boolean = false;

      //prettier-ignore
      miniBus.listenToggling(
        () => true,
        () => new Observable(() => { 
          on=true;
          return () => on=false;
        })
      );

      miniBus.trigger();
      expect(on).toBeTruthy();
      miniBus.trigger();
      expect(on).toBeFalsy();
    });
  });

  describe('#listen #trigger #trigger', () => {
    describe('handlers which error', () => {
      describe('Not rescued', () => {
        it('does not continue listening', () => {
          const seen = [];
          const actor = StringBus.listen(
            () => true,
            (s) => {
              seen.push(s);
              return throwError();
            },
            {}
          );

          StringBus.trigger('foo');
          expect(seen).toEqual(['foo']);
          expect(actor).toHaveProperty('closed', true);
          // no longer listening
          StringBus.trigger('bar');
          expect(seen).toEqual(['foo']);
        });
      });

      describe('Rescued', () => {
        it('continues listening', () => {
          const seen = [];
          const errs = [];
          StringBus.errors.subscribe((e) => errs.push(e));
          const actor = StringBus.listen(
            () => true,
            (s) => {
              seen.push(s);
              return throwError(() => new Error(':('));
            },
            {
              error(e) {
                seen.push('rescued ' + e.message);
              },
            }
          );

          StringBus.trigger('foo');
          expect(seen).toEqual(['foo', 'rescued :(']);
          expect(errs).toEqual([]);
          expect(actor).toHaveProperty('closed', false);
          // we're still listening
          StringBus.trigger('bar');
          expect(seen).toEqual(['foo', 'rescued :(', 'bar', 'rescued :(']);
        });
      });
    });

    it('does not insert a tick between each trigger', async () => {
      const seen = [];
      const micro = new Bus<number>();
      micro.listen(
        () => true,
        (e) => {
          seen.push(e);
        }
      );
      micro.trigger(2.7182);
      micro.trigger(3.1416);

      // synchronously available
      expect(seen).toEqual([2.7182, 3.1416]);
    });
  });

  describe('#reset', () => {
    it('ends all listeners', () => {
      const microBus = new Bus<number>();
      const events = [];
      const listener = microBus.listen(
        (n) => n == 1,
        (one) => {
          return of(one + 1).pipe(tap((two) => events.push(two)));
        }
      );

      microBus.reset();

      // further triggerings have no effect
      microBus.trigger(1);
      expect(events).toHaveLength(0); // not two
      // and our listener is forever closed
      expect(listener).toHaveProperty('closed', true);
    });

    it(
      'ends all handlers',
      capturing(miniBus, async (events) => {
        // @ts-ignore
        miniBus.listen(
          (n) => n === 1,
          () =>
            // after a Promise resolution, trigger 3
            timer(0, promiseScheduler).pipe(
              tap(() => {
                miniBus.trigger(3);
              })
            )
        );
        // The handler will have begun but..
        miniBus.trigger(1);
        // Unsubscribe before the handler's observable has completed
        miniBus.reset();

        // Wait long enough to have seen the result if not canceled by reset
        await Promise.resolve();
        // seen would have 1 and 3 if we didn't cancel the in-flight
        expect(events).toEqual([1]);
      })
    );
  });

  describe('#spy', () => {
    it('calls the function passed to it on any event, before any listener', () => {
      const seen = [];
      const listenerSpy = jest.fn().mockImplementation(() => {
        seen.push('seen by spy');
      });
      miniBus.listen(
        () => true,
        () => {
          seen.push('seen by nonspy');
        }
      );

      miniBus.spy(listenerSpy);
      miniBus.trigger(NaN);
      expect(listenerSpy).toHaveBeenCalledTimes(1);
      expect(seen).toEqual(['seen by spy', 'seen by nonspy']);
    });

    it('returns a subscription for cancelation', () => {
      const seen = [];
      const listenerSpy = jest.fn().mockImplementation(() => {
        seen.push('seen by spy');
      });

      const sub = miniBus.spy(listenerSpy);
      miniBus.trigger(1);
      expect(listenerSpy).toHaveBeenCalledTimes(1);

      sub.unsubscribe();
      miniBus.trigger(1.1);
      expect(listenerSpy).toHaveBeenCalledTimes(1);
    });

    describe('#spy #spy', () => {
      it('runs spies in the order appended', () => {
        const seen = [];
        miniBus.spy(() => {
          seen.push(1);
        });
        miniBus.spy(() => {
          seen.push(2);
        });
        miniBus.trigger(Math.PI);
        expect(seen).toEqual([1, 2]);
      });
    });
  });

  describe('#guard', () => {
    it.todo('returns a subscription for cancelation');

    describe('callback', () => {
      it.todo('is called on matching events');
      describe('when it throws', () => {
        it('allows rejection of bus items by throwing', () => {
          const seen = [];

          miniBus.listen(
            () => true,
            (i) => {
              seen.push(i);
            }
          );
          miniBus.guard(
            (i) => i === 3.14,
            () => {
              throw 'No rounded transcendentals!';
            }
          );

          miniBus.trigger(3.13);
          expect(() => {
            miniBus.trigger(3.14);
          }).toThrow('No rounded transcendentals!');

          expect(seen).toEqual([3.13]);
        });
        it('doesnt terminate the guard when throwing', () => {
          const seen = [];

          miniBus.spy((i) => seen.push(i));
          miniBus.guard(
            (i) => i === 3.14,
            () => {
              throw 'No rounded transcendentals!';
            }
          );

          miniBus.trigger(3.13);
          expect(() => {
            miniBus.trigger(3.14);
          }).toThrow('No rounded transcendentals!');

          // still errs
          expect(() => {
            miniBus.trigger(3.14);
          }).toThrow('No rounded transcendentals!');

          // didnt break the bus
          miniBus.trigger(3.15);

          expect(seen).toEqual([3.13, 3.15]);
        });
      });
      describe('return value', () => {
        it('can mutate the payload', () => {
          const seen = [];

          FSABus.guard(
            ({ type }) => type === 'foo',
            (e) => {
              e.payload.timestamp = '2020-01-01';
            }
          );
          FSABus.listen(
            () => true,
            (e) => {
              seen.push(e);
            }
          );

          // mutates the payload
          const payload = { fooId: 'bazž' };
          FSABus.trigger({ type: 'foo', payload });

          expect(seen).toMatchInlineSnapshot(`
            Array [
              Object {
                "payload": Object {
                  "fooId": "bazž",
                  "timestamp": "2020-01-01",
                },
                "type": "foo",
              },
            ]
          `);
        });
      });
    });

    describe('#guard #guard', () => {
      it('runs guards in the order created', () => {
        const seen = [];

        miniBus.guard(
          () => true,
          () => {
            seen.push(1);
          }
        );
        miniBus.guard(
          () => true,
          () => {
            seen.push(2);
          }
        );

        miniBus.trigger('foo'.length);
        expect(seen).toEqual([1, 2]);
      });
      it('should maintain exception handling', () => {
        const micro = new Bus<number>();
        // on our secondarily triggered action we throw
        micro.guard(
          (n) => n % 2 === 0,
          (n) => {
            throw new Error(`${n} not odd`);
          }
        );
        micro.guard(
          (e) => e === 1,
          () => {
            try {
              micro.trigger(2); // raises error
            } catch (ex) {
              throw 'Saw it';
            }
          }
        );

        // minibus.trigger(1) should raise error
        expect(() => {
          micro.trigger(1);
        }).toThrow();
      });
    });

    describe('#spy #guard', () => {
      it('runs guards before any spies', () => {
        const seen = [];

        miniBus.spy(() => seen.push(2));
        miniBus.guard(
          () => true,
          () => seen.push(1)
        );

        miniBus.trigger('foo'.length);
        expect(seen).toEqual([1, 2]);
      });
    });

    describe('#trigger from within', () => {
      it('pre-empts the initial trigger', () => {
        const seen = [];

        const sub = miniBus.guard(
          (e) => e === 1,
          () => miniBus.trigger(2)
        );
        miniBus.spy((e) => seen.push(e));

        miniBus.trigger(1);
        expect(seen).toEqual([2, 1]);
        sub.unsubscribe();
      });
      it('can follow the initial trigger', async () => {
        const seen = [];

        miniBus.guard(
          (e) => e === 1,
          () => Promise.resolve().then(() => miniBus.trigger(2.1))
        );
        miniBus.spy((e) => seen.push(e));
        miniBus.trigger(1);

        await Promise.resolve();
        expect(seen).toEqual([1, 2.1]);
      });
    });
  });

  describe('#filter', () => {
    it.todo('returns a subscription for cancelation');
    it('only responds to its own events', () => {
      const seen = [];

      StringBus.filter(
        (s) => s === 'never',
        (s) => seen.push(s)
      );
      StringBus.trigger('always');
      expect(seen).toEqual([]);
    });

    describe('shouldnt trigger events, but if it does', () => {
      it('should maintain order', () => {
        const seen = [] as number[];
        const heard = [] as number[];
        miniBus.filter(
          (e) => e === 1,
          (e) => {
            miniBus.trigger(2);
            return e;
          }
        );
        miniBus.filter(
          () => true,
          (e) => {
            seen.push(e);
            return e;
          }
        );
        miniBus.listen(
          () => true,
          (e) => {
            heard.push(e);
          }
        );
        miniBus.trigger(1);

        // guard A triggers 2
        // guard B sees 1,2
        // listener "hears" 1,2
        expect(seen).toEqual([1, 2]);
        expect(heard).toEqual([1, 2]);
      });
    });

    describe('callback', () => {
      it('may replace the action with another, after guards and before spies', () => {
        const seen = [];
        StringBus.spy((e) => seen.push(e));
        StringBus.filter(
          () => true,
          (s) => s.substr(0, 4)
        );
        StringBus.trigger('BOOYEAH');

        expect(seen).toEqual(['BOOY']);
      });

      it('may remove the action by returning null or undefined', () => {
        const seen = [];
        StringBus.spy((e) => seen.push(e));

        StringBus.filter(
          () => true,
          () => null // removes it
        );
        StringBus.trigger('BOOYEAH');

        expect(seen).toEqual([]);
      });
    });

    describe('#filter #filter #trigger', () => {
      it('no exception - error sent to bus.errors', () => {
        const micro = new Bus<number>();
        const seenErrors = [];
        micro.errors.subscribe((e) => seenErrors.push(e));
        // on our secondarily triggered action we throw
        micro.filter(
          (n) => n % 2 === 0,
          (n) => {
            throw `${n} not odd`;
          }
        );
        micro.filter(
          (e) => e === 1,
          () => {
            micro.trigger(2); // raises error
          }
        );

        micro.trigger(1); // should populate errors
        expect(seenErrors).toEqual(['2 not odd']);
      });
      it('continues to process events', () => {
        const micro = new Bus<number>();
        const seenErrors = [];
        const seen = [];
        const heard = [];
        micro.guard(
          () => true,
          (e) => seen.push(e)
        );
        micro.errors.subscribe((e) => seenErrors.push(e));
        // on our secondarily triggered action we throw
        micro.filter(
          (n) => n % 2 === 0,
          (n) => {
            throw `${n} not odd`;
          }
        );
        micro.filter(
          (e) => e === 1,
          () => {
            micro.trigger(2); // raises error
          }
        );
        micro.listen(
          () => true,
          (e) => {
            heard.push(e);
          }
        );
        micro.trigger(-1);
        micro.trigger(1); // should populate errors
        expect(seenErrors).toEqual(['2 not odd']);
        micro.trigger(3); // still works..
        expect(seen).toEqual([-1, 1, 2, 3]);
        expect(heard).toEqual([-1, 3]);
      });
    });
  });

  describe('RxJS interop (https://codesandbox.io/s/rxfx-bus-as-observable-m6e41v)', () => {
    it('can be treated as an Observable via from()', () => {
      const seen = [] as number[];
      // @ts-ignore
      const obsFromBus = from(miniBus);

      obsFromBus.subscribe({
        next(num) {
          seen.push(num);
        },
      });
      miniBus.trigger(1.2);
      expect(seen).toEqual([1.2]);
    });

    it('is canceled by a reset', () => {
      const seen = [] as number[];
      const obsFromBus = miniBus[Symbol.observable]();

      obsFromBus.subscribe({
        next(num) {
          seen.push(num);
        },
      });
      miniBus.trigger(1.1);
      miniBus.reset();
      miniBus.trigger(2.2);
      expect(seen).toEqual([1.1]);
    });

    it('can be treated as an Observable through the symbol-observable package', () => {
      const seen = [] as number[];
      const obsFromBus = miniBus[symbol_Observable]();

      obsFromBus.subscribe({
        next(num) {
          seen.push(num);
        },
      });
      miniBus.trigger(1.1);
      expect(seen).toEqual([1.1]);
    });

    it('can be treated as an Observable through the Symbol.observable property', () => {
      const seen = [] as number[];
      const obsFromBus = miniBus[Symbol.observable]();

      obsFromBus.subscribe({
        next(num) {
          seen.push(num);
        },
      });
      miniBus.trigger(1.1);
      expect(seen).toEqual([1.1]);
    });
  });
});
