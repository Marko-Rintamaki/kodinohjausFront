import React, { useEffect, useState } from 'react';
import { useAuthWithFallback } from '../hooks/useAuthWithFallback';
import PasswordAuthDialog from './PasswordAuthDialog';

/**
 * Global Authentication Manager
 * - Handles automatic authentication attempts
 * - Shows password fallback dialog when location auth fails
 * - Integrates with the automatic socket system
 */
const AuthManager: React.FC = () => {
  const {
    attemptAuthentication,
    showPasswordDialog,
    closePasswordDialog
  } = useAuthWithFallback();

  const [hasTriedAuth, setHasTriedAuth] = useState(false);

  // Reset auth attempt when showPasswordDialog changes (user can retry)
  useEffect(() => {
    if (!showPasswordDialog && hasTriedAuth) {
      // If dialog was closed, allow retry after 10 seconds
      const retryTimer = setTimeout(() => {
        console.log('[AuthManager] Allowing auth retry after dialog close');
        setHasTriedAuth(false);
      }, 10000);
      return () => clearTimeout(retryTimer);
    }
  }, [showPasswordDialog, hasTriedAuth]);

  // Listen for authentication needs from the global system
  useEffect(() => {
    // Custom event listener for when automatic auth fails and we need fallback
    const handleAuthenticationNeeded = async () => {
      console.log('[AuthManager] Authentication needed - checking existing token...');
      
      // Check if we already have a token
      const existingToken = localStorage.getItem('authToken');
      if (existingToken) {
        console.log('[AuthManager] Token exists in storage - assuming it works until proven otherwise');
        return; // Trust the token until we get needsAuth response
      }

      // If no token and haven't tried auth yet, try automatic authentication
      if (!hasTriedAuth) {
        console.log('[AuthManager] No token found, attempting automatic authentication...');
        setHasTriedAuth(true);
        
        try {
          const result = await attemptAuthentication();
          if (result.success && result.token) {
            console.log('[AuthManager] Automatic authentication successful');
            localStorage.setItem('authToken', result.token);
            // Socket will handle the reconnection automatically
          } else if (result.needsPasswordFallback) {
            console.log('[AuthManager] Location auth failed, password dialog should be shown');
            // Password dialog is already handled by the hook
          } else {
            console.log('[AuthManager] Authentication failed without fallback needed');
            // Allow retry after 30 seconds
            setTimeout(() => setHasTriedAuth(false), 30000);
          }
        } catch (error) {
          console.error('[AuthManager] Authentication attempt failed:', error);
          // Allow retry after error
          setTimeout(() => setHasTriedAuth(false), 15000);
        }
      } else {
        console.log('[AuthManager] Already tried auth, waiting for retry timer or manual retry');
      }
    };

    // Listen for custom authentication events
    window.addEventListener('authenticationNeeded', handleAuthenticationNeeded);

    // Add global retry function for debugging
    (window as any).retryAuth = () => {
      console.log('[AuthManager] Manual auth retry requested');
      localStorage.removeItem('authToken'); // Clear invalid token
      setHasTriedAuth(false);
      handleAuthenticationNeeded();
    };

    // Listen for needsAuth responses and clear invalid tokens
    const handleNeedsAuth = () => {
      console.log('[AuthManager] Received needsAuth - clearing invalid token');
      localStorage.removeItem('authToken');
      setHasTriedAuth(false);
      handleAuthenticationNeeded();
    };

    window.addEventListener('needsAuth', handleNeedsAuth);

    // Trigger initial authentication check after a short delay
    const initialAuthTimer = setTimeout(() => {
      console.log('[AuthManager] Starting initial authentication check...');
      handleAuthenticationNeeded();
    }, 3000); // Wait 3 seconds for socket to connect

    return () => {
      window.removeEventListener('authenticationNeeded', handleAuthenticationNeeded);
      window.removeEventListener('needsAuth', handleNeedsAuth);
      clearTimeout(initialAuthTimer);
    };
  }, [attemptAuthentication, hasTriedAuth]);



  return (
    <>
      {/* Password fallback dialog */}
      <PasswordAuthDialog
        open={showPasswordDialog}
        onClose={closePasswordDialog}
        onSuccess={async (token: string) => {
          // PasswordAuthDialog odottaa token, mutta meidän handlePasswordSuccess odottaa password
          // Tämä on jo hoidettu PasswordAuthDialog sisällä, joten vain hyväksy token
          console.log('[AuthManager] Password authentication successful via dialog');
          localStorage.setItem('authToken', token);
          
          // Trigger socket reconnection
          const { initializeSocket } = await import('../helpers/socketHelper');
          initializeSocket(token, {
            onConnect: () => {
              console.log('[AuthManager] Socket reconnected with password token');
            }
          });
        }}
        reason="Sijainti-autentikointi epäonnistui - syötä fallback salasana"
      />
    </>
  );
};

export default AuthManager;