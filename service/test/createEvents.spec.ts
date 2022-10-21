import { Action } from 'typescript-fsa';
import {
  createEvent,
  createProcessEvents,
  createCollectionEvents,
} from '../src/createEvents';

interface Indexed {
  idx: number;
}

describe(createEvent, () => {
  describe('return value', () => {
    it('preserves the type', () => {
      const ac = createEvent('user/submit/click');
      expect(ac.type).toBe('user/submit/click');
    });
    it('preserves the type for single', () => {
      const ac = createEvent('doIt');
      expect(ac.type).toBe('doIt');
    });

    it('creates an action with typed payload', () => {
      const actionCreator = createEvent<Indexed>('user/submit/click');
      // Typescript will complain if we dont provide an Indexed payload argument
      const createdEvent = actionCreator({ idx: -1 });
      expect(createdEvent).toMatchObject({
        type: 'user/submit/click',
        payload: { idx: -1 },
      });
    });

    it('returns an action creator with a typed .match property', () => {
      const actionCreator = createEvent<Indexed>('user/submit/click');
      const event: Action<Indexed> = {
        type: 'user/submit/click',
        payload: { idx: 0 },
      };
      expect(actionCreator.match(event)).toBeTruthy();
      if (actionCreator.match(event)) {
        // in here event.payload is Indexed, so idx is number
        const index: number = event.payload.idx;
        expect(index).toBe(event.payload.idx);
      }
    });
  });
});

describe('createProcessEvents', () => {
  describe('return value', () => {
    it('creates types', () => {
      const INC = createProcessEvents('inc');
      expect(INC.request.type).toBe('inc/request');
    });
    it('has the keys', () => {
      expect(Object.keys(createProcessEvents('inc'))).toMatchInlineSnapshot(`
        [
          "request",
          "cancel",
          "started",
          "next",
          "error",
          "complete",
          "canceled",
        ]
      `);
    });
  });
});

describe('createDataEvents', () => {
  describe('return value', () => {
    it('creates types', () => {
      const BOOKS = createCollectionEvents('books');
      expect(BOOKS.load.request.type).toBe('books/load/request');
    });
    it('has the keys', () => {
      expect(Object.keys(createCollectionEvents('inc'))).toMatchInlineSnapshot(`
        [
          "load",
          "refresh",
          "post",
          "update",
          "delete",
        ]
      `);
    });
  });
});
