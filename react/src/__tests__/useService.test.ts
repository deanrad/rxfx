import { renderHook } from '@testing-library/react-hooks';
import { createService } from '@rxfx/service';
import { useService } from '../useService';

describe('useService', () => {
  const createTestService = () => {
    const service = createService('test', jest.fn());
    service.cancelCurrent = jest.fn();
    service.cancelCurrentAndQueued = jest.fn();
    return service;
  };

  it('provides state, isActive, and request function', () => {
    const service = createTestService();
    const { result } = renderHook(() => useService(service));

    expect(result.current.state).toBeDefined();
    expect(result.current.isActive).toBe(false);
  });

  describe('unmount behavior', () => {
    it('does not cancel by default', () => {
      const service = createTestService();
      const { unmount } = renderHook(() => useService(service));

      unmount();
      expect(service.cancelCurrent).not.toHaveBeenCalled();
      expect(service.cancelCurrentAndQueued).not.toHaveBeenCalled();
    });

    it('calls cancelCurrent when unmount option is cancelCurrent', () => {
      const service = createTestService();
      const { unmount } = renderHook(() => 
        useService(service, { unmount: 'cancelCurrent' })
      );

      unmount();
      expect(service.cancelCurrent).toHaveBeenCalled();
    });

    it('calls cancelCurrentAndQueued when unmount option is cancelCurrentAndQueued', () => {
      const service = createTestService();
      const { unmount } = renderHook(() => 
        useService(service, { unmount: 'cancelCurrentAndQueued' })
      );

      unmount();
      expect(service.cancelCurrentAndQueued).toHaveBeenCalled();
    });
  });
});
