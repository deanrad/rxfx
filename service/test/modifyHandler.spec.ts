import { after } from '@rxfx/after';
import { defaultBus as bus } from '@rxfx/bus';
import { timeoutHandler, monitorHandler } from '../src/modifyHandler';
import { createService } from '../src/createService';

describe(timeoutHandler, () => {
  afterEach(() => {
    bus.reset();
  });

  describe('timeout', () => {
    it('is a noop at or below the timeout', async () => {
      const timedOutProc = timeoutHandler({ duration: 20 }, () => after(10, 2));
      const srv = createService<void, number, Error>('test', bus, timedOutProc);

      const seen = [];
      srv.errors.subscribe((e) => {
        seen.push(e);
      });

      srv.request();
      await after(20);
      expect(seen).toMatchInlineSnapshot(`[]`);
    });

    it('times out with the default error', async () => {
      const timedOutProc = timeoutHandler({ duration: 10 }, () =>
        after(100, 2)
      );
      const srv = createService<void, number, Error>('test', bus, timedOutProc);

      const seen = [];
      srv.errors.subscribe((e) => {
        seen.push(e);
      });

      srv.request();
      await after(20);
      expect(seen).toMatchInlineSnapshot(`
        [
          {
            "error": true,
            "payload": [Error: Rxfx process timed out in 10 ms],
            "type": "test/error",
          },
        ]
      `);
    });

    it('times out with a custom error', async () => {
      const timedOutProc = timeoutHandler(
        {
          duration: 10,
          errorFactory: (req: number) =>
            new Error(`Request for ${req} timed out`),
        },
        (req: number) => after(100, 2)
      );
      const srv = createService<number, number, Error>(
        'test',
        bus,
        timedOutProc
      );

      const seen = [];
      srv.errors.subscribe((e) => {
        seen.push(e);
      });

      srv.request(3.14);
      await after(20);
      expect(seen).toMatchInlineSnapshot(`
        [
          {
            "error": true,
            "payload": [Error: Request for 3.14 timed out],
            "type": "test/error",
          },
        ]
      `);
    });
  });
});

describe(monitorHandler, () => {
  afterEach(() => {
    bus.reset();
  });

  it('can run a callback periodically while handling', async () => {
    let elapsed = [] as number[];
    const progressCallback = (i: number) => {
      elapsed.push(i);
    };

    const monitoredProc = monitorHandler(
      { duration: 20, progressCallback },
      () => after(100, 2)
    );
    const srv = createService<void, number, Error>('test', bus, monitoredProc);

    // Cancels with the handling
    srv.request();
    expect(elapsed).toMatchInlineSnapshot(`
      [
        0,
      ]
    `);
    await after(20);
    srv.cancelCurrent();
    await after(20);
    expect(elapsed).toMatchInlineSnapshot(`
      [
        0,
        20,
      ]
    `);

    // Runs to completion but no farther
    elapsed = [];
    srv.request();
    await after(120);
    expect(elapsed).toMatchInlineSnapshot(`
      [
        0,
        20,
        40,
        60,
        80,
      ]
    `);
  });
});
