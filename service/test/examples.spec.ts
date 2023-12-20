import { createQueueingService } from '../src/createService';
import { defaultBus as bus } from '@rxfx/bus';
import { after } from '@rxfx/after';
import { produce } from 'immer';
import { Service } from '../src/types';

jest.useFakeTimers();

describe('Examples', () => {
  describe('counter - queueing', () => {
    let countService: Service<void, void, Error, { count: number }>;
    const DELAY = 1000;

    beforeEach(() => {
      countService = createQueueingService<
        void,
        void,
        Error,
        { count: number }
      >(
        'count',
        () => after(DELAY), // Use after() with the specified delay
        ({ isResponse }) =>
          produce((state = { count: 0 }, event) => {
            if (isResponse(event)) {
              state.count += 1; // Increment count on response
            }
            return state;
          })
      );
    });

    afterEach(() => {
      countService.stop();
    });

    test('should increment count after delay', () => {
      countService.request();

      expect(countService.state.value.count).toBe(0); // Initial state

      jest.advanceTimersByTime(1000); // Fast-forward time

      expect(countService.state.value.count).toBe(1); // State after delay
    });

    test('should handle multiple requests with queueing', () => {
      countService.request();
      countService.request();
      countService.request();

      expect(countService.state.value.count).toBe(0); // Initial state

      jest.advanceTimersByTime(1000);
      expect(countService.state.value.count).toBe(1); // After first delay

      jest.advanceTimersByTime(1000);
      expect(countService.state.value.count).toBe(2); // After second delay

      jest.advanceTimersByTime(1000);
      expect(countService.state.value.count).toBe(3); // After third delay
    });
  });
});
