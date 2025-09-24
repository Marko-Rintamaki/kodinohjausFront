/* eslint-disable @typescript-eslint/no-explicit-any */
import { io, Socket } from 'socket.io-client';

// Debug logging flags - set to true to enable specific logging categories:
// socketConnectionLogging: Socket connection/disconnection events
// socketTokenLogging: Token injection and authentication
// socketOutgoingLogging: Outgoing messages and events
// socketIncomingLogging: Incoming messages and responses
// updateStatusLogging: UpdateStatus data changes
// dataQueryLogging: DataQuery requests and responses
// debugCallbackLogging: DEBUG callback and status function logging
// krittinenLogging: KRIITTINEN status update logging
const socketConnectionLogging = false;
const socketTokenLogging = false;
const socketOutgoingLogging = false;
const socketIncomingLogging = false;
const updateStatusLogging = false;
const dataQueryLogging = false;
const debugCallbackLogging = false;
const krittinenLogging = false;

// Socket instance - pidetään globaalina, jotta se on saatavilla kaikkialla
let socket: Socket | null = null;

// GLOBAALI UPDATESTATUS DATA - Dynaaminen JSON data kaikille sivuille
let globalUpdateStatus: any = null;
const updateStatusCallbacks: ((data: any) => void)[] = [];

// Callback tyypit
interface SocketCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onResponse?: (data: any) => void;
  onControlResponse?: (data: any) => void;
  onStatusUpdate?: (data: any) => void;
  onError?: (error: any) => void;
  onAuthenticationResult?: (data: any) => void;
  onDataQueryResponse?: (data: any) => void;
}

/**
 * GLOBAALI UPDATESTATUS HALLINTA
 */

// Palauttaa nykyisen updateStatus datan
export const getUpdateStatus = (): any => {
  if (debugCallbackLogging) {
    console.log('🔍 [DEBUG] getUpdateStatus called, returning:', globalUpdateStatus);
  }
  return globalUpdateStatus;
};

// Kuuntelee updateStatus muutoksia
export const onUpdateStatusChange = (callback: (data: any) => void): (() => void) => {
  if (debugCallbackLogging) {
    console.log('🔍 [DEBUG] onUpdateStatusChange called, registering callback. Total callbacks will be:', updateStatusCallbacks.length + 1);
  }
  updateStatusCallbacks.push(callback);
  
  // Palauta cleanup funktio
  return () => {
    const index = updateStatusCallbacks.indexOf(callback);
    if (index > -1) {
      updateStatusCallbacks.splice(index, 1);
      if (debugCallbackLogging) {
        console.log('🔍 [DEBUG] Callback removed, remaining callbacks:', updateStatusCallbacks.length);
      }
    }
  };
};

// Funktio updateStatus:n päivittämiseen - exportattu jotta useAppSocket voi kutsua sitä
export const updateGlobalUpdateStatus = (newStatus: any): void => {
  if (updateStatusLogging) {
    if (krittinenLogging) {
      console.log('🔄 [UpdateStatus] KRIITTINEN: päivitetään globalUpdateStatus:', newStatus);
      console.log('🔄 [UpdateStatus] Callbacks määrä:', updateStatusCallbacks.length);
    }
  }
  
  // Debug: Tarkista onko Nilan-dataa
  if (newStatus?.Nilan) {
    if (updateStatusLogging) console.log('🔍 [UpdateStatus] Nilan-data löytyi:', newStatus.Nilan);
  } else {
    if (updateStatusLogging) console.log('🔍 [UpdateStatus] EI Nilan-dataa statusupdate:ssa. Keys:', Object.keys(newStatus || {}));
  }
  
  if (updateStatusLogging) {
    if (krittinenLogging) {
      console.log('🔄 [UpdateStatus] päivitetty:', newStatus);
    }
  }
  globalUpdateStatus = newStatus;
  
  // Ilmoita kaikille kuuntelijoille
  updateStatusCallbacks.forEach((callback, index) => {
    if (updateStatusLogging) console.log(`🔄 [UpdateStatus] Kutsutaan callback ${index}`);
    try {
      callback(newStatus);
    } catch (error) {
      console.error('❌ Error in updateStatus callback:', error);
    }
  });
};

// Hakee tietyn kohteen updateStatus:sta (esim. rele tila)
export const getStatusValue = (path: string): any => {
  if (!globalUpdateStatus) return null;
  
  // Tukee polkuja kuten "relays.5.stat" tai "sensors.temp1.value"
  const pathParts = path.split('.');
  let current = globalUpdateStatus;
  
  for (const part of pathParts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  
  return current;
};

// Hakee rele tilan (helpottaa lighting sivua)
export const getRelayStatus = (relayId: number): number => {
  if (!globalUpdateStatus?.relays) return 0;
  
  const relay = globalUpdateStatus.relays.find((r: any) => r.relay === relayId);
  return relay ? relay.stat : 0;
};

// Hakee kaikki rele tilat
export const getAllRelayStatus = (): Array<{relay: number; stat: number}> => {
  if (!globalUpdateStatus?.relays) return [];
  return globalUpdateStatus.relays;
};

// Hakee sensori datan
export const getSensorValue = (sensorType: string, sensorId?: string): any => {
  if (!globalUpdateStatus) return null;
  
  if (sensorId) {
    return getStatusValue(`${sensorType}.${sensorId}`);
  } else {
    return getStatusValue(sensorType);
  }
};

// Socket konfiguraatio - PRODUCTION: kodinohjaus.fi backend
const SOCKET_CONFIG = {
  url: 'https://kodinohjaus.fi',
  options: {
    transports: ['websocket'], // Websocket tuotantoon
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    path: '/socket.io',
    timeout: 10000, // 10 sekunnin timeout
    forceNew: true, // Pakota uusi yhteys
    auth: undefined as any // Lisätään auth kenttä
  }
};

/**
 * AUTOMAATTINEN SOCKET JA AUTH INITIALISOINTI + TOKEN REFRESH
 * Kutsutaan kun sovellus käynnistyy
 */
export const initializeAutoSocket = async (): Promise<void> => {
  if (socketConnectionLogging) {
    if (socketConnectionLogging) {
      console.log('🚀 [Connection] Initializing automatic socket connection...');
    }
  }
  
  try {
    // 1. Hae mahdollinen olemassa oleva token
  const currentToken = localStorage.getItem('authToken');
    
    // 2. Yhdistä socket tokenin kanssa (jos löytyy)
    initializeSocket(currentToken || undefined, {
      onConnect: () => {
        if (socketConnectionLogging) {
          if (socketConnectionLogging) {
            console.log('✅ [Connection] Socket connected automatically with token:', currentToken ? 'present' : 'none');
          }
        }
      },
      onDisconnect: () => {
        if (socketConnectionLogging) {
          if (socketConnectionLogging) {
            console.log('❌ [Connection] Socket disconnected');
          }
        }
      },
      onError: (error: any) => {
        if (socketConnectionLogging) {
          console.error('🚫 [Connection] Socket error:', error);
        }
      },
      onAuthenticationResult: (data: any) => {
        if (socketTokenLogging) {
          if (socketTokenLogging) {
            console.log('🔐 [Token] Auto-authentication result:', data);
          }
        }
        if (data.token) {
          // Tallenna uusi token ja reconnect
          localStorage.setItem('authToken', data.token);
          if (socketTokenLogging) {
            if (socketTokenLogging) {
              console.log('🔄 [Token] updated - reconnecting with new token...');
            }
          }
          initializeSocket(data.token, {});
        }
      }
    });

    // 3. Anna socket yhteyden muodostua
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Käynnistä säännöllinen token refresh (15 min välein)
    startTokenRefresh();
    
  } catch (error) {
    if (socketConnectionLogging) {
      console.error('❌ [Connection] Auto-initialization failed:', error);
    }
  }
};

/**
 * Käynnistää säännöllisen token päivityksen
 */
export const startTokenRefresh = (): void => {
  // Yritä päivittää token 15 minuutin välein
  const refreshInterval = setInterval(async () => {
    if (socketTokenLogging) {
      if (socketTokenLogging) {
        console.log('🔄 [Token] Starting token refresh...');
      }
    }
    
    try {
      const { isTokenValid, attemptAuthentication } = await import('./authHelper');
      
      if (!isTokenValid()) {
        if (socketTokenLogging) {
          if (socketTokenLogging) {
            console.log('🔄 [Token] expired - attempting re-authentication...');
          }
        }
        
        const authResult = await attemptAuthentication();
        if (authResult.success && authResult.token) {
          if (socketTokenLogging) {
            if (socketTokenLogging) {
              console.log('✅ [Token] refreshed successfully');
            }
          }
          
          // Reconnect socket with new token
          const currentToken = localStorage.getItem('authToken');
          if (currentToken && socket) {
            if (socketTokenLogging) {
              if (socketTokenLogging) {
                console.log('🔄 [Token] Reconnecting socket with refreshed token...');
              }
            }
            initializeSocket(currentToken, {
              onConnect: () => {
                if (socketTokenLogging) {
                  if (socketTokenLogging) {
                    console.log('✅ [Token] Socket reconnected with fresh token');
                  }
                }
              }
            });
          }
        } else {
          if (socketTokenLogging) {
            if (socketTokenLogging) {
              console.log('ℹ️ [Token] refresh failed - user will remain as viewer');
            }
          }
        }
      } else {
        if (socketTokenLogging) {
          if (socketTokenLogging) {
            console.log('✅ [Token] still valid');
          }
        }
      }
    } catch (error) {
      if (socketTokenLogging) {
        console.log('ℹ️ [Token] refresh not possible:', error);
      }
    }
  }, 15 * 60 * 1000); // 15 minuuttia

  // Tallenna interval ID mahdollista clear:iä varten
  (window as any).tokenRefreshInterval = refreshInterval;
};

/**
 * Alustaa Socket.IO yhteyden
 * @param token - Valinnainen autentikointi token
 * @param callbacks - Callback funktiot eri tapahtumille
 */
export const initializeSocket = (token?: string, callbacks: SocketCallbacks = {}): Socket => {
  // Jos socket on jo olemassa, sulje se ensin
  if (socket) {
    socket.disconnect();
  }

  const socketOptions: any = { ...SOCKET_CONFIG.options };

  // Käytä annettua tokenia TAI lue TUORE token localStorage:sta
  const finalToken = token || localStorage.getItem('authToken');
  
  if (finalToken) {
    if (socketTokenLogging) {
      console.log('🔍 [Token] SOCKET INIT: Using token for handshake:', finalToken ? 'present' : 'none');
    }
    socketOptions.auth = { token: finalToken };
  } else {
    if (socketTokenLogging) {
      console.log('🔍 [Token] SOCKET INIT: No token available for handshake');
    }
  }

  // Luo uusi socket yhteys
  if (socketConnectionLogging) {
    console.log('🔌 [Connection] Creating socket connection to:', SOCKET_CONFIG.url);
    console.log('🔧 [Connection] Socket options:', socketOptions);
  }
  
  socket = io(SOCKET_CONFIG.url, socketOptions);

  // Monkeypatch emit to log outgoing queries/commands with token
  const originalEmit = socket.emit.bind(socket);
  (socket as any).emit = (event: string, ...args: any[]) => {
    try {
      if (event === 'dataQuery' || event === 'control') {
        const payload = args[0];
        if (payload && typeof payload === 'object') {
          if (!('token' in payload)) {
            const injected = getFreshToken();
            (payload as any).token = injected || null; // lisää myös jos null, jotta näkyy
            if (socketTokenLogging) {
              console.log(`[Token] INJECT ${event} payload had no token -> injected ${injected ? 'present' : 'none'}`);
            }
          }
          const tokenPreview = payload.token ? (payload.token.length > 80 ? payload.token.slice(0, 40) + '...' + payload.token.slice(-10) : payload.token) : 'NONE';
          if (socketOutgoingLogging) {
            console.log(`➡️ [Outgoing] ${event} | token=${tokenPreview} | fullPayload=`, payload);
          }
        }
      }
    } catch (e) {
      console.warn('Emit log failed', e);
    }
    return originalEmit(event, ...args);
  };

  // Aseta tapahtumakuuntelijat
  setupSocketListeners(callbacks);

  return socket;
};

// --- TOKEN HELPER ---
const getFreshToken = (): string | null => {
  try {
    const value = localStorage.getItem('authToken');
    if (socketTokenLogging) {
      console.log('[Token] fresh read ->', value);
    }
    return value;
  } catch (e) {
    console.warn('[Token] read failed', e);
    return null;
  }
};

// --- RE-AUTH SHARED STATE ---
let reauthPromise: Promise<any> | null = null;

const triggerReauthentication = async () => {
  if (reauthPromise) {
    console.log('[REAUTH] Existing re-auth in progress, waiting...');
    return reauthPromise;
  }
  reauthPromise = (async () => {
    console.log('[REAUTH] Starting re-auth attempt due to auth failure');
    try {
      const { attemptAuthentication } = await import('./authHelper');
      const result = await attemptAuthentication();
      if (result.success && result.token) {
  console.log('[REAUTH:SUCCESS] New token acquired');
      } else {
  console.warn('[REAUTH:FAIL]', result.error);
      }
      return result;
    } catch (e) {
      console.error('[REAUTH] Re-auth exception:', e);
      return { success: false, error: e instanceof Error ? e.message : 'unknown error' };
    } finally {
      reauthPromise = null;
    }
  })();
  return reauthPromise;
};

const isAuthError = (data: any): boolean => {
  if (!data) return false;
  if (data.needsAuth) {
    // Trigger global needsAuth event for AuthManager
    window.dispatchEvent(new CustomEvent('needsAuth', { detail: data }));
    return true;
  }
  const msg = (data.error || data.message || '').toString().toLowerCase();
  return /auth|token/.test(msg);
};

/**
 * Asettaa Socket tapahtumakuuntelijat
 */
const setupSocketListeners = (callbacks: SocketCallbacks) => {
  if (!socket) return;

  // Hiljennä statusUpdate flood. Vaihda true jos haluat nähdä ne.
  const STATUS_LOGGING_ENABLED = true; // PAKOTETTUNA PÄÄLLE DEBUGGAUSTA VARTEN

  const {
    onConnect,
    onDisconnect,
    onResponse,
    onControlResponse,
    onStatusUpdate,
    onError,
    onAuthenticationResult,
    onDataQueryResponse
  } = callbacks;

  socket.on('connect', () => {
    console.log('✅ Socket connected successfully to:', SOCKET_CONFIG.url);
    console.log('🔌 Socket ID:', socket?.id);
    onConnect?.();
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    onDisconnect?.();
  });

  socket.on('connect_error', (error) => {
    console.error('🚫 Socket connection error:', error);
    console.error('🔧 Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    onError?.(error);
  });

  socket.on('response', (data) => {
    console.log('Socket response:', data);
    onResponse?.(data);
  });

  socket.on('controlResponse', (data) => {
    console.log('Control response:', data);
    onControlResponse?.(data);
  });

  socket.on('statusUpdate', (data) => {
    console.log('🔄 [SocketHelper] statusUpdate vastaanotettu:', data);
    if (STATUS_LOGGING_ENABLED) {
      console.log('Status update:', data);
    }
    
    // Päivitä globaali updateStatus
    updateGlobalUpdateStatus(data);
    
    // Kutsu myös callback jos annettu
    onStatusUpdate?.(data);
  });

  socket.on('authenticationResult', (data) => {
    console.log('Authentication result:', data);
    onAuthenticationResult?.(data);
  });

  socket.on('dataQueryResponse', (data) => {
    console.log('Data query response:', data);
    onDataQueryResponse?.(data);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    onError?.(error);
  });

  // Lisää debug-loggaus kaikille saapuville viesteille
  socket.onAny((eventName, ...args) => {
    // Älä loggaa statusUpdate jos logging disabloitu
    if (eventName === 'statusUpdate') return; // suppress flood
    if (socketIncomingLogging) {
      console.log(`⬅️ [Incoming] Socket event: ${eventName}`, args);
    }
  });
};

/**
 * Lähettää controller komennon TOKEN:n kanssa
 */
export const sendControlCommand = (command: {
  id: string;
  function: string;
  path: string;
  value?: any;
}): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    // AINA TUORE TOKEN SUORAAN localStorage:sta - EI CACHETUSTA!
  const freshToken = getFreshToken();
    console.log('🔍 CONTROL DEBUG: Reading FRESH token from localStorage:', freshToken);
    console.log('🔍 CONTROL DEBUG: Token type:', typeof freshToken);
    console.log('🔍 CONTROL DEBUG: Token length:', freshToken ? freshToken.length : 'null/undefined');
    console.log('🔍 CONTROL DEBUG: localStorage keys:', Object.keys(localStorage));
    
    const commandWithToken = {
      ...command,
      token: freshToken || undefined  // Käytä FRESH tokenia
    };

    console.log('📤 Sending control command with FRESH token:', freshToken ? 'present' : 'none');
    console.log('📤 Command payload:', commandWithToken);

    const timeout = setTimeout(() => {
      reject(new Error('Command timeout'));
    }, 10000);

    const attemptSend = (attempt: number) => {
      console.log(`[CONTROL] Sending attempt ${attempt}`);
      socket!.once('controlResponse', async (data) => {
        if (isAuthError(data) && attempt === 1) {
          console.warn('[CONTROL] Auth error detected, triggering re-auth and retry');
            const authRes = await triggerReauthentication();
            if (authRes.success) {
              // Rebuild with fresh token
              const newToken = getFreshToken();
              commandWithToken.token = newToken || undefined;
              console.log('[CONTROL] Retrying with new token');
              return attemptSend(2);
            }
        }
  const ok = data && data.success;
  const tokenUsed = commandWithToken.token ? 'present' : 'none';
  const reauthFlag = attempt === 2 ? ' (reauth used)' : '';
  console.log(`[CONTROL:FINAL] status=${ok?'OK':'FAIL'} attempts=${attempt} token=${tokenUsed}${reauthFlag} error=${ok?'none':data?.error}`);
        clearTimeout(timeout);
        resolve(data);
      });
      socket!.emit('control', commandWithToken);
    };
    attemptSend(1);
  });
};

/**
 * Lähettää yleisen kyselyn (yksinkertaisempi versio sendDataQuery:stä)
 */
export const sendQuery = (query: any): void => {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return;
  }
  
  // AINA TUORE TOKEN SUORAAN localStorage:sta - EI CACHETUSTA!
  const freshToken = getFreshToken();
  console.log('🔍 QUERY DEBUG: Reading FRESH token from localStorage:', freshToken);
  
  const queryWithToken = {
    ...query,
    token: freshToken || undefined // Käytä FRESH tokenia
  };
  
  console.log('📤 Sending query with FRESH token:', freshToken ? 'present' : 'none');
  console.log('📤 Query payload:', queryWithToken);
  socket.emit('dataQuery', queryWithToken);
};

/**
 * Lähettää tietokantakyselyn TOKEN:n kanssa
 */
/**
 * Lähettää pyynnön backend:in RequestHandler:ille 'request' eventin kautta
 * Käyttää uutta arkkitehtuuria layout tallennuksille ym.
 */
export const sendRequest = (requestType: string, data: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    const makePayload = (): any => ({
      type: requestType,
      data,
      token: getFreshToken() || undefined
    });

    const REQUEST_TIMEOUT_MS = 15000;
    let finished = false;
    // eslint-disable-next-line prefer-const
    let timeout: NodeJS.Timeout;

    const finalize = (attempt: number, response: any, reauthUsed: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      const ok = response && response.success;
      if (dataQueryLogging) {
        console.log(`[Request] FINAL type=${requestType} status=${ok?'OK':'FAIL'} attempts=${attempt}${reauthUsed?' (reauth)':''} error=${ok?'none':response?.error}`);
      }
      resolve(response);
    };

    const sendAttempt = async (attempt: number, reauthUsed: boolean) => {
      const payload = makePayload();
      if (dataQueryLogging) {
        console.log(`[Request] Attempt ${attempt} ->`, payload);
      }
      try {
        socket!.emit('request', payload, async (response: any) => {
          if (isAuthError(response) && attempt === 1) {
            if (dataQueryLogging) {
              console.warn('[Request] Auth error -> re-auth & retry');
            }
            const authRes = await triggerReauthentication();
            if (authRes.success) {
              return sendAttempt(2, true);
            }
            finalize(attempt, response, reauthUsed);
          } else {
            finalize(attempt, response, reauthUsed);
          }
        });
      } catch (error) {
        console.error('[Request] Send error:', error);
        finalize(attempt, { success: false, error: 'Send failed' }, reauthUsed);
      }
    };

    timeout = setTimeout(() => finalize(1, { success: false, error: 'Timeout' }, false), REQUEST_TIMEOUT_MS);
    sendAttempt(1, false);
  });
};

export const sendDataQuery = (query: { queryType: string; params: any }): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    const makePayload = (): any => ({ ...query, token: getFreshToken() || undefined });
    const QUERY_TIMEOUT_MS = 15000;

    let finished = false;
    // eslint-disable-next-line prefer-const
    let timeout: NodeJS.Timeout;

    const finalize = (attempt: number, data: any, reauthUsed: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      const ok = data && data.success;
      if (dataQueryLogging) {
        console.log(`[DataQuery] FINAL q=${query.queryType} status=${ok?'OK':'FAIL'} attempts=${attempt}${reauthUsed?' (reauth)':''} error=${ok?'none':data?.error}`);
      }
      resolve(data);
    };

    const sendAttempt = async (attempt: number, reauthUsed: boolean) => {
      const payload = makePayload();
      if (dataQueryLogging) {
        console.log(`[DataQuery] Attempt ${attempt} ->`, payload);
      }
      try {
        socket!.emit('dataQuery', payload, async (data: any) => {
          if (isAuthError(data) && attempt === 1) {
            if (dataQueryLogging) {
              console.warn('[DataQuery] Auth error -> re-auth & retry');
            }
            const authRes = await triggerReauthentication();
            if (authRes.success) {
              return sendAttempt(2, true);
            }
          }
          finalize(attempt, data, reauthUsed);
        });
      } catch (e) {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          reject(e);
        }
      }
    };

    timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        reject(new Error('Query timeout'));
      }
    }, QUERY_TIMEOUT_MS);

    sendAttempt(1, false);
  });
};

/**
 * Pyytää salasana-pohjaista autentikointia (fallback)
 */
export const requestPasswordAuthentication = (password: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const AUTH_TIMEOUT_MS = 12000;
    let timeout: NodeJS.Timeout;

    const sendAuth = () => {
      if (!socket || !socket.connected) {
        reject(new Error('Socket not connected (after wait)'));
        return;
      }
      timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, AUTH_TIMEOUT_MS);

      const cleanupListeners = () => {
        socket?.off('authenticationResult');
      };

      socket.once('authenticationResult', (data) => {
        clearTimeout(timeout);
        cleanupListeners();
        resolve(data);
      });

      const credentials = {
        password: password
      };
      console.log('[AUTH] Sending password authenticate request');
      socket.emit('authenticate', credentials);
    };

    // Jos jo yhdistetty -> suoraan
    if (socket && socket.connected) {
      return sendAuth();
    }

    // Muuten yritä muodostaa yhteys ja odota
    console.log('[AUTH] Socket not connected, initializing before authentication...');
    try {
      initializeSocket();
      socket?.on('connect', () => {
        console.log('[AUTH] Socket connected, sending password auth...');
        sendAuth();
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Pyytää autentikointia paikkatieto koordinaateilla
 */
export const requestAuthentication = (latitude?: number, longitude?: number): Promise<any> => {
  return new Promise((resolve, reject) => {
    const AUTH_TIMEOUT_MS = 12000;
    let timeout: NodeJS.Timeout;

    const sendAuth = () => {
      if (!socket || !socket.connected) {
        reject(new Error('Socket not connected (after wait)'));
        return;
      }
      timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, AUTH_TIMEOUT_MS);

      const cleanupListeners = () => {
        socket?.off('authenticationResult');
      };

      socket.once('authenticationResult', (data) => {
        clearTimeout(timeout);
        cleanupListeners();
        resolve(data);
      });

      const credentials = {
        location: {
          latitude: latitude || 0,
          longitude: longitude || 0
        }
      };
      console.log('[AUTH] Sending authenticate request', credentials);
      socket.emit('authenticate', credentials);
    };

    // Jos jo yhdistetty -> suoraan
    if (socket && socket.connected) {
      return sendAuth();
    }

    // Muuten yritä muodostaa yhteys ja odota
    console.log('[AUTH] Socket not connected, initializing before authentication...');
    try {
      initializeSocket(undefined, {
        onConnect: () => {
          console.log('[AUTH] Socket connected, proceeding with authentication');
          sendAuth();
        },
        onError: (err) => {
          console.error('[AUTH] Socket error before auth', err);
        }
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error('Failed to initialize socket for auth'));
    }
  });
};

/**
 * Palauttaa nykyisen socket instanssin
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * Sulkee socket yhteyden
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Tarkistaa onko socket yhdistetty
 */
export const isSocketConnected = (): boolean => {
  return socket ? socket.connected : false;
};
