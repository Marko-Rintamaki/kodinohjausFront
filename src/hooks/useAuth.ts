/**
 * 🔒 CRITICAL: Authentication Service
 * 
 * Handles authentication using the SocketProvider architecture.
 * Integrates with Socket.IO service and React Context.
 * 
 * Security: All location validation happens on backend only.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocketService } from '../hooks/useSocket';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  user: Record<string, unknown> | null;
}

interface LocationData {
  latitude: number;
  longitude: number;
}

export function useAuth() {
  const { service, isConnected } = useSocketService();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: localStorage.getItem('authToken'),
    isLoading: false,
    error: null,
    user: null
  });

  // Track if authentication has been attempted to avoid infinite loops
  const [authAttempted, setAuthAttempted] = useState(false);

  /**
   * Try authentication with stored token
   */
  const tryTokenAuth = useCallback(async (token: string): Promise<boolean> => {
    try {
      console.log('🔐 Auth: Trying token authentication...');
      const response = await service.authenticateAsync({ token });
      
      if (response.success && response.data && typeof response.data === 'object' && 'token' in response.data) {
        console.log('🔐 Auth: Token authentication successful');
        const authData = response.data as { token: string; user: Record<string, unknown> };
        
        setAuthState({
          isAuthenticated: true,
          token: authData.token,
          isLoading: false,
          error: null,
          user: authData.user
        });
        localStorage.setItem('authToken', authData.token);
        return true;
      } else {
        console.warn('⚠️ Auth: Token authentication failed:', response.error || response.message);
        localStorage.removeItem('authToken');
        setAuthState(prev => ({ ...prev, token: null }));
        return false;
      }
    } catch (error) {
      console.error('❌ Auth: Token authentication error:', error);
      localStorage.removeItem('authToken');
      setAuthState(prev => ({ ...prev, token: null }));
      return false;
    }
  }, [service]);

  /**
   * 🔒 SECURITY: Try location-based authentication
   * 
   * Frontend only gets GPS coordinates and sends them to backend.
   * Backend validates if coordinates are within home area.
   * No location validation logic on frontend to prevent spoofing.
   * Can be called manually even after auto-auth attempt.
   */
  const tryLocationAuth = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };

          console.log('🔐 Auth: Sending location to backend for validation...');

          try {
            const response = await service.authenticateAsync({ location });
            
            if (response.success && response.data && typeof response.data === 'object' && 'token' in response.data) {
              console.log('🔐 Auth: Location authentication successful');
              const authData = response.data as { token: string; user: Record<string, unknown> };
              
              setAuthState({
                isAuthenticated: true,
                token: authData.token,
                isLoading: false,
                error: null,
                user: authData.user
              });
              localStorage.setItem('authToken', authData.token);
              resolve(true);
            } else {
              console.warn('⚠️ Auth: Location authentication failed:', response.error || response.message);
              setAuthState(prev => ({ 
                ...prev, 
                isLoading: false, 
                error: 'Location-based authentication failed' 
              }));
              resolve(false);
            }
          } catch (error) {
            console.error('❌ Auth: Location authentication error:', error);
            setAuthState(prev => ({ 
              ...prev, 
              isLoading: false, 
              error: 'Location authentication error' 
            }));
            resolve(false);
          }
        },
        (error) => {
          console.error('❌ Auth: Geolocation error:', error);
          setAuthState(prev => ({ 
            ...prev, 
            isLoading: false, 
            error: 'Location access denied' 
          }));
          reject(error);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }, [service]);

  /**
   * 🔒 CRITICAL: Initialize authentication on startup
   * Tries stored token first, then location-based auth (only once)
   */
  const initializeAuth = useCallback(async () => {
    if (!isConnected || authState.isLoading || authAttempted) return;

    console.log('🔐 Auth: Initializing authentication...');
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    setAuthAttempted(true); // Mark that we've attempted authentication

    try {
      const storedToken = localStorage.getItem('authToken');
      
      if (storedToken) {
        console.log('🔐 Auth: Trying stored token...');
        const success = await tryTokenAuth(storedToken);
        if (success) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }

      // Try location-based authentication ONLY ONCE
      console.log('🔐 Auth: Trying location-based authentication (one attempt only)...');
      const locationSuccess = await tryLocationAuth();
      
      if (!locationSuccess) {
        console.log('🔐 Auth: Automatic authentication failed. Manual authentication required.');
        setAuthState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'Automatic authentication failed. Please authenticate manually.' 
        }));
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
      
    } catch (error) {
      console.error('❌ Auth: Initialization failed:', error);
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      }));
    }
  }, [isConnected, authState.isLoading, authAttempted, tryLocationAuth, tryTokenAuth]);

  /**
   * Manual password authentication (can be used even after auto-auth has been attempted)
   */
  const authenticateWithPassword = useCallback(async (password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('🔐 Auth: Trying password authentication...');
      const response = await service.authenticateAsync({ password });
      
      if (response.success && response.data && typeof response.data === 'object' && 'token' in response.data) {
        console.log('🔐 Auth: Password authentication successful');
        const authData = response.data as { token: string; user: Record<string, unknown> };
        
        setAuthState({
          isAuthenticated: true,
          token: authData.token,
          isLoading: false,
          error: null,
          user: authData.user
        });
        localStorage.setItem('authToken', authData.token);
        return true;
      } else {
        console.error('❌ Auth: Password authentication failed:', response.error || response.message);
        setAuthState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'Invalid password' 
        }));
        return false;
      }
    } catch (error) {
      console.error('❌ Auth: Password authentication error:', error);
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Password authentication error' 
      }));
      return false;
    }
  }, [service]);

  /**
   * Logout - clear all auth data
   */
  const logout = useCallback(() => {
    console.log('🔐 Auth: Logging out...');
    localStorage.removeItem('authToken');
    setAuthState({
      isAuthenticated: false,
      token: null,
      isLoading: false,
      error: null,
      user: null
    });
    // Reset auth attempt flag so user can try authentication again
    setAuthAttempted(false);
  }, []);

  /**
   * Store latest initializeAuth in ref to avoid dependency issues
   */
  const initializeAuthRef = useRef(initializeAuth);
  initializeAuthRef.current = initializeAuth;

  /**
   * Auto-initialize authentication when connected (only once)
   */
  useEffect(() => {
    if (isConnected && !authState.isAuthenticated && !authState.isLoading && !authAttempted) {
      initializeAuthRef.current();
    }
  }, [isConnected, authState.isAuthenticated, authState.isLoading, authAttempted]);

  return {
    ...authState,
    initializeAuth,
    tryLocationAuth,
    authenticateWithPassword,
    logout
  };
}