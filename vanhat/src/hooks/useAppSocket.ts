import { useEffect, useRef, useState, useCallback } from 'react';
import { initializeSocket, disconnectSocket, sendDataQuery, sendControlCommand } from '../helpers/socketHelper';
import { attemptAuthentication, isTokenValid, getStoredToken } from '../helpers/authHelper';

// Debug logging flags - set to true to enable specific logging categories:
// appSocketLogging: useAppSocket hook authentication and connection logging
var appSocketLogging = false;

interface UseAppSocketOptions {
  autoAuth?: boolean;            // Force auth attempts on mount
  authRetries?: number;          // How many auth attempts
  fallbackMs?: number;           // Fallback to stop loading
  useStatusAsInitial?: boolean;  // Use first statusUpdate as initial data
  overviewQuery?: boolean;       // Whether to issue overview dataQuery
}

interface SystemStatus {
  lighting: { total: number; on: number };
  heating: { temperature: number; target: number };
  electric: { consumption: number; production: number };
  connected: boolean;
}

interface HookState {
  systemStatus: SystemStatus | null;
  loading: boolean;
  error: string | null;
  authStatus: 'checking' | 'authenticated' | 'unauthenticated';
}

export const useAppSocket = (options: UseAppSocketOptions = {}) => {
  const {
    autoAuth = true,
    authRetries = 2,
    fallbackMs = 5000,
    useStatusAsInitial = true,
    overviewQuery = true
  } = options;

  const [state, setState] = useState<HookState>({
    systemStatus: null,
    loading: true,
    error: null,
    authStatus: 'checking'
  });

  const statusInitializedRef = useRef(false);
  const fallbackRef = useRef<number | null>(null);

  const updateState = (patch: Partial<HookState>) => setState(s => ({ ...s, ...patch }));

  const performAuth = useCallback(async (): Promise<boolean> => {
    if (!autoAuth) {
      if (appSocketLogging) {
        console.log('[HOOK AUTH] autoAuth disabled, setting authenticated');
      }
      updateState({ authStatus: 'authenticated' });
      return true;
    }

    if (isTokenValid()) {
      if (appSocketLogging) {
        console.log('[HOOK AUTH] Valid token found, setting authenticated');
      }
      updateState({ authStatus: 'authenticated' });
      return true;
    }

    // Try authentication multiple times
    for (let attempt = 1; attempt <= authRetries; attempt++) {
      if (appSocketLogging) {
        console.log(`[HOOK AUTH] Attempt ${attempt}`);
      }
      const res = await attemptAuthentication();
      if (appSocketLogging) {
        console.log(`[HOOK AUTH] Attempt ${attempt} result:`, res);
      }
      if (res.success) break;
    }
    const success = isTokenValid();
    if (appSocketLogging) {
      console.log('[HOOK AUTH] Final auth result:', success);
    }
    updateState({ authStatus: success ? 'authenticated' : 'unauthenticated' });
    return success;
  }, [autoAuth, authRetries]);

  const mapStatus = (raw: any): SystemStatus => ({
    lighting: raw?.lighting || { total: raw?.lightsTotal || 0, on: raw?.lightsOn || 0 },
    heating: raw?.heating || { temperature: raw?.temperature || 0, target: raw?.targetTemp || 0 },
    electric: raw?.electric || { consumption: raw?.powerConsumption || 0, production: raw?.powerProduction || 0 },
    connected: true
  });

  const fetchOverview = useCallback(async () => {
    if (!overviewQuery) return;
    if (appSocketLogging) {
      console.log('[HOOK] Fetch overview via dataQuery');
    }
    const res = await sendDataQuery({ queryType: 'overview', params: { ts: Date.now() } });
    if (res && (res.lighting || res.heating || res.electric || res.data)) {
      const payload: any = (res as any).data || res;
      if (payload.lighting || payload.heating || payload.electric) {
        updateState({ systemStatus: mapStatus(payload), loading: false });
      } else if (payload.success === false && /unknown query/i.test(payload.error || '')) {
        console.warn('[HOOK] overview query unsupported');
      }
    }
  }, [overviewQuery]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      updateState({ loading: true, error: null });
      const authOK = await performAuth();
      if (!authOK || cancelled) return;

      const token = getStoredToken() || undefined;
      initializeSocket(token, {
        onConnect: () => {
          if (appSocketLogging) {
            console.log('[HOOK] socket connected');
          }
          if (overviewQuery) fetchOverview();
        },
        onDisconnect: () => {
          updateState({ systemStatus: state.systemStatus ? { ...state.systemStatus, connected: false } : null });
        },
        onStatusUpdate: (status) => {
          if (!useStatusAsInitial || statusInitializedRef.current || cancelled) return;
          if (appSocketLogging) {
            console.log('[HOOK] using first statusUpdate as initial data');
          }
            statusInitializedRef.current = true;
            updateState({ systemStatus: mapStatus(status), loading: false });
        },
        onDataQueryResponse: (data) => {
          if (data?.queryType === 'overview') {
            updateState({ systemStatus: mapStatus(data.data || data), loading: false });
          }
        },
        onError: (err) => {
          if (cancelled) return;
          updateState({ error: err?.message || 'Yhteysvirhe', loading: false });
        }
      });

      // Fallback
      if (fallbackMs > 0) {
        fallbackRef.current = window.setTimeout(() => {
          if (cancelled) return;
          setState(current => {
            if (!current.loading) return current;
            console.warn('[HOOK] fallback timeout -> placeholder systemStatus');
            return {
              ...current,
              systemStatus: current.systemStatus || mapStatus({}),
              loading: false
            };
          });
        }, fallbackMs);
      }
    })();

    return () => {
      cancelled = true;
      if (fallbackRef.current) window.clearTimeout(fallbackRef.current);
      disconnectSocket();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    sendDataQuery,
    sendControlCommand,
    refreshOverview: fetchOverview
  };
};
