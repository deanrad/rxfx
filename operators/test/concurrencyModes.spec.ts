import { immediate, queueing, blocking, switching } from '../src';
import { mergeMap, concatMap, exhaustMap, switchMap } from 'rxjs/operators';

describe('Concurrency mode operator aliases', () => {
  test('immediate is the same as mergeMap', () => {
    expect(immediate).toBe(mergeMap);
  });

  test('queueing is the same as concatMap', () => {
    expect(queueing).toBe(concatMap);
  });

  test('blocking is the same as exhaustMap', () => {
    expect(blocking).toBe(exhaustMap);
  });

  test('switching is the same as switchMap', () => {
    expect(switching).toBe(switchMap);
  });
});