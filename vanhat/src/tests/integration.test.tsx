import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeSocket, sendQuery, sendControlCommand, disconnectSocket } from '../helpers/socketHelper';
import { attemptAuthentication, isTokenValid, getStoredToken } from '../helpers/authHelper';

// Mock socket.io-client
const mockSocket = {
  connected: true,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  onAny: vi.fn(),
  once: vi.fn()
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn()
};
Object.defineProperty(navigator, 'geolocation', { value: mockGeolocation });

describe('Socket Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  afterEach(() => {
    disconnectSocket();
    vi.clearAllMocks();
  });

  test('initializes socket connection with token', () => {
    const callbacks = {
      onConnect: vi.fn(),
      onDisconnect: vi.fn()
    };

    const socket = initializeSocket('test-token', callbacks);

    expect(socket).toBeDefined();
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  test('sends query through socket', () => {
    initializeSocket('test-token');
    
    const query = { type: 'overview', timestamp: Date.now() };
    sendQuery(query);

    expect(mockSocket.emit).toHaveBeenCalledWith('dataQuery', query);
  });

  test('sends control command through socket', async () => {
    initializeSocket('test-token');
    
    // Mock successful response
    mockSocket.once.mockImplementation((event, callback) => {
      if (event === 'controlResponse') {
        setTimeout(() => callback({ success: true }), 10);
      }
    });

    const command = {
      id: 'device1',
      function: 'turn_on',
      path: '/lights/1',
      value: true
    };

    const response = await sendControlCommand(command);
    
    expect(response).toEqual({ success: true });
    expect(mockSocket.emit).toHaveBeenCalledWith('control', command);
  });

  test('handles socket connection callback', () => {
    const onConnect = vi.fn();
    const callbacks = { onConnect };

    initializeSocket('test-token', callbacks);

    // Simulate connect event
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
    connectHandler?.();

    expect(onConnect).toHaveBeenCalled();
  });

  test('handles socket disconnection callback', () => {
    const onDisconnect = vi.fn();
    const callbacks = { onDisconnect };

    initializeSocket('test-token', callbacks);

    // Simulate disconnect event
    const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
    disconnectHandler?.('transport close');

    expect(onDisconnect).toHaveBeenCalled();
  });

  test('handles data query response', () => {
    const onDataQueryResponse = vi.fn();
    const callbacks = { onDataQueryResponse };

    initializeSocket('test-token', callbacks);

    const mockData = {
      type: 'overview',
      lighting: { total: 5, on: 3 },
      heating: { temperature: 21, target: 22 }
    };

    // Simulate dataQueryResponse event
    const responseHandler = mockSocket.on.mock.calls.find(call => call[0] === 'dataQueryResponse')?.[1];
    responseHandler?.(mockData);

    expect(onDataQueryResponse).toHaveBeenCalledWith(mockData);
  });

  test('handles control response', () => {
    const onControlResponse = vi.fn();
    const callbacks = { onControlResponse };

    initializeSocket('test-token', callbacks);

    const mockResponse = {
      success: true,
      deviceId: 'light1',
      newState: { state: 'on', brightness: 100 }
    };

    // Simulate controlResponse event
    const responseHandler = mockSocket.on.mock.calls.find(call => call[0] === 'controlResponse')?.[1];
    responseHandler?.(mockResponse);

    expect(onControlResponse).toHaveBeenCalledWith(mockResponse);
  });

  test('disconnects socket properly', () => {
    initializeSocket('test-token');
    
    disconnectSocket();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('validates stored token', () => {
    // Mock valid token and expiry
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'authToken') return 'valid-token';
      if (key === 'tokenExpiry') return String(Date.now() + 60000); // Valid for 1 minute
      return null;
    });

    const isValid = isTokenValid();
    
    expect(isValid).toBe(true);
  });

  test('invalidates expired token', () => {
    // Mock expired token
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'authToken') return 'expired-token';
      if (key === 'tokenExpiry') return String(Date.now() - 60000); // Expired 1 minute ago
      return null;
    });

    const isValid = isTokenValid();
    
    expect(isValid).toBe(false);
  });

  test('returns null for missing token', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const token = getStoredToken();
    
    expect(token).toBeNull();
  });

  test('returns stored token when available', () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'authToken') return 'stored-token';
      return null;
    });

    const token = getStoredToken();
    
    expect(token).toBe('stored-token');
  });

  test('attempts authentication with geolocation', async () => {
    // Mock successful geolocation
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 60.623857,
          longitude: 22.110013,
          accuracy: 10
        }
      });
    });

    // Mock socket connection for authentication
    initializeSocket();

    // Mock successful authentication response
    mockSocket.once.mockImplementation((event, callback) => {
      if (event === 'authResponse') {
        setTimeout(() => callback({
          success: true,
          token: 'new-auth-token',
          expiresIn: 3600000
        }), 10);
      }
    });

    const result = await attemptAuthentication();

    expect(result.success).toBe(true);
    expect(result.token).toBe('new-auth-token');
    expect(mockSocket.emit).toHaveBeenCalledWith('authenticate', expect.objectContaining({
      location: {
        latitude: 60.623857,
        longitude: 22.110013
      }
    }));
  });

  test('handles geolocation error', async () => {
    // Mock geolocation error
    mockGeolocation.getCurrentPosition.mockImplementation((_success, error) => {
      error({
        code: 1,
        message: 'Permission denied'
      });
    });

    const result = await attemptAuthentication();

    expect(result.success).toBe(false);
    expect(result.error).toContain('Sijainnin haku epäonnistui');
  });

  test('handles authentication failure from server', async () => {
    // Mock successful geolocation
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 61.0, // Wrong location
          longitude: 22.0,
          accuracy: 10
        }
      });
    });

    initializeSocket();

    // Mock failed authentication response
    mockSocket.once.mockImplementation((event, callback) => {
      if (event === 'authResponse') {
        setTimeout(() => callback({
          success: false,
          error: 'Location too far from home'
        }), 10);
      }
    });

    const result = await attemptAuthentication();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Location too far from home');
  });
});
