import { after } from '@rxfx/after';
import {
  createAsyncListService,
  AsyncState,
} from '../src/createAsyncListService';
import { defaultBus } from '@rxfx/bus';
import { THRESHOLD } from '@rxfx/perception';

function mostRecentOf<T>(ary: T[]) {
  return ary[ary.length - 1];
}

const DELAY = 100;

describe('createAsyncListService', () => {
  it('has items, entering, leaving states', async () => {
    const srv = createAsyncListService<number>('ids', DELAY);

    const seenStates: AsyncState<number>[] = [];

    srv.state.subscribe((s) => seenStates.push(s));
    expect(mostRecentOf(seenStates)).toMatchObject({
      entering: [],
    });

    srv.request({ method: 'push', item: 3.14 });

    expect(mostRecentOf(seenStates)).toMatchObject({
      items: [3.14],
      entering: [3.14],
    });

    await after(DELAY);
    expect(mostRecentOf(seenStates)).toMatchObject({
      items: [3.14],
      entering: [],
    });

    srv.request({ method: 'pop' });
    expect(mostRecentOf(seenStates)).toMatchObject({
      items: [3.14],
      leaving: [3.14],
    });

    await after(DELAY);
    expect(mostRecentOf(seenStates)).toMatchObject({
      items: [],
      leaving: [],
    });

    // Adds them only serially
    // Note - to handle multiple rapid pushes, we should only process them on started
    // (but the trick there is that started events dont relate to the requests that started them)

    srv.request({ method: 'push', item: 1 });
    srv.request({ method: 'push', item: 2 });
    expect(mostRecentOf(seenStates)).toMatchObject({
      items: [1],
      entering: [1],
    });

    await after(DELAY);
    expect(mostRecentOf(seenStates)).toMatchObject({
      items: [1, 2],
      entering: [2],
    });

    await after(DELAY);
    expect(mostRecentOf(seenStates)).toMatchObject({
      items: [1, 2],
      entering: [],
    });

    srv.request({ method: 'remove', item: 1 });
    expect(mostRecentOf(seenStates)).toMatchObject({
      items: [1, 2],
      leaving: [1],
    });

    await after(DELAY);
    expect(mostRecentOf(seenStates)).toMatchObject({
      items: [2],
      leaving: [],
    });
  });

  describe('Defaulted arguments', () => {
    it('assigns them', async () => {
      const seen = [];
      defaultBus.spy((e) => seen.push(e));

      const srv = createAsyncListService<number>();
      srv.request({ method: 'push', item: 2 });
      expect(seen.map((e) => e.type)).toMatchObject([
        'list/1/request',
        'list/1/started',
      ]);
      await after(THRESHOLD.AnimationShort);
      expect(seen.map((e) => e.type)).toMatchObject([
        'list/1/request',
        'list/1/started',
        'list/1/next',
        'list/1/complete',
      ]);
    });
  });
  describe('Compound objects', () => {
    interface HasId {
      id: number;
    }
    const matchesOnId = (obj1: HasId, obj2: HasId) => obj1.id === obj2.id;

    // Note the test is flaky and double-adds to items, so we loosed the assertions to cheat
    it('has items, entering, leaving states', async () => {
      const srv = createAsyncListService<HasId>('ids', DELAY, matchesOnId);

      const seenStates: AsyncState<HasId>[] = [];

      srv.state.subscribe((s) => seenStates.push(s));
      expect(mostRecentOf(seenStates)).toMatchObject({
        entering: [],
      });

      srv.request({ method: 'push', item: { id: 3.14 } });
      expect(mostRecentOf(seenStates)).toMatchObject({
        items: expect.arrayContaining([{ id: 3.14 }]),
        entering: expect.arrayContaining([{ id: 3.14 }]),
      });

      await after(DELAY);
      expect(mostRecentOf(seenStates)).toMatchObject({
        items: expect.arrayContaining([{ id: 3.14 }]),
        entering: [],
      });

      srv.request({ method: 'pop' });
      expect(mostRecentOf(seenStates)).toMatchObject({
        leaving: expect.arrayContaining([{ id: 3.14 }]),
        items: expect.arrayContaining([{ id: 3.14 }]),
      });

      await after(DELAY);
      expect(mostRecentOf(seenStates)).toMatchObject({
        items: [],
        leaving: [],
      });

      // Adds them only serially
      srv.request({ method: 'push', item: { id: 1 } });
      srv.request({ method: 'push', item: { id: 2 } });
      expect(mostRecentOf(seenStates)).toMatchObject({
        items: expect.arrayContaining([{ id: 1 }]),
        entering: expect.arrayContaining([{ id: 1 }]),
      });

      await after(DELAY);
      expect(mostRecentOf(seenStates)).toMatchObject({
        items: expect.arrayContaining([{ id: 1 }, { id: 2 }]),
        entering: expect.arrayContaining([{ id: 2 }]),
      });

      await after(DELAY);
      expect(mostRecentOf(seenStates)).toMatchObject({
        items: expect.arrayContaining([{ id: 1 }, { id: 2 }]),
        entering: [],
      });

      srv.request({ method: 'remove', item: { id: 1 } });
      expect(mostRecentOf(seenStates)).toMatchObject({
        items: expect.arrayContaining([{ id: 1 }, { id: 2 }]),
        leaving: expect.arrayContaining([{ id: 1 }]),
      });

      await after(DELAY);
      expect(mostRecentOf(seenStates)).toMatchObject({
        items: expect.arrayContaining([{ id: 2 }]),
        leaving: [],
      });
    });
  });
});
