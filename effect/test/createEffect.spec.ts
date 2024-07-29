import { after } from '@rxfx/after';
import { queueOnlyLatest } from '@rxfx/operators';
import {
  createBlockingEffect,
  createCustomEffect,
  createDebouncedEffect,
  createEffect,
  createQueueingEffect,
  createSwitchingEffect,
  createThrottledEffect,
  createTogglingEffect,
} from '../src/createEffect';

describe.only('createEffect - returns a function which', () => {
  it('runs asap', async () => {
    const liked = [] as string[];
    const responses = [] as string[];
    const likePost = createEffect((postId: number) => {
      return after(10, () => {
        const msg = `post liked ${postId}`;
        liked.push(msg);
        return msg;
      });
    });

    // XXX
    // likePost.responses.subscribe((r) => responses.push(r));

    likePost(123);
    likePost(234);

    // When both are done (with leeway)
    await after(10 + 1);
    expect(liked).toMatchInlineSnapshot(`
      [
        "post liked 123",
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
    await after(10 + 1);
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

    const likePost = createThrottledEffect(10)((postId: number) => {
      return after(10, () => {
        liked.push(`post liked ${postId}`);
      });
    });
    likePost(123);
    likePost(234);

    // The first has blocked the second
    await after(10 * 2 + 1);
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
      return after(10, () => {
        liked.push(`post liked ${postId}`);
      });
    });

    likePost(123);
    likePost(234);

    // The second toggled the first off
    await after(10 + 1);
    expect(liked).toMatchInlineSnapshot(`[]`);
  });
});

describe('createCustomEffect', () => {
  it('allows you to pass a custom operator', () => {
    expect.assertions(0);

    const liked = [] as string[];

    const likeIt = createCustomEffect((postId: number) => {
      return after(10, () => {
        liked.push(`post liked ${postId}`);
      });
    }, queueOnlyLatest);

    likeIt(2718);
  });
});
