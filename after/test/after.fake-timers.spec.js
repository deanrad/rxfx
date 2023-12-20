import { timer } from 'rxjs';
import { tap } from 'rxjs/operators';

import { after } from '../src/after';
jest.useFakeTimers();
const DELAY = 100;

describe('after', () => {
  it('can be activated via .subscribe()', () => {
    const result = after(DELAY, 3.14);
    const finished = jest.fn();

    // turn it on
    result.subscribe(finished);
    expect(finished).not.toHaveBeenCalled();

    jest.advanceTimersByTime(DELAY);
    expect(finished).toHaveBeenCalled();
  });

  it('can be activated via .then(), resolving a tick after DELAY', async () => {
    const result = after(DELAY, 3.14);
    const finished = jest.fn();

    // turn it on
    result.then(finished);
    expect(finished).not.toHaveBeenCalled();

    jest.advanceTimersByTime(DELAY);
    await Promise.resolve();
    expect(finished).toHaveBeenCalled();
  });
});

describe('RxJS#timer', () => {
  it('works with jest fake timers', async () => {
    const finished = jest.fn();
    const t = timer(DELAY).pipe(tap(finished));

    t.subscribe();
    expect(finished).not.toHaveBeenCalled();

    jest.advanceTimersByTime(DELAY);
    expect(finished).toHaveBeenCalled();
  });
});
