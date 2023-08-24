import { after } from '@rxfx/after';
import { createStatefulEffect } from '../src/createStatefulEffect';

describe(createStatefulEffect, () => {
  it('can be called', async () => {
    const likePost = createStatefulEffect<number, string, string[]>(
      (postId) => {
        return after(10, () => {
          return `post liked: ${postId}`;
        });
      },
      (EVENTS) =>
        (state = [], event) => {
          if (EVENTS.request.match(event)) {
            return [...state, `request: ${event.payload}`];
          }
          if (EVENTS.next.match(event)) {
            return [...state, event.payload];
          }

          return state;
        }
    );

    likePost(12333);

    await after(10);
    expect(likePost.state.value).toEqual([
      'request: 12333',
      'post liked: 12333',
    ]);
  });
});
