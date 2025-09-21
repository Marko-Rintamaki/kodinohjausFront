import React, { useState, useRef, useEffect, useCallback } from 'react';
import Lamp from '../components/Lamp';
import MirrorLight from '../components/MirrorLight';
import SpotLight from '../components/SpotLight';
import LEDStrip from '../components/LEDStrip';
import HeatingPipe from '../components/HeatingPipe';
import HeatPump from '../components/HeatPump';
import CompressorNew from '../components/CompressorNew';
import FanIcon from '../components/FanIcon';
import HeatPumpCompressor from '../components/HeatPumpCompressor';
import HeatPumpIndoorUnit from '../components/HeatPumpIndoorUnit';
import WallLight from '../components/WallLight';
import DirectionChooser from '../components/DirectionChooser';
import RelayAssignmentDialog from '../components/RelayAssignmentDialog';
import AdminToolbar, { type ToolType } from '../components/AdminToolbar';
import TemperatureIcon from '../components/TemperatureIcon';
import StatusModal from '../components/StatusModal';
import StatusBar from '../components/StatusBar';
import { sendDataQuery, getSocket, onUpdateStatusChange, getAllRelayStatus } from '../helpers/socketHelper';
import { useAppSocket } from '../hooks/useAppSocket';
import { useZoomAndPan } from '../hooks/useZoomAndPan';
import { useLayoutPersistence } from '../hooks/useLayoutPersistence';
import { useDrawingLogic } from '../hooks/useDrawingLogic';
import { useLocalStorageSync } from '../helpers/localStorageSync';
import './Home.css';

// Full width home view with small padding and pinch/scroll zoom + drag pan.

// Debug logging flags - set to true to enable specific logging categories:
// parseStatusDataLogging: Temperature and status data parsing
// localStorageLogging: localStorage operations and sync
// authLogging: Authentication status changes
// relayLogging: Relay status updates and control commands
// adminLogging: Admin mode actions and component editing
// dragLogging: Component dragging operations
// cloudSyncLogging: Save/Load to cloud operations
// socketLogging: Socket connection status
// statusUpdateLogging: Status update subscriptions
var parseStatusDataLogging = false;
var localStorageLogging = false;
var authLogging = false;
var relayLogging = false;
var adminLogging = false;
var dragLogging = false;
var cloudSyncLogging = false;
var socketLogging = false;
var statusUpdateLogging = false;
interface HomeProps {
  hideHeatingPipes?: boolean;
  hideLEDStrips?: boolean;
  hideLamps?: boolean;
  hideTemperatureIcons?: boolean;
  hideWallLights?: boolean;
  hideHeatPumps?: boolean;
}

const Home: React.FC<HomeProps> = ({
  hideHeatingPipes: hideHeatingPipesProp = false,
  hideLEDStrips: hideLEDStripsProp = false,
  hideLamps: hideLampsProp = false,
  hideTemperatureIcons: hideTemperatureIconsProp = false,
  hideWallLights: hideWallLightsProp = false,
  hideHeatPumps: hideHeatPumpsProp = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Authentication state
  const [authenticated, setAuthenticated] = useState(false);
  
  // Use socket hook for authentication status
  const { authStatus } = useAppSocket({
    autoAuth: true,
    authRetries: 2,
    fallbackMs: 5000,
    useStatusAsInitial: true,
    overviewQuery: false
  });
  
  // Use localStorage sync hook for server backup
  const { loadFromServer, saveToServer, resetLayoutToEmpty } = useLocalStorageSync();
  if (localStorageLogging) {
    console.log('[localStorage] sync hook initialized, functions available:', {
      loadFromServer: !!loadFromServer,
      saveToServer: !!saveToServer,
      resetLayoutToEmpty: !!resetLayoutToEmpty
    });
  }
  
  // Debugging: make functions available globally for testing
  useEffect(() => {
    (window as any).localStorageSyncFunctions = { loadFromServer, saveToServer, resetLayoutToEmpty };
    (window as any).testSave = () => {
      if (localStorageLogging) {
        console.log('[localStorage] Manual test save triggered...');
      }
      return saveToServer();
    };
    (window as any).resetLayout = () => {
      if (localStorageLogging) {
        console.log('[localStorage] Manual layout reset triggered...');
      }
      
      // Tyhjennä localStorage kokonaan
      Object.values({
        LAYOUT_DATA: 'homeLayout:v7',
        DEBUG_MODE: 'debugMode', 
        DEBUG_COORDS: 'debugCoordinates',
        LAST_AUTH_ATTEMPT: 'lastAuthAttempt'
      }).forEach(key => {
        localStorage.removeItem(key);
        if (localStorageLogging) {
          console.log('[localStorage] Removed key:', key);
        }
      });
      
      // Reload page to see changes
      window.location.reload();
    };
  }, [loadFromServer, saveToServer, resetLayoutToEmpty]);
  
  // Monitor authentication status
  useEffect(() => {
    if (authLogging) {
      console.log('[Auth] status changed:', authStatus, 'type:', typeof authStatus);
    }
    const isAuthenticated = authStatus === 'authenticated';
    if (authLogging) {
      console.log('[Auth] Setting authenticated to:', isAuthenticated);
    }
    setAuthenticated(isAuthenticated);
    
    // When authenticated, load localStorage from server (with delay)
    if (isAuthenticated) {
      if (authLogging) {
        console.log('[Auth] User authenticated, starting localStorage sync...');
        console.log('[Auth] loadFromServer function available:', !!loadFromServer);
      }
      
      // Small delay to ensure authentication is fully processed
      setTimeout(() => {
        if (authLogging) {
          console.log('[Auth] Calling loadFromServer after delay...');
        }
        // Note: Actual loading will happen in a separate useEffect after useLayoutPersistence
      }, 1000); // 1 second delay to ensure auth is fully processed
    }
  }, [authStatus, loadFromServer]);
  
  // TODO: Fetch register_meanings from database when needed (currently disabled due to MySQL connection issues)
  // useEffect(() => {
  //   const fetchRegisterMeanings = async () => {
  //     if (!authenticated) return;
  //     // ... register meanings fetch logic disabled
  //   };
  //   if (authenticated) {
  //     const timer = setTimeout(fetchRegisterMeanings, 1000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [authenticated]);
  
  // Use zoom and pan hook
  const {
    scale,
    translate,
    imgSize,
    panning,
    setImgSize,
    setContainerSize,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel
  } = useZoomAndPan();
  // Data models
  type Lamp = {id:string; kind:'lamp'|'mirror'|'spot'; x:number; y:number; on:boolean; label?:string; brightness?:number; color?:string; relayId?:number};
  type LEDStripModel = {id:string; points:{x:number;y:number;}[]; on:boolean; label?:string; brightness?:number; color?:string; relayId?:number};
  type HeatingPipeModel = {id:string; points:{x:number;y:number;}[]; on:boolean; label?:string; relayId?:number};
  type TemperatureIconModel = {id:string; x:number; y:number; roomId: string; roomName?:string};
  type HeatPumpModel = {id:string; x:number; y:number; label?:string};
  type CompressorModel = {id:string; x:number; y:number; label?:string; compressorId?:string};
  type FanModel = {id:string; x:number; y:number; label?:string; fanId?:string; fanType?: 'indoor' | 'outdoor'};
  type HeatPumpCompressorModel = {id:string; x:number; y:number; label?:string; compressorId?:string};
  type HeatPumpIndoorUnitModel = {id:string; x:number; y:number; label?:string; unitId?:string};
  type WallLightModel = {id:string; x:number; y:number; label?:string; relayId?:number; direction?: 'up' | 'down'};
  
  // Multiple lamps (relative coordinates 0..1)
  const [lamps, setLamps] = useState<Array<Lamp>>([]);
  // Track initial mount to prevent saving on first render
  const isInitialMount = useRef(true);

  // Admin mode toggle (press 'a')
  const [admin, setAdmin] = useState(false);
  // Status modal toggle
  const [showStatusModal, setShowStatusModal] = useState(false);
  // Status data from statusUpdate
  const [statusData, setStatusData] = useState<any>(null);

  // Status data type
  interface StatusData {
    hotWaterTemp?: number;
    heatingTankTemp?: number;
    outsideTemp?: number;
    insideTemp?: number;
    ventilationInTemp?: number;  // IV in - tuloilma
    ventilationOutTemp?: number; // IV out - poistoilma
    heatPumpStatus?: string;
    solarProduction?: number;
    powerConsumption?: number;
    powerL1?: number;
    powerL2?: number;
    powerL3?: number;
    heatPumpPower?: number;
    ventilationPower?: number;
    lightingPower?: number;
    batteryLevel?: number;
    gridPower?: number;
    electricityPrice?: number;
    totalSavings?: number;
  }

  // Parse status data for StatusModal
  const parseStatusData = useCallback((statusUpdate: any) => {
    const data: StatusData = {};

    // Käyttövesi lämpötila (Nilan register 5162, value/10)
    const nilanData = statusUpdate?.Nilan?.[0]?.registers;
    if (nilanData) {
      const hotWaterReg = nilanData.find((reg: any) => reg.register === "5162");
      if (hotWaterReg) {
        data.hotWaterTemp = parseFloat(hotWaterReg.value) / 10;
      }
    }

    // Lämmitysvaraaja lämpötila (Bosch dhw1 actualTemp)
    const boschData = statusUpdate?.Bosch?.[0]?.paths;
    if (boschData) {
      const dhwTemp = boschData.find((path: any) => path.id === "/dhwCircuits/dhw1/actualTemp");
      if (dhwTemp) {
        data.heatingTankTemp = dhwTemp.value;
      }
    }

    // Sähkön kulutus (Gw slaveId 2, registers 18,20,22 = L1,L2,L3) ja aurinkotuotto
    const gwData = statusUpdate?.Gw?.[0]?.registers;
    if (gwData) {
      // Etsi slaveId 2 register:it (sähkönkulutus vaiheet)
      const slave2Registers = gwData.filter((reg: any) => reg.slaveId === "2");
      
      const L1 = slave2Registers.find((reg: any) => reg.register === "18");
      const L2 = slave2Registers.find((reg: any) => reg.register === "20");
      const L3 = slave2Registers.find((reg: any) => reg.register === "22");

      if (L1 && L2 && L3) {
        // Muuta decimaaliksi (säilytä etumerkki: + = kulutus, - = syöttö verkkoon)
        const l1Power = parseFloat(L1.value) / 10; // W -> desimaalimukaan
        const l2Power = parseFloat(L2.value) / 10; // W -> desimaalimukaan  
        const l3Power = parseFloat(L3.value) / 10; // W -> desimaalimukaan
        
        data.powerConsumption = (l1Power + l2Power + l3Power) / 1000; // W -> kW
        data.powerL1 = l1Power / 1000; // kW
        data.powerL2 = l2Power / 1000; // kW
        data.powerL3 = l3Power / 1000; // kW
      }

      // Sähkönkulutus breakdown (slaveId 1, registers 18,20,22)
      const slave1Registers = gwData.filter((reg: any) => reg.slaveId === "1");
      
      const vilp = slave1Registers.find((reg: any) => reg.register === "18"); // VILP
      const ventilation = slave1Registers.find((reg: any) => reg.register === "20"); // Ilmanvaihto
      const lighting = slave1Registers.find((reg: any) => reg.register === "22"); // Valaistus

      if (vilp) {
        data.heatPumpPower = parseFloat(vilp.value) / 10 / 1000; // W -> kW (olettaen desimaalimukaisuus)
      }
      if (ventilation) {
        data.ventilationPower = parseFloat(ventilation.value) / 10 / 1000; // W -> kW
      }
      if (lighting) {
        data.lightingPower = parseFloat(lighting.value) / 10 / 1000; // W -> kW
      }
    }

    const solarData = statusUpdate?.SolarInverter?.Data;
    if (solarData) {
      // Aurinkotuotto (PAC)
      if (solarData.PAC) {
        data.solarProduction = solarData.PAC.Value / 1000; // W -> kW
      }
    }

    // Ulkolämpötila Bosch-datasta (outdoor_t1)
    if (boschData) {
      const outdoorSensor = boschData.find((path: any) => 
        path.id === "/system/sensors/temperatures/outdoor_t1"
      );
      if (outdoorSensor) {
        data.outsideTemp = outdoorSensor.value;
        if (parseStatusDataLogging) {
          console.log('[parseStatusData] Outdoor temperature from Bosch:', outdoorSensor.value + '°C');
        }
      }
    }

    // Lämpötilat (temperatures array)
    const temperatures = statusUpdate?.temperatures;
    if (temperatures && Array.isArray(temperatures)) {
      // Ulkolämpötila (ei ole mukana IV lämpötiloissa, mutta jätetään varalle)
      const outsideTemp = temperatures.find((temp: any) => temp.room === "IV out");
      if (outsideTemp) {
        data.ventilationOutTemp = parseFloat(outsideTemp.value); // Poistoilma
      }

      // Tuloilma lämpötila (IV in)
      const inletTemp = temperatures.find((temp: any) => temp.room === "IV in");
      if (inletTemp) {
        data.ventilationInTemp = parseFloat(inletTemp.value);
      }

      // Sisälämpötila (keskiarvo huoneista: MH1, MH2, MH3, OHETKT, PHKHH jne.)
      const roomTemps = temperatures.filter((temp: any) => 
        temp.room !== "IV out" && temp.room !== "IV in"
      );
      if (roomTemps.length > 0) {
        if (parseStatusDataLogging) {
          console.log('[parseStatusData] Room temperatures:', roomTemps.map(t => `${t.room}: ${t.value}°C`));
        }
        const avgTemp = roomTemps.reduce((sum: number, temp: any) => 
          sum + parseFloat(temp.value), 0) / roomTemps.length;
        data.insideTemp = avgTemp;
        if (parseStatusDataLogging) {
          console.log('[parseStatusData] Average inside temperature:', avgTemp.toFixed(1) + '°C');
          console.log('[parseStatusData] Ventilation temps - In:', data.ventilationInTemp?.toFixed(1) + '°C', 'Out:', data.ventilationOutTemp?.toFixed(1) + '°C');
        }
      }
    }

    // Lämpöpumppu status (Bosch modulation)
    if (boschData) {
      const modulation = boschData.find((path: any) => path.id === "/heatSources/actualModulation");
      if (modulation) {
        data.heatPumpStatus = modulation.value > 0 ? `Toiminnassa (${modulation.value}%)` : 'Ei käytössä';
      }
    }

    // Placeholder arvot puuttuville tiedoille
    data.powerConsumption = data.powerConsumption || 2.1; // TODO: Laske oikeasti
    data.batteryLevel = data.batteryLevel || 85; // TODO: Jos on akku järjestelmä
    data.gridPower = data.gridPower || (data.solarProduction ? data.solarProduction - data.powerConsumption : 0);

    return data;
  }, []);
  // Tool selection in admin mode
  const [selectedTool, setSelectedTool] = useState<ToolType>('strip');
  // View toggle states - now controlled by props from parent
  const hideHeatingPipes = hideHeatingPipesProp;
  const hideLEDStrips = hideLEDStripsProp;
  const hideLamps = hideLampsProp;
  const hideTemperatureIcons = hideTemperatureIconsProp;
  const hideWallLights = hideWallLightsProp;
  const hideHeatPumps = hideHeatPumpsProp;
  
  // Drag state for lamp and temperature icon repositioning in admin mode
  const dragRef = useRef<{
    id: string; startClientX: number; startClientY: number; origX: number; origY: number; moved: boolean; type: 'lamp' | 'temperature' | 'heatpump' | 'compressor' | 'fan' | 'heatpumpCompressor' | 'heatpumpIndoorUnit' | 'wallLight';
  } | null>(null);
  const scaleRef = useRef(scale); useEffect(()=>{ scaleRef.current = scale; }, [scale]);
  const lampsRef = useRef(lamps); useEffect(()=>{ lampsRef.current = lamps; }, [lamps]);

  // LED strips: relative points and on state
  const [strips, setStrips] = useState<Array<LEDStripModel>>([]);
  // Heating pipes: relative points and on state  
  const [heatingPipes, setHeatingPipes] = useState<Array<HeatingPipeModel>>([]);
  // Temperature icons: relative coordinates 0..1
  const [temperatureIcons, setTemperatureIcons] = useState<Array<TemperatureIconModel>>([]);
  // Heat pumps: relative coordinates 0..1  
  const [heatPumps, setHeatPumps] = useState<Array<HeatPumpModel>>([]);
  // Compressors: relative coordinates 0..1
  const [compressors, setCompressors] = useState<Array<CompressorModel>>([]);
  // Wall Lights: relative coordinates 0..1
  const [wallLights, setWallLights] = useState<Array<WallLightModel>>([]);
  // Fans: relative coordinates 0..1
  const [fans, setFans] = useState<Array<FanModel>>([]);
  
  // HeatPump Compressors: relative coordinates 0..1  
  const [heatpumpCompressors, setHeatpumpCompressors] = useState<Array<HeatPumpCompressorModel>>([]);

  // HeatPump Indoor Units: relative coordinates 0..1  
  const [heatpumpIndoorUnits, setHeatpumpIndoorUnits] = useState<Array<HeatPumpIndoorUnitModel>>([
    // Removed default item - can be added via admin toolbar
  ]);

  // Setter functions reserved for future admin functionality
  setCompressors; setFans; // Referenced to avoid lint warnings
  const [selectedStripId, setSelectedStripId] = useState<string|null>(null);
  const [snap90, setSnap90] = useState<boolean>(true);
  
  // Relay status from statusUpdate
  const [relayStatus, setRelayStatus] = useState<{relay: number; stat: number}[]>([]);
  
  // Relay ID assignment dialog state
  const [showRelayDialog, setShowRelayDialog] = useState<{itemId: string; itemType: 'lamp' | 'strip'; currentRelayId?: number} | null>(null);
  
  // Temperature icon editing dialog state
  const [editingTemperatureIcon, setEditingTemperatureIcon] = useState<{iconId: string; roomId: string; roomName: string} | null>(null);
  
  // Use socket hook
  useAppSocket({
    useStatusAsInitial: true
  });

  // Use layout persistence hook  
  const { commitChange, undo, redo, canUndo, canRedo, loadFromStorage } = useLayoutPersistence(
    lamps, strips, heatingPipes, temperatureIcons, heatPumps, compressors, fans, heatpumpCompressors, heatpumpIndoorUnits, wallLights,
    setLamps, setStrips, setHeatingPipes, setTemperatureIcons, setHeatPumps, setCompressors, setFans, setHeatpumpCompressors, setHeatpumpIndoorUnits, setWallLights
  );

  // Use localStorage sync hook for server backup (moved up above useEffect)
  // const { loadFromServer, saveToServer } = useLocalStorageSync();

  // Use drawing logic hook
  const {
    drawing,
    startDrawing,
    addPointToStrip,
    finishDrawing,
    cancelDrawing,
    shortenStrip
  } = useDrawingLogic(
    selectedTool,
    setStrips,
    setHeatingPipes,
    imgSize,
    scale,
    translate,
    commitChange
  );

  // Direction chooser overlay
  const [directionMenu, setDirectionMenu] = useState<null | { stripId:string; end:'start'|'end'; anchor:{x:number;y:number} }>(null);
  // Drag entire strip or heating pipe
  const stripDragRef = useRef<{ stripId:string; startClientX:number; startClientY:number; origPoints:{x:number;y:number;}[] }|null>(null);
  // Extend operation step (relative units)
  const stripExtendStep = 0.06; // ~6% of image dimension
  
  // Load persisted layout on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);
  
  // Fetch relay information from database
  const fetchRelayInfo = useCallback(async () => {
    try {
      const socket = getSocket();
      if (!socket || !socket.connected) {
        if (socketLogging) {
          console.log('[Socket] not connected yet, retrying in 1 second...');
        }
        setTimeout(fetchRelayInfo, 1000);
        return;
      }
      
      const requestData = {
        id: "sqlQuery",
        query: "SELECT * FROM relaysinf;", 
        db: "ifserver"  // Use the main database
      };      
      
      // Using sendDataQuery to match the old pattern
      await sendDataQuery({ 
        queryType: 'sqlQuery', 
        params: requestData 
      });      
      
    } catch (error) {
      console.error('Failed to fetch relay info:', error);
    }
  }, []);
  
  // Load persisted layout - removed automatic loading as it conflicts with server sync
  // useEffect(() => {
  //   loadFromStorage();
  // }, [loadFromStorage]);
  // Undo / Redo / Delete + drawing finalize shortcuts
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') { // undo
        e.preventDefault();
        undo();
      } else if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { // redo
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' && selectedStripId && !drawing.active) {
        commitChange(()=> {
          if (selectedStripId.startsWith('H')) {
            setHeatingPipes(prev=> prev.filter(p=> p.id!==selectedStripId));
          } else {
            setStrips(prev=> prev.filter(s=> s.id!==selectedStripId));
          }
        });
        setSelectedStripId(null);
      } else if(e.key === 'Enter' && drawing.active) {
        // Finish drawing: only keep if at least 2 points
        commitChange(() => {
          if (drawing.stripId?.startsWith('H')) {
            setHeatingPipes(prev => prev.map(p => {
              if(p.id !== drawing.stripId) return p;
              if(p.points.length < 2) return { ...p, points: [] };
              return p;
            }));
            setHeatingPipes(prev => prev.filter(p => !(p.id === drawing.stripId && p.points.length === 0)));
          } else {
            setStrips(prev => prev.map(s => {
              if(s.id !== drawing.stripId) return s;
              if(s.points.length < 2) return { ...s, points: [] };
              return s;
            }));
            setStrips(prev => prev.filter(s => !(s.id === drawing.stripId && s.points.length === 0)));
          }
        });
        if (drawing.stripId) finishDrawing(drawing.stripId);
      } else if(e.key === 'Escape' && drawing.active) {
        // Cancel drawing completely
        if (drawing.stripId) cancelDrawing(drawing.stripId);
        if(selectedStripId === drawing.stripId) setSelectedStripId(null);
      }
    };
    window.addEventListener('keydown', key);
    return ()=> window.removeEventListener('keydown', key);
  }, [undo, redo, selectedStripId, commitChange, drawing, cancelDrawing, finishDrawing]);

  // Keyboard toggle for admin mode
  useEffect(() => {
    const key = (e:KeyboardEvent) => {
      if (e.key.toLowerCase() === 'a' && !e.metaKey && !e.ctrlKey) {
        setAdmin(a => !a);
        if (adminLogging) {
          console.log('[Admin] mode toggled ->', !admin);
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [admin]);

  // Handle admin mode changes - save to server when exiting admin mode
  useEffect(() => {
    if (adminLogging) {
      console.log('[Admin] Admin mode changed:', admin, 'isInitialMount:', isInitialMount.current);
    }
    
    // Skip ALL logic on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (adminLogging) {
        console.log('[Admin] Skipping ALL admin logic on initial mount');
      }
      return;
    }
    
    // DISABLED TEMPORARILY - When exiting admin mode (admin becomes false), save current state to server
    /*
    if (!admin) {
      if (cloudSyncLogging) {
        console.log('[CloudSync] Exiting admin mode, saving changes to server...');
      }
      
      // Save immediately, no timeout bullshit
      saveToServer().then(success => {
        if (cloudSyncLogging) {
          console.log('[CloudSync] Admin mode exit save result:', success);
        }
      }).catch(error => {
        console.error('[CloudSync] Failed to save changes when exiting admin mode:', error);
      });
    }
    */
  }, [admin, saveToServer, adminLogging, cloudSyncLogging]);

  // Initialize and fetch relay info on component mount
  useEffect(() => {
    fetchRelayInfo();
  }, [fetchRelayInfo]);

  // Auto-load layout from server continuously (unless admin mode is active)
  useEffect(() => {
    // Run initial load immediately
    const initialLoad = async () => {
      if (admin) {
        if (cloudSyncLogging) {
          console.log('[CloudSync] SKIPPING initial load - admin mode active');
        }
        return;
      }

      // Odota että socket on yhdistetty ennen localStorage synciä
      const socket = getSocket();
      if (!socket || !socket.connected) {
        if (cloudSyncLogging) {
          console.log('[CloudSync] Socket not connected, delaying initial load...');
        }
        setTimeout(initialLoad, 1000); // Kokeile uudelleen 1 sekunnin kuluttua
        return;
      }

      if (cloudSyncLogging) {
        console.log('[CloudSync] Socket connected, starting initial auto-load from server...');
      }
      
      try {
        const success = await loadFromServer();
        if (cloudSyncLogging) {
          console.log('[CloudSync] FORCED initial auto-load result:', success);
        }
        
        if (success) {
          // Reload from localStorage after successful server load
          setTimeout(() => {
            loadFromStorage();
          }, 100);
        }
      } catch (error) {
        console.error('[CloudSync] FORCED initial auto-load failed:', error);
      }
    };

    // Wait a bit for socket to be ready, then FORCE load
    setTimeout(initialLoad, 1000);

    const autoLoadInterval = setInterval(async () => {
      if (admin) {
        if (cloudSyncLogging) {
          console.log('[CloudSync] Skipping interval auto-load - admin mode active');
        }
        return;
      }

      if (cloudSyncLogging) {
        console.log('[CloudSync] Interval auto-loading from server...');
      }
      
      try {
        const success = await loadFromServer();
        if (cloudSyncLogging) {
          console.log('[CloudSync] Interval auto-load result:', success);
        }
        
        if (success) {
          // Reload from localStorage after successful server load
          setTimeout(() => {
            loadFromStorage();
          }, 100);
        }
      } catch (error) {
        console.error('[CloudSync] Interval auto-load failed:', error);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(autoLoadInterval);
  }, [admin, loadFromServer, loadFromStorage, cloudSyncLogging]);

  // Listen for openStatusModal event from Navbar (mobile)
  useEffect(() => {
    const handleOpenStatusModal = () => {
      setShowStatusModal(true);
    };

    window.addEventListener('openStatusModal', handleOpenStatusModal);
    return () => window.removeEventListener('openStatusModal', handleOpenStatusModal);
  }, []);

  // Listen for statusUpdate messages to get relay states
  useEffect(() => {
        
    interface RelayStatus {
      relays: { relay: number; stat: number }[];
    }
    const unsubscribe = onUpdateStatusChange((status: RelayStatus) => {
      
      // Parse status data for StatusModal
      const parsedStatusData = parseStatusData(status);
      setStatusData(parsedStatusData);
            
      if (status?.relays) {
        
        setRelayStatus(status.relays);        
       
        // Update lamp states based on relay status
        setLamps(prev => prev.map(lamp => {
          if (!lamp.relayId) return lamp;
          const relay = status.relays.find((r: { relay: number; stat: number }) => r.relay === lamp.relayId);
          if (relay) {
            if (relayLogging) {
              console.log(`[Relay] Lamppu ${lamp.id} (rele ${lamp.relayId}) tila: ${relay.stat === 1 ? 'ON' : 'OFF'}`);
            }
            return { ...lamp, on: relay.stat === 1 };
          }
          return lamp;
        }));

        // Update strip states based on relay status
        setStrips(prev => prev.map(strip => {
          if (!strip.relayId) return strip;
          const relay = status.relays.find((r: { relay: number; stat: number }) => r.relay === strip.relayId);
          if (relay) {
            if (relayLogging) {
              console.log(`[Relay] Strip ${strip.id} (rele ${strip.relayId}) tila: ${relay.stat === 1 ? 'ON' : 'OFF'}`);
            }
            return { ...strip, on: relay.stat === 1 };
          }
          return strip;
        }));

        // Update heating pipe states based on relay status  
        setHeatingPipes(prev => prev.map(pipe => {
          if (!pipe.relayId) return pipe;
          const relay = status.relays.find((r: { relay: number; stat: number }) => r.relay === pipe.relayId);
          if (relay) {
            if (relayLogging) {
              console.log(`[Relay] Lämmitysputki ${pipe.id} (rele ${pipe.relayId}) tila: ${relay.stat === 1 ? 'ON' : 'OFF'}`);
            }
            return { ...pipe, on: relay.stat === 1 };
          }
          return pipe;
        }));
      } else {
        if (relayLogging) {
          console.log('[Relay] StatusUpdate ei sisältänyt relays dataa');
        }
      }
    });
    
    // Hae alkutila heti
    const currentRelays = getAllRelayStatus();
    if (currentRelays.length > 0) {
      if (relayLogging) {
        console.log('[Relay] Haetaan alkutila: ', currentRelays);
      }
      setRelayStatus(currentRelays);
    }
    
    return () => {
      if (statusUpdateLogging) {
        console.log('[StatusUpdate] Poistetaan globaali statusUpdate kuuntelija');
      }
      unsubscribe();
    };
  }, [parseStatusData]);

  // Handle relay control (based on old Lighting.js)
  const handleToggleRelay = useCallback(async (relayId: number, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      const command = {
        id: "relays",
        function: "setRelay",
        relay: relayId.toString(),
        stat: newStatus.toString(),
        token: localStorage.getItem('authToken') // Add auth token
      };
      
      if (relayLogging) {
        console.log('=== RELE KOMENTO LÄHTEE ===');
        console.log('Rele ID:', relayId);
        console.log('Nykyinen tila:', currentStatus === 1 ? 'ON' : 'OFF');
        console.log('Uusi tila:', newStatus === 1 ? 'ON' : 'OFF');
        console.log('Control komento objekti:', JSON.stringify(command, null, 2));
      }
      
      // Use direct socket emit to 'control' event
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('control', command);
        if (relayLogging) {
          console.log('✅ Rele komento lähetetty socket.emit("control")');
        }
      } else {
        console.error('❌ Socket ei ole yhdistetty');
        throw new Error('Socket not connected');
      }
      
    } catch (error) {
      console.error('VIRHE: Rele komennon lähetyksessä:', error);
    }
  }, []);

  // Helper function to get relay status for a lamp
  const getRelayStatus = useCallback((relayId?: number) => {
    if (!relayId) return 0;
    const relay = relayStatus.find(r => r.relay === relayId);
    return relay ? relay.stat : 0;
  }, [relayStatus]);

  // Handle lamp click - in admin mode show relay assignment, in normal mode toggle relay
  const handleLampClick = useCallback((lamp: Lamp) => {
    if (relayLogging) {
      console.log('[Relay] Lamppu klikattu:', lamp.id, 'Admin mode:', admin, 'Relay ID:', lamp.relayId);
    }
    
    if (admin) {
      // In admin mode, show relay ID assignment dialog
      if (relayLogging) {
        console.log('[Relay] Avaa rele ID valinta lampulle', lamp.id);
      }
      setShowRelayDialog({
        itemId: lamp.id,
        itemType: 'lamp',
        currentRelayId: lamp.relayId
      });
    } else if (lamp.relayId !== undefined) {
      // In normal mode, toggle the relay if assigned
      const currentStatus = getRelayStatus(lamp.relayId);
      if (relayLogging) {
        console.log('[Relay] Toggle rele', lamp.relayId, 'nykyinen tila:', currentStatus);
      }
      handleToggleRelay(lamp.relayId, currentStatus);
    } else {
      if (relayLogging) {
        console.log('[Relay] Lampulla', lamp.id, 'ei ole rele ID:tä asetettu');
      }
    }
  }, [admin, getRelayStatus, handleToggleRelay]);

  // Handle relay ID assignment
  const handleAssignRelayId = useCallback((itemId: string, itemType: 'lamp' | 'strip', relayId: number | null) => {
    if (relayLogging) {
      console.log('[Relay] Aseta rele ID:', itemType, itemId, '->', relayId);
    }
    commitChange(() => {
      if (itemType === 'lamp') {
        // Check if it's a wallLight first (ID starts with 'W')
        if (itemId.startsWith('W')) {
          setWallLights(prev => prev.map(wallLight => 
            wallLight.id === itemId 
              ? { ...wallLight, relayId: relayId || undefined }
              : wallLight
          ));
        } else {
          setLamps(prev => prev.map(lamp => 
            lamp.id === itemId 
              ? { ...lamp, relayId: relayId || undefined }
              : lamp
          ));
        }
      } else if (itemType === 'strip') {
        // Handle both strips and heating pipes with 'strip' type for now
        const isHeatingPipe = itemId.startsWith('H');
        if (isHeatingPipe) {
          setHeatingPipes(prev => prev.map(pipe => 
            pipe.id === itemId 
              ? { ...pipe, relayId: relayId || undefined }
              : pipe
          ));
        } else {
          setStrips(prev => prev.map(strip => 
            strip.id === itemId 
              ? { ...strip, relayId: relayId || undefined }
              : strip
          ));
        }
      }
    });
    setShowRelayDialog(null);
    if (relayLogging) {
      console.log('[Relay] Rele ID asetettu', itemType, itemId);
    }
  }, [commitChange]);

  // Handle temperature icon editing
  const handleUpdateTemperatureIcon = useCallback((iconId: string, roomId: string, roomName: string) => {
    commitChange(() => {
      setTemperatureIcons(prev => prev.map(icon => 
        icon.id === iconId 
          ? { ...icon, roomId, roomName }
          : icon
      ));
    });
    setEditingTemperatureIcon(null);
    if (adminLogging) {
      console.log('[Admin] Lämpötilaikon tiedot päivitetty:', iconId, roomId, roomName);
    }
  }, [commitChange]);

  // Global pointer move/up for lamp dragging
  useEffect(() => {
    const move = (e:PointerEvent) => {
      if (!dragRef.current || !imgSize) return;
      const sc = scaleRef.current;
      const dxWorld = (e.clientX - dragRef.current.startClientX) / sc;
      const dyWorld = (e.clientY - dragRef.current.startClientY) / sc;
      const origXPx = dragRef.current.origX * imgSize.w;
      const origYPx = dragRef.current.origY * imgSize.h;
      const newXPx = origXPx + dxWorld;
      const newYPx = origYPx + dyWorld;
      const newX = Math.min(1, Math.max(0, newXPx / imgSize.w));
      const newY = Math.min(1, Math.max(0, newYPx / imgSize.h));
      if (Math.abs(dxWorld) > 2 || Math.abs(dyWorld) > 2) dragRef.current.moved = true;
      
      if (dragRef.current.type === 'lamp') {
        setLamps(prev => prev.map(l => l.id === dragRef.current!.id ? { ...l, x: newX, y: newY } : l)); // live move (not committing each pixel)
      } else if (dragRef.current.type === 'temperature') {
        setTemperatureIcons(prev => prev.map(t => t.id === dragRef.current!.id ? { ...t, x: newX, y: newY } : t)); // live move (not committing each pixel)
      } else if (dragRef.current.type === 'heatpump') {
        setHeatPumps(prev => prev.map(h => h.id === dragRef.current!.id ? { ...h, x: newX, y: newY } : h)); // live move (not committing each pixel)
      } else if (dragRef.current.type === 'compressor') {
        setCompressors(prev => prev.map(c => c.id === dragRef.current!.id ? { ...c, x: newX, y: newY } : c)); // live move (not committing each pixel)
      } else if (dragRef.current.type === 'fan') {
        setFans(prev => prev.map(f => f.id === dragRef.current!.id ? { ...f, x: newX, y: newY } : f)); // live move (not committing each pixel)
      } else if (dragRef.current.type === 'heatpumpCompressor') {
        setHeatpumpCompressors(prev => prev.map(hp => hp.id === dragRef.current!.id ? { ...hp, x: newX, y: newY } : hp)); // live move (not committing each pixel)
      } else if (dragRef.current.type === 'heatpumpIndoorUnit') {
        setHeatpumpIndoorUnits(prev => prev.map(unit => unit.id === dragRef.current!.id ? { ...unit, x: newX, y: newY } : unit)); // live move (not committing each pixel)
      } else if (dragRef.current.type === 'wallLight') {
        setWallLights(prev => prev.map(light => light.id === dragRef.current!.id ? { ...light, x: newX, y: newY } : light)); // live move (not committing each pixel)
      }
    };
    const up = () => {
      if (dragRef.current) {
        const dragged = dragRef.current;
        if (dragLogging) {
          console.log('[Drag] end', dragged.id, 'moved=', dragged.moved);
        }
        if(dragged.moved) {
          // Commit final position to undo/persist
          if (dragged.type === 'lamp') {
            commitChange(()=> setLamps(prev=> prev)); // positions already updated live
          } else if (dragged.type === 'temperature') {
            commitChange(()=> setTemperatureIcons(prev=> prev)); // positions already updated live
          } else if (dragged.type === 'heatpump') {
            commitChange(()=> setHeatPumps(prev=> prev)); // positions already updated live
          } else if (dragged.type === 'compressor') {
            commitChange(()=> setCompressors(prev=> prev)); // positions already updated live
          } else if (dragged.type === 'fan') {
            commitChange(()=> setFans(prev=> prev)); // positions already updated live
          } else if (dragged.type === 'heatpumpCompressor') {
            commitChange(()=> setHeatpumpCompressors(prev=> prev)); // positions already updated live
          } else if (dragged.type === 'heatpumpIndoorUnit') {
            commitChange(()=> setHeatpumpIndoorUnits(prev=> prev)); // positions already updated live
          } else if (dragged.type === 'wallLight') {
            commitChange(()=> setWallLights(prev=> prev)); // positions already updated live
          }
        }
      }
      dragRef.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [imgSize, commitChange]);

    // Helper functions
  const saveToCloud = useCallback(async () => {
    if (cloudSyncLogging) {
      console.log('[CloudSync] Save to cloud triggered');
    }
    try {
      const success = await saveToServer();
      if (success) {
        if (cloudSyncLogging) {
          console.log('[CloudSync] Successfully saved layout to cloud');
        }
        alert('Layout saved to cloud!');
      } else {
        if (cloudSyncLogging) {
          console.log('[CloudSync] Failed to save layout to cloud');
        }
        alert('Failed to save layout to cloud');
      }
    } catch (error) {
      console.error('[CloudSync] Error saving to cloud:', error);
      alert('Error saving to cloud: ' + error);
    }
  }, [saveToServer]);

  const loadFromCloud = useCallback(async () => {
    if (cloudSyncLogging) {
      console.log('[CloudSync] Load from cloud triggered');
    }
    try {
      if (cloudSyncLogging) {
        console.log('[CloudSync] Calling loadFromServer...');
      }
      const success = await loadFromServer();
      if (cloudSyncLogging) {
        console.log('[CloudSync] loadFromServer returned:', success);
      }
      if (success) {
        if (cloudSyncLogging) {
          console.log('[CloudSync] Successfully loaded layout from cloud, reloading...');
        }
        // Small delay to ensure localStorage is written
        setTimeout(() => {
          if (cloudSyncLogging) {
            console.log('[CloudSync] Calling loadFromStorage to reload components...');
          }
          loadFromStorage();
          if (cloudSyncLogging) {
            console.log('[CloudSync] loadFromStorage called, should reload components now');
          }
          alert('Layout loaded from cloud!');
        }, 100);
      } else {
        if (cloudSyncLogging) {
          console.log('[CloudSync] No layout found in cloud or failed to load');
        }
        alert('No layout found in cloud');
      }
    } catch (error) {
      console.error('[CloudSync] Error loading from cloud:', error);
      alert('Error loading from cloud: ' + error);
    }
  }, [loadFromServer, loadFromStorage, cloudSyncLogging]);

  const handleDelete = useCallback(() => {
    if (selectedStripId && !drawing.active) {
      commitChange(() => {
        if (selectedStripId.startsWith('H')) {
          setHeatingPipes(prev => prev.filter(p => p.id !== selectedStripId));
        } else {
          setStrips(prev => prev.filter(s => s.id !== selectedStripId));
        }
      });
      setSelectedStripId(null);
    }
  }, [selectedStripId, drawing.active, commitChange]);

  // Wrapper for startDrawing that clears selection first
  const handleStartDrawing = useCallback(() => {
    setSelectedStripId(null); // Clear any previous selection
    return startDrawing();
  }, [startDrawing]);

  // Wrapper for tool change that clears selection
  const handleToolChange = useCallback((tool: ToolType) => {
    setSelectedStripId(null); // Clear selection when changing tools
    setSelectedTool(tool);
  }, []);

  // Resize observer for container
  useEffect(() => {
    const el = containerRef.current; if(!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect; setContainerSize({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [setContainerSize]);

  // LED strip dragging whole strip (admin mode)
  useEffect(()=>{
    if(!admin) return;
    const move = (e:PointerEvent) => {
      if(!stripDragRef.current || !imgSize) return;
      const sc = scaleRef.current;
      const dxRel = (e.clientX - stripDragRef.current.startClientX)/ (imgSize.w * sc);
      const dyRel = (e.clientY - stripDragRef.current.startClientY)/ (imgSize.h * sc);
      
      const isHeatingPipe = stripDragRef.current.stripId.startsWith('H');
      
      if (isHeatingPipe) {
        setHeatingPipes(prev => prev.map(p => p.id === stripDragRef.current!.stripId ? {
          ...p,
          points: stripDragRef.current!.origPoints.map(pt => ({
            x: Math.min(1, Math.max(0, pt.x + dxRel)),
            y: Math.min(1, Math.max(0, pt.y + dyRel))
          }))
        } : p));
      } else {
        setStrips(prev => prev.map(s => s.id === stripDragRef.current!.stripId ? {
          ...s,
          points: stripDragRef.current!.origPoints.map(p => ({
            x: Math.min(1, Math.max(0, p.x + dxRel)),
            y: Math.min(1, Math.max(0, p.y + dyRel))
          }))
        } : s));
      }
    };
    const up = () => { 
      if(stripDragRef.current) {
        const isHeatingPipe = stripDragRef.current.stripId.startsWith('H');
        if (isHeatingPipe) {
          commitChange(()=> setHeatingPipes(prev=> prev)); // commit final positions
        } else {
          commitChange(()=> setStrips(prev=> prev)); // commit final positions
        }
      }
      stripDragRef.current = null; 
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [admin, imgSize, commitChange]);

  const extendStrip = (stripId:string, _end:'start'|'end', direction:'up'|'down'|'left'|'right') => {
    // Always append to end; deduplicate if no movement (e.g. clamped at boundary or zero delta).
    const EPS = 0.0002; // minimal movement threshold in relative units
    commitChange(()=> setStrips(prev => prev.map(s => {
      if(s.id !== stripId) return s;
      if(s.points.length === 0) return s;
      const pts = [...s.points];
      const base = pts[pts.length-1];
      let dx=0, dy=0;
      if(direction==='right') dx = stripExtendStep; else if(direction==='left') dx = -stripExtendStep; else if(direction==='down') dy = stripExtendStep; else if(direction==='up') dy = -stripExtendStep;
      if(snap90) { if(Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      let newX = Math.min(1, Math.max(0, base.x + dx));
      let newY = Math.min(1, Math.max(0, base.y + dy));
      // Round to reduce floating drift
      newX = parseFloat(newX.toFixed(4));
      newY = parseFloat(newY.toFixed(4));
      const dist = Math.hypot(newX - base.x, newY - base.y);
      if(dist < EPS) {
        // No effective movement -> do not create duplicate / overlapping point
        return s;
      }
      // Avoid accidental overlap with previous corner point (if three last collinear and very short segment)
      if(pts.length >= 2) {
        const prev = pts[pts.length-2];
        const prevDist = Math.hypot(newX - prev.x, newY - prev.y);
        if(prevDist < EPS) return s; // would overlap previous as well
      }
      pts.push({ x:newX, y:newY });
      return { ...s, points: pts };
    })));
  };

  const getCursorClass = () => {
    if (panning) return 'cursor-grabbing';
    if (drawing.active || (admin && selectedTool !== 'strip' && selectedTool !== 'heating')) return 'cursor-crosshair';
    return 'cursor-grab';
  };

  return (
    <>
      <div className="floorplan-page">
        {/* Status bar desktop */}
        <StatusBar 
          statusData={statusData}
          onShowDetails={() => setShowStatusModal(true)}
        />

        {/* Status modal - sama sekä mobile että desktop */}
        <StatusModal 
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          statusData={statusData}
        />

        <div 
    ref={containerRef} 
    className="floorplan-outer"
    style={{ touchAction: admin ? 'none' : 'pan-x pan-y pinch-zoom' }}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
    onWheel={handleWheel}
  >
        <div className={`floorplan-inner ${getCursorClass()}`} style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})` }}>
          <div style={{ width: imgSize?.w ?? 1200, height: imgSize?.h ?? 800, position:'relative' }}>
            <img
              src="/img/pohjakuva.svg"
              alt="Pohjakuva"
              className="floorplan-img"
              draggable={false}
              onLoad={e=>{
                const t = e.currentTarget; const naturalW = (t.naturalWidth)||1200; const naturalH = (t.naturalHeight)||800; setImgSize({ w:naturalW, h:naturalH });
              }}
            />
            {!hideLamps && lamps.map(l => {
              const left = (imgSize ? imgSize.w * l.x : 1200 * l.x);
              const top = (imgSize ? imgSize.h * l.y : 800 * l.y);
              return (
                <div
                  key={l.id}
                  style={{ position:'absolute', left, top, transform:'translate(-50%,-50%)', cursor: admin ? 'move' : undefined, zIndex:2 }}
                  onPointerDown={(e) => {
                    if (!admin) {
                      // In normal mode, handle lamp click for relay control
                      handleLampClick(l);
                      return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    dragRef.current = { id: l.id, startClientX: e.clientX, startClientY: e.clientY, origX: l.x, origY: l.y, moved: false, type: 'lamp' };
                  }}
                  onClick={(e)=> {
                    // In admin mode, only suppress clicks if we're dragging
                    if (admin && dragRef.current && dragRef.current.moved) {
                      e.stopPropagation();
                      return;
                    }
                    // In admin mode, handle relay assignment
                    if (admin) {
                      handleLampClick(l);
                    }
                  }}
                  onContextMenu={(e)=> {
                    if (!admin) return;
                    e.preventDefault();
                    e.stopPropagation();
                    // Delete lamp with right click
                    commitChange(() => setLamps(prev => prev.filter(lamp => lamp.id !== l.id)));
                  }}
                >
                  {l.kind === 'lamp' && (
                    <Lamp
                      size={30}
                      on={l.relayId !== undefined ? getRelayStatus(l.relayId) === 1 : l.on}
                      onChange={undefined}
                      title={`Lamppu ${l.id}${l.relayId ? ` (rele ${l.relayId})` : ' (ei releä)'}${admin ? ' (siirrettävä)' : ''}`}
                    />
                  )}
                  {l.kind === 'mirror' && (
                    <MirrorLight
                      length={50}
                      on={l.relayId !== undefined ? getRelayStatus(l.relayId) === 1 : l.on}
                      onChange={undefined}
                      title={`Peilivalo ${l.id}${l.relayId ? ` (rele ${l.relayId})` : ' (ei releä)'}${admin ? ' (siirrettävä)' : ''}`}
                    />
                  )}
                  {l.kind === 'spot' && (
                    <SpotLight
                      size={24}
                      on={l.relayId !== undefined ? getRelayStatus(l.relayId) === 1 : l.on}
                      onChange={undefined}
                      title={`Spottivalo ${l.id}${l.relayId ? ` (rele ${l.relayId})` : ' (ei releä)'}${admin ? ' (siirrettävä)' : ''}`}
                    />
                  )}
                  {admin && <div className="lamp-admin-label">
                    {l.id}{l.relayId ? ` (R${l.relayId})` : ' (ei releä)'}
                  </div>}
                </div>
              );
            })}
            {!hideTemperatureIcons && temperatureIcons.map(icon => {
              const left = (imgSize ? imgSize.w * icon.x : 1200 * icon.x);
              const top = (imgSize ? imgSize.h * icon.y : 800 * icon.y);
              return (
                <div
                  key={icon.id}
                  style={{ position:'absolute', left, top, transform:'translate(-50%,-50%)', cursor: admin ? 'move' : 'pointer', zIndex:2 }}
                  onPointerDown={(e) => {
                    if (!admin) {
                      // In normal mode, don't prevent default or stop propagation
                      // Let TemperatureIcon handle touch/click events normally
                      return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    dragRef.current = { id: icon.id, startClientX: e.clientX, startClientY: e.clientY, origX: icon.x, origY: icon.y, moved: false, type: 'temperature' };
                  }}
                  onClick={(e)=> {
                    // In admin mode, only suppress clicks if we're dragging
                    if (admin && dragRef.current && dragRef.current.moved) {
                      e.stopPropagation();
                      return;
                    }
                    // In normal mode, don't prevent event bubbling - let TemperatureIcon handle the click
                    if (!admin) {
                      // Do nothing - let the TemperatureIcon component handle its own onClick
                      return;
                    }
                  }}
                  onContextMenu={(e)=> {
                    if (!admin) return;
                    e.preventDefault();
                    e.stopPropagation();
                    // Delete temperature icon with right click
                    commitChange(() => setTemperatureIcons(prev => prev.filter(t => t.id !== icon.id)));
                  }}
                >
                  <TemperatureIcon 
                    roomId={icon.roomId}
                    roomName={icon.roomName || 'Huone'}
                    authenticated={authenticated}
                  />
                  {admin && <div 
                    className="lamp-admin-label" 
                    style={{ cursor: 'pointer', backgroundColor: 'rgba(0,0,0,0.8)', padding: '2px 4px', borderRadius: '3px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTemperatureIcon({
                        iconId: icon.id,
                        roomId: icon.roomId,
                        roomName: icon.roomName || 'Huone'
                      });
                    }}
                    title="Klikkaa muokataksesi huoneen tietoja"
                  >
                    {icon.id} - {icon.roomName || icon.roomId}
                  </div>}
                </div>
              );
            })}
            {!hideHeatPumps && heatPumps.map(pump => {
              const left = (imgSize ? imgSize.w * pump.x : 1200 * pump.x);
              const top = (imgSize ? imgSize.h * pump.y : 800 * pump.y);
              return (
                <div
                  key={pump.id}
                  style={{ position:'absolute', left, top, transform:'translate(-50%,-50%)', cursor: admin ? 'move' : 'default', zIndex:2 }}
                  onPointerDown={(e) => {
                    if (!admin) return;
                    e.preventDefault();
                    e.stopPropagation();
                    dragRef.current = { id: pump.id, startClientX: e.clientX, startClientY: e.clientY, origX: pump.x, origY: pump.y, moved: false, type: 'heatpump' };
                  }}
                  onClick={(e)=> {
                    // In admin mode, suppress clicks if we're dragging
                    if (admin && dragRef.current && dragRef.current.moved) {
                      e.stopPropagation();
                    }
                  }}
                  onContextMenu={(e)=> {
                    if (!admin) return;
                    e.preventDefault();
                    e.stopPropagation();
                    // Delete heat pump with right click
                    commitChange(() => setHeatPumps(prev => prev.filter(h => h.id !== pump.id)));
                  }}
                >
                  <HeatPump 
                    size={80}
                    title={pump.label || 'Lämpöpumppu'}
                  />
                  {admin && <div className="lamp-admin-label">
                    {pump.id} - {pump.label || 'Lämpöpumppu'}
                  </div>}
                </div>
              );
            })}
            
            {/* Air Conditioning Components */}
            {!hideHeatPumps && compressors.map(compressor => {
              const left = (imgSize ? imgSize.w * compressor.x : 1200 * compressor.x);
              const top = (imgSize ? imgSize.h * compressor.y : 800 * compressor.y);
              return (
                <div
                  key={compressor.id}
                  style={{ position:'absolute', left, top, transform:'translate(-50%,-50%)', cursor: admin ? 'move' : 'default', zIndex:2 }}
                  onPointerDown={(e) => {
                    if (!admin) return;
                    e.preventDefault();
                    e.stopPropagation();
                    dragRef.current = { id: compressor.id, startClientX: e.clientX, startClientY: e.clientY, origX: compressor.x, origY: compressor.y, moved: false, type: 'compressor' };
                  }}
                  onClick={(e)=> {
                    // In admin mode, suppress clicks if we're dragging
                    if (admin && dragRef.current && dragRef.current.moved) {
                      e.stopPropagation();
                    }
                  }}
                  onContextMenu={(e) => {
                    if (!admin) return;
                    e.preventDefault();
                    e.stopPropagation();
                    commitChange(() => setCompressors(prev => prev.filter(c => c.id !== compressor.id)));
                  }}
                >
                  <CompressorNew 
                    size={35}
                    title={compressor.label || 'Kompressori'}
                    compressorId={compressor.compressorId}
                  />
                  {admin && <div className="lamp-admin-label" style={{fontSize: '9px'}}>
                    {compressor.id} - Kompressori
                  </div>}
                </div>
              );
            })}
            
            {!hideHeatPumps && fans.map(fan => {
              const left = (imgSize ? imgSize.w * fan.x : 1200 * fan.x);
              const top = (imgSize ? imgSize.h * fan.y : 800 * fan.y);
              return (
                <div
                  key={fan.id}
                  style={{ position:'absolute', left, top, transform:'translate(-50%,-50%)', cursor: admin ? 'move' : 'default', zIndex:2 }}
                  onPointerDown={(e) => {
                    if (!admin) return;
                    e.preventDefault();
                    e.stopPropagation();
                    dragRef.current = { id: fan.id, startClientX: e.clientX, startClientY: e.clientY, origX: fan.x, origY: fan.y, moved: false, type: 'fan' };
                  }}
                  onClick={(e)=> {
                    // In admin mode, suppress clicks if we're dragging
                    if (admin && dragRef.current && dragRef.current.moved) {
                      e.stopPropagation();
                    }
                  }}
                  onContextMenu={(e) => {
                    if (!admin) return;
                    e.preventDefault();
                    e.stopPropagation();
                    commitChange(() => setFans(prev => prev.filter(f => f.id !== fan.id)));
                  }}
                >
                  <FanIcon
                    size={35}
                    title={fan.label || 'Puhallin'}
                    fanId={fan.fanId}
                  />
                  {admin && <div className="lamp-admin-label" style={{fontSize: '9px'}}>
                    {fan.id} - {fan.fanType === 'outdoor' ? 'Ulkopuhallin' : 'Sisäpuhallin'}
                  </div>}
                </div>
              );
            })}
            
            {/* HeatPump Compressors */}
            {!hideHeatPumps && imgSize && heatpumpCompressors.map(hpCompressor => {
              const left = hpCompressor.x * imgSize!.w - 25; // Center the 50px wide component
              const top = hpCompressor.y * imgSize!.h - 18.75; // Center the 37.5px high component
              
              return (
                <div 
                  key={hpCompressor.id} 
                  style={{ 
                    position: 'absolute', 
                    left: `${left}px`, 
                    top: `${top}px`,
                    cursor: admin ? 'move' : 'default',
                    zIndex: 10
                  }}
                  onPointerDown={(e) => {
                    if (!admin) return;
                    e.preventDefault();
                    e.stopPropagation();
                    dragRef.current = { 
                      id: hpCompressor.id, 
                      startClientX: e.clientX, 
                      startClientY: e.clientY, 
                      origX: hpCompressor.x, 
                      origY: hpCompressor.y, 
                      moved: false, 
                      type: 'heatpumpCompressor' 
                    };
                  }}
                  onClick={(e) => {
                    if (admin && dragRef.current && dragRef.current.moved) {
                      e.stopPropagation();
                    }
                  }}
                  onContextMenu={(e) => {
                    if (!admin) return;
                    e.preventDefault();
                    e.stopPropagation();
                    commitChange(() => setHeatpumpCompressors(prev => prev.filter(hp => hp.id !== hpCompressor.id)));
                  }}
                >
                  <HeatPumpCompressor
                    size={50}
                    title={hpCompressor.label || 'Lämpöpumpun kompressori'}
                    compressorId={hpCompressor.compressorId}
                  />
                  {admin && <div className="lamp-admin-label" style={{fontSize: '9px'}}>
                    {hpCompressor.id} - {hpCompressor.label || 'LP Kompressori'}
                  </div>}
                </div>
              );
            })}
            
            {/* HeatPump Indoor Units */}
            {!hideHeatPumps && imgSize && heatpumpIndoorUnits.map(hpUnit => {
              const left = hpUnit.x * imgSize!.w - 30; // Center the 60px wide component
              const top = hpUnit.y * imgSize!.h - 30; // Center the 60px high component
              
              return (
                <div 
                  key={hpUnit.id} 
                  style={{ 
                    position: 'absolute', 
                    left: `${left}px`, 
                    top: `${top}px`,
                    cursor: admin ? 'move' : 'default',
                    zIndex: 10
                  }}
                  onPointerDown={(e) => {
                    if (!admin) return;
                    e.preventDefault();
                    e.stopPropagation();
                    dragRef.current = { 
                      id: hpUnit.id, 
                      startClientX: e.clientX, 
                      startClientY: e.clientY, 
                      origX: hpUnit.x, 
                      origY: hpUnit.y, 
                      moved: false, 
                      type: 'heatpumpIndoorUnit' 
                    };
                  }}
                  onClick={(e) => {
                    if (admin && dragRef.current && dragRef.current.moved) {
                      e.stopPropagation();
                    }
                  }}
                  onContextMenu={(e) => {
                    if (!admin) return;
                    e.preventDefault();
                    e.stopPropagation();
                    commitChange(() => setHeatpumpIndoorUnits(prev => prev.filter(unit => unit.id !== hpUnit.id)));
                  }}
                >
                  <HeatPumpIndoorUnit
                    size={60}
                    title={hpUnit.label || 'VILP Sisäyksikkö'}
                    unitId={hpUnit.unitId}
                  />
                  {admin && <div className="lamp-admin-label" style={{fontSize: '9px'}}>
                    {hpUnit.id} - {hpUnit.label || 'VILP Sisäyksikkö'}
                  </div>}
                </div>
              );
            })}
            
            {imgSize && (
              <svg width={imgSize.w} height={imgSize.h} style={{ position:'absolute', left:0, top:0, overflow:'visible', zIndex:1 }}
                onClick={(e)=> {
                  if(!admin) return;
                  e.stopPropagation();
                  
                  console.log('[Home] Home view click, selectedTool:', selectedTool, 'drawing.active:', drawing.active);
                  
                  if(drawing.active && drawing.stripId && (selectedTool === 'strip' || selectedTool === 'heating')) {
                    // Add point to strip/heating pipe when drawing
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      addPointToStrip(drawing.stripId, e.clientX, e.clientY, rect);
                    }
                  } else if((selectedTool !== 'strip' && selectedTool !== 'heating') && !drawing.active) {
                    console.log('[Home] Eligible for component creation, selectedTool:', selectedTool);
                    // Add new lamp/mirror/spot/temperature
                    const rect = containerRef.current?.getBoundingClientRect();
                    if(!rect || !imgSize) return;
                    
                    const relX = (e.clientX - rect.left - translate.x) / scale / imgSize.w;
                    const relY = (e.clientY - rect.top - translate.y) / scale / imgSize.h;
                    
                    if(relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
                      if(selectedTool === 'temperature') {
                        const id = 'T' + Math.floor(Date.now()%100000);
                        // Cycle through common rooms for new temperature icons
                        const commonRooms = [
                          { id: 'olohuone', name: 'Olohuone' },
                          { id: 'makuuhuone', name: 'Makuuhuone' },
                          { id: 'keittio', name: 'Keittiö' },
                          { id: 'kylpyhuone', name: 'Kylpyhuone' },
                          { id: 'tyohuone', name: 'Työhuone' },
                          { id: 'lastenhuone', name: 'Lastenhuone' }
                        ];
                        const roomIndex = temperatureIcons.length % commonRooms.length;
                        const selectedRoom = commonRooms[roomIndex];
                        
                        const newIcon: TemperatureIconModel = {
                          id,
                          x: parseFloat(relX.toFixed(4)),
                          y: parseFloat(relY.toFixed(4)),
                          roomId: selectedRoom.id,
                          roomName: selectedRoom.name
                        };
                        console.log('[Home] Luodaan uusi lämpötilaikoni:', newIcon);
                        commitChange(() => setTemperatureIcons(prev => [...prev, newIcon]));
                      } else if(selectedTool === 'heatpump') {
                        const id = 'HP' + Math.floor(Date.now()%100000);
                        const newHeatPump: HeatPumpModel = {
                          id,
                          x: parseFloat(relX.toFixed(4)),
                          y: parseFloat(relY.toFixed(4)),
                          label: 'Lämpöpumppu'
                        };
                        console.log('[Home] Luodaan uusi lämpöpumppu:', newHeatPump);
                        commitChange(() => setHeatPumps(prev => [...prev, newHeatPump]));
                      } else if(selectedTool === 'compressor') {
                        const id = 'COMP' + Math.floor(Date.now()%100000);
                        const newCompressor: CompressorModel = {
                          id,
                          x: parseFloat(relX.toFixed(4)),
                          y: parseFloat(relY.toFixed(4)),
                          label: 'Kompressori',
                          compressorId: 'livingroom' // Default, user can configure later
                        };
                        console.log('[Home] Luodaan uusi kompressori:', newCompressor);
                        commitChange(() => setCompressors(prev => [...prev, newCompressor]));
                      } else if(selectedTool === 'fan') {
                        const id = 'FAN' + Math.floor(Date.now()%100000);
                        const newFan: FanModel = {
                          id,
                          x: parseFloat(relX.toFixed(4)),
                          y: parseFloat(relY.toFixed(4)),
                          label: 'Puhallin',
                          fanId: 'livingroom', // Default, user can configure later
                          fanType: 'indoor' // Default to indoor fan
                        };
                        console.log('[Home] Luodaan uusi puhallin:', newFan);
                        commitChange(() => setFans(prev => [...prev, newFan]));
                      } else if(selectedTool === 'heatpump-compressor') {
                        const id = 'HPCOMP' + Math.floor(Date.now()%100000);
                        const newHeatPumpCompressor: HeatPumpCompressorModel = {
                          id,
                          x: parseFloat(relX.toFixed(4)),
                          y: parseFloat(relY.toFixed(4)),
                          label: 'LP Kompressori',
                          compressorId: 'outdoor1' // Default, user can configure later
                        };
                        console.log('[Home] Luodaan uusi lämpöpumpun kompressori:', newHeatPumpCompressor);
                        commitChange(() => setHeatpumpCompressors(prev => [...prev, newHeatPumpCompressor]));
                      } else if(selectedTool === 'heatpump-indoor-unit') {
                        const id = 'HPUNIT' + Math.floor(Date.now()%100000);
                        const newHeatPumpIndoorUnit: HeatPumpIndoorUnitModel = {
                          id,
                          x: parseFloat(relX.toFixed(4)),
                          y: parseFloat(relY.toFixed(4)),
                          label: 'VILP Sisäyksikkö',
                          unitId: 'indoor1' // Default, user can configure later
                        };
                        console.log('[Home] Luodaan uusi VILP sisäyksikkö:', newHeatPumpIndoorUnit);
                        commitChange(() => setHeatpumpIndoorUnits(prev => [...prev, newHeatPumpIndoorUnit]));
                      } else if(selectedTool === 'wallLight') {
                        const id = 'W' + Math.floor(Date.now()%100000);
                        const newWallLight: WallLightModel = {
                          id,
                          x: parseFloat(relX.toFixed(4)),
                          y: parseFloat(relY.toFixed(4)),
                          direction: 'up',
                          label: 'Seinävalo'
                        };
                        console.log('[Home] Luodaan uusi seinävalo:', newWallLight);
                        commitChange(() => setWallLights(prev => [...prev, newWallLight]));
                      } else {
                        const id = selectedTool.charAt(0).toUpperCase() + Math.floor(Date.now()%100000);
                        const newLamp: Lamp = {
                          id,
                          kind: selectedTool as 'lamp' | 'mirror' | 'spot',
                          x: parseFloat(relX.toFixed(4)),
                          y: parseFloat(relY.toFixed(4)),
                          on: false
                        };
                        console.log('[Home] Luodaan uusi lamppu:', newLamp);
                        commitChange(() => setLamps(prev => [...prev, newLamp]));
                      }
                    }
                  }
                }}
                onContextMenu={(e)=> {
                  if(!admin || !drawing.active) return;
                  e.preventDefault();
                  e.stopPropagation();
                  // Finish drawing: commit if >=2 points, otherwise remove
                  const target = strips.find(s=> s.id===drawing.stripId);
                  if(target && target.points.length >= 2) {
                    commitChange(()=> {}); // commit current state
                  } else {
                    setStrips(prev => prev.filter(s => s.id !== drawing.stripId));
                    setSelectedStripId(null);
                  }
                }}
              >
                {/* Heating pipes - rendered first to be in background */}
                {!hideHeatingPipes && heatingPipes.map(pipe => (
                  <HeatingPipe
                    key={pipe.id}
                    id={pipe.id}
                    points={pipe.points}
                    baseWidth={imgSize.w}
                    baseHeight={imgSize.h}
                    admin={admin}
                    on={pipe.relayId !== undefined ? getRelayStatus(pipe.relayId) === 1 : pipe.on}
                    onChange={(next)=> {
                      if (pipe.relayId !== undefined) {
                        // Jos pipellä on relayId, käytä rele kontrollia
                        const currentStatus = getRelayStatus(pipe.relayId);
                        handleToggleRelay(pipe.relayId, currentStatus);
                      } else {
                        // Muuten käytä vanhaa tapaa
                        commitChange(()=> setHeatingPipes(prev=> prev.map(p=> p.id===pipe.id ? { ...p, on: next } : p)));
                      }
                    }}
                    onToggle={()=>{
                      if (pipe.relayId !== undefined) {
                        const currentStatus = getRelayStatus(pipe.relayId);
                        handleToggleRelay(pipe.relayId, currentStatus);
                      } else {
                        commitChange(()=> setHeatingPipes(prev=> prev.map(p=> p.id===pipe.id ? { ...p, on: !p.on } : p)));
                      }
                    }}
                    onRootPointerDown={(e)=> {
                      if(!admin) return;
                      // Select this heating pipe  
                      setSelectedStripId(pipe.id);
                      // Add heating pipe dragging support
                      stripDragRef.current = {
                        stripId: pipe.id,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        origPoints: pipe.points.map(p=>({...p}))
                      };
                    }}
                    onRootContextMenu={(e)=> { 
                      if (!admin) return;
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (e.shiftKey) {
                        // Shift + right-click: Open relay ID assignment dialog
                        console.log('[Home] Avaa rele ID valinta lämmitysputkelle', pipe.id);
                        setShowRelayDialog({
                          itemId: pipe.id,
                          itemType: 'strip', // Reuse strip type for now
                          currentRelayId: pipe.relayId
                        });
                      } else {
                        // Regular right-click: Delete heating pipe
                        commitChange(() => setHeatingPipes(prev => prev.filter(p => p.id !== pipe.id)));
                      }
                    }}
                    title={`Lattialämmitys ${pipe.id}${admin?' (klikkaa toggle, right-click rele)':''}`}
                  />
                ))}

                {/* LED strips - rendered after heating pipes to be on top */}
                {!hideLEDStrips && strips.map(strip => (
                  <LEDStrip
                    key={strip.id}
                    id={strip.id}
                    points={strip.points}
                    baseWidth={imgSize.w}
                    baseHeight={imgSize.h}
                    spacing={40}
                    spotRadius={5}
                    admin={admin}
                    showSpots={!admin}
                    showPath={admin}
                    pathColor={drawing.active && strip.id===drawing.stripId ? '#fbbf24' : '#475569'}
                    on={strip.relayId !== undefined ? getRelayStatus(strip.relayId) === 1 : strip.on}
                    onChange={(next)=> {
                      if (strip.relayId !== undefined) {
                        // Jos stripillä on relayId, käytä rele kontrollia
                        const currentStatus = getRelayStatus(strip.relayId);
                        handleToggleRelay(strip.relayId, currentStatus);
                      } else {
                        // Muuten käytä vanhaa tapaa
                        commitChange(()=> setStrips(prev=> prev.map(s=> s.id===strip.id ? { ...s, on: next } : s)));
                      }
                    }}
                    onToggle={()=>{
                      if (strip.relayId !== undefined) {
                        const currentStatus = getRelayStatus(strip.relayId);
                        handleToggleRelay(strip.relayId, currentStatus);
                      } else {
                        commitChange(()=> setStrips(prev=> prev.map(s=> s.id===strip.id ? { ...s, on: !s.on } : s)));
                      }
                    }}
                    onRootPointerDown={(e)=> {
                      if(!admin) return;
                      setSelectedStripId(strip.id);
                      stripDragRef.current = {
                        stripId: strip.id,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        origPoints: strip.points.map(p=>({...p}))
                      };
                    }}
                    onRootContextMenu={(e)=> { 
                      if (adminLogging) {
                        console.log('[Admin] LEDStrip right-click, admin:', admin);
                      }
                      if (!admin) {
                        if (adminLogging) {
                          console.log('[Admin] mode ei ole päällä, skipppaa rele dialog');
                        }
                        return;
                      }
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (e.shiftKey) {
                        // Shift + right-click: Open relay ID assignment dialog
                        if (relayLogging) {
                          console.log('[Relay] Avaa rele ID valinta stripille', strip.id);
                        }
                        setShowRelayDialog({
                          itemId: strip.id,
                          itemType: 'strip',
                          currentRelayId: strip.relayId
                        });
                      } else {
                        // Regular right-click: Delete LED strip
                        commitChange(() => setStrips(prev => prev.filter(s => s.id !== strip.id)));
                      }
                    }}
                    title={`LED strip ${strip.id}${admin?' (klikkaa lisätäksesi pisteen, raahaa siirtääksesi)':''}`}
                  />
                ))}
                
                {/* Wall Lights */}
                {!hideWallLights && wallLights.map(wallLight => (
                  <g key={wallLight.id}>
                    {/* Invisible click area for admin functions */}
                    {admin && (
                      <rect
                        x={wallLight.x * imgSize.w - 12}
                        y={wallLight.y * imgSize.h - 12}
                        width="24"
                        height="24"
                        fill="transparent"
                        stroke="rgba(255, 0, 0, 0.3)"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          dragRef.current = { 
                            id: wallLight.id, 
                            startClientX: e.clientX, 
                            startClientY: e.clientY, 
                            origX: wallLight.x, 
                            origY: wallLight.y, 
                            moved: false, 
                            type: 'wallLight' 
                          };
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Delete wall light with right click
                          commitChange(() => setWallLights(prev => prev.filter(light => light.id !== wallLight.id)));
                        }}
                        style={{ cursor: 'move' }}
                      />
                    )}
                    <WallLight
                      x={wallLight.x * imgSize.w - 8}
                      y={wallLight.y * imgSize.h - 10}
                      direction={wallLight.direction || 'up'}
                      label={admin ? wallLight.label : undefined}
                      scaleRatio={1}
                      isOn={wallLight.relayId !== undefined ? getRelayStatus(wallLight.relayId) === 1 : false}
                      onClick={() => {
                        if (admin) {
                          // Admin mode - open relay assignment dialog
                          setShowRelayDialog({
                            itemId: wallLight.id,
                            itemType: 'lamp', // Reuse lamp type
                            currentRelayId: wallLight.relayId
                          });
                        } else if (wallLight.relayId) {
                          // User mode - toggle relay
                          const currentStatus = getRelayStatus(wallLight.relayId);
                          handleToggleRelay(wallLight.relayId, currentStatus);
                        }
                      }}
                    />
                    {/* Admin label */}
                    {admin && (
                      <text
                        x={wallLight.x * imgSize.w}
                        y={wallLight.y * imgSize.h + 25}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#333333"
                        fontFamily="Arial, sans-serif"
                        pointerEvents="none"
                      >
                        {wallLight.id} - R{wallLight.relayId || '?'}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            )}
          </div>
        </div>
      </div>

      
      {/* Relay Status Panel */}
      {admin && relayStatus.length > 0 && (
        <div className="relay-status-panel">
          <div className="relay-status-title">
            Rele-tilanteet ({relayStatus.length}/48):
          </div>
          <div className="relay-grid">
            {relayStatus
              .sort((a, b) => a.relay - b.relay)
              .map(relay => (
                <div 
                  key={relay.relay} 
                  className={`relay-item ${relay.stat === 1 ? 'on' : 'off'}`}
                >
                  {relay.relay}
                </div>
              ))}
          </div>
          <div className="relay-legend">
            Vihreä = ON, Harmaa = OFF
          </div>
          {/* Show lamp assignments */}
          <div className="relay-assignments">
            <div className="relay-assignments-title">
              Lamppu-rele kytkennät:
            </div>
            {lamps
              .filter(lamp => lamp.relayId !== undefined)
              .sort((a, b) => (a.relayId || 0) - (b.relayId || 0))
              .map(lamp => (
                <div key={lamp.id} className="relay-assignment-item">
                  <span>{lamp.id} ({lamp.kind})</span>
                  <span>→ R{lamp.relayId}</span>
                </div>
              ))}
            {lamps.filter(lamp => lamp.relayId !== undefined).length === 0 && (
              <div className="relay-no-assignments">
                Ei rele-kytkentöjä
              </div>
            )}
          </div>
          {/* Show wall light assignments */}
          <div className="relay-assignments">
            <div className="relay-assignments-title">
              Seinävalo-rele kytkennät:
            </div>
            {wallLights
              .filter(wallLight => wallLight.relayId !== undefined)
              .sort((a, b) => (a.relayId || 0) - (b.relayId || 0))
              .map(wallLight => (
                <div key={wallLight.id} className="relay-assignment-item">
                  <span>{wallLight.id} ({wallLight.direction})</span>
                  <span>→ R{wallLight.relayId}</span>
                </div>
              ))}
            {wallLights.filter(wallLight => wallLight.relayId !== undefined).length === 0 && (
              <div className="relay-no-assignments">
                Ei rele-kytkentöjä
              </div>
            )}
          </div>
        </div>
      )}
      
      {admin && (
        <AdminToolbar
          selectedTool={selectedTool}
          onToolChange={handleToolChange}
          snap90={snap90}
          onSnap90Change={setSnap90}
          onUndo={undo}
          onRedo={redo}
          onDelete={handleDelete}
          onSaveToCloud={saveToCloud}
          onLoadFromCloud={loadFromCloud}
          undoAvailable={canUndo}
          redoAvailable={canRedo}
          drawing={drawing}
          selectedStripId={selectedStripId}
          onStartDrawing={handleStartDrawing}
          onShortenStrip={() => selectedStripId && shortenStrip(selectedStripId)}
        />
      )}

  {directionMenu && admin && (
        <DirectionChooser
          anchor={directionMenu.anchor}
          stripId={directionMenu.stripId}
          end={directionMenu.end}
          onCancel={()=> setDirectionMenu(null)}
          onSelect={(dir)=> { extendStrip(directionMenu.stripId, directionMenu.end, dir); setDirectionMenu(null); }}
        />
      )}
      {admin && drawing.active && (
        <div className="drawing-instruction">
          <strong>Piirretään LED-stripiä: {drawing.stripId}</strong><br/>
          • Klikkaa pisteitä (automaattinen 90° kulmat)<br/>
          • ENTER tai oikea hiiren painike lopettaa<br/>
          • ESC peruuttaa ja poistaa stripin
        </div>
      )}
      
      {/* Relay ID Assignment Dialog */}
      {showRelayDialog && (
        <RelayAssignmentDialog
          itemId={showRelayDialog.itemId}
          itemType={showRelayDialog.itemType}
          currentRelayId={showRelayDialog.currentRelayId}
          onAssign={handleAssignRelayId}
          onClose={() => setShowRelayDialog(null)}
        />
      )}

      {/* Temperature Icon Editing Dialog */}
      {editingTemperatureIcon && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            minWidth: '300px',
            maxWidth: '500px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Muokkaa huoneen tietoja</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: 'bold' }}>
                Huone ID:
              </label>
              <input
                type="text"
                value={editingTemperatureIcon.roomId}
                onChange={(e) => setEditingTemperatureIcon(prev => prev ? {...prev, roomId: e.target.value} : null)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="esim. olohuone, makuuhuone, keittio"
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: 'bold' }}>
                Huoneen nimi:
              </label>
              <input
                type="text"
                value={editingTemperatureIcon.roomName}
                onChange={(e) => setEditingTemperatureIcon(prev => prev ? {...prev, roomName: e.target.value} : null)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="esim. Olohuone, Makuuhuone, Keittiö"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingTemperatureIcon(null)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Peruuta
              </button>
              <button
                onClick={() => {
                  if (editingTemperatureIcon) {
                    handleUpdateTemperatureIcon(
                      editingTemperatureIcon.iconId,
                      editingTemperatureIcon.roomId,
                      editingTemperatureIcon.roomName
                    );
                  }
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Tallenna
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default Home;
