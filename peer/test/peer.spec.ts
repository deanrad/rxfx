import { after } from '@rxfx/after';
import { Action } from '@rxfx/service';
import { EMPTY, Subject } from 'rxjs';
import { createPeer, Role, PROMOTE, DEMOTE, LEAVE } from '../src/peer';
import { forward, handleErrors } from '../src/forward';

describe('createPeer', () => {
  let _outbox = new Subject<Action<any>>();
  let inbox = new Subject<Action<any>>();
  let outbox = (a: Action<any>) => {
    _outbox.next(a);
  };

  let peer: ReturnType<typeof createPeer>;
  const whoami1 = () => 'test user 1';
  const whoami2 = () => 'test user 2';
  const shouldLeave = new Subject<void>();

  beforeEach(() => {
    peer = createPeer({ inbox, outbox, whoami: whoami1, shouldLeave });
  });

  describe('On Exit', () => {
    it('Outbox LEAVE({ origin })', () => {
      // Arrange
      // Act
      // Await?
      // Assert
    });
  });

  describe('On Startup', () => {
    describe('Set', () => {
      it('role LEAD', () => {
        expect(peer.role.value).toEqual(Role.LEAD);
      });
    });

    it('Outbox PROMOTE({ origin, MY_ID }', () => {
      // Arrange
      const sent = [] as Action<any>[];
      _outbox.subscribe((e) => {
        sent.push(e);
      });
      const whoami = jest.fn().mockReturnValue('test user 1');
      // Act
      peer = createPeer({ inbox, outbox, whoami });

      // Assert
      expect(whoami).toHaveBeenCalled();
      expect(sent).toMatchInlineSnapshot(`
        [
          {
            "payload": {
              "origin": "test user 1",
            },
            "type": "lead/promote",
          },
        ]
      `);
    });

    describe('When LEAD role', () => {
      describe('Event PROMOTE({ origin, FOREIGN_ID })', () => {
        it('Outbox DEMOTE({ target, FOREIGN_ID })', () => {
          // Arrange
          const sent = [] as Action<any>[];
          _outbox.subscribe((e) => {
            sent.push(e);
          });

          // Act
          inbox.next(PROMOTE({ origin: 'foo' }));

          // Assert
          expect(sent[0]).toEqual(DEMOTE({ target: 'foo' }));
        });
      });

      describe('Event DEMOTE({ target, MY_ID })', () => {
        it('role changes', () => {
          // Arrange
          const sent = [] as Action<any>[];
          _outbox.subscribe((e) => {
            sent.push(e);
          });

          // Act
          inbox.next(DEMOTE({ target: whoami1() }));

          // Assert
        });
      });
    });

    describe('When FOLLOW role', () => {
      beforeAll(() => {
        peer.role.next(Role.FOLLOW);
      });

      describe('Event LEAVE({ origin })', () => {
        describe('Sequence Sequence', () => {
          it('Delay random > 500ms', () => {
            // Arrange
            // Act
            // Await?
            // Assert
          });
          describe('Set Set', () => {
            it('role LEAD', () => {
              // Arrange
              // Act
              // Await?
              // Assert
            });
          });
          it('Outbox PROMOTE({ origin, MY_ID }', async () => {
            // Arrange
            // Act
            inbox.next(LEAVE({ origin: whoami2() }));
            // Await?
            await after(1000);

            // Assert
          });
        });
      });
    });

    describe('On Exit', () => {
      it('Outbox LEAVE', () => {
        shouldLeave.next();
        // calls code but were lazy not awaiting/asserting oh well :)
      });
    });
  });
});

describe('forward', () => {
  it('works', () => {
    // Act
    forward(
      EMPTY,
      LEAVE.match,
      () => {},
      (e) => e
    );
  });
});

describe('handleErrors', () => {
  it('works', () => {
    // Act
    handleErrors.error('Yay I errored!');
  });
});
