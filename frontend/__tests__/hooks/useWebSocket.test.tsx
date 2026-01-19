import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '@/hooks/useWebSocket';

describe('useWebSocket', () => {
  let mockWebSocket: any;

  beforeEach(() => {
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
    };
    
    global.WebSocket = jest.fn(() => mockWebSocket) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates WebSocket connection', () => {
    const { result } = renderHook(() => useWebSocket('test-job-id'));

    expect(global.WebSocket).toHaveBeenCalled();
  });

  it('handles incoming messages', () => {
    const onMessage = jest.fn();
    const { result } = renderHook(() => 
      useWebSocket('test-job-id', { onMessage })
    );

    // Simulate receiving a message
    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({ progress: 50, status: 'processing' }),
        });
      }
    });

    expect(onMessage).toHaveBeenCalled();
  });

  it('handles connection open', () => {
    const onOpen = jest.fn();
    const { result } = renderHook(() => 
      useWebSocket('test-job-id', { onOpen })
    );

    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }
    });

    expect(onOpen).toHaveBeenCalled();
  });

  it('handles connection close', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useWebSocket('test-job-id', { onClose })
    );

    act(() => {
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose();
      }
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('closes connection on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket('test-job-id'));

    unmount();

    expect(mockWebSocket.close).toHaveBeenCalled();
  });
});
