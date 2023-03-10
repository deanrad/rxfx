import { Observable, Subject } from 'rxjs';
import { thresholdToggle } from '../src/thresholdToggle';

describe('Operator thresholdToggle', () => {
  const started = jest.fn();
  const canceled = jest.fn();
  const momentarySwitch = new Subject<void>();

  const effect = new Observable(() => {
    started();
    return () => {
      canceled();
    };
  });

  describe('Threshold 2', () => {
    describe('When A Request arrives', () => {
      let light;

      beforeEach(() => {
        jest.resetAllMocks();
        light = momentarySwitch
          .pipe(thresholdToggle(() => effect, 2)) // 2 is also the default
          .subscribe();
      });
      afterEach(() => {
        light?.unsubscribe();
      });

      it('Does nothing', () => {
        momentarySwitch.next(); // down
        expect(momentarySwitch.closed).toBe(false);
        expect(started).not.toHaveBeenCalled();
      });

      describe('When Another Request arrives', () => {
        it('Starts it', () => {
          momentarySwitch.next(); // down
          momentarySwitch.next(); // up
          expect(started).toHaveBeenCalled();
        });

        describe('When Another Request arrives', () => {
          it('Does Nothing', () => {
            momentarySwitch.next();
            momentarySwitch.next();
            momentarySwitch.next();
            expect(canceled).not.toHaveBeenCalled();
          });

          describe('When Another Request arrives', () => {
            it('Cancels it', () => {
              momentarySwitch.next();
              momentarySwitch.next();
              momentarySwitch.next();
              momentarySwitch.next();
              expect(canceled).toHaveBeenCalled();
            });
          });
        });
      });
    });
  });
});
