import { after } from '@rxfx/after';
import { queueOnlyLatest } from '@rxfx/operators';
import {
  createBlockingEffect,
  createCustomEffect,
  createDebouncedEffect,
  createEffect,
  createImmediateEffect,
  createQueueingEffect,
  createSwitchingEffect,
  createThrottledEffect,
  createTogglingEffect,
  EffectRunner,
  shutdownAll,
  trace,
} from '../src/createEffect';
import { concat, mergeMap, of, Subscription, throwError } from 'rxjs';
import { z } from 'zod/v4';
import { ProcessLifecycleCallbacks } from '../src/types';

const DELAY = 10;

/**
 * Related ChatGPT sessions for test writing:
 * [Immediate vs Queueing](https://chatgpt.com/share/d324a2b3-e8b6-471b-8b46-5aa0b0bc36a2)
 * [Throttled](https://chatgpt.com/share/0466b99d-77a3-4df5-85bf-1a4d464ec925)
 */
describe('createEffect - returns a function with properties which', () => {
  it('calls the wrapped fn synchronously as a function', () => {
    const fxFn = jest.fn();
    const fx = createEffect<void>(fxFn);

    fx();

    expect(fxFn).toHaveBeenCalled();
  });

  it('calls the wrapped fn synchronously via .request()', () => {
    const fxFn = jest.fn();
    const fx = createEffect<void>(fxFn);

    fx.request();

    expect(fxFn).toHaveBeenCalled();
  });

  it('is cancelable', async () => {
    const liked = [] as string[];
    const likePost = createEffect((postId: number) => {
      return after(10, () => {
        const msg = `post liked ${postId}`;
        liked.push(msg);
        return msg;
      });
    });

    likePost(123);
    likePost(234);
    likePost.cancelCurrent();

    // When both are done
    await after(10);

    // The responses don't arrive
    expect(liked).toMatchInlineSnapshot(`[]`);

    // yet still requestable
    likePost(345);
    await after(10);
    expect(liked).toMatchInlineSnapshot(`
      [
        "post liked 345",
      ]
    `);
  });

  it('can be shutdown', async () => {
    const liked = [] as string[];
    const likePost = createEffect((postId: number) => {
      return after(10, () => {
        const msg = `post liked ${postId}`;
        liked.push(msg);
        return msg;
      });
    });

    likePost(123);
    likePost(234);
    likePost.shutdown();

    // When both are done
    await after(10);

    // The responses don't arrive
    expect(liked).toMatchInlineSnapshot(`[]`);

    // and no longer requestable
    likePost(345);
    await after(10);
    expect(liked).toEqual([]);
  });

  it('can be shutdown via shutdownAll', async () => {
    const liked = [] as string[];
    const likePost = createEffect((postId: number) => {
      return after(10, () => {
        const msg = `post liked ${postId}`;
        liked.push(msg);
        return msg;
      });
    });

    likePost(123);
    likePost(234);
    shutdownAll();

    // When both are done
    await after(10);

    // The responses don't arrive
    expect(liked).toMatchInlineSnapshot(`[]`);

    // and no longer requestable
    likePost(345);
    await after(10);
    expect(liked).toEqual([]);
  });

  it('doesnt nest handlings', () => {
    const ops = [] as string[];

    const likePost = createEffect<number, void>((postId: number) => {
      ops.push(`begin ${postId}`);
      if (postId === 123) {
        likePost(234);
      }
      ops.push(`end ${postId}`);
    });

    likePost(123);

    /* Keep handlers from recurring upon the stack, preventing:
        "begin 123",
        "begin 234",
        "end 234",
        "end 123",
    */

    expect(ops).toMatchInlineSnapshot(`
      [
        "begin 123",
        "end 123",
        "begin 234",
        "end 234",
      ]
    `);

    // Note it handles 234 in the same call stack - no extra time,
    // just strict sequencing.
  });

  it('can provide a Promise for the next response via .send(). Not concurrency-safe!', async () => {
    const counterFx = createEffect<number, number>((i: number) =>
      after(DELAY, i + 1)
    );
    const REQ1 = 25;
    const REQ2 = 27;

    const resP = counterFx.send(REQ1);
    const response = await resP;
    expect(response).toBe(REQ1 + 1);

    // Not concurrency-safe! Use CQRS instead or prevent concurrency
    const res2 = counterFx.send(REQ1);
    const res3 = counterFx.send(REQ2);

    const [response2, response3] = await Promise.all([res2, res3]);
    expect(response2).toBe(REQ1 + 1);
    expect(response3).toBe(REQ1 + 1);
  });
  describe('Effect Handler', () => {
    it('Can return a Promise', async () => {
      const VALUE = 1.1;
      const handler = jest.fn().mockResolvedValue(VALUE);
      const fx = createEffect<void, number>(handler);

      const responses = [] as number[];
      fx.responses.subscribe((res) => responses.push(res));

      // call it
      fx();
      // flush it out
      await Promise.resolve();
      // TODO await
      expect(responses).toEqual([VALUE]);
    });

    it('Can return an Observable (sync, single)', async () => {
      const VALUE = 1.1;
      const handler = jest.fn().mockReturnValue(of(VALUE));
      const fx = createEffect<void, number>(handler);

      const responses = [] as number[];
      fx.responses.subscribe((res) => responses.push(res));

      // call it
      fx();
      expect(responses).toEqual([VALUE]);
    });
    it('Can return an Observable (async, single)', async () => {
      const VALUE = 1.2;
      const DELAY = 1;
      const handler = jest.fn().mockReturnValue(after(DELAY, VALUE));
      const fx = createEffect<void, number>(handler);

      const responses = [] as number[];
      fx.responses.subscribe((res) => responses.push(res));

      // call it
      fx();
      // await
      await after(DELAY);

      // we have the value now
      expect(responses).toEqual([VALUE]);
    });

    it('Can return an Observable (async, multiple) ⭐️', async () => {
      const VALUE = 1.2;
      const DELAY = 1;
      const handler = jest
        .fn()
        .mockReturnValue(concat(after(DELAY, VALUE), after(DELAY, VALUE)));
      const fx = createEffect<void, number>(handler);

      const responses = [] as number[];
      fx.responses.subscribe((res) => responses.push(res));

      // call it
      fx();
      // await
      await after(DELAY);
      // we have the first value
      expect(responses).toEqual([VALUE]);

      // await
      await after(DELAY);
      // we have both values now
      expect(responses).toEqual([VALUE, VALUE]);
    });

    it('Can return an iterable', () => {
      const VALUES = [1.1, 1.2];
      const handler = jest.fn().mockReturnValue(VALUES);
      const fx = createEffect<void, number>(handler);

      const responses = [] as number[];
      fx.responses.subscribe((res) => responses.push(res));

      // call it
      fx();

      // we have the value now
      expect(responses).toEqual(VALUES);
    });

    it('can track state with a reducer', async () => {
      const likePost = createEffect<number, string, Error, any[]>(
        (postId: number) => {
          return after(10, () => {
            return `post liked ${postId}`;
          });
        },
        mergeMap,
        []
      );
      expect(likePost.state.value).toEqual([]);

      // Supply a reducer so that likePost.state is populated
      likePost.reduceWith((s = ['YYY'], e) => {
        if (e.type === 'response') {
          return [...s, e.payload];
        }
        return [...s, e];
      }, []);
      expect(likePost.state.value).toEqual([]);

      likePost(123);
      likePost(345);
      await after(10);
      likePost(456);
      likePost.cancelCurrent();

      expect(likePost.state.value).toMatchInlineSnapshot(`
              [
                {
                  "payload": 123,
                  "type": "request",
                },
                {
                  "payload": 123,
                  "type": "started",
                },
                {
                  "payload": 345,
                  "type": "request",
                },
                {
                  "payload": 345,
                  "type": "started",
                },
                "post liked 123",
                {
                  "payload": 123,
                  "type": "complete",
                },
                "post liked 345",
                {
                  "payload": 345,
                  "type": "complete",
                },
                {
                  "payload": 456,
                  "type": "request",
                },
                {
                  "payload": 456,
                  "type": "started",
                },
                {
                  "payload": 456,
                  "type": "canceled",
                },
              ]
          `);
    });

    const calls = [] as { type: string; arg: number }[];
    const spies: Partial<ProcessLifecycleCallbacks<number, number>> = {
      request: jest.fn((arg) => calls.push({ type: 'request', arg })),
      started: jest.fn((arg) => calls.push({ type: 'started', arg })),
      response: jest.fn((arg) => calls.push({ type: 'response', arg })),
      complete: jest.fn((arg) => calls.push({ type: 'complete', arg })),
      canceled: jest.fn((arg) => calls.push({ type: 'canceled', arg })),
      error: jest.fn((arg) => calls.push({ type: 'error', arg })),
      finalized: jest.fn((arg) => calls.push({ type: 'finalized', arg })),
    };

    it('can be observed (request shouldnt lag started)', async () => {
      const countFx = createEffect<number, number, Error, number>((i) =>
        after(1, () => i * 2)
      );

      countFx.observe(spies);
      // trigger
      countFx.request(1); // req 0

      expect(spies.request).toHaveBeenCalledWith(1);
      expect(spies.started).toHaveBeenCalledTimes(1);

      await after(1);
      expect(spies.complete).toHaveBeenCalledTimes(1);

      // XXX //
      expect(spies.finalized).toHaveBeenCalledTimes(1);

      countFx(3);
      expect(spies.request).toHaveBeenCalledWith(3);

      expect(calls).toMatchInlineSnapshot(`
        [
          {
            "arg": 1,
            "type": "request",
          },
          {
            "arg": 1,
            "type": "started",
          },
          {
            "arg": 2,
            "type": "response",
          },
          {
            "arg": 1,
            "type": "complete",
          },
          {
            "arg": 1,
            "type": "finalized",
          },
          {
            "arg": 3,
            "type": "request",
          },
          {
            "arg": 3,
            "type": "started",
          },
        ]
      `);
    });

    describe('Errors: Do not affect caller, requests are still handled, and errors appear on #errors', () => {
      let errs = [];
      let counterFx: EffectRunner<number, number>;

      beforeEach(() => {
        errs = [];
      });

      it('Synchronously thrown error', () => {
        counterFx = createEffect<number, number>((i: number) => {
          throw new Error(`req ${i} errored`);
        });
        counterFx?.errors.subscribe((e) => errs.push(e));

        counterFx(1);
        expect(errs[0]).toHaveProperty('message', 'req 1 errored');
        counterFx(2);
        expect(errs[1]).toHaveProperty('message', 'req 2 errored');
      });
      it('Zod Request Schema Validation error', () => {
        const Req = z.object({ reqId: z.number() });
        type Request = z.infer<typeof Req>;

        const reqFx = createEffect<Request, number>((req: Request) => {
          Req.parse(req);
          return Promise.resolve(314 + req.reqId);
        });
        reqFx?.errors.subscribe((e) => errs.push(e));

        // @ts-ignore
        reqFx({ requestId: 33 });
        // sync validation
        expect(errs[0]).toBeInstanceOf(z.ZodError);
        expect(errs[0]).toHaveProperty('issues[0].message');
      });

      it('Zod Response Schema Validation error', async () => {
        const Res = z.object({ userId: z.number() });
        type Response = z.infer<typeof Res>;

        // @ts-ignore
        const reqFx = createEffect<number, Response>((req: number) => {
          return Promise.resolve(req + 314).then((response) => {
            Res.parse(response);
            return response;
          });
        });
        reqFx?.errors.subscribe((e) => errs.push(e));

        reqFx(25);
        await after(Promise.resolve());

        expect(errs[0]).toBeInstanceOf(z.ZodError);
        expect(errs[0]).toHaveProperty(
          'issues[0].message',
          'Invalid input: expected object, received number'
        );
      });

      it('Rejected Async Promise', async () => {
        counterFx = createEffect<number, number>((i: number) => {
          return after(DELAY, () => {
            throw new Error(`bad promise ${i}`);
          });
        });
        counterFx?.errors.subscribe((e) => errs.push(e));

        counterFx(1);
        counterFx(2);
        await after(DELAY);
        expect(errs).toHaveLength(2);
        expect(errs[0]).toHaveProperty('message', 'bad promise 1');
        expect(errs[1]).toHaveProperty('message', 'bad promise 2');
      });

      it('Observable with Error', async () => {
        counterFx = createEffect<number, number>((i: number) => {
          return after(
            DELAY,
            throwError(() => new Error(`bad Observable ${i}`))
          );
        });
        counterFx?.errors.subscribe((e) => errs.push(e));

        counterFx(1);
        counterFx(2);
        await after(DELAY);
        expect(errs).toHaveLength(2);
        expect(errs[0]).toHaveProperty('message', 'bad Observable 1');
        expect(errs[1]).toHaveProperty('message', 'bad Observable 2');
      });
    });

    describe('Errors', () => {
      let counterFx: EffectRunner<number, any>;

      describe('#currentError', () => {
        it('Shows the most recent error', () => {
          counterFx = createEffect<number, void>((i: number) => {
            if (i === 1) {
              throw new Error(`req ${i} errored`);
            }
          });

          expect(counterFx?.currentError.value).toBeNull();

          counterFx(1);

          expect(counterFx?.currentError.value).toHaveProperty(
            'message',
            'req 1 errored'
          );

          // TODO: Test that the error is cleared by the next start
          counterFx(2);
          expect(counterFx?.currentError.value).toBeNull();
        });
      });
    });
  });
  describe('Observable properties', () => {
    it('#lastResponse', async () => {
      const likePost = createEffect((postId: number) => {
        return after(10, () => {
          return `post liked ${postId}`;
        });
      });

      likePost(123);

      // When both are done
      await after(10);

      expect(likePost.lastResponse.value).toBe(`post liked 123`);
    });

    it.todo('exposes requests');
    it.todo('exposes starts');
    it.todo('exposes completions');
    it.todo('exposes errors');
    it.todo('exposes cancelations');
  });

  describe('#isHandling', () => {
    let asyncHandler, asyncService;

    beforeEach(() => {
      asyncHandler = jest.fn(() => {
        return after(DELAY, '3.14');
      });
      asyncService = createEffect(asyncHandler);
    });

    it('initially is false', () => {
      expect(asyncService.isHandling.value).toBeFalsy();
    });

    it('becomes true when a handler is in-flight', async () => {
      asyncService();

      expect(asyncHandler).toHaveBeenCalled();
      expect(asyncService.isHandling.value).toBeTruthy();

      await after(DELAY);
      expect(asyncService.isHandling.value).toBeFalsy();
    });

    it('doesnt immediately repeat values', () => {
      const statuses = [];
      asyncService.isHandling.subscribe((s) => statuses.push(s));

      asyncService();
      // trigger again
      asyncService();

      // no double true
      expect(statuses).toEqual([false, true]);
    });

    describe('Mode: Queueing', () => {
      it('toggles on and off across handlings', async () => {
        const statuses: boolean[] = [];
        const fx = createQueueingEffect<void>(() => after(DELAY, '3.14'));

        fx.isHandling.subscribe((s) => statuses.push(s));
        expect(statuses).toEqual([false]);

        fx();
        expect(statuses).toEqual([false, true]);

        // queue another
        fx();
        expect(statuses).toEqual([false, true]);
        await after(DELAY * 3);

        expect(statuses).toEqual([false, true, false, true, false]);
      });
    });

    it('has a final value of false on a shutdown', () => {
      const statuses: boolean[] = [];
      const fx = createQueueingEffect<void>(() => after(DELAY, '3.14'));

      fx.isHandling.subscribe((s) => statuses.push(s));
      expect(statuses).toEqual([false]);

      fx();
      expect(statuses).toEqual([false, true]);
      fx.shutdown();

      expect(statuses).toEqual([false, true, false]);
    });

    // it.skip('has a final value of false on a shutdownAll', () => {
    //   const fx = createQueueingEffect<void>(() => after(DELAY, '3.14'));

    //   const statuses = makeArray(fx.isHandling) as boolean[];
    //   fx.isHandling.subscribe((s) => statuses.push(s));

    //   fx();
    //   expect(statuses).toEqual([false, true]);
    //   shutdownAll();

    //   expect(statuses).toEqual([false, true, false]);
    // });
  });

  describe('#isActive', () => {
    it('is like #isHandling usually', async () => {
      const statuses: boolean[] = [];
      const effect = createEffect<void, string>(() => after(DELAY, '3.14'));

      effect.isActive.subscribe((s) => statuses.push(s));
      expect(statuses).toEqual([false]);

      effect();
      expect(statuses).toEqual([false, true]);

      effect();
      expect(statuses).toEqual([false, true]);
      await after(DELAY * 3);

      expect(statuses).toEqual([false, true, false]); // YAY!
    });

    describe('Mode: Queueing', () => {
      it('stays "true" across handlings', async () => {
        const statuses: boolean[] = [];
        const effect = createQueueingEffect<void, string>(() =>
          after(DELAY, '3.14')
        );

        effect.isActive.subscribe((s) => statuses.push(s));
        expect(statuses).toEqual([false]);

        effect();
        expect(statuses).toEqual([false, true]);

        effect();
        expect(statuses).toEqual([false, true]);
        await after(DELAY * 3);

        // Note - not [false, true, false, true, false] - stays active
        // while moving to the next in the queue
        expect(statuses).toEqual([false, true, false]);
      });
    });
  });

  // describe('#send', () => {
  //   const REQ1 = 1;
  //   const REQ2 = 2;

  //   let counterFx: EffectRunner<number, number>;
  //   const equalityMatcher = (req: number, res: number) => req === res;

  //   it('returns a Promise for the next response', async () => {
  //     const counterFx = createEffect<number, number>((i: number) =>
  //       after(DELAY, i)
  //     );

  //     const response = counterFx.send(REQ1);
  //     expect(response).resolves.toBe(REQ1);
  //   });

  //   describe('Mode: Immediate', () => {
  //     beforeEach(() => {
  //       counterFx?.cancelCurrentAndQueued();
  //       counterFx = createEffect<number, number>((i: number) =>
  //         after(DELAY, i)
  //       );
  //     });

  //     describe('Multiple', () => {
  //       it('resolves with the earliest response for each request', () => {
  //         const response1 = counterFx.send(REQ1);
  //         const response2 = counterFx.send(REQ2);

  //         expect(response1).resolves.toBe(REQ1);
  //         expect(response2).resolves.toBe(REQ1);
  //       });
  //       describe('With a Matcher', () => {
  //         it('resolves with the matching response', () => {
  //           const response1 = counterFx.send(REQ1, equalityMatcher);
  //           const response2 = counterFx.send(REQ2, equalityMatcher);

  //           expect(response1).resolves.toBe(REQ1);
  //           expect(response2).resolves.toBe(REQ2);

  //           // Also testable as
  //           // expect(await response1).toEqual(REQ1);
  //           // expect(await response2).toEqual(REQ2);
  //         });
  //       });
  //     });
  //     describe('Errors', () => {});
  //   });
  //   describe('Mode: Queueing', () => {
  //     beforeEach(() => {
  //       counterFx?.cancelCurrentAndQueued();
  //       counterFx = createQueueingEffect<number, number>((i: number) =>
  //         after(DELAY, i)
  //       );
  //     });

  //     describe('Multiple', () => {
  //       it('resolves with the earliest', async () => {
  //         counterFx = createQueueingEffect<number, number>((i: number) =>
  //           after(DELAY, i)
  //         );

  //         const response1 = counterFx.send(REQ1);
  //         const response2 = counterFx.send(REQ2);

  //         // Note - still the nearest response
  //         expect(response1).resolves.toBe(REQ1);
  //         expect(response2).resolves.toBe(REQ1);
  //       });
  //     });
  //   });
  // });
});

describe('createQueueingEffect', () => {
  it('runs queued', async () => {
    const liked = [] as string[];

    const likePost = createQueueingEffect((postId: number) => {
      return after(10, () => {
        liked.push(`post liked ${postId}`);
      });
    });
    likePost(123);
    likePost(234);

    // The first has finished, the second was queued
    await after(10 + 1);
    expect(liked).toMatchInlineSnapshot(`
      [
        "post liked 123",
      ]
    `);

    // now done
    await after(10 + 1);
    expect(liked).toMatchInlineSnapshot(`
      [
        "post liked 123",
        "post liked 234",
      ]
    `);
  });

  it('is cancelable singly', async () => {
    const liked = [] as string[];

    const likePost = createQueueingEffect((postId: number) => {
      return after(10, () => {
        liked.push(`post liked ${postId}`);
      });
    });
    likePost(123);
    likePost(234);

    likePost.cancelCurrent();

    // The first has finished, the second was queued
    await after(10 + 1);
    expect(liked).toEqual(['post liked 234']);

    // yet still requestable
    likePost(345);
    await after(10 + 1);
    expect(liked).toEqual(['post liked 234', 'post liked 345']);
  });

  it('is cancelable for whole queue with .cancelCurrentAndQueued()', async () => {
    const liked = [] as string[];

    const likePost = createQueueingEffect((postId: number) => {
      return after(10, () => {
        liked.push(`post liked ${postId}`);
      });
    });
    likePost(123);
    likePost(234);

    likePost.cancelCurrentAndQueued();

    // The 1st would have finished
    await after(10 + 1);
    expect(liked).toEqual([]);

    // The 2nd would have finished
    await after(10 + 1);
    expect(liked).toEqual([]);

    // yet still requestable
    likePost(345);
    await after(10 + 1);
    expect(liked).toEqual(['post liked 345']);
  });

  it('Can be canceled by being returned anywhere a Subscription would be (eg useService)', async () => {
    const liked = [] as string[];

    const likePost = createQueueingEffect((postId: number) => {
      return after(10, () => {
        liked.push(`post liked ${postId}`);
      });
    });
    likePost(123);
    likePost(234);

    // Can be treated like one
    (likePost as unknown as Subscription).unsubscribe();

    // The 1st would have finished
    await after(10 + 1);
    expect(liked).toEqual([]);

    // The 2nd would have finished
    await after(10 + 1);
    expect(liked).toEqual([]);

    // yet still requestable
    likePost(345);
    await after(10 + 1);
    expect(liked).toEqual(['post liked 345']);
  });
});

describe('createSwitchingEffect', () => {
  it('runs switching', async () => {
    const liked = [] as string[];

    const likePost = createSwitchingEffect((postId: number) => {
      return after(10, () => {
        liked.push(`post liked ${postId}`);
      });
    });
    likePost(123);
    likePost(234);

    // The first has canceled, the second finished
    await after(10 + 1);
    expect(liked).toMatchInlineSnapshot(`
      [
        "post liked 234",
      ]
    `);
  });
});

describe('createQueueingEffect', () => {
  it('runs queued', async () => {
    const liked = [] as string[];

    const likePost = createQueueingEffect((postId: number) => {
      return after(10, () => {
        liked.push(`post liked ${postId}`);
      });
    });
    likePost(123);
    likePost(234);

    // The first has finished, the second was queued
    await after(10 + 1);
    expect(liked).toMatchInlineSnapshot(`
      [
        "post liked 123",
      ]
    `);

    // now done
    await after(10 + 1);
    expect(liked).toMatchInlineSnapshot(`
      [
        "post liked 123",
        "post liked 234",
      ]
    `);
  });

  it('is cancelable singly', async () => {
    const liked = [] as string[];

    const likePost = createQueueingEffect((postId: number) => {
      return after(10, () => {
        liked.push(`post liked ${postId}`);
      });
    });
    likePost(123);
    likePost(234);

    likePost.cancelCurrent();

    // The first has finished, the second was queued
    await after(10 + 1);
    expect(liked).toEqual(['post liked 234']);

    // yet still requestable
    likePost(345);
    await after(10 + 1);
    expect(liked).toEqual(['post liked 234', 'post liked 345']);
  });

  it('is cancelable for whole queue with .cancelCurrentAndQueued()', async () => {
    const liked = [] as string[];

    const likePost = createQueueingEffect((postId: number) => {
      return after(10, () => {
        liked.push(`post liked ${postId}`);
      });
    });
    likePost(123);
    likePost(234);

    likePost.cancelCurrentAndQueued();

    // The 1st would have finished
    await after(10 + 1);
    expect(liked).toEqual([]);

    // The 2nd would have finished
    await after(10 + 1);
    expect(liked).toEqual([]);

    // yet still requestable
    likePost(345);
    await after(10 + 1);
    expect(liked).toEqual(['post liked 345']);
  });

  it('Can be canceled by being returned anywhere a Subscription would be (eg useService)', async () => {
    const liked = [] as string[];

    const likePost = createQueueingEffect((postId: number) => {
      return after(10, () => {
        liked.push(`post liked ${postId}`);
      });
    });
    likePost(123);
    likePost(234);

    // Can be treated like one
    (likePost as unknown as Subscription).unsubscribe();

    // The 1st would have finished
    await after(10 + 1);
    expect(liked).toEqual([]);

    // The 2nd would have finished
    await after(10 + 1);
    expect(liked).toEqual([]);

    // yet still requestable
    likePost(345);
    await after(10 + 1);
    expect(liked).toEqual(['post liked 345']);
  });
});

describe('createDebouncedEffect', () => {
  it('runs debounced', async () => {
    const liked = [] as string[];

    const likePost = createDebouncedEffect(5)((postId: number) => {
      return after(10, () => {
        const msg = `post liked ${postId}`;
        liked.push(msg);
        return msg; // provide via `responses` as well
      });
    });

    likePost(123);
    likePost(234);

    // The first has been switched off by the second
    await after(10 * 2 + 1);
    expect(liked).toMatchInlineSnapshot(`
      [
        "post liked 234",
      ]
    `);
  });
});

describe('createBlockingEffect', () => {
  it('runs blocking', async () => {
    const liked = [] as string[];

    const likePost = createBlockingEffect((postId: number) => {
      return after(10, () => {
        liked.push(`post liked ${postId}`);
      });
    });
    likePost(123);
    likePost(234);

    // The first has blocked the second
    await after(DELAY + 1);
    expect(liked).toMatchInlineSnapshot(`
      [
        "post liked 123",
      ]
    `);
  });
});

describe('createThrottledEffect', () => {
  it('runs throttling', async () => {
    const liked = [] as string[];

    const likePost = createThrottledEffect(DELAY)((postId: number) => {
      return after(DELAY, () => {
        liked.push(`post liked ${postId}`);
      });
    });
    likePost(123);
    likePost(234);

    // The first has blocked the second
    await after(DELAY * 2 + 1);
    expect(liked).toMatchInlineSnapshot(`
      [
        "post liked 123",
      ]
    `);
  });
});

describe('createTogglingEffect', () => {
  it('runs toggling', async () => {
    const liked = [] as string[];

    const likePost = createTogglingEffect((postId: number) => {
      return after(DELAY, () => {
        liked.push(`post liked ${postId}`);
      });
    });

    likePost(123);
    likePost(234);

    // The second toggled the first off
    await after(DELAY + 1);
    expect(liked).toMatchInlineSnapshot(`[]`);
  });
});

describe('createCustomEffect', () => {
  it('allows you to pass a custom operator', () => {
    expect.assertions(0);

    const liked = [] as string[];

    const likeIt = createCustomEffect((postId: number) => {
      return after(DELAY, () => {
        liked.push(`post liked ${postId}`);
      });
    }, queueOnlyLatest);

    likeIt(2718);
  });
});

describe('createImmediateEffect', () => {
  it('runs can be called', async () => {
    const likePost = createImmediateEffect((postId: number) => {
      return after(10, () => {
        liked.push(`post liked ${postId}`);
      });
    });
    likePost(123);
  });
});

// export function trace(
//   effect,
//   prefix = "rxfx-" + generateId(),
//   fn = console.log
// ) {
//   return effect.observe({
//     request: fn.bind(null, `${prefix}/request`),
//     started: fn.bind(null, `${prefix}/started`),
//     response: fn.bind(null, `${prefix}/next`),
//     error: fn.bind(null, `${prefix}/error`),
//     complete: fn.bind(null, `${prefix}/complete`),
//     canceled: fn.bind(null, `${prefix}/canceled`),
//   });
// }
describe('trace', () => {
  const events = [] as any[];
  const likePost = createImmediateEffect((postId: number) => {
    return after(0, postId);
  });
  // trace(likePost, 'post/like', events.push.bind(events));
  trace(likePost, 'post/like', (prefix, payload) =>
    events.push([prefix, payload])
  );

  likePost(123);
  expect(events).toMatchInlineSnapshot(`
    [
      [
        "post/like/request",
        123,
      ],
      [
        "post/like/started",
        123,
      ],
      [
        "post/like/next",
        123,
      ],
      [
        "post/like/complete",
        123,
      ],
    ]
  `);
});

describe('#reset', () => {
  it('resets state to initial value', async () => {
    const initialState = { count: 0 };
    const counterFx = createEffect<number, number, Error, { count: number }>(
      (i: number) => after(5, i),
      mergeMap,
      initialState
    );

    // Set up reducer to track the count
    counterFx.reduceWith((state, event) => {
      if (event.type === 'response') {
        return { count: state.count + event.payload };
      }
      return state;
    }, initialState);

    // Initial state check
    expect(counterFx.state.value).toEqual(initialState);

    // Execute effect to update state
    await counterFx.send(5);
    await counterFx.send(10);

    // State should be updated
    expect(counterFx.state.value).toEqual({ count: 15 });

    // Reset the effect
    counterFx.reset();

    // State should be restored to initial value
    expect(counterFx.state.value).toEqual(initialState);
  });

  it('cancels current operations', async () => {
    const operations = [] as string[];
    const longFx = createEffect<number, string>((i: number) => {
      return after(20, () => {
        const result = `processed ${i}`;
        operations.push(result);
        return result;
      });
    });

    // Start a long-running operation
    longFx(123);

    // Reset should cancel the current operation
    longFx.reset();

    // Wait enough time for the operation to have completed if not canceled
    await after(30);

    // The operation should have been canceled
    expect(operations).toEqual([]);

    // But the effect should still be usable
    longFx(456);
    await after(30);
    expect(operations).toEqual(['processed 456']);
  });

  it('stays reset after next request', async () => {
    const operations = [] as string[];
    const queuedFx = createQueueingEffect<number, string>((i: number) => {
      return after(10, () => {
        const result = `processed ${i}`;
        operations.push(result);
        return result;
      });
    }, []);

    queuedFx.reduceWith((state = [], event) => {
      if (event.type === 'request') {
        return [...state, event.payload];
      }
      return state;
    });

    // Call it
    queuedFx(1);
    await after(10);
    expect(queuedFx.state.value).toEqual([1]);

    queuedFx.reset();
    expect(queuedFx.state.value).toEqual([]); // reset
    queuedFx(2);
    queuedFx(3);
    await after(10);
    expect(queuedFx.state.value).toEqual([2, 3]);
  });
});
