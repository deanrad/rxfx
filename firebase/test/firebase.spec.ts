describe('init', () => {
  describe('Arguments', () => {
    describe('config', () => {
      it.todo('firebase.initializeApp is called with it');
      it.todo(
        'gets types from import firebase from firebase/app and @types/firebase'
      );
    });
    describe('collection', () => {
      it.todo('db.ref is called to create the collectionRef');
    });
    describe('keyMaker', () => {
      it.todo('defaults to returning Date.now()');
      it.todo('can be overridden');
      it.todo(
        'should exclude \n, $ # [ ] or any ASCII control characters (0x00 - 0x1F and 0x7F)'
      );
    });
  });
  describe('Behavior', () => {
    it.todo('firebase.database is called with no args');
  });
  describe('Return Value', () => {
    describe('outbox', () => {
      describe("'#next(obj)'", () => {
        it.todo('invokes keyMaker(obj) for the key');
        it.todo(
          'invokes db.ref(COLLECTION/KEY).set(obj) (invoking child_added in subscribers)'
        );
      });
    });
    describe('inbox', () => {
      it.todo(
        'An Observable emitting [key, snapshot.val()] for every collectionRef#child_added'
      );
    });
    describe('bus', () => {
      it.todo('contains all incoming or outgoing events');
    });
    describe('unsubscribe', () => {
      it.todo('disconnects and cleans up all subscriptions');
    });
  });
});
