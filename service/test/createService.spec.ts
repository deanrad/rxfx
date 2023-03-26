import { concat, Observable, of, throwError } from 'rxjs';
import { Action } from 'typescript-fsa';

import { Bus } from '@rxfx/bus';
import { after } from '@rxfx/after';

import {
  createQueueingService,
  createReplacingService,
  createBlockingService,
  createService,
  createTogglingService,
} from '../src/createService';

import type { ProcessLifecycleCallbacks, ReducerProducer } from '../src/types';

describe('createService', () => {
  const testNamespace = 'testService';
  const bus = new Bus<Action<any>>();
  const handler = jest.fn((_) => {
    // console.log(s);
  });
  let testService = createService<any, any, Error>(testNamespace, bus, handler);
  beforeEach(() => {
    bus.reset(); // stops existing services, handlings
  });
  const counterReducer = (s = 0, e) => (e ? s + 1 : s);

  it('triggers a request to the bus when called', () => {
    const seen = eventsOf(bus);
    testService('3');

    expect(seen).toMatchObject([testService.actions.request('3')]);
  });

  describe('arguments', () => {
    describe('actionNamespace', () => {
      it.todo('prefixes action types');
    });

    describe('bus', () => {
      it.todo('recieves requests');
      it.todo('recieves observed events');
    });

    describe('handler', () => {
      it('can return an item an Observable will be made from', async () => {
        const service = createService<void, number, Error>(
          testNamespace,
          bus,
          () => Promise.resolve(3.14159) // for options see https://rxjs.dev/api/index/function/from
        );
        const seen: Action<unknown>[] = [];
        bus.spy((e) => seen.push(e));
        service.request();
        await Promise.resolve();
        expect(seen).toContainEqual({
          type: 'testService/next',
          payload: 3.14159,
        });
      });
    });

    describe('reducerProducer', () => {
      const initialState = { count: 0 };
      const reduxStyle = (state = initialState, e: Action<unknown>) => {
        if (!e) return state;
        if (e?.type !== 'counter/started') return state;

        return { count: state.count + 1 };
      };

      const typeSafeStyle: ReducerProducer<void, number, Error, number> =
        (events) =>
        (count = 0, event) => {
          if (events.started.match(event)) {
            return count + 1;
          }
          return count;
        };

      const rtkStyle = (state: typeof initialState, e: Action<unknown>) => {
        if (e?.type !== 'counter/started') return state;

        return { count: state.count + 1 };
      };
      rtkStyle.getInitialState = () => initialState;

      it('can return a Redux Style reducer', () => {
        const counterService = createService<
          void,
          number,
          Error,
          typeof initialState
        >('counter', bus, handler, () => reduxStyle);
        expect(counterService.state.value).toHaveProperty('count', 0);
        counterService.request();
        expect(counterService.state.value).toHaveProperty('count', 1);
      });

      it('can return a ReduxToolkit-Style reducer', () => {
        const counterService = createService<
          void,
          number,
          Error,
          typeof initialState
        >('counter', bus, handler, () => rtkStyle);
        expect(counterService.state.value).toHaveProperty('count', 0);
        counterService.request();
        expect(counterService.state.value).toHaveProperty('count', 1);
      });

      it('can use a typesafe reducerproducer', () => {
        const counterService = createService<void, number, Error, number>(
          'counter',
          bus,
          handler,
          typeSafeStyle
        );
        expect(counterService.state.value).toBe(0);
        counterService.request();
        expect(counterService.state.value).toBe(1);
      });

      it('wont error if it doesnt default the event', () => {
        const counterService = createService<
          void,
          void,
          Error,
          typeof initialState
        >(
          'counter',
          bus,
          () => undefined,
          () => reduxStyle
        );
        expect(counterService.state.value).toHaveProperty('count', 0);
        counterService.request();
        expect(counterService.state.value).toHaveProperty('count', 1);
      });

      it('can be created ', () => {});
    });
  });

  describe('return value', () => {
    describe('#state', () => {
      const initial = {
        constants: [] as number[],
      };
      type InitialState = typeof initial;
      const handler = () => concat(after(0, 3.14), after(0, 2.718));
      const reducerProducer = (ACs) => {
        const reducer = (state = initial, e) => {
          if (e?.type !== ACs.next.type) return state;
          return {
            constants: [...state.constants, e?.payload],
          };
        };
        return reducer;
      };

      it('reduces into .state', () => {
        const stateService = createService<
          string | void,
          number,
          Error,
          InitialState
        >(testNamespace, bus, handler, reducerProducer);

        expect(stateService.state.value).toEqual({ constants: [] });

        stateService.request();
        expect(stateService.state.value).toEqual({ constants: [3.14, 2.718] });
      });

      it('does not reduce until after handlers', () => {
        const seenStates: InitialState[] = [];
        let count = 1;
        const handler = () => {
          seenStates.push(stateService.state.value);
          return of(count++);
        };

        const stateService = createService<
          string | void,
          number,
          Error,
          InitialState
        >(testNamespace, bus, handler, reducerProducer);

        expect(stateService.state.value).toEqual({ constants: [] });

        stateService.request()
        expect(seenStates).toEqual([{ constants: [] }]);

        stateService.request()
        expect(seenStates).toEqual([{ constants: [] }, { constants: [1] }]);

        expect(stateService.state.value).toEqual({ constants: [1, 2] });
      });

      it('does not reduce if handler throws', () => {
        const seenStates: InitialState[] = [];
        const handler = () => {
          seenStates.push(stateService.state.value);
          return throwError('oops');
        };

        const stateService = createService<
          string | void,
          number,
          Error,
          InitialState
        >(testNamespace, bus, handler, reducerProducer);

        expect(stateService.state.value).toEqual({ constants: [] });

        stateService.request()
        expect(seenStates).toEqual([{ constants: [] }]);

        stateService.request()
        expect(seenStates).toEqual([{ constants: [] }, { constants: [] }]);

        expect(stateService.state.value).toEqual({ constants: [] });
      });

      it('continues reducing after an error, alerting bus.errors', async () => {
        const seenErrors: any[] = [];

        let hasThrown = false;
        const throwingReducer =
          (ACs) =>
          (state = 0, e) => {
            if (!e) return state;
            if (ACs.request.match(e)) {
              if (state !== 1 || hasThrown) {
                return state + 1;
              }
              hasThrown = true;
              throw new Error('oops');
            }
            return state;
          };

        const stateService = createService<void, void, Error, number>(
          testNamespace,
          bus,
          () => after(0),
          throwingReducer
        );
        bus.errors.subscribe((e) => seenErrors.push(e));

        expect(stateService.state.value).toBe(0);
        expect(seenErrors).toHaveLength(0);

        stateService.request()
        expect(stateService.state.value).toBe(1);

        // errors: return the same state, send to bus.errors, resume
        stateService.request()
        expect(stateService.state.value).toBe(1);
        expect(seenErrors).toMatchInlineSnapshot(`
          [
            [Error: oops],
          ]
        `);
        // continues to reduce
        stateService.request()
        expect(stateService.state.value).toBe(2);
      });
    });

    describe('#isHandling', () => {
      let asyncHandler, asyncService;
      const ASYNC_DELAY = 10;

      beforeEach(() => {
        asyncHandler = jest.fn(() => {
          return after(ASYNC_DELAY, '3.14');
        });
        asyncService = createService<string, string, Error>(
          testNamespace,
          bus,
          asyncHandler
        );
      });

      it('initially is false', () => {
        expect(asyncService.isHandling.value).toBeFalsy();
      });

      it('becomes true when a handler is in-flight', async () => {
        asyncService();

        expect(asyncHandler).toHaveBeenCalled();
        expect(asyncService.isHandling.value).toBeTruthy();

        await after(ASYNC_DELAY);
        expect(asyncService.isHandling.value).toBeFalsy();
      });

      it('emits changes only on request, completed, error, unsubscribe, and when changed', () => {
        const statuses: boolean[] = [];
        asyncService.isHandling.subscribe((s) => statuses.push(s));

        asyncService();
        // trigger again
        asyncService();

        // no double true
        expect(statuses).toEqual([false, true]);
      });

      describe('Immediate', () => {
        it('toggles on and off across multiple handlings', async () => {
          const statuses: boolean[] = [];
          const svc = createService<void, string, Error>(
            'isHandling-immediate',
            bus,
            () => after(ASYNC_DELAY, '3.14')
          );

          svc.isHandling.subscribe((s) => statuses.push(s));
          expect(statuses).toEqual([false]);

          svc();
          expect(statuses).toEqual([false, true]);

          //
          svc();
          expect(statuses).toEqual([false, true]);
          await after(ASYNC_DELAY * 2);
          expect(statuses).toEqual([false, true, false]);
        });
      });

      describe('Queueing', () => {
        it('toggles on and off across multiple handlings', async () => {
          const statuses: boolean[] = [];
          const svc = createQueueingService<void, string, Error>(
            'isHandling-queueing',
            bus,
            () => after(ASYNC_DELAY, '3.14')
          );

          svc.isHandling.subscribe((s) => statuses.push(s));
          expect(statuses).toEqual([false]);

          svc();
          expect(statuses).toEqual([false, true]);

          //
          svc();
          expect(statuses).toEqual([false, true]);
          await after(ASYNC_DELAY * 3);

          expect(statuses).toEqual([false, true, false, true, false]);
        });
      });

      describe('Replacing', () => {
        it('toggles on and off across multiple handlings', async () => {
          const statuses: boolean[] = [];
          const svc = createReplacingService<void, string, Error>(
            'isHandling-replacing',
            bus,
            () => after(ASYNC_DELAY, '3.14')
          );

          svc.isHandling.subscribe((s) => statuses.push(s));
          expect(statuses).toEqual([false]);

          svc();
          expect(statuses).toEqual([false, true]);

          //
          svc();
          expect(statuses).toEqual([false, true, false, true]);
          await after(ASYNC_DELAY * 2);

          expect(statuses).toEqual([false, true, false, true, false]);
        });
      });

      describe('Toggling', () => {
        it('toggles on and off across multiple handlings', async () => {
          const statuses: boolean[] = [];
          const svc = createTogglingService<void, string, Error>(
            'isHandling-toggling',
            bus,
            () => after(ASYNC_DELAY, '3.14')
          );

          svc.isHandling.subscribe((s) => statuses.push(s));
          expect(statuses).toEqual([false]);

          svc();
          expect(statuses).toEqual([false, true]);

          //
          svc();
          expect(statuses).toEqual([false, true, false]);
          await after(ASYNC_DELAY * 2);

          expect(statuses).toEqual([false, true, false]);
        });
      });

      it('terminates on a reset', () => {
        // our stream will close - we'll get no statuses after
        let didClose = false;
        asyncService.isHandling.subscribe({
          complete() {
            didClose = true;
          },
        });

        bus.reset();
        expect(asyncService.isHandling.isStopped).toBeTruthy();
        expect(didClose).toBeTruthy();
        expect(asyncService.isHandling.observers).toHaveLength(0);
      });

      it('has a final value of false on bus.reset()', async () => {
        const statuses: boolean[] = [];
        asyncService.isHandling.subscribe((s) => statuses.push(s));

        asyncService(); // true
        bus.reset(); // to false
        expect(asyncService.isHandling.isStopped).toBeTruthy();
        expect(statuses).toEqual([false, true, false]);

        await after(ASYNC_DELAY);
        expect(statuses).toEqual([false, true, false]);
      });

      it('has a final value of false on stop()', async () => {
        const statuses: boolean[] = [];
        asyncService.isHandling.subscribe((s) => statuses.push(s));

        asyncService(); // to true
        asyncService.stop(); // to false
        expect(asyncService.isHandling.isStopped).toBeTruthy();

        expect(statuses).toEqual([false, true, false]);

        await after(ASYNC_DELAY);
        expect(statuses).toEqual([false, true, false]);
      });
    });

    describe('#isActive', () => {
      const ASYNC_DELAY = 10;

      describe('Immediate', () => {
        it('stays true across multiple activities (F, T, F)', async () => {
          const statuses: boolean[] = [];
          const svc = createService<void, string, Error>(
            'isActive-immediate',
            bus,
            () => after(ASYNC_DELAY, '3.14')
          );

          svc.isActive.subscribe((s) => statuses.push(s));
          expect(statuses).toEqual([false]);

          svc();
          expect(statuses).toEqual([false, true]);

          //
          svc();
          expect(statuses).toEqual([false, true]);
          await after(ASYNC_DELAY * 3);

          expect(statuses).toEqual([false, true, false]); // YAY!
        });
      });

      describe('Queueing', () => {
        it('stays true across multiple activities (F, T, F)', async () => {
          const statuses: boolean[] = [];
          const svc = createQueueingService<void, string, Error>(
            'isActive-immediate',
            bus,
            () => after(ASYNC_DELAY, '3.14')
          );

          svc.isActive.subscribe((s) => statuses.push(s));
          expect(statuses).toEqual([false]);

          svc();
          expect(statuses).toEqual([false, true]);

          //
          svc();
          expect(statuses).toEqual([false, true]);
          await after(ASYNC_DELAY * 3);

          expect(statuses).toEqual([false, true, false]); // YAY!
        });
      });

      describe('Replacing', () => {
        it('stays true across multiple activities (F, T, F)', async () => {
          const statuses: boolean[] = [];
          const svc = createReplacingService<void, string, Error>(
            'isActive-replacing',
            bus,
            () => after(ASYNC_DELAY, '3.14')
          );

          svc.isActive.subscribe((s) => statuses.push(s));
          expect(statuses).toEqual([false]);

          svc();
          expect(statuses).toEqual([false, true]);

          //
          svc();
          expect(statuses).toEqual([false, true]);
          await after(ASYNC_DELAY * 3);

          expect(statuses).toEqual([false, true, false]); // YAY!
        });
      });

      describe('Blocking', () => {
        it('stays true across multiple activities (F, T, F)', async () => {
          const statuses: boolean[] = [];
          const svc = createReplacingService<void, string, Error>(
            'isActive-blocking',
            bus,
            () => after(ASYNC_DELAY, '3.14')
          );

          svc.isActive.subscribe((s) => statuses.push(s));
          expect(statuses).toEqual([false]);

          svc();
          expect(statuses).toEqual([false, true]);

          //
          svc();
          expect(statuses).toEqual([false, true]);
          await after(ASYNC_DELAY * 3);

          expect(statuses).toEqual([false, true, false]); // YAY!
        });
      });
      describe('Toggling', () => {
        it('stays true across multiple activities (F, T, F)', async () => {
          const statuses: boolean[] = [];
          const svc = createTogglingService<void, string, Error>(
            'isActive-toggling',
            bus,
            () => after(ASYNC_DELAY, '3.14')
          );

          svc.isActive.subscribe((s) => statuses.push(s));
          expect(statuses).toEqual([false]);

          svc();
          expect(statuses).toEqual([false, true]);

          //
          svc();
          expect(statuses).toEqual([false, true]);
          await after(ASYNC_DELAY * 3);

          expect(statuses).toEqual([false, true, false]); // YAY!
        });
      });
    });

    describe('#currentError', () => {
      const ex = new Error('foo');

      it('gets set upon an error, cleared the next start', async () => {
        let i = 0;
        const svc = createService<void, string, Error>('err', bus, () => {
          if (i++ === 0) {
            return Promise.reject(ex);
          }
          return of('no error');
        });

        expect(svc.currentError.value).toBeNull();
        svc.request();
        await after(Promise.resolve());
        expect(svc.currentError.value).toEqual(ex);
        svc.request();
        expect(svc.currentError.value).toBeNull();
        await after(Promise.resolve());
        expect(svc.currentError.value).toBeNull();
      });
    });

    describe('#bus', () => {
      it('refers to the bus it was created with', () => {
        const stateService = createService(testNamespace, bus, handler);
        expect(stateService.bus === bus).toBeTruthy();
      });
    });

    describe('#namespace', () => {
      it('returns the namespace it was created with', () => {
        const stateService = createService(testNamespace, bus, handler);
        expect(stateService.namespace).toEqual(testNamespace);
      });
    });

    describe('#addTeardown', () => {
      it('adds a function to be called once when stop() is invoked', () => {
        let tornDownTimes = 0;
        const stateService = createService(testNamespace, bus, handler);
        stateService.addTeardown(() => {
          tornDownTimes += 1;
        });
        expect(tornDownTimes).toBe(0);
        stateService.stop();
        expect(tornDownTimes).toBe(1);
        stateService.stop();
        expect(tornDownTimes).toBe(1);
      });
    });

    describe('#actions: a property for each actioncreator', () => {
      [
        'request',
        'cancel',
        'started',
        'next',
        'error',
        'complete',
        'canceled',
      ].forEach((subType) => {
        it(`has property ${subType}`, () => {
          expect(testService.actions).toHaveProperty(subType);
          expect(testService.actions[subType]()).toMatchObject({
            type: `${testNamespace}/${subType}`,
          });
        });
      });

      describe('Cancelation', () => {
        const testService = createService('test-async', bus, () =>
          after(10, Math.PI)
        );

        it('can cancel with .cancelCurrent()', async () => {
          const seen = eventsOf(bus);
          testService(1);
          testService.cancelCurrent();
          // also bus.trigger(testService.actions.cancel());
          // long enough to see completion
          await after(100);
          expect(seen.map((e) => e.type)).toEqual([
            'test-async/request',
            'test-async/cancel',
          ]);
        });
        it('can cancel existing, and any queued with .cancelCurrentAndQueued()', async () => {
          const qService = createQueueingService('number', bus, (n) =>
            after(10, n)
          );
          const seen = [];
          qService.events.subscribe((e) => seen.push(e.type));

          qService(1);
          qService(2);

          // qService.cancelCurrentAndQueued();
          qService.cancelCurrent();
          expect(qService.isHandling.value).toBeTruthy();

          // long enough to see completion
          await after(100);
          expect(qService.isHandling.value).toBeFalsy();
          expect(seen).toMatchInlineSnapshot(`
            [
              "number/request",
              "number/started",
              "number/request",
              "number/cancel",
              "number/canceled",
              "number/started",
              "number/next",
              "number/complete",
            ]
          `);
        });
        it('has property stop()', () => {
          expect(testService).toHaveProperty('stop');
        });
        it('removes listeners and cancels handlings when stop()-ed.', async () => {
          expect(testService).toHaveProperty('stop');
          const seen = eventsOf(bus);
          testService(1);
          testService.stop();
          await after(100);
          expect(seen.map((e) => e.type)).toEqual(['test-async/request']);
        });
      });
    });

    describe('#send', () => {
      it('gets a Promise for a response', async () => {
        const counterService = createService<number, number, Error>(
          'counter',
          bus,
          (i) => after(50, i + 1) // replies with increment soon
        );

        const response = await counterService.send(3);
        expect(response.payload).toBe(4);
      });
    });

    describe('#errors', () => {
      it('notifies of /error events', () => {
        expect(testService.errors).toBeDefined();
      });
    });

    describe('#responses', () => {
      it('notifies of /next events', () => {
        expect(testService.responses).toBeDefined();
      });
    });

    describe('#observe', () => {
      const spies: Partial<ProcessLifecycleCallbacks<void, string, Error>> = {
        request: jest.fn(),
        started: jest.fn(),
        next: jest.fn(),
        complete: jest.fn(),
        cancel: jest.fn(),
        canceled: jest.fn(),
        error: jest.fn(),
        finalized: jest.fn(),
      };

      let req = 0;
      const maybeThrow = new Observable<string>((notify) => {
        req++;
        if (req === 2) {
          notify.error('fuuu');
          return;
        }
        notify.next(`req-${req}`);
        notify.complete();
      });
      beforeEach(() => {
        req = 0;
      });

      describe('Immediate mode', () => {
        it('Handles lifecycle events with callbacks', async () => {
          const counterService = createService<void, string, Error, number>(
            'xxx',
            bus,
            () => after(1, maybeThrow),
            () => counterReducer
          );
          counterService.observe(spies);
          const seen = [];
          counterService.events.subscribe((e) => seen.push(e.type));
          // trigger
          counterService.request(); // req 0

          expect(spies.request).toHaveBeenCalledWith(undefined);
          expect(spies.started).toHaveBeenCalled();
          await after(1);

          expect(spies.next).toHaveBeenCalledWith('req-1');
          expect(spies.complete).toHaveBeenCalledTimes(1);

          // cancelation (only gets cancel, not canceled atm)
          counterService.request(); // req 1
          counterService.cancelCurrent();
          expect(spies.cancel).toHaveBeenCalled();
          expect(spies.canceled).toHaveBeenCalled();

          expect(spies.complete).toHaveBeenCalledTimes(1);

          // still workin
          counterService.request();
          await after(1);

          // error
          counterService.request(); // req 2
          expect(spies.error).toHaveBeenCalledWith('fuuu');

          await after(1);
          expect(spies.finalized).toHaveBeenCalledTimes(4);
          expect(seen).toMatchInlineSnapshot(`
            [
              "xxx/request",
              "xxx/started",
              "xxx/next",
              "xxx/complete",
              "xxx/request",
              "xxx/started",
              "xxx/cancel",
              "xxx/canceled",
              "xxx/request",
              "xxx/started",
              "xxx/error",
              "xxx/request",
              "xxx/started",
              "xxx/next",
              "xxx/complete",
            ]
          `);
        });
      });

      describe('Queueing mode', () => {
        const queuer = createQueueingService;
        it('Handles lifecycle events with callbacks', async () => {
          // prettier-ignore
          const counterService = queuer<number, string, Error, number>(
            'xyx',
            bus,
            () => {req++; return after(1, `req-${req}`)},
            () => counterReducer
          );
          counterService.observe(spies);
          const seen = [];
          counterService.events.subscribe((e) => seen.push(e.type));
          // cancelation
          counterService.request(1);
          counterService.cancelCurrent();
          await after(1);
          counterService.request(2);
          counterService.request(3);
          counterService.cancelCurrent(); // 2

          await after(1);
          expect(seen).toMatchInlineSnapshot(`
            [
              "xyx/request",
              "xyx/started",
              "xyx/cancel",
              "xyx/canceled",
              "xyx/request",
              "xyx/started",
              "xyx/request",
              "xyx/cancel",
              "xyx/canceled",
              "xyx/started",
              "xyx/next",
              "xyx/complete",
            ]
          `);

          // expect(spies.cancel).toHaveBeenCalled();
          // expect(spies.canceled).toHaveBeenCalled();

          // expect(spies.complete).toHaveBeenCalledTimes(1);

          // // still workin
          // counterService.request();
          // await after(1);

          // // error
          // counterService.request(); // req 2
          // expect(spies.error).toHaveBeenCalledWith('fuuu');

          // await after(1);
          // expect(spies.finalized).toHaveBeenCalledTimes(4);
          // expect(seen).toMatchInlineSnapshot();
        });
      });
    });
  });

  it('triggers events from observable handlers when no error', () => {
    const seen = eventsOf(bus);
    testService = createService<string, string, Error>(testNamespace, bus, () =>
      after(0, 'bar')
    );
    testService('foo');
    expect(seen).toEqual([
      testService.actions.request('foo'),
      testService.actions.started(),
      testService.actions.next('bar'),
      testService.actions.complete(),
    ]);
  });

  it('triggers events from Promise handlers when no error', async () => {
    const seen = eventsOf(bus);
    testService = createService<string, string, Error>(testNamespace, bus, () =>
      Promise.resolve('bar')
    );
    testService('foo');

    await Promise.resolve();

    expect(seen).toEqual([
      testService.actions.request('foo'),
      testService.actions.started(),
      testService.actions.next('bar'),
      testService.actions.complete(),
    ]);
  });

  it('triggers events from Promise-handlers when no error', async () => {
    const seen = eventsOf(bus);
    testService = createService<string, string, Error>(testNamespace, bus, () =>
      Promise.resolve('bar')
    );
    testService('foo');

    await Promise.resolve();

    expect(seen).toEqual([
      testService.actions.request('foo'),
      testService.actions.started(),
      testService.actions.next('bar'),
      testService.actions.complete(),
    ]);
  });

  it('triggers events from observable handlers, even when they error', async () => {
    const seen = [];
    testService = createService<string, string, Error>(testNamespace, bus, () =>
      throwError(() => new Error('dang!'))
    );
    testService.events.subscribe((e) => seen.push(e));
    testService('foo');
    await after(100);
    expect(seen).toMatchInlineSnapshot(`
      [
        {
          "payload": "foo",
          "type": "testService/request",
        },
        {
          "payload": undefined,
          "type": "testService/started",
        },
        {
          "error": true,
          "payload": [Error: dang!],
          "type": "testService/error",
        },
      ]
    `);
  });

  it('terminates effects on a bus.reset', async () => {
    const afterFinishedSpy = jest.fn();

    testService = createService<string, string, Error>(testNamespace, bus, () =>
      after(10, afterFinishedSpy)
    );
    testService('foo');
    bus.reset();
    await after(10);
    expect(afterFinishedSpy).not.toHaveBeenCalled();
  });

  describe('createQueueingService', () => {
    it.todo('calls createService with concatMap');
    it('can be called', () => {
      expect.assertions(0);
      testService = createQueueingService(testNamespace, bus, (s) =>
        after(0, s)
      );
    });
  });

  describe('createReplacingService', () => {
    it.todo('calls createService with switchMap');
    it('can be called', () => {
      testService = createReplacingService(testNamespace, bus, (s) =>
        after(0, s)
      );
    });
  });

  describe('createBlockingService', () => {
    it.todo('calls createService with exhaustMap');
    it('can be called', () => {
      expect.assertions(0);
      testService = createBlockingService(testNamespace, bus, (s) =>
        after(0, s)
      );
    });
  });

  describe('createTogglingService', () => {
    it.todo('calls createService with toggleMap');
    it('can be called', async () => {
      const testService = createTogglingService<void, void, void>(
        testNamespace,
        bus,
        (s) => after(100, s)
      );
      const seen = [];
      bus.spy((e) => seen.push(e));

      testService();
      await after(10);
      testService();
      await after(100);
      testService();
      await after(100);
      expect(seen.map((e) => e.type)).toMatchInlineSnapshot(`
        [
          "testService/request",
          "testService/started",
          "testService/request",
          "testService/canceled",
          "testService/request",
          "testService/started",
          "testService/next",
          "testService/complete",
        ]
      `);
    });
  });
});

function eventsOf<T>(bus: Bus<T>) {
  const seen: Array<T> = [];
  bus.spy((e) => {
    seen.push(e);
  });
  return seen;
}
