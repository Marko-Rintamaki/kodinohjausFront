import { useCallback } from 'react';
import { useSocketService } from '../hooks/useSocket';

const localStorageSyncLogging = false;
const localStorageDataLogging = false;

// LocalStorage avaimet jotka synkronoidaan palvelimelle
const SYNC_KEYS = {
  // Layout persistence data
  LAYOUT_DATA: 'homeLayout:v7',
  
  // Debug settings
  DEBUG_MODE: 'debugMode',
  DEBUG_COORDS: 'debugCoordinates',
  
  // Muut käyttäjäasetukset  
  LAST_AUTH_ATTEMPT: 'lastAuthAttempt'
};

interface LocalStorageData {
  [key: string]: string | null;
}

/**
 * Kerää kaikki synkronoitavat localStorage-tiedot
 */
export const collectLocalStorageData = (): LocalStorageData => {
  const data: LocalStorageData = {};
  
  if (localStorageDataLogging) {
    console.log('[LocalStorageData] Collecting localStorage data...');
  }
  
  Object.values(SYNC_KEYS).forEach(key => {
    const value = localStorage.getItem(key);
    data[key] = value;
    if (localStorageDataLogging) {
      console.log(`[LocalStorageData] Collected ${key}:`, value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : null);
    }
  });
  
  return data;
};

/**
 * Asettaa localStorage-tiedot palvelimelta saaduista tiedoista
 */
export const setLocalStorageData = (data: LocalStorageData): void => {
  Object.entries(data).forEach(([key, value]) => {
    if (Object.values(SYNC_KEYS).includes(key) && value !== null) {
      if (localStorageDataLogging) {
        console.log('[LocalStorageData] Setting key:', key);
      }
      const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
      localStorage.setItem(key, valueToStore);
    }
  });
};

/**
 * Tyhjentää localStorage-tiedot
 */
export const clearSyncedLocalStorage = (): void => {
  Object.values(SYNC_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

/**
 * Asettaa layout:n tyhjäksi (puhdas aloitus)
 */
export const resetLayoutToEmpty = (): void => {
  const emptyLayout = {
    heatingPipes: []
    // Other component arrays will be added later
  };
  
  localStorage.setItem(SYNC_KEYS.LAYOUT_DATA, JSON.stringify(emptyLayout));
  if (localStorageDataLogging) {
    console.log('[LocalStorageData] Layout reset to empty');
  }
};

/**
 * Hook localStorage-tietojen synkronointiin palvelimelle
 */
export const useLocalStorageSync = () => {
  const { service, isConnected } = useSocketService();

  if (localStorageSyncLogging) {
    console.log('[LocalStorageSync] useLocalStorageSync hook initialized');
  }

  /**
   * Tallentaa localStorage-tiedot palvelimelle (yhteiskäyttöinen layout)
   */
  const saveToServer = useCallback(async (): Promise<boolean> => {
    try {
      if (!isConnected) {
        if (localStorageSyncLogging) {
          console.log('[LocalStorageSync] Socket not connected, cannot save to server');
        }
        return false;
      }
      
      const localData = collectLocalStorageData();
      if (localStorageSyncLogging) {
        console.log('[LocalStorageSync] Attempting to save to server:', localData);
      }
      
      // Use new Socket.IO request system with authentication
      const result = await service.sendRequest({
        type: 'database_write',
        data: {
          query: `INSERT INTO layout_settings (layout_name, layout_data) 
                  VALUES ('default', ?) 
                  ON DUPLICATE KEY UPDATE layout_data = ?, updated_at = NOW()`,
          params: [JSON.stringify(localData), JSON.stringify(localData)]
        },
        token: localStorage.getItem('authToken') || undefined
      });
      
      if (localStorageSyncLogging) {
        console.log('[LocalStorageSync] Server response:', result);
      }
      return result.success || false;
    } catch (error) {
      console.error('[LocalStorageSync] Failed to save to server:', error);
      return false;
    }
  }, [service, isConnected]);

  /**
   * Lataa localStorage-tiedot palvelimelta (yhteiskäyttöinen layout)
   */
  const loadFromServer = useCallback(async (): Promise<boolean> => {
    try {
      if (localStorageSyncLogging) {
        console.log('[LocalStorageSync] Attempting to load from server...');
      }
      
      if (!isConnected) {
        if (localStorageSyncLogging) {
          console.log('[LocalStorageSync] Socket not connected, cannot load from server');
        }
        return false;
      }
      
      // Use new Socket.IO request system (no auth required for read)
      const result = await service.sendRequest({
        type: 'sql_query',
        data: {
          sql: 'SELECT layout_data FROM layout_settings WHERE layout_name = ?',
          params: ['default']
        }
      });
      
      if (localStorageSyncLogging) {
        console.log('[LocalStorageSync] Server response:', result);
      }
      
      if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
        const row = result.data[0] as { layout_data: string };
        const layoutData = JSON.parse(row.layout_data);
        
        if (localStorageDataLogging) {
          console.log('[LocalStorageSync] Parsed layout data:', layoutData);
        }
        
        // Handle both old and new format
        if (typeof layoutData['homeLayout:v7'] === 'string') {
          layoutData['homeLayout:v7'] = JSON.parse(layoutData['homeLayout:v7']);
        }
        
        // Convert layout object back to string for localStorage
        const finalData = {
          ...layoutData,
          'homeLayout:v7': JSON.stringify(layoutData['homeLayout:v7'])
        };
        
        setLocalStorageData(finalData);
        
        if (localStorageSyncLogging) {
          console.log('[LocalStorageSync] Successfully loaded and restored data from server');
        }
        return true;
      } else {
        if (localStorageSyncLogging) {
          console.log('[LocalStorageSync] No data found on server or load failed');
        }
        return false;
      }
    } catch (error) {
      console.error('[LocalStorageSync] Failed to load from server:', error);
      return false;
    }
  }, [service, isConnected]);

  return {
    saveToServer,
    loadFromServer,
    collectLocalStorageData,
    setLocalStorageData,
    resetLayoutToEmpty
  };
};

export default useLocalStorageSync;