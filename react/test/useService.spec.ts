import * as React from 'react';
import { Action } from 'typescript-fsa';
import { createService } from '@rxfx/service';
import { Bus } from '@rxfx/bus';
import { render } from '@testing-library/react';
import { useService } from '../src/useService';

const defaultBus = new Bus<Action<any>>();
const reducer = (c = 1.1, { type } = { type: '' }) => {
  return type === 'counter/request' ? c + 1 : c;
};
const testService = createService(
  'counter',
  defaultBus,
  () => {},
  () => reducer
);

const Wrapper = () => {
  const { request, state } = useService(testService);
  return React.createElement('div', {}, [
    React.createElement('input', {
      'data-testid': 'count',
      type: 'text',
      key: 'count',
      readOnly: true,
      value: state,
    }),
    React.createElement('button', {
      'data-testid': 'increment',
      key: 'increment',
      onClick: () => {
        request();
      },
    }),
  ]);
};

describe('useService', () => {
  it('is a hook function', async () => {
    const result = render(React.createElement(Wrapper));
    const cnt = result.getByTestId('count');
    expect(cnt).toHaveProperty('value', '1.1');
  });
  describe('return value', () => {
    it.todo('is [request, state, isActive, currentError]');
  });
  it.todo('subscribes to #state and #isActive');
});
