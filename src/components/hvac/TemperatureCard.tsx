import React, { useState, useEffect, useRef } from 'react';
import { getUpdateStatus, onUpdateStatusChange } from '../../helpers/socketHelper';
import { useSocketService } from '../../hooks/useSocket';
import './TemperatureCard.css';

// Debug logging flags - set to true to enable specific logging categories:
// temperatureCardLogging: TemperatureCard cache operations and database queries
const temperatureCardLogging = true;

// Shared cache for setpoint data to avoid multiple database queries
const SETPOINT_CACHE_KEY = 'temperatureSetpoints';
const SETPOINT_CACHE_EXPIRY_KEY = 'temperatureSetpointsExpiry';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let setpointPromise: Promise<Record<string, number>> | null = null;

// Get cached setpoints from localStorage
const getCachedSetpoints = (): Record<string, number> | null => {
  try {
    const cached = localStorage.getItem(SETPOINT_CACHE_KEY);
    const expiry = localStorage.getItem(SETPOINT_CACHE_EXPIRY_KEY);
    
    if (cached && expiry) {
      const expiryTime = parseInt(expiry);
      if (Date.now() < expiryTime) {
        if (temperatureCardLogging) {
          console.log('[TemperatureCache] Using valid cached setpoints from localStorage');
        }
        return JSON.parse(cached);
      } else {
        if (temperatureCardLogging) {
          console.log('[TemperatureCache] Cache expired, removing old data');
        }
        localStorage.removeItem(SETPOINT_CACHE_KEY);
        localStorage.removeItem(SETPOINT_CACHE_EXPIRY_KEY);
      }
    }
  } catch (error) {
    console.error('[TemperatureCache] Error reading from localStorage:', error);
  }
  return null;
};

// Save setpoints to localStorage
const setCachedSetpoints = (setpoints: Record<string, number>) => {
  try {
    localStorage.setItem(SETPOINT_CACHE_KEY, JSON.stringify(setpoints));
    localStorage.setItem(SETPOINT_CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
    if (temperatureCardLogging) {
      console.log('[TemperatureCache] Saved setpoints to localStorage:', setpoints);
    }
  } catch (error) {
    console.error('[TemperatureCache] Error saving to localStorage:', error);
  }
};

// Clear cache (for debugging)
const clearSetpointCache = () => {
  localStorage.removeItem(SETPOINT_CACHE_KEY);
  localStorage.removeItem(SETPOINT_CACHE_EXPIRY_KEY);
  setpointPromise = null;
  if (temperatureCardLogging) {
    console.log('[TemperatureCache] Cache cleared');
  }
};

// Make clearSetpointCache available globally for debugging
(window as typeof window & { clearTemperatureCache?: () => void }).clearTemperatureCache = clearSetpointCache;

// Wait for socket connection helper
const waitForSocketConnection = (socketService: any): Promise<void> => { // eslint-disable-line @typescript-eslint/no-explicit-any
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeout = 5000; // 5 seconds timeout
    
    const checkConnection = () => {
      if (socketService.isConnected) {
        if (temperatureCardLogging) {
          console.log('[SocketWait] Socket connected, proceeding with request');
        }
        resolve();
      } else if (Date.now() - startTime > timeout) {
        if (temperatureCardLogging) {
          console.log('[SocketWait] Socket connection timeout after 5 seconds');
        }
        reject(new Error('Socket connection timeout'));
      } else {
        if (temperatureCardLogging) {
          console.log('[SocketWait] Waiting for socket connection...');
        }
        setTimeout(checkConnection, 500);
      }
    };
    checkConnection();
  });
};

// Shared function to fetch setpoints once and cache the result
const fetchAllSetpoints = async (socketService: any): Promise<Record<string, number>> => { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (temperatureCardLogging) {
    console.log('[SharedSetpoint] 🚀 fetchAllSetpoints called');
  }
  
  // Check localStorage cache first
  const cachedData = getCachedSetpoints();
  if (cachedData) {
    if (temperatureCardLogging) {
      console.log('[SharedSetpoint] 📦 Using cached data:', cachedData);
    }
    return cachedData;
  }

  // If there's already a request in progress, wait for it
  if (setpointPromise) {
    if (temperatureCardLogging) {
      console.log('Waiting for existing setpoint request...');
    }
    return setpointPromise;
  }

  if (temperatureCardLogging) {
    console.log('[SharedSetpoint] No valid cache found, making new database query');
  }

  // Create new request promise using sendRequest
  setpointPromise = new Promise<Record<string, number>>((resolve) => {
    if (temperatureCardLogging) {
      console.log('Starting new setpoint database query...');
    }
    
    const performRequest = async () => {
      try {
        // Check socket connection - if not connected, use defaults immediately
        if (!socketService.isConnected) {
          if (temperatureCardLogging) {
            console.log('[SharedSetpoint] Socket not connected, using default setpoints');
          }
          const defaults = { mh1: 20, mh2: 20, mh3: 20, ohetkt: 20, phkhh: 20 };
          setCachedSetpoints(defaults);
          resolve(defaults);
          return;
        }

        // Wait for socket connection first (with timeout)
        await waitForSocketConnection(socketService);
        
        if (temperatureCardLogging) {
          console.log('[SharedSetpoint] ✅ Socket connected, preparing database query...');
        }
        
        const requestData = {
          sql: 'SELECT * FROM ifserver.roomsetpointtemp ORDER BY idroomsetpointtemp DESC LIMIT 1;',
          params: []
        };
        
        if (temperatureCardLogging) {
          console.log('[SharedSetpoint] 📤 Sending SQL query:', requestData);
        }
        
        // Use socketService.sendRequest() EXACTLY like lamps do!
        const response = await socketService.sendRequest({
          type: 'sql_query',
          data: requestData,
          token: localStorage.getItem('authToken') || undefined
        });
        
        if (temperatureCardLogging) {
          console.log('[SharedSetpoint] 📥 Response received:', response);
          console.log('[SharedSetpoint] 📊 Response success:', response?.success);
          console.log('[SharedSetpoint] 📊 Response data type:', Array.isArray(response?.data) ? 'array' : typeof response?.data);
          console.log('[SharedSetpoint] 📊 Response data length:', response?.data ? response.data.length : 'no data');
        }
        
        let row = null;
        if (response && response.success) {
          if (response.data && Array.isArray(response.data)) {
            row = response.data[0];
            if (temperatureCardLogging) {
              console.log('[SharedSetpoint] 🔍 Found data in response.data[0]:', row);
              if (row) {
                console.log('[SharedSetpoint] 🔍 Row keys:', Object.keys(row));
                console.log('[SharedSetpoint] 🔍 Row values:', Object.values(row));
              }
            }
          }
        } else {
          if (temperatureCardLogging) {
            console.log('[SharedSetpoint] ❌ Query failed or returned no success');
            console.log('[SharedSetpoint] ❌ Response object:', response);
          }
        }

        if (row) {
          if (temperatureCardLogging) {
            console.log('[SharedSetpoint] 🔄 Processing row data...');
          }
          // Extract all room setpoints from the row
          const setpoints: Record<string, number> = {};
          Object.keys(row).forEach(column => {
            if (temperatureCardLogging) {
              console.log(`[SharedSetpoint] 📝 Column: "${column}" = ${row[column]} (type: ${typeof row[column]})`);
            }
            if (column !== 'idroomsetpointtemp' && column !== 'room_id') {
              const key = column.toLowerCase();
              const value = Number(row[column]);
              setpoints[key] = value;
              if (temperatureCardLogging) {
                console.log(`[SharedSetpoint] ✅ Added setpoint: ${key} = ${value}`);
              }
            } else {
              if (temperatureCardLogging) {
                console.log(`[SharedSetpoint] ⏭️ Skipped column: ${column}`);
              }
            }
          });
          
          if (temperatureCardLogging) {
            console.log('[SharedSetpoint] 🎯 Final parsed setpoints:', setpoints);
          }
          setCachedSetpoints(setpoints);  // Cache to localStorage
          resolve(setpoints);
        } else {
          if (temperatureCardLogging) {
            console.log('[SharedSetpoint] No data found, using defaults');
          }
          const defaults = { mh1: 20, mh2: 20, mh3: 20, ohetkt: 20, phkhh: 20 };
          setCachedSetpoints(defaults);
          resolve(defaults);
        }
      } catch (error) {
        console.error('[SharedSetpoint] Database query failed:', error);
        const defaults = { mh1: 20, mh2: 20, mh3: 20, ohetkt: 20, phkhh: 20 };
        setCachedSetpoints(defaults);
        resolve(defaults); // Resolve with defaults instead of rejecting
      }
    };
    
    performRequest();
  });

  return setpointPromise;
};

interface TemperatureCardProps {
  roomId: string;
  roomName: string;
  authenticated?: boolean;
  minTemp?: number;
  maxTemp?: number;
  step?: number;
  isModal?: boolean; // New prop for modal styling
  onClose?: () => void; // Function to close the modal
}

interface TemperatureData {
  current: number | null;
  setpoint?: number | null; // Make setpoint optional since it's handled separately
  heatingOn: boolean;
}

// Separate interface for status updates (no setpoint)
interface StatusUpdateData {
  current: number | null;
  heatingOn: boolean;
}

const TemperatureCard: React.FC<TemperatureCardProps> = ({
  roomId,
  roomName,
  minTemp = 18,
  maxTemp = 25,
  step = 0.5,
  authenticated = false,
  isModal = false,
  onClose
}) => {
  // USE THE SAME SOCKET API AS LAMPS!
  const { service: socketService } = useSocketService();
  
  const [temperatureData, setTemperatureData] = useState<TemperatureData>({
    current: null,
    setpoint: null,
    heatingOn: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isChanging, setIsChanging] = useState(false);
  const commitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Room ID to name mapping (matches StatusUpdate data format - uppercase)
  const roomIdToName: Record<number, string> = {
    1: 'MH1',     // Makuuhuone 1
    2: 'MH2',     // Makuuhuone 2
    3: 'MH3',     // Makuuhuone 3
    4: 'OHETKT',  // Olohuone/etupihan takkahuone
    5: 'PHKHH'    // Pesuhuone/kodinhoitohuone
  };

  // Get room key for temperature lookup - handle both numeric IDs and direct room names
  const getRoomKey = (id: string): string => {
    const numId = parseInt(id);
    
    // If it's a numeric ID, use the mapping and convert to lowercase for cache consistency
    if (!isNaN(numId) && roomIdToName[numId]) {
      return roomIdToName[numId].toLowerCase();  // Return lowercase for cache
    }
    
    // If it's already a room name like 'MH2' or 'mh2', normalize to lowercase for cache
    return id.toLowerCase();
  };

  // Get room key for StatusUpdate lookup (uppercase for server data matching)
  const getStatusUpdateRoomKey = (id: string): string => {
    const numId = parseInt(id);
    
    // If it's a numeric ID, use the mapping  
    if (!isNaN(numId) && roomIdToName[numId]) {
      return roomIdToName[numId];  // Return uppercase for StatusUpdate matching
    }
    
    // If it's already a room name, normalize to uppercase to match StatusUpdate format
    return id.toUpperCase();
  };

  // Format temperature to 1 decimal place
  const formatTemperature = (temp: number | null): string => {
    if (temp == null) return '--';
    return parseFloat(temp.toString()).toFixed(1);
  };

  // Handle setpoint change with debounced database update for ALL rooms
  const handleSetpointChange = (newValue: number) => {
    if (!authenticated) return;

    setIsChanging(true);
    setTemperatureData(prev => ({ ...prev, setpoint: newValue }));

    // Update localStorage cache immediately for this room
    const roomKey = getRoomKey(roomId);
    const cachedData = getCachedSetpoints();
    let updatedCache: Record<string, number>;
    
    if (cachedData) {
      updatedCache = { ...cachedData, [roomKey]: newValue };
      setCachedSetpoints(updatedCache);
      if (temperatureCardLogging) {
        console.log(`[TemperatureCard ${roomId}] Updated localStorage cache for ${roomKey}:`, newValue);
      }
    } else {
      // If no cache exists, create default values with the new value
      updatedCache = { mh1: 20, mh2: 20, mh3: 20, ohetkt: 20, phkhh: 20 };
      updatedCache[roomKey] = newValue;
      setCachedSetpoints(updatedCache);
    }

    // Clear previous timeout
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
    }

    // Debounce database update - use the updatedCache directly instead of re-reading
    commitTimeoutRef.current = setTimeout(async () => {
      try {
        if (temperatureCardLogging) {
          console.log('[Database Update] Using setpoints directly from updatedCache:', updatedCache);
        }

        // Wait for socket connection first
        await waitForSocketConnection(socketService);

        // Create INSERT query with ALL room values from updatedCache
        const values = [
          updatedCache.mh1 || 20,
          updatedCache.mh2 || 20, 
          updatedCache.mh3 || 20,
          updatedCache.ohetkt || 20,
          updatedCache.phkhh || 20
        ];

        const requestData = {
          query: `INSERT INTO ifserver.roomsetpointtemp (mh1, mh2, mh3, ohetkt, phkhh) VALUES (?, ?, ?, ?, ?);`,
          params: values
        };
        
        // Use socketService.sendRequest() EXACTLY like lamps do!
        const response = await socketService.sendRequest({
          type: 'database_write',
          data: requestData,
          token: localStorage.getItem('authToken') || undefined
        });
        
        if (temperatureCardLogging) {
          console.log('All rooms setpoint update command sent:', requestData);
          console.log('Values inserted:', { mh1: values[0], mh2: values[1], mh3: values[2], ohetkt: values[3], phkhh: values[4] });
          console.log('Database write response:', response);
        }
        
        if (response && response.success) {
          if (temperatureCardLogging) {
            console.log('✅ Setpoint update successful');
          }
        } else {
          console.error('❌ Setpoint update failed:', response.error);
        }
      } catch (error) {
        console.error('Failed to update setpoints:', error);
      } finally {
        setIsChanging(false);
      }
    }, 2000); // 2 seconds debounce - longer to avoid too many inserts
  };

  // Subscribe to status updates
  useEffect(() => {
    console.log(`🔍 [TemperatureCard ${roomId}] KRIITTINEN: useEffect käynnistyy, yritetään rekisteröidä callback`);
    if (temperatureCardLogging) {
      console.log(`[TemperatureCard ${roomId}] useEffect triggered, authenticated:`, authenticated); // Debug log
    }
    // Extract temperature data from status updates
    const extractTemperatureData = (statusData: any): StatusUpdateData => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const roomKey = getStatusUpdateRoomKey(roomId); // Use uppercase for StatusUpdate matching
      let current: number | null = null;
      let heatingOn = false;

      // Extract current temperature from status data
      if (Array.isArray(statusData.temperatures)) {
        if (temperatureCardLogging) {
          console.log(`[TemperatureCard ${roomId}] Looking for roomKey "${roomKey}" in temperatures:`, 
            statusData.temperatures.map((t: { room?: string; value?: string | number }) => ({ room: t.room, value: t.value })));
        }
        const tempEntry = statusData.temperatures.find((t: any) =>  // eslint-disable-line @typescript-eslint/no-explicit-any
          t.room && t.room.toUpperCase() === roomKey.toUpperCase()
        );
        if (tempEntry) {
          current = typeof tempEntry.value === 'number' 
            ? tempEntry.value 
            : parseFloat(tempEntry.value) || null;
          if (temperatureCardLogging) {
            console.log(`[TemperatureCard ${roomId}] Found temperature for "${roomKey}": ${current}°C`);
          }
        }
      } else if (statusData.temperatures && typeof statusData.temperatures === 'object') {
        // Handle object format temperatures
        Object.entries(statusData.temperatures).forEach(([key, value]) => {
          if (key.toLowerCase() === roomKey && typeof value === 'number') {
            current = value;
          }
        });
      }

      // Check heating relay status
      if (statusData.relays && statusData.relaysinf) {
        const heatingRelay = statusData.relaysinf.find((info: any) =>  // eslint-disable-line @typescript-eslint/no-explicit-any
          info.type === 'heating' && (
            info.name.toLowerCase() === roomKey || 
            (info.room_id && roomIdToName[info.room_id] === roomKey)
          )
        );
        
        if (heatingRelay) {
          const relayStatus = statusData.relays.find((r: any) =>  // eslint-disable-line @typescript-eslint/no-explicit-any
            String(r.relay) === String(heatingRelay.idrelay)
          );
          heatingOn = !!(relayStatus && (relayStatus.stat === 1 || relayStatus.stat === "1"));
        }
      }

      return {
        current,
        heatingOn
        // Never return setpoint - it's managed separately
      };
    };

    // Fetch initial setpoint from database (using shared cache)
    const fetchSetpoint = async () => {
      if (temperatureCardLogging) {
        console.log('[TemperatureCard] fetchSetpoint called, authenticated:', authenticated);
      }
      
      if (!authenticated) {
        if (temperatureCardLogging) {
          console.log('[TemperatureCard] Not authenticated, skipping setpoint fetch');
        }
        setIsLoading(false);
        return;
      }

      try {
        // First check if we have cached data
        const cachedData = getCachedSetpoints();
        if (cachedData) {
          const roomKey = getRoomKey(roomId);
          if (cachedData[roomKey] !== undefined) {
            if (temperatureCardLogging) {
              console.log(`[TemperatureCard ${roomId}] Using cached setpoint for ${roomKey}:`, cachedData[roomKey]);
            }
            setTemperatureData(prev => ({
              ...prev,
              setpoint: cachedData[roomKey]
            }));
            setIsLoading(false);
            return;
          }
        }

        // If no cache and socket is not connected, use defaults immediately
        if (!socketService.isConnected) {
          if (temperatureCardLogging) {
            console.log(`[TemperatureCard ${roomId}] Socket not connected, using default setpoint`);
          }
          setTemperatureData(prev => ({
            ...prev,
            setpoint: 20 // Default to 20°C
          }));
          setIsLoading(false);
          return;
        }

        // Try to fetch from database only if socket is connected
        const allSetpoints = await fetchAllSetpoints(socketService);
        const roomKey = getRoomKey(roomId);
        
        // Try both uppercase and lowercase keys for cache lookup since database stores lowercase
        const setpointValue = allSetpoints[roomKey] !== undefined ? allSetpoints[roomKey] : allSetpoints[roomKey.toLowerCase()];
        
        if (setpointValue !== undefined) {
          if (temperatureCardLogging) {
            console.log(`[TemperatureCard ${roomId}] Found setpoint for ${roomKey} (or ${roomKey.toLowerCase()}):`, setpointValue);
          }
          setTemperatureData(prev => ({
            ...prev,
            setpoint: setpointValue
          }));
        } else {
          if (temperatureCardLogging) {
            console.log(`[TemperatureCard ${roomId}] No setpoint found for ${roomKey} or ${roomKey.toLowerCase()}, using default`);
            console.log(`[TemperatureCard ${roomId}] Available setpoint keys:`, Object.keys(allSetpoints));
          }
          setTemperatureData(prev => ({
            ...prev,
            setpoint: 20 // Default to 20°C
          }));
        }
        setIsLoading(false);
      } catch (error) {
        console.error(`[TemperatureCard ${roomId}] Failed to fetch setpoint:`, error);
        setTemperatureData(prev => ({
          ...prev,
          setpoint: 20 // Default to 20°C
        }));
        setIsLoading(false);
      }
    };

    // Get initial status (only for current temp and heating status)
    const initialStatus = getUpdateStatus();
    console.log(`🔍 [TemperatureCard ${roomId}] KRIITTINEN: Initial status:`, initialStatus);
    if (initialStatus) {
      const data = extractTemperatureData(initialStatus);
      console.log(`🔍 [TemperatureCard ${roomId}] KRIITTINEN: Extracted initial data:`, data);
      setTemperatureData(prev => ({ 
        ...prev, 
        current: data.current,
        heatingOn: data.heatingOn
        // Don't set setpoint from status data
      }));
    }

    // Subscribe to updates
    const unsubscribe = onUpdateStatusChange((statusData) => {
      console.log(`🔍 [TemperatureCard ${roomId}] KRIITTINEN: onUpdateStatusChange callback kutsuttu:`, statusData);
      // Only update current temperature and heating status, never setpoint
      const data = extractTemperatureData(statusData);
      console.log(`🔍 [TemperatureCard ${roomId}] KRIITTINEN: Extracted update data:`, data);
      setTemperatureData(prev => ({ 
        ...prev, 
        current: data.current,
        heatingOn: data.heatingOn
        // Keep existing setpoint unchanged
      }));
    });

    // Fetch initial setpoint
    fetchSetpoint();

    return () => {
      unsubscribe();
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, authenticated]);

  if (isLoading) {
    return (
      <div className={`temperature-card loading${isModal ? ' modal' : ''}`}>
        <div className="temperature-card-header">
          <div className="room-info">
            <div className="heating-indicator off" />
            <h3>{roomName}</h3>
          </div>
        </div>
        <div className="temperature-card-body">
          <div className="loading-spinner">Ladataan...</div>
        </div>
      </div>
    );
  }

  console.log(`[TemperatureCard ${roomId}] Rendering with data:`, temperatureData, 'authenticated:', authenticated); // Debug log

  return (
    <div 
      className={`temperature-card${isModal ? ' modal' : ''}`}
      data-testid="temperature-card"
      onClick={(e) => {
        if (isModal) {
          e.stopPropagation(); // Prevent clicks from closing modal when clicking inside card
        }
      }}
    >
      {/* Close button - only show in modal */}
      {isModal && onClose && (
        <button
          onClick={onClose}
          onTouchEnd={(e) => {
            e.preventDefault();
            onClose();
          }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '2px solid #ef4444',
            fontSize: '18px',
            color: '#ef4444', // Red color
            cursor: 'pointer',
            padding: '8px',
            lineHeight: '1',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            zIndex: 10,
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            touchAction: 'manipulation'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#ef4444';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ✕
        </button>
      )}
      
      <div className="temperature-card-header">
        <div className="room-info">
          <div className={`heating-indicator ${temperatureData.heatingOn ? 'on' : 'off'}`} />
          <h3>{roomName}</h3>
        </div>
      </div>
      
      <div className="temperature-card-body">
        <div className="current-temperature">
          <span className="temperature-value">
            {formatTemperature(temperatureData.current)}°C
          </span>
          <span className="temperature-label">Nykyinen</span>
        </div>

        {/* Always show slider, but disable when not authenticated */}
        <div className="setpoint-control">
          <div className="setpoint-display">
            <span className="setpoint-value">
              {formatTemperature(temperatureData.setpoint ?? 20)}°C
            </span>
            <span className="setpoint-label">Tavoite</span>
          </div>
          
          <input
            type="range"
            min={minTemp}
            max={maxTemp}
            step={step}
            value={temperatureData.setpoint ?? 20}
            onChange={(e) => handleSetpointChange(parseFloat(e.target.value))}
            className={`temperature-slider ${isChanging ? 'changing' : ''}`}
            disabled={!authenticated || isChanging}
          />
          
          <div className="slider-labels">
            <span>{minTemp}°C</span>
            <span>{maxTemp}°C</span>
          </div>
        </div>

        {!authenticated && (
          <div className="auth-message">
            <span>Kirjaudu sisään säätääksesi lämpötilaa</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemperatureCard;
