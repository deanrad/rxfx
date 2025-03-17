// Concurrency mode operator aliases
export {
  mergeMap as immediate,
  concatMap as queueing,
  exhaustMap as blocking,
  switchMap as switching,
} from 'rxjs/operators';
