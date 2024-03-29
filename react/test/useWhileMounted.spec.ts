import * as React from 'react';
import { Observable, Subscription } from 'rxjs';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useWhileMounted, useWhileRendered } from '../src/useWhileMounted';

describe('useWhileMounted', () => {
  describe('called with a Subscription factory', () => {
    let count = 0;
    const Example = () => {
      useWhileMounted(() => {
        count++;
        return new Subscription(() => {
          count--;
        });
      });
      return null;
    };

    describe('at mount time', () => {
      it('calls the factory', () => {
        render(React.createElement(Example));
        expect(count).toBe(1);
      });
    });
    describe('at unmount time', () => {
      it('unsubscribes the subscription', () => {
        const { unmount } = render(React.createElement(Example));
        expect(count).toBe(1);
        unmount();
        expect(count).toBe(0);
      });
    });
  });
  describe('called with an EffectCallback', () => {
    let count = 0;
    const Example = () => {
      useWhileMounted(() => {
        count++;
        return () => {
          count--;
        };
      });
      return null;
    };

    describe('at mount time', () => {
      it('calls the factory', () => {
        render(React.createElement(Example));
        expect(count).toBe(1);
      });
    });
    describe('at unmount time', () => {
      it('unsubscribes the subscription', () => {
        const { unmount } = render(React.createElement(Example));
        expect(count).toBe(1);
        unmount();
        expect(count).toBe(0);
      });
    });
    describe('with no teardown', () => {
      let count = 0;
      const Example = () => {
        useWhileMounted(() => {
          count++;
        });
        return null;
      };
      beforeEach(() => {
        count = 0;
      });

      describe('at mount time', () => {
        it('calls the factory', () => {
          render(React.createElement(Example));
          expect(count).toBe(1);
        });
      });
      describe('at unmount time', () => {
        it('doesnt err', () => {
          const { unmount } = render(React.createElement(Example));
          expect(count).toBe(1);
          unmount();
        });
      });
    });
  });
  describe('called with an Observable', () => {
    let count = 0;
    const Example = () => {
      useWhileMounted(() => {
        return new Observable(() => {
          count++;
          return () => {
            count--;
          };
        });
      });
      return null;
    };

    describe('at mount time', () => {
      it('calls the factory', () => {
        render(React.createElement(Example));
        expect(count).toBe(1);
      });
    });
    describe('at unmount time', () => {
      it('unsubscribes the subscription', () => {
        const { unmount } = render(React.createElement(Example));
        expect(count).toBe(1);
        unmount();
        expect(count).toBe(0);
      });
    });
  });

  describe('With Mocks', () => {
    describe('called with a Subscription factory', () => {
      const mockSub = new Subscription();
      const mockUnsub = jest.spyOn(mockSub, 'unsubscribe');
      const mockSubFactory = jest.fn(() => mockSub) as unknown as () => Subscription;
      const Example = () => {
        useWhileMounted(mockSubFactory);
        return null;
      };

      describe('at mount time', () => {
        it('calls the factory', () => {
          render(React.createElement(Example));
          expect(mockSubFactory).toHaveBeenCalled();
        });
      });
      describe('at unmount time', () => {
        it('calls unsubscribe', () => {
          const { unmount } = render(React.createElement(Example));
          unmount();
          expect(mockUnsub).toHaveBeenCalled();
        });
      });
    });
  });

  it('exists', () => {
    expect(useWhileMounted).toBeTruthy();
  });
});

describe('useWhileRendered (https://codesandbox.io/s/rxfx-example-listeners-in-a-component-tree-dv8f0h?file=/src/Parent.tsx:226-532)', () => {
  it('exists', () => {
    expect(useWhileRendered).toBeTruthy();
  });
});
