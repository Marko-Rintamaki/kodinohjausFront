import { requestAuthentication, disconnectSocket } from './socketHelper';

// Debug logging flags - set to true to enable specific logging categories:
// authHelperLogging: Authentication location checks and token management
const authHelperLogging = false;

// Kotisijainti (README.md:n mukaan)
const HOME_COORDINATES = {
  latitude: 60.623857,
  longitude: 22.110013
};

// Maksimi etäisyys kotoa (README.md:n mukaan)
// ASETUS: Jos arvo < 0 => ei etäisyysrajaa (lähetetään aina autentikointipyyntö backendille)
const MAX_DISTANCE_METERS = -1; // Unlimited range to allow auth anywhere

// localStorage avaimet
const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  TOKEN_EXPIRY: 'tokenExpiry',
  LAST_AUTH_ATTEMPT: 'lastAuthAttempt',
  DEBUG_COORDS: 'debugCoordinates', // Debug-koordinaatit
  DEBUG_MODE: 'debugMode' // Debug-tila päälle/pois
};

interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

interface AuthResult {
  success: boolean;
  token?: string;
  expiresIn?: number;
  message?: string;
  error?: string;
}

/**
 * Laskee etäisyyden kahden koordinaatin välillä (Haversine formula)
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Maapallon säde metreinä
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Etäisyys metreinä
};

/**
 * Tarkistaa onko käyttäjä tarpeeksi lähellä kotia
 */
const isWithinHomeRange = (latitude: number, longitude: number): boolean => {
  if (MAX_DISTANCE_METERS < 0) {
    if (authHelperLogging) {
      console.log('Distance check bypassed (unlimited mode)');
    }
    return true; // Bypass distance check
  }

  const distance = calculateDistance(
    latitude,
    longitude,
    HOME_COORDINATES.latitude,
    HOME_COORDINATES.longitude
  );
  if (authHelperLogging) {
    console.log(`Distance from home: ${Math.round(distance)}m (max: ${MAX_DISTANCE_METERS}m)`);
  }
  return distance <= MAX_DISTANCE_METERS;
};

/**
 * Hakee nykyisen paikkatieto
 */
const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    // Tarkista debug-tila
    const debugMode = localStorage.getItem(STORAGE_KEYS.DEBUG_MODE) === 'true';
    const debugCoords = localStorage.getItem(STORAGE_KEYS.DEBUG_COORDS);
    
    if (debugMode && debugCoords) {
      if (authHelperLogging) {
        console.log('Debug mode enabled, using stored coordinates');
      }
      const coords = JSON.parse(debugCoords);
      resolve({
        coords: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: 10
        }
      } as GeolocationPosition);
      return;
    }

    // Kehitysympäristössä käytä mock-sijaintia
    if (window.location.hostname === 'localhost' || 
        window.location.hostname.includes('127.0.0.1') ||
        window.location.hostname.includes('codespace') ||
        window.location.hostname.includes('gitpod')) {
      if (authHelperLogging) {
        console.log('Development environment detected, using mock location');
      }
      // Mock position kotona (sallii autentikoinnin kehityksessä)
      resolve({
        coords: {
          latitude: HOME_COORDINATES.latitude,
          longitude: HOME_COORDINATES.longitude,
          accuracy: 10
        }
      } as GeolocationPosition);
      return;
    }

    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        console.error('Geolocation error:', error);
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minuutti
      }
    );
  });
};

/**
 * Tallentaa tokenin localStorage:iin
 */
const saveToken = (token: string, expiresIn: number): void => {
  const expiryDate = new Date();
  expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn);
  
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryDate.toISOString());
  
  if (authHelperLogging) {
    console.log('Token saved, expires:', expiryDate.toISOString());
  }
};

/**
 * Hakee tokenin localStorage:sta
 */
export const getStoredToken = (): string | null => {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
  
  if (!token || !expiry) {
    return null;
  }
  
  // Tarkista onko token vanhentunyt
  if (new Date() > new Date(expiry)) {
    if (authHelperLogging) {
      console.log('Token expired, removing from storage');
    }
    clearStoredToken();
    return null;
  }
  
  return token;
};

/**
 * Poistaa tokenin localStorage:sta
 */
export const clearStoredToken = (): void => {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  if (authHelperLogging) {
    console.log('Token cleared from storage');
  }
};

/**
 * Tarkistaa onko token voimassa
 */
export const isTokenValid = (): boolean => {
  return getStoredToken() !== null;
};

/**
 * Yrittää autentikoitua paikkatieto-pohjaisesti
 */
export const attemptAuthentication = async (): Promise<AuthResult> => {
  try {
    if (authHelperLogging) {
      console.log('Starting location-based authentication...');
    }
    
    // Hae nykyinen sijainti
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;
    
    if (authHelperLogging) {
      console.log(`Current position: ${latitude}, ${longitude}`);
    }
    
    // Tarkista kotietäisyys VAIN jos rajoitus käytössä
    if (!isWithinHomeRange(latitude, longitude)) {
      // Ei palauteta virhettä jos unlimited - mutta funktio jo palautti true unlimited-moodissa
      return {
        success: false,
        error: 'Not within home range for authentication (frontend check)'
      };
    }
    
    // Pyydä autentikointia backendilta koordinaateilla
    if (authHelperLogging) {
      console.log('Requesting authentication from backend...');
    }
    const authResponse = await requestAuthentication(latitude, longitude);
    
    if (authHelperLogging) {
      console.log('Authentication response:', authResponse);
    }
    
    if (authResponse.success && authResponse.token) {
      // Tallenna uusi token
      saveToken(authResponse.token, authResponse.expiresIn || 7776000); // 90 päivää default
      
      return {
        success: true,
        token: authResponse.token,
        expiresIn: authResponse.expiresIn,
        message: 'Authentication successful'
      };
    } else {
      return {
        success: false,
        error: authResponse.error || authResponse.message || 'Authentication failed'
      };
    }
    
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown authentication error'
    };
  }
};

/**
 * Automaattinen autentikointi joka yrittää hakea tokenia
 */
export const autoAuthenticate = async (): Promise<AuthResult> => {
  if (authHelperLogging) {
    console.log('Starting auto authentication...');
  }
  
  // Tarkista onko voimassa oleva token jo olemassa
  const existingToken = getStoredToken();
  if (existingToken) {
    if (authHelperLogging) {
      console.log('Valid token found in storage');
    }
    // Socket on jo alustettu useAuth:ssa, ei tarvitse alustaa uudestaan
    return { 
      success: true, 
      token: existingToken,
      message: 'Using existing valid token' 
    };
  }
  
  // Tarkista milloin viimeksi yritettiin autentikoitua (vältetään liian tiheä yrittäminen)
  const lastAttempt = localStorage.getItem(STORAGE_KEYS.LAST_AUTH_ATTEMPT);
  if (lastAttempt) {
    const timeSinceLastAttempt = Date.now() - parseInt(lastAttempt);
    if (timeSinceLastAttempt < 60000) { // 1 minuutti
      if (authHelperLogging) {
        console.log('Recent authentication attempt, skipping');
      }
      return { success: false, error: 'Recent attempt, wait before retrying' };
    }
  }
  
  // Merkitse yritysaika
  localStorage.setItem(STORAGE_KEYS.LAST_AUTH_ATTEMPT, Date.now().toString());
  
  // Yritä uutta autentikointia
  if (authHelperLogging) {
    console.log('Attempting new authentication...');
  }
  const result = await attemptAuthentication();
  
  if (result.success) {
    // Jos onnistui ja oli vanha token, se on jo korvattu
    if (authHelperLogging) {
      console.log('Authentication successful, token updated');
    }
  }
  
  return result;
};

/**
 * Pakottaa uudelleen autentikoinnin (poistaa vanhan tokenin ensin)
 */
export const forceReauthentication = async (): Promise<AuthResult> => {
  if (authHelperLogging) {
    console.log('Forcing re-authentication...');
  }
  
  // Poista vanha token
  clearStoredToken();
  
  // Sulje socket yhteys
  disconnectSocket();
  
  // Yritä uudelleen autentikoitua
  return await attemptAuthentication();
};

/**
 * Uloskirjautuminen
 */
export const logout = (): void => {
  if (authHelperLogging) {
    console.log('Logging out...');
  }
  clearStoredToken();
  disconnectSocket();
};

/**
 * Palauttaa autentikoinnin tilan
 */
export const getAuthStatus = () => {
  const token = getStoredToken();
  const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
  
  return {
    isAuthenticated: !!token,
    token,
    expiresAt: expiry ? new Date(expiry) : null,
    timeToExpiry: expiry ? new Date(expiry).getTime() - Date.now() : null
  };
};

// ============ DEBUG FUNKTIOT ============

/**
 * Ottaa debug-tilan käyttöön ja asettaa koordinaatit
 */
export const enableDebugMode = (latitude: number, longitude: number): void => {
  localStorage.setItem(STORAGE_KEYS.DEBUG_MODE, 'true');
  localStorage.setItem(STORAGE_KEYS.DEBUG_COORDS, JSON.stringify({ latitude, longitude }));
  if (authHelperLogging) {
    console.log(`Debug mode enabled with coordinates: ${latitude}, ${longitude}`);
  }
};

/**
 * Poistaa debug-tilan käytöstä
 */
export const disableDebugMode = (): void => {
  localStorage.removeItem(STORAGE_KEYS.DEBUG_MODE);
  localStorage.removeItem(STORAGE_KEYS.DEBUG_COORDS);
  if (authHelperLogging) {
    console.log('Debug mode disabled');
  }
};

/**
 * Asettaa kotisijainnin debug-koordinaateiksi (helppo autentikointi)
 */
export const setDebugToHomeLocation = (): void => {
  enableDebugMode(HOME_COORDINATES.latitude, HOME_COORDINATES.longitude);
  if (authHelperLogging) {
    console.log('Debug coordinates set to home location for easy authentication');
  }
};

/**
 * Tarkistaa onko debug-tila käytössä
 */
export const isDebugModeEnabled = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.DEBUG_MODE) === 'true';
};

/**
 * Palauttaa nykyiset debug-koordinaatit
 */
export const getDebugCoordinates = (): { latitude: number; longitude: number } | null => {
  const coords = localStorage.getItem(STORAGE_KEYS.DEBUG_COORDS);
  return coords ? JSON.parse(coords) : null;
};

/**
 * Palauttaa debug-tilan tiedot
 */
export const getDebugStatus = () => {
  const isEnabled = isDebugModeEnabled();
  const coords = getDebugCoordinates();
  
  return {
    enabled: isEnabled,
    coordinates: coords,
    homeCoordinates: HOME_COORDINATES
  };
};
