export { concat, EMPTY, throwError } from 'rxjs';
export * from './createEffect';
// Concurrency mode operator aliases
export {
  mergeMap as immediate,
  concatMap as queueing,
  exhaustMap as blocking,
  switchMap as switching,
  switchMap as replacing,
} from 'rxjs/operators';
