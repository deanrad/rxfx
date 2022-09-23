import { Subject, Observable } from 'rxjs';
import { toggleMap } from '../src/toggleMap';

describe('toggleMap - the missing *Map operator', () => {
  let connectWires = jest.fn();

  // an Observable for consuming and releasing a resource
  const turnLightOn$ = new Observable(() => {
    connectWires(true); // never complete the observable
    return () => connectWires(false);
  });

  describe('with no running subscription', () => {
    it('starts one', () => {
      const onStatuses: boolean[] = [];
      const _switch = new Subject<void>();
      connectWires = jest.fn((status: boolean) => {
        onStatuses.push(status);
      });
      const light = _switch.pipe(toggleMap(() => turnLightOn$)).subscribe();

      _switch.next(); // turn on

      expect(connectWires).toHaveBeenCalledWith(true);
      expect(onStatuses).toEqual([true]);
      expect(light.closed).toBeFalsy(); // !closed means still listening
    });
  });

  describe('with an already running subscription', () => {
    it('unsubscribes it, not starting a new one', () => {
      const onStatuses: boolean[] = [];
      const _switch = new Subject<void>();
      connectWires = jest.fn((status: boolean) => {
        onStatuses.push(status);
      });
      const light = _switch.pipe(toggleMap(() => turnLightOn$)).subscribe();
      _switch.next(); // turn on
      expect(connectWires).toHaveBeenCalledWith(true);
      expect(onStatuses).toEqual([true]);

      _switch.next(); // turn off

      expect(connectWires).toHaveBeenLastCalledWith(false);
      expect(onStatuses).toEqual([true, false]);
      expect(light.closed).toBeFalsy(); // !closed means still listening
    });
  });

  describe('mapper function', () => {
    const turnLightOn$ = new Observable<boolean>((notify) => {
      notify.next(true);
      connectWires(true);
      return () => connectWires(false);
    });

    it('gives info about both the cause and the effect', () => {
      const onStatuses: string[] = [];
      const _switch = new Subject<number>();
      connectWires = jest.fn();
      _switch
        .pipe(
          toggleMap(
            () => turnLightOn$,
            (cause, effect) => {
              onStatuses.push(`${cause}-${effect}`);
            }
          )
        )
        .subscribe();

      _switch.next(1); // turn on
      _switch.next(-1); // turn off
      _switch.next(2); // turn on

      expect(onStatuses).toEqual(['1-true', '2-true']);
    });
  });
});
