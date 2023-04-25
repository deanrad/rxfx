import { after } from '@rxfx/after';
import { defaultBus as bus } from '@rxfx/bus';
import { concat } from 'rxjs';
import { createService } from '../src/createService';
import { ServiceRequestType, ServiceStateType } from '../src/types';

describe('Types', () => {
  const initial = {
    constants: [] as number[],
  };
  type InitialState = typeof initial;
  const handler = () => concat(after(0, 3.14), after(0, 2.718));
  const reducerProducer = (ACs) => {
    const reducer = (state = initial, e) => {
      if (e?.type !== ACs.next.type) return state;
      return {
        constants: [...state.constants, e?.payload],
      };
    };
    return reducer;
  };

  describe('ServiceRequestType', () => {
    it('gets the type of .state.value', () => {
      const mathService = createService<
        string | void,
        number,
        Error,
        InitialState
      >('math', bus, handler, reducerProducer);

      const _initial: ServiceStateType<typeof mathService> = { constants: [] };
      const { constants } = _initial;

      // Type inference has worked - this is number[]
      expect(constants).toEqual([]);
    });
  });

  describe('ServiceRequestType', () => {
    it('gets the .request arg type', () => {
      const mathService = createService<
        string | void,
        number,
        Error,
        InitialState
      >('math', bus, handler, reducerProducer);

      let _req: ServiceRequestType<typeof mathService>;

      // Type inference has worked - _req is string|void
      expect.assertions(0);
    });
  });

  it.todo('has examples');
});
