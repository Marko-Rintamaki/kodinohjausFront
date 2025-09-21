/**
 * 🔧 DEMO: Socket & Auth Test Component
 * 
 * Tests the SocketProvider + useAuth architecture.
 * Shows connection status, authentication state, and provides manual controls.
 */

import React from 'react';
import { useConnectionStatus } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';

export function AuthDemo() {
  const { isConnected, connectionStatus, lastError } = useConnectionStatus();
  const { 
    isAuthenticated, 
    isLoading, 
    error: authError, 
    user,
    tryLocationAuth,
    authenticateWithPassword,
    logout 
  } = useAuth();

  const [password, setPassword] = React.useState('');

  const handlePasswordAuth = async () => {
    if (!password) return;
    const success = await authenticateWithPassword(password);
    if (success) {
      setPassword('');
    }
  };

  const handleLocationAuth = async () => {
    await tryLocationAuth();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">🔧 Socket & Auth Demo</h2>
      
      {/* Connection Status */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">🔌 Connection Status</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
            <span className="text-sm text-gray-600">({connectionStatus})</span>
          </div>
          {lastError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {lastError}
            </div>
          )}
        </div>
      </div>

      {/* Authentication Status */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">🔐 Authentication Status</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</span>
          </div>
          
          {isLoading && (
            <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
              🔄 Authenticating...
            </div>
          )}
          
          {authError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              ❌ {authError}
            </div>
          )}
          
          {user && (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
              ✅ User: {JSON.stringify(user)}
            </div>
          )}
        </div>
      </div>

      {/* Manual Authentication Controls */}
      {!isAuthenticated && (
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-3">🎛️ Manual Authentication</h3>
          
          {/* Location Auth Button */}
          <div className="mb-4">
            <button
              onClick={handleLocationAuth}
              disabled={!isConnected || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              📍 Try Location Auth
            </button>
            <p className="text-sm text-gray-600 mt-1">
              Uses your current GPS location for authentication
            </p>
          </div>

          {/* Password Auth */}
          <div className="mb-4">
            <div className="flex gap-2 mb-1">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={!isConnected || isLoading}
                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordAuth()}
              />
              <button
                onClick={handlePasswordAuth}
                disabled={!isConnected || isLoading || !password}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                🔑 Password Auth
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Fallback password authentication
            </p>
          </div>
        </div>
      )}

      {/* Logout */}
      {isAuthenticated && (
        <div className="mb-6 p-4 border rounded-lg">
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            🚪 Logout
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-2">📋 Testing Instructions:</h4>
        <ol className="text-sm space-y-1 list-decimal list-inside text-gray-700">
          <li>Connection should auto-establish to backend</li>
          <li>Authentication should auto-try stored token + location</li>
          <li>If auto-auth fails, use manual buttons</li>
          <li>Location auth works if you're near home coordinates</li>
          <li>Password auth uses fallback password</li>
          <li>All state changes are logged to console</li>
        </ol>
      </div>
    </div>
  );
}