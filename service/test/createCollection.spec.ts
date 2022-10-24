import { defaultBus as bus } from '@rxfx/bus';
import { after } from '@rxfx/after';
import { EMPTY, from, Observable } from 'rxjs';
import { allAtEndObservable, syncObservableArray } from './books/loaders';
import { AnyAction } from 'typescript-fsa';

import { createCollectionEvents } from '../src/createEvents';
import { Book } from './books/bookCollection';
import { mocks } from './books/loaders';
import { createCollection } from '../src/createCollection';

const LOAD_DELAY = 200;
describe(createCollection, () => {
  beforeEach(() => {
    bus.reset();
  });

  describe('Books Collection', () => {
    const BOOK_EVENTS = createCollectionEvents<void, Book>('book');

    const appendBook = (all = [] as Book[], book = {} as AnyAction) => {
      if (BOOK_EVENTS.load.next.match(book)) {
        return [...all, book.payload];
      }
      return all;
    };

    describe('load', () => {
      beforeEach(() => {
        bus.reset();
      });

      it('contains records after loader returns', async () => {
        const seen = [];
        bus.spy((e) => {
          seen.push(e);
        });
        const booksCollection = createCollection<void, Book, Error, Book[]>(
          BOOK_EVENTS,
          bus,
          {
            handler: allAtEndObservable,
            reducer: appendBook,
          }
        );
        booksCollection.requestLoad();

        await after(LOAD_DELAY);
        expect(seen).toMatchInlineSnapshot(`
          [
            {
              "payload": undefined,
              "type": "book/load/request",
            },
            {
              "payload": undefined,
              "type": "book/load/started",
            },
            {
              "payload": {
                "author": "Miles",
                "name": "Friends",
              },
              "type": "book/load/next",
            },
            {
              "payload": {
                "author": "Paul",
                "name": "Boys",
              },
              "type": "book/load/next",
            },
            {
              "payload": undefined,
              "type": "book/load/complete",
            },
          ]
        `);

        expect(booksCollection.state.value).toMatchInlineSnapshot(`
          [
            {
              "author": "Miles",
              "name": "Friends",
            },
            {
              "author": "Paul",
              "name": "Boys",
            },
          ]
        `);
      });

      it.todo('throttles concurrent loads');
    });

    describe('refresh', () => {
      it('merges a new Observable of records into state', async () => {
        const seen = [];
        bus.spy((e) => {
          seen.push(e);
        });
        const booksCollection = createCollection<void, Book, Error, Book[]>(
          BOOK_EVENTS,
          bus,
          {
            handler: syncObservableArray,
            reducer: appendBook,
          },
          () => fakePage2
        );
        booksCollection.requestLoad();

        expect(booksCollection.state.value).toMatchInlineSnapshot(`
          [
            {
              "author": "Miles",
              "name": "Friends",
            },
            {
              "author": "Paul",
              "name": "Boys",
            },
          ]
        `);

        booksCollection.refresh();
        expect(booksCollection.state.value).toMatchInlineSnapshot(`
          [
            {
              "author": "Miles",
              "name": "Friends",
            },
            {
              "author": "Paul",
              "name": "Boys",
            },
            {
              "author": "Page 2 Author: Miles",
              "name": "Page 2 Name:=Friends",
            },
            {
              "author": "Page 2 Author: Paul",
              "name": "Page 2 Name:=Boys",
            },
          ]
        `);
      });
      it('can be used for pagination', () => {
        const seen = [];
        bus.spy((e) => {
          seen.push(e);
        });
        const booksCollection = createCollection<void, Book, Error, Book[]>(
          BOOK_EVENTS,
          bus,
          {
            handler: syncObservableArray,
            reducer: appendBook,
          },
          () => fakeNextPage
        );
        booksCollection.requestLoad();

        expect(booksCollection.state.value).toMatchInlineSnapshot(`
          [
            {
              "author": "Miles",
              "name": "Friends",
            },
            {
              "author": "Paul",
              "name": "Boys",
            },
          ]
        `);

        booksCollection.refresh();
        expect(booksCollection.state.value).toMatchInlineSnapshot(`
          [
            {
              "author": "Miles",
              "name": "Friends",
            },
            {
              "author": "Paul",
              "name": "Boys",
            },
            {
              "author": "Page 1 Author: Miles",
              "name": "Page 1 Name: Miles",
            },
            {
              "author": "Page 1 Author: Paul",
              "name": "Page 1 Name: Paul",
            },
          ]
        `);
        booksCollection.refresh();
        expect(booksCollection.state.value).toMatchInlineSnapshot(`
          [
            {
              "author": "Miles",
              "name": "Friends",
            },
            {
              "author": "Paul",
              "name": "Boys",
            },
            {
              "author": "Page 1 Author: Miles",
              "name": "Page 1 Name: Miles",
            },
            {
              "author": "Page 1 Author: Paul",
              "name": "Page 1 Name: Paul",
            },
            {
              "author": "Page 2 Author: Miles",
              "name": "Page 2 Name: Miles",
            },
            {
              "author": "Page 2 Author: Paul",
              "name": "Page 2 Name: Paul",
            },
          ]
        `);
      });
      it.todo('can be used for optimistic UI');
      it.todo('throttles concurrent refreshes');
    });

    describe('post', () => {
      it('creates responses', async () => {
        const seen = [];
        bus.spy((e) => {
          seen.push(e);
        });
        const booksCollection = createCollection<void, Book, Error, Book[]>(
          BOOK_EVENTS,
          bus,
          {
            handler: syncObservableArray,
            reducer: appendBook,
          },
          () => EMPTY,
          {
            handler: (book) =>
              after(LOAD_DELAY / 10, () => ({
                ...book,
                servedAt: '2007-12-10',
              })),
          }
        );

        booksCollection.requestPost({
          id: 'bob',
          name: 'What about Bob?',
          author: 'Bob',
        });

        await after(LOAD_DELAY / 10);
        expect(seen).toMatchInlineSnapshot(`
          [
            {
              "payload": {
                "author": "Bob",
                "id": "bob",
                "name": "What about Bob?",
              },
              "type": "book/post/request",
            },
            {
              "payload": undefined,
              "type": "book/post/started",
            },
            {
              "payload": {
                "author": "Bob",
                "id": "bob",
                "name": "What about Bob?",
                "servedAt": "2007-12-10",
              },
              "type": "book/post/next",
            },
            {
              "payload": {
                "author": "Bob",
                "id": "bob",
                "name": "What about Bob?",
                "servedAt": "2007-12-10",
              },
              "type": "book/load/next",
            },
            {
              "payload": undefined,
              "type": "book/post/complete",
            },
          ]
        `);

        expect(booksCollection.state.value).toMatchInlineSnapshot(`
          [
            {
              "author": "Bob",
              "id": "bob",
              "name": "What about Bob?",
              "servedAt": "2007-12-10",
            },
          ]
        `);
      });
    });
  });
});

// Implementation Details
const fakePage2 = from(
  mocks.map((b) => ({
    author: `Page 2 Author: ${b.author}`,
    name: `Page 2 Name:=${b.name}`,
  }))
);

let page = 0;
const fakeNextPage = new Observable<Book>((notify) => {
  page++;
  mocks.forEach((b) => {
    notify.next({
      author: `Page ${page} Author: ${b.author}`,
      name: `Page ${page} Name: ${b.author}`,
    });
  });
  notify.complete();
});
