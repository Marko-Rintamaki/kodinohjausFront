import { getSocket, sendRequest } from './socketHelper';
var localStorageSyncLogging = false; // Enable by default for debugging
var localStorageDataLogging = false; // Enable by default for debugging

// LocalStorage avaimet jotka synkronoidaan palvelimelle
const SYNC_KEYS = {
  // Layout persistence data (oikea avain useLayoutPersistence:stä)
  LAYOUT_DATA: 'homeLayout:v7',
  
  // Auth data (ei synkronoida turvasyistä)
  // AUTH_TOKEN: 'authToken',
  // TOKEN_EXPIRY: 'tokenExpiry',
  
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
    console.log('[LocalStorageData] Keys to collect:', Object.values(SYNC_KEYS));
  }
  
  Object.values(SYNC_KEYS).forEach(key => {
    const value = localStorage.getItem(key);
    data[key] = value;
    if (localStorageDataLogging) {
      console.log(`[LocalStorageData] Collected ${key}:`, value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : null);
    }
  });
  
  if (localStorageDataLogging) {
    console.log('[LocalStorageData] Final collected data:', data);
  }
  
  return data;
};

/**
 * Asettaa localStorage-tiedot palvelimelta saaduista tiedoista
 */
export const setLocalStorageData = (data: LocalStorageData): void => {
  Object.entries(data).forEach(([key, value]) => {
    if (Object.values(SYNC_KEYS).includes(key) && value !== null) {
      if (localStorageDataLogging) {
        console.log('[LocalStorageData] Setting key:', key, 'value:', value, 'type:', typeof value);
      }
      // Jos arvo on objekti, stringifioi se ennen tallennusta
      // Jos arvo on jo string (kuten homeLayout:v7), tallenna sellaisenaan
      const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
      localStorage.setItem(key, valueToStore);
      
      if (localStorageDataLogging) {
        console.log('[LocalStorageData] Stored to localStorage:', key, '=', valueToStore ? (valueToStore.length > 100 ? valueToStore.substring(0, 100) + '...' : valueToStore) : null);
      }
    }
  });
};

/**
 * Tyhjentää localStorage-tiedot (esim. uloskirjautuessa)
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
    lamps: [],
    strips: [],
    heatingPipes: [],
    temperatureIcons: [],
    heatPumps: [],
    compressors: [],
    fans: [],
    heatpumpCompressors: [],
    heatpumpIndoorUnits: [],
    wallLights: []
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
  if (localStorageSyncLogging) {
    console.log('[LocalStorageSync] useLocalStorageSync hook initialized');
  }
  
  if (localStorageSyncLogging) {
    console.log('[LocalStorageSync] sendRequest function available:', !!sendRequest);
  }

  /**
   * Tallentaa localStorage-tiedot palvelimelle (yhteiskäyttöinen layout)
   */
  const saveToServer = async (): Promise<boolean> => {
    try {
      // Tarkista socket-yhteys ennen kyselyä
      const socket = getSocket();
      if (!socket || !socket.connected) {
        if (localStorageSyncLogging) {
          console.log('[LocalStorageSync] Socket not connected, cannot save to server');
        }
        return false;
      }
      
      const localData = collectLocalStorageData();
      if (localStorageSyncLogging) {
        console.log('[LocalStorageSync] Attempting to save to server:', localData);
      }
      
      const query = `INSERT INTO layout_settings (layout_name, layout_data) 
                     VALUES ('default', ?) 
                     ON DUPLICATE KEY UPDATE layout_data = ?, updated_at = NOW()`;
      const params = [JSON.stringify(localData), JSON.stringify(localData)];
      
      if (localStorageSyncLogging) {
        console.log('[LocalStorageSync] SQL Query:', query);
        console.log('[LocalStorageSync] SQL Params:', params);
      }
      
      const result = await sendRequest('sql_query', {
        sql: query,
        params: params
      });
      
      if (localStorageSyncLogging) {
        console.log('[LocalStorageSync] Server response:', result);
      }
      return result.success || false;
    } catch (error) {
      console.error('[LocalStorageSync] Failed to save to server:', error);
      return false;
    }
  };

  /**
   * Lataa localStorage-tiedot palvelimelta (yhteiskäyttöinen layout)
   */
    const loadFromServer = async (): Promise<boolean> => {
    try {
      if (localStorageSyncLogging) {
        console.log('[LocalStorageSync] Attempting to load from server...');
      }
      
      // Tarkista socket-yhteys ennen kyselyä
      const socket = getSocket();
      if (!socket || !socket.connected) {
        if (localStorageSyncLogging) {
          console.log('[LocalStorageSync] Socket not connected, cannot load from server');
        }
        return false;
      }
      
      const query = 'SELECT layout_data FROM layout_settings WHERE layout_name = ?';
      const params = ['default'];
      
      if (localStorageSyncLogging) {
        console.log('[LocalStorageSync] Load SQL Query:', query);
        console.log('[LocalStorageSync] Load SQL Params:', params);
        console.log('[LocalStorageSync] About to send request with:', {
          sql: query,
          params: params
        });
      }
      
      const result = await sendRequest('sql_query', {
        sql: query,
        params: params
      });
      
      if (localStorageSyncLogging) {
        console.log('[LocalStorageSync] ===== SERVER RESPONSE ANALYSIS =====');
        console.log('[LocalStorageSync] Complete server response:', result);
        console.log('[LocalStorageSync] Response type:', typeof result);
        console.log('[LocalStorageSync] Result.success:', result?.success);
        console.log('[LocalStorageSync] Result.error:', result?.error);
        console.log('[LocalStorageSync] Result.requiresAuth:', result?.requiresAuth);
        console.log('[LocalStorageSync] Result object keys:', result ? Object.keys(result) : 'null');
        console.log('[LocalStorageSync] Result.result:', result?.result);
        if (result?.result) {
          console.log('[LocalStorageSync] Result.result keys:', Object.keys(result.result));
        }
        console.log('[LocalStorageSync] Database raw data:', result?.data);
        console.log('[LocalStorageSync] Database data length:', result?.data ? result.data.length : 'null/undefined');
        console.log('[LocalStorageSync] ===== END SERVER RESPONSE =====');
      }
      
      // Try different possible data locations in the response
      const dataArray = result.data || result.result?.rows || result.result;
      
      if (localStorageSyncLogging) {
        console.log('[LocalStorageSync] Data array found:', dataArray);
        console.log('[LocalStorageSync] Data array type:', typeof dataArray);
        console.log('[LocalStorageSync] Data array length:', dataArray ? dataArray.length : 'null/undefined');
      }
      
      if (result.success && dataArray && dataArray.length > 0) {
        if (localStorageSyncLogging) {
          console.log('[LocalStorageSync] First row from database:', dataArray[0]);
          console.log('[LocalStorageSync] Raw layout_data from database:', dataArray[0].layout_data);
        }
        
        const layoutData = JSON.parse(dataArray[0].layout_data);
        
        if (localStorageDataLogging) {
          console.log('[LocalStorageSync] Parsed layout data:', layoutData);
          console.log('[LocalStorageSync] Type of parsed data:', typeof layoutData);
          console.log('[LocalStorageSync] Keys in parsed data:', Object.keys(layoutData));
        }
        
        // Check if homeLayout:v7 is a string (old format) or object (new format)
        if (typeof layoutData['homeLayout:v7'] === 'string') {
          // Old format - parse the string
          layoutData['homeLayout:v7'] = JSON.parse(layoutData['homeLayout:v7']);
          if (localStorageDataLogging) {
            console.log('[LocalStorageSync] Converted string layout to object (old format)');
          }
        }
        
        // Convert layout object back to string for localStorage
        const finalData = {
          ...layoutData,
          'homeLayout:v7': JSON.stringify(layoutData['homeLayout:v7'])
        };
        
        if (localStorageDataLogging) {
          console.log('[LocalStorageSync] Final data for localStorage:', finalData);
        }
        
        setLocalStorageData(finalData);
        
        if (localStorageSyncLogging) {
          console.log('[LocalStorageSync] Data successfully set to localStorage');
          console.log('[LocalStorageSync] Verifying localStorage content after set:');
          Object.values(SYNC_KEYS).forEach(key => {
            const value = localStorage.getItem(key);
            console.log(`[LocalStorageSync] ${key}:`, value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : null);
          });
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
  };

  /**
   * Synkronoi localStorage palvelimelle (tallentaa nykyiset tiedot)
   */
  const syncToServer = saveToServer;

  /**
   * Synkronoi localStorage palvelimelta (lataa palvelimen tiedot)
   */
  const syncFromServer = loadFromServer;

  return {
    saveToServer,
    loadFromServer,
    syncToServer,
    syncFromServer,
    collectLocalStorageData,
    setLocalStorageData,
    resetLayoutToEmpty
  };
};

export default useLocalStorageSync;
