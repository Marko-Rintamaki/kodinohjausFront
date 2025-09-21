import { useState, useCallback } from 'react';
import { requestAuthentication, requestPasswordAuthentication } from '../helpers/socketHelper';

interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
  needsPasswordFallback?: boolean;
}

export const useAuthWithFallback = () => {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const attemptAuthentication = useCallback(async (): Promise<AuthResult> => {
    setAuthLoading(true);
    setAuthError('');

    try {
      // Yritä ensin geolocation-pohjaista autentikointia
      console.log('Attempting geolocation authentication...');
      
      // Hae nykyinen sijainti
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation ei tueta'));
          return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      console.log('Got geolocation:', { latitude, longitude });

      const result = await requestAuthentication(latitude, longitude);
      
      if (result.success && result.token) {
        console.log('Geolocation authentication successful!');
        return {
          success: true,
          token: result.token
        };
      } else {
        console.log('Geolocation authentication failed, showing password fallback');
        setShowPasswordDialog(true);
        return {
          success: false,
          error: result.error || 'Sijainti-autentikointi epäonnistui',
          needsPasswordFallback: true
        };
      }

    } catch (geoError) {
      console.log('Geolocation failed:', geoError);
      console.log('Showing password fallback due to geolocation error');
      setShowPasswordDialog(true);
      return {
        success: false,
        error: 'Sijaintitiedon haku epäonnistui',
        needsPasswordFallback: true
      };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const authenticateWithPassword = useCallback(async (password: string): Promise<AuthResult> => {
    try {
      console.log('Attempting password authentication...');
      const result = await requestPasswordAuthentication(password);
      
      if (result.success && result.token) {
        console.log('Password authentication successful!');
        setShowPasswordDialog(false);
        return {
          success: true,
          token: result.token
        };
      } else {
        return {
          success: false,
          error: result.error || 'Väärä salasana'
        };
      }
    } catch (error) {
      console.error('Password authentication error:', error);
      return {
        success: false,
        error: 'Autentikointi epäonnistui'
      };
    }
  }, []);

  const closePasswordDialog = useCallback(() => {
    setShowPasswordDialog(false);
    setAuthError('');
  }, []);

  return {
    attemptAuthentication,
    authenticateWithPassword,
    showPasswordDialog,
    closePasswordDialog,
    authLoading,
    authError,
    setAuthError
  };
};