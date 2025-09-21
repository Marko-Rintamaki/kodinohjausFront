import { useState, useEffect, useCallback } from 'react';
import { 
  autoAuthenticate, 
  forceReauthentication, 
  logout, 
  getAuthStatus,
  setDebugToHomeLocation,
  disableDebugMode,
  getDebugStatus,
  getStoredToken
} from '../helpers/authHelper';
import { 
  initializeSocket, 
  sendControlCommand, 
  sendDataQuery, 
  disconnectSocket,
  isSocketConnected
} from '../helpers/socketHelper';

// Debug logging flags - set to true to enable specific logging categories:
// useAuthLogging: useAuth hook socket connection logging
var useAuthLogging = false;

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  expiresAt: Date | null;
}

interface UseAuthReturn extends AuthState {
  authenticate: () => Promise<void>;
  forceAuth: () => Promise<void>;
  logout: () => void;
  sendControlCommand: (command: any) => Promise<any>;
  sendDataQuery: (query: any) => Promise<any>;
  isSocketConnected: () => boolean;
  // Debug funktiot
  setDebugToHome: () => void;
  disableDebug: () => void;
  getDebugStatus: () => any;
}

/**
 * React hook autentikoinnin ja socket kommunikoinnin hallintaan
 */
export const useAuth = (): UseAuthReturn => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    token: null,
    expiresAt: null
  });

  const [socketConnected, setSocketConnected] = useState(false);

  // Päivitä autentikoinnin tila
  const updateAuthState = useCallback(() => {
    const status = getAuthStatus();
    setAuthState(prev => ({
      ...prev,
      isAuthenticated: status.isAuthenticated,
      token: status.token,
      expiresAt: status.expiresAt,
      isLoading: false
    }));
  }, []);

  // Automaattinen autentikointi komponentin latautuessa
  const authenticate = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await autoAuthenticate();
      
      if (result.success) {
        updateAuthState();
        setAuthState(prev => ({ ...prev, error: null }));
      } else {
        setAuthState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: result.error || 'Authentication failed'
        }));
      }
    } catch (error) {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication error'
      }));
    }
  }, [updateAuthState]);

  // Pakollinen uudelleen autentikointi
  const forceAuth = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await forceReauthentication();
      
      if (result.success) {
        updateAuthState();
        setAuthState(prev => ({ ...prev, error: null }));
      } else {
        setAuthState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: result.error || 'Re-authentication failed'
        }));
      }
    } catch (error) {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Re-authentication error'
      }));
    }
  }, [updateAuthState]);

  // Uloskirjautuminen
  const handleLogout = useCallback(() => {
    logout();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: null,
      expiresAt: null
    });
  }, []);

  // Tarkista token voimassaolo säännöllisesti
  useEffect(() => {
    const checkTokenValidity = () => {
      const status = getAuthStatus();
      if (!status.isAuthenticated && authState.isAuthenticated) {
        // Token on vanhentunut
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: false,
          token: null,
          expiresAt: null,
          error: 'Token expired'
        }));
        disconnectSocket();
      } else if (status.isAuthenticated && !authState.isAuthenticated) {
        // Token on tullut saataville
        updateAuthState();
      }
    };

    // Tarkista heti
    checkTokenValidity();

    // Tarkista minuutin välein
    const interval = setInterval(checkTokenValidity, 60000);

    return () => clearInterval(interval);
  }, [authState.isAuthenticated, updateAuthState]);

  // Alusta socket yhteys komponentin latautuessa
  useEffect(() => {
    if (useAuthLogging) {
      console.log('Initializing socket connection...');
    }
    
    // Hae mahdollinen olemassa oleva token
    const existingToken = getStoredToken();
    
    // Alusta socket callbackeilla
    initializeSocket(existingToken || undefined, {
      onConnect: () => {
        if (useAuthLogging) {
          console.log('Socket connected successfully');
        }
        setSocketConnected(true);
      },
      onDisconnect: () => {
        if (useAuthLogging) {
          console.log('Socket disconnected');
        }
        setSocketConnected(false);
      },
      onError: (error) => {
        console.error('Socket error:', error);
        setAuthState(prev => ({ 
          ...prev, 
          error: `Socket error: ${error.message || error}` 
        }));
      }
    });

    // Siivoa socket kun komponentti puretaan
    return () => {
      disconnectSocket();
      setSocketConnected(false);
    };
  }, []);

  // Alusta autentikointi kun komponentti latautuu
  useEffect(() => {
    authenticate();
  }, [authenticate]);

  return {
    ...authState,
    authenticate,
    forceAuth,
    logout: handleLogout,
    sendControlCommand,
    sendDataQuery,
    isSocketConnected: () => socketConnected,
    // Debug funktiot
    setDebugToHome: setDebugToHomeLocation,
    disableDebug: disableDebugMode,
    getDebugStatus
  };
};

/**
 * Hook pelkälle socket kommunikoinnille (ei autentikointia)
 */
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Alusta socket ilman autentikointia
    initializeSocket(undefined, {
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false)
    });

    return () => {
      disconnectSocket();
      setIsConnected(false);
    };
  }, []);

  return {
    isConnected,
    sendDataQuery,
    isSocketConnected
  };
};
