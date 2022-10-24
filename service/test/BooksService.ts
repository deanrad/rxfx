// import { after } from '@rxfx/after';
// import { concat, from, merge, Observable, Subscription, EMPTY } from 'rxjs';
// import { map, mergeMap } from 'rxjs/operators';
// import { ajax } from 'rxjs/ajax';
// import {
//   createCollectionEvents,
//   createBlockingService,
//   createQueueingService,
// } from '@rxfx/service';
// import { defaultBus as bus } from '@rxfx/bus';

// const mocks = [
//   { name: 'Doctors', author: 'Dean' },
//   { name: 'Friends', author: 'Miles' },
//   { name: 'Boys', author: 'Paul' },
// ];

// const allSubs = new Subscription();

// export function stop() {
//   allSubs.unsubscribe();
// }

// export const BOOKS = createCollectionEvents('books');

// export const addService = createQueueingService('books/post', bus, (book) =>
//   after(1500, book)
// );
// allSubs.add(() => addService.stop());

// // the function that defines the payloads of load/next events
// const getPayload = map(({ payload }) => payload);

// const freshlyAdded = addService.responses.pipe(getPayload);
// const fakePage2 = from(
//   mocks.map((b, idx) => ({
//     author: `Author=${idx}`,
//     name: `Name=${idx}`,
//   }))
// );
// let page = 0;
// const fakeNextPage = new Observable((notify) => {
//   page++;
//   mocks.forEach((b, idx) => {
//     notify.next({
//       author: `Page ${page} - Author${idx}=`,
//       name: `Page ${page} - Name${idx}`,
//     });
//   });
//   notify.complete();
// });

// // type RefreshArgs void | {page:number} | {}
// const refreshListener = bus.listenBlocking(
//   BOOKS.refresh.request.match,
//   // get the responses of adds
//   () => freshlyAdded,
//   // get a fake new page
//   // () => fakePage2,
//   // or multiple pages
//   // () => fakeNextPage,
//   // or both
//   // () => merge(freshlyAdded, fakePage2),
//   {
//     subscribe() {
//       bus.trigger(BOOKS.refresh.started());
//     },
//     next(b) {
//       bus.trigger(BOOKS.load.next(b));
//     },
//     complete() {
//       bus.trigger(BOOKS.refresh.complete());
//     },
//   }
// );
// allSubs.add(() => refreshListener.stop());

// export function refresh() {
//   bus.trigger(BOOKS.refresh.request());
// }

// export const loadService = createBlockingService(
//   'books/load',
//   bus,
//   // Try the following implementations
//   // Assume books come in individually at once - Observable<book>
//   // allAtEndObservable,
//   // observableReducer
//   // // Assume books come in individually incremental - Observable<book>
//   // incrementalObservable,
//   // observableReducer
//   // Or a legacy all-at-end style as the norm - Promise<book[]>
//   // promisedArray,
//   // promisedArrayReducer
//   // Or Observable Wtih a tracking ajax
//   allAtEndObservableWithAjax,
//   observableReducer
//   // Or Promise With tracking Ajax
//   // promisedArrayWithAjax,
//   // promisedArrayReducer
//   // Experimental: with realtime updates from adds (should hide isActive all time)
//   // withSuccessfulAdds,
//   // observableReducer
// );
// allSubs.add(() => loadService.stop());

// // Try the following implementations

// function incrementalObservable() {
//   return concat(...mocks.map((m) => after(1000, m)));
// }
// function withSuccessfulAdds() {
//   return concat(
//     incrementalObservable(),
//     new Observable((notify) => {
//       const sub = addService.responses
//         .pipe(map(({ payload: book }) => book))
//         .subscribe((book) => {
//           bus.trigger(loadService.actions.next(book));
//         });
//       notify.complete();
//       // return sub; // kills updates, why?
//     })
//   );
// }

// function allAtEndObservable() {
//   return after(2000, from(mocks));
// }
// function promisedArray() {
//   return after(2000, mocks);
// }
// function allAtEndObservableWithAjax() {
//   return merge(
//     after(2000, from(mocks)),
//     ajax.getJSON('https://httpbin.org/delay/2').pipe(mergeMap(EMPTY))
//   );
// }
// function promisedArrayWithAjax() {
//   fetch('https://httpbin.org/delay/2');
//   return after(2000, mocks);
// }

// function promisedArrayReducer(PEs) {
//   return (state = [], e = {}) => {
//     if (PEs.next.match(e)) {
//       return e.payload;
//     }
//     return state;
//   };
// }
// function observableReducer(PEs) {
//   return (state = [], e = {}) => {
//     if (PEs.next.match(e)) {
//       return [...state, e.payload];
//     }
//     return state;
//   };
// }
