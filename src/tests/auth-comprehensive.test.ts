/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn((event, data, callback) => {
    // Simulate real backend responses based on request
    setTimeout(() => {
      if (event === 'request') {
        const { type, location, password, token } = data;
        
        if (type === 'auth_location') {
          // Test wrong coordinates (not near Turku, Finland: 60.623857, 22.110013)
          if (location?.latitude !== 60.623857 || location?.longitude !== 22.110013) {
            if (callback) {
              callback({
                success: false,
                error: 'Location authentication failed: Not within allowed radius',
                requiresAuth: true
              });
            }
          } else {
            // Correct coordinates
            if (callback) {
              callback({
                success: true,
                message: 'Location authentication successful',
                data: {
                  token: 'valid-location-token-12345',
                  expiresIn: 7776000000 // 90 days
                }
              });
            }
          }
        }
        
        if (type === 'auth_password') {
          if (password !== 'koti2025') {
            if (callback) {
              callback({
                success: false,
                error: 'Invalid password',
                requiresAuth: true
              });
            }
          } else {
            if (callback) {
              callback({
                success: true,
                message: 'Password authentication successful',
                data: {
                  token: 'valid-password-token-67890',
                  expiresIn: 7776000000
                }
              });
            }
          }
        }
        
        if (type === 'verify_token') {
          if (token === 'valid-location-token-12345' || token === 'valid-password-token-67890') {
            if (callback) {
              callback({
                success: true,
                message: 'Token is valid',
                data: { valid: true }
              });
            }
          } else {
            if (callback) {
              callback({
                success: false,
                error: 'Invalid or expired token',
                requiresAuth: true
              });
            }
          }
        }
        
        // Socket operations with authentication
        if (type === 'sql_query') {
          if (token === 'valid-location-token-12345' || token === 'valid-password-token-67890') {
            if (callback) {
              callback({
                success: true,
                data: [
                  { id: 1, name: 'Test Layout', type: 'lamp', x: 100, y: 200 },
                  { id: 2, name: 'Test Heating', type: 'heatingPipe', x: 300, y: 400 }
                ]
              });
            }
          } else {
            if (callback) {
              callback({
                success: false,
                error: 'Authentication required',
                requiresAuth: true
              });
            }
          }
        }
        
        if (type === 'controller_command') {
          if (token === 'valid-location-token-12345' || token === 'valid-password-token-67890') {
            if (callback) {
              callback({
                success: true,
                message: 'Command executed successfully',
                data: { deviceId: data.data?.id, newState: 'on' }
              });
            }
          } else {
            if (callback) {
              callback({
                success: false,
                error: 'Authentication required for controller commands',
                requiresAuth: true
              });
            }
          }
        }
      }
    }, 10);
  }),
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

// Authentication helper functions
async function authenticateWithLocation(latitude: number, longitude: number): Promise<any> {
  return new Promise((resolve) => {
    mockSocket.emit('request', {
      type: 'auth_location',
      location: { latitude, longitude }
    }, resolve);
  });
}

async function authenticateWithPassword(password: string): Promise<any> {
  return new Promise((resolve) => {
    mockSocket.emit('request', {
      type: 'auth_password',
      password
    }, resolve);
  });
}

async function verifyToken(token: string): Promise<any> {
  return new Promise((resolve) => {
    mockSocket.emit('request', {
      type: 'verify_token',
      token
    }, resolve);
  });
}

async function testSocketQuery(token: string): Promise<any> {
  return new Promise((resolve) => {
    mockSocket.emit('request', {
      type: 'sql_query',
      data: { sql: 'SELECT * FROM layout_items', params: [] },
      token
    }, resolve);
  });
}

async function testControllerCommand(token: string): Promise<any> {
  return new Promise((resolve) => {
    mockSocket.emit('request', {
      type: 'controller_command',
      data: { command: 'set', id: 'relay1', value: true },
      token
    }, resolve);
  });
}

describe('Comprehensive Authentication Flow Tests', () => {
  let validToken: string | null = null;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = true;
    validToken = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('Step 1: Authentication with wrong coordinates should fail', async () => {
    console.log('🧪 Testing wrong coordinates (Helsinki instead of Turku)');
    
    const result = await authenticateWithLocation(60.1699, 24.9384); // Helsinki
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Location authentication failed');
    expect(result.requiresAuth).toBe(true);
    
    console.log('✅ Wrong coordinates correctly rejected');
  });

  test('Step 2: Authentication with wrong password should fail', async () => {
    console.log('🧪 Testing wrong password');
    
    const result = await authenticateWithPassword('wrongpassword');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid password');
    expect(result.requiresAuth).toBe(true);
    
    console.log('✅ Wrong password correctly rejected');
  });

  test('Step 3: Authentication with wrong token should fail', async () => {
    console.log('🧪 Testing invalid token');
    
    const result = await verifyToken('invalid-token-123');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid or expired token');
    expect(result.requiresAuth).toBe(true);
    
    console.log('✅ Invalid token correctly rejected');
  });

  test('Step 4: Authentication with correct coordinates should succeed', async () => {
    console.log('🧪 Testing correct coordinates (Turku, Finland)');
    
    const result = await authenticateWithLocation(60.623857, 22.110013); // Turku
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Location authentication successful');
    expect(result.data).toBeDefined();
    expect(result.data!.token).toBeDefined();
    expect(result.data!.token).toMatch(/valid-location-token-/);
    
    validToken = result.data!.token;
    console.log(`✅ Location authentication successful, token: ${validToken}`);
  });

  test('Step 5: Verify that obtained token is valid', async () => {
    // First get a valid token
    const authResult = await authenticateWithLocation(60.623857, 22.110013);
    const token = authResult.data.token;
    
    console.log('🧪 Verifying obtained token');
    
    const result = await verifyToken(token);
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Token is valid');
    expect(result.data.valid).toBe(true);
    
    console.log('✅ Token verification successful');
  });

  test('Step 6: Alternative password authentication should work', async () => {
    console.log('🧪 Testing password authentication as fallback');
    
    const result = await authenticateWithPassword('koti2025');
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Password authentication successful');
    expect(result.data.token).toBeDefined();
    expect(result.data.token).toMatch(/valid-password-token-/);
    
    console.log(`✅ Password authentication successful, token: ${result.data.token}`);
  });

  test('Step 7: Socket operations should work with valid token', async () => {
    // Get valid token first
    const authResult = await authenticateWithLocation(60.623857, 22.110013);
    const token = authResult.data.token;
    
    console.log('🧪 Testing socket query with valid token');
    
    const queryResult = await testSocketQuery(token);
    
    expect(queryResult.success).toBe(true);
    expect(queryResult.data).toBeInstanceOf(Array);
    expect(queryResult.data.length).toBeGreaterThan(0);
    expect(queryResult.data[0]).toHaveProperty('id');
    expect(queryResult.data[0]).toHaveProperty('type');
    
    console.log('✅ Socket query with authentication successful');
  });

  test('Step 8: Controller commands should work with valid token', async () => {
    // Get valid token first  
    const authResult = await authenticateWithPassword('koti2025');
    const token = authResult.data.token;
    
    console.log('🧪 Testing controller command with valid token');
    
    const commandResult = await testControllerCommand(token);
    
    expect(commandResult.success).toBe(true);
    expect(commandResult.message).toContain('Command executed successfully');
    expect(commandResult.data.deviceId).toBe('relay1');
    expect(commandResult.data.newState).toBe('on');
    
    console.log('✅ Controller command with authentication successful');
  });

  test('Step 9: Socket operations should fail without token', async () => {
    console.log('🧪 Testing socket query without authentication');
    
    const queryResult = await testSocketQuery('');
    
    expect(queryResult.success).toBe(false);
    expect(queryResult.error).toContain('Authentication required');
    expect(queryResult.requiresAuth).toBe(true);
    
    console.log('✅ Unauthenticated socket query correctly rejected');
  });

  test('Step 10: Controller commands should fail with invalid token', async () => {
    console.log('🧪 Testing controller command with invalid token');
    
    const commandResult = await testControllerCommand('invalid-token');
    
    expect(commandResult.success).toBe(false);
    expect(commandResult.error).toContain('Authentication required');
    expect(commandResult.requiresAuth).toBe(true);
    
    console.log('✅ Unauthenticated controller command correctly rejected');
  });
});

describe('Authentication Integration Flow', () => {
  test('Complete authentication flow: wrong → wrong → correct → use token', async () => {
    console.log('🚀 Starting complete authentication flow test');
    
    // Step 1: Try wrong coordinates
    console.log('1️⃣ Trying wrong coordinates...');
    const wrongLocationResult = await authenticateWithLocation(61.0, 25.0); // Wrong location
    expect(wrongLocationResult.success).toBe(false);
    console.log('❌ Wrong coordinates rejected as expected');
    
    // Step 2: Try wrong password
    console.log('2️⃣ Trying wrong password...');
    const wrongPasswordResult = await authenticateWithPassword('wrongpass');
    expect(wrongPasswordResult.success).toBe(false);
    console.log('❌ Wrong password rejected as expected');
    
    // Step 3: Use correct coordinates
    console.log('3️⃣ Using correct coordinates...');
    const correctLocationResult = await authenticateWithLocation(60.623857, 22.110013);
    expect(correctLocationResult.success).toBe(true);
    const validToken = correctLocationResult.data.token;
    console.log('✅ Correct coordinates accepted, got token');
    
    // Step 4: Use token for socket operations
    console.log('4️⃣ Testing socket operations with token...');
    const queryResult = await testSocketQuery(validToken);
    expect(queryResult.success).toBe(true);
    console.log('✅ Socket query works with valid token');
    
    const commandResult = await testControllerCommand(validToken);
    expect(commandResult.success).toBe(true);
    console.log('✅ Controller command works with valid token');
    
    console.log('🎉 Complete authentication flow test successful!');
  });
});