import { after } from '@rxfx/after';
import { concat, from, merge, Observable, Subscription, EMPTY } from 'rxjs';
import { Book } from './bookCollection';

export const mocks = [
  { name: 'Friends', author: 'Miles' },
  { name: 'Boys', author: 'Paul' },
] as Book[];
export const LOAD_DELAY = 200;

////// Handlers ///////
export function incrementalObservable() {
  return concat(...mocks.map((m) => after(LOAD_DELAY / mocks.length, m)));
}

export function allAtEndObservable() {
  return after(LOAD_DELAY, from(mocks));
}

export function promisedArray() {
  return after(LOAD_DELAY, mocks);
}

export function syncObservableArray() {
  return from(mocks);
}
