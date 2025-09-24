/**
 * 🏠 Home - Suppea pohjakuvanäkymä zoomilla ja panilla
 * 
 * Vain oleelliset toiminnot:
 * - Pohjakuva (/img/pohjakuva.svg)
 * - Hiiren scroll wheel zoom
 * - Hiiren drag panorointi
 * - EI ylimääräisiä komponentteja tai mediajuttuja
 * 
 * ⚠️  ZOOM/PAN TOIMINNALLISUUS ON VALIDOITU JA TOIMII TÄYDELLISESTI! ⚠️
 * 
 * ÄLYKÄSTÄ TÄTÄ KOODIA ENÄÄ MUUTA!
 * - useZoomAndPan hook toimii täydellisesti
 * - Touch-eventit korjattu lopullisesti 
 * - Passive event listener virheet korjattu
 * - Mobile single-finger pan + two-finger pinch zoom toimivat
 * - Desktop mouse wheel zoom + drag pan toimivat
 * 
 * Seuraavat osat ovat SUOJATTUJA muutoksilta:
 * ✅ useEffect zoom/pan event handlerit
 * ✅ Container ref ja transform-tyylien asetus
 * ✅ Wheel event non-passive asetukset
 * ✅ Touch event pointerDown/Move/Up logiikat
 * ✅ Scale/translate state management
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { useZoomAndPan } from '../hooks/useZoomAndPan';
import { useLayoutPersistence } from '../hooks/useLayoutPersistence';
import { useLocalStorageSync } from '../helpers/localStorageSync';
import LampComponent from '../components/Lamp';
import LEDStrip from '../components/LEDStrip';
import HeatingPipe from '../components/HeatingPipe';
import TemperatureIcon from '../components/TemperatureIcon';
import TemperatureCard from '../components/TemperatureCard';
import AdminToolbar from '../components/AdminToolbar';
import { Lamp, LEDStripModel, HeatingPipeModel, TemperatureIconModel, ToolType, DrawingState, StatusUpdate } from '../types';
import { parseStatusData, updateComponentStatesFromRelays, updateTemperatureIconsFromStatus } from '../helpers/statusParser';
import { useSocketService } from '../hooks/useSocket';
import { onUpdateStatusChange, getAllRelayStatus, getRelayStatus } from '../helpers/socketHelper';

// Import mirror/wall/spot components from hvac/ folder
import MirrorLight from '../components/hvac/MirrorLight';
import SpotLight from '../components/hvac/SpotLight';
import WallLight from '../components/hvac/WallLight';

// Import HVAC components - migrated from vanhat/src/pages/Home.tsx
import Compressor from '../components/hvac/Compressor';
import Fan from '../components/hvac/Fan';
import HeatPumpCompressor from '../components/hvac/HeatPumpCompressor';
import HeatPumpIndoorUnit from '../components/hvac/HeatPumpIndoorUnit';

// Import layout types from useLayoutPersistence hook
import type { WallLightModel } from '../hooks/useLayoutPersistence';

// HVAC component type definitions - migrated from vanhat/src/pages/Home.tsx
type CompressorModel = {id:string; x:number; y:number; label?:string; compressorId?:string};
type FanModel = {id:string; x:number; y:number; label?:string; fanId?:string; fanType?:string};
type HeatPumpModel = {id:string; x:number; y:number; label?:string};
type HeatPumpCompressorModel = {id:string; x:number; y:number; label?:string; compressorId?:string};
type HeatPumpIndoorUnitModel = {id:string; x:number; y:number; label?:string; unitId?:string};

export const Home: React.FC = () => {
  // Socket service for commands
  const { service: socketService, isConnected: isSocketConnected } = useSocketService();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ touches: Touch[]; scale: number; translate: { x: number; y: number } } | null>(null);
  
  const {
    scale,
    translate,
    imgSize,
    panning,
    setImgSize,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    setScale,
    setTranslate
  } = useZoomAndPan();

  // Admin state - needs to be defined before handlers that use it
  const [admin, setAdmin] = useState(false);

  // Lamp state - migrated from vanhat/src/pages/Home.tsx
  const [lamps, setLamps] = useState<Array<Lamp>>([]);
  
  // Handle lamp click - migrated from vanhat/src/pages/Home.tsx
  const handleLampClick = useCallback(async (lamp: Lamp) => {
    console.log('� Lamp clicked:', lamp.id, 'Current state:', lamp.on, 'Admin mode:', admin, 'Relay ID:', lamp.relayId);
    
    if (admin) {
      // In admin mode, show relay ID assignment dialog (TODO: implement dialog)
      console.log('🔧 Admin mode: Would show relay assignment dialog for lamp', lamp.id);
      // TODO: Implement admin mode relay assignment dialog
    } else if (lamp.relayId !== undefined) {
      // In normal mode, toggle the relay if assigned
      const currentStatus = getRelayStatus(lamp.relayId);
      console.log('🔌 Toggle relay', lamp.relayId, 'current status:', currentStatus);
      
      try {
        const newStatus = currentStatus === 1 ? 0 : 1;
        
        // Tarkista että socket on yhdistetty
        if (!isSocketConnected) {
          throw new Error('Socket not connected to backend');
        }
        
        // Use SocketService for controller commands (correct architecture)
        const response = await socketService.sendRequest({
          type: 'controller_command',
          data: {
            id: "relays",
            function: "setRelay", 
            relay: lamp.relayId.toString(),
            stat: newStatus.toString()
          },
          token: localStorage.getItem('authToken') || undefined
        });

        if (response.success) {
          console.log('✅ Relay command sent successfully:', lamp.relayId, '->', newStatus === 1 ? 'ON' : 'OFF');
        } else {
          console.error('❌ Relay command failed:', response.error);
        }
      } catch (error) {
        console.error('❌ Error sending relay command:', error);
      }
    } else {
      console.log('💡 Lamp', lamp.id, 'has no relay ID assigned');
    }
  }, [admin, socketService, isSocketConnected]);

  // LED strips state - migrated from vanhat/src/pages/Home.tsx
  const [strips, setStrips] = useState<LEDStripModel[]>([]);

  // Handle LED strip toggle - migrated from vanhat/src/pages/Home.tsx
  const handleLEDStripToggle = useCallback(async (stripId: string) => {
    console.log('💡 LED Strip toggled:', stripId);
    
    const strip = strips.find(s => s.id === stripId);
    if (!strip) return;
    
    // Update visual state immediately
    setStrips(prevStrips =>
      prevStrips.map(s =>
        s.id === stripId
          ? { ...s, on: !s.on }
          : s
      )
    );
    
    // If strip has relay ID assigned, send controller command
    if (strip.relayId !== undefined && !admin) {
      const currentStatus = getRelayStatus(strip.relayId);
      console.log('🔌 Toggle LED strip relay', strip.relayId, 'current status:', currentStatus);
      
      try {
        const newStatus = currentStatus === 1 ? 0 : 1;
        
        // Tarkista että socket on yhdistetty
        if (!isSocketConnected) {
          throw new Error('Socket not connected to backend');
        }
        
        // Use SocketService for controller commands (correct architecture)
        const response = await socketService.sendRequest({
          type: 'controller_command',
          data: {
            id: "relays",
            function: "setRelay", 
            relay: strip.relayId.toString(),
            stat: newStatus.toString()
          },
          token: localStorage.getItem('authToken') || undefined
        });

        if (response.success) {
          console.log('✅ LED strip relay command sent successfully:', strip.relayId, '->', newStatus === 1 ? 'ON' : 'OFF');
        } else {
          console.error('❌ LED strip relay command failed:', response.error);
        }
      } catch (error) {
        console.error('❌ Error sending LED strip relay command:', error);
      }
    } else if (!strip.relayId) {
      console.log('💡 LED strip', stripId, 'has no relay ID assigned');
    } else if (admin) {
      console.log('🔧 Admin mode: Would show relay assignment dialog for LED strip', stripId);
    }
  }, [strips, admin, socketService, isSocketConnected]);

  // Heating pipes state - migrated from vanhat/src/pages/Home.tsx
  const [heatingPipes, setHeatingPipes] = useState<HeatingPipeModel[]>([]);

  // Handle heating pipe toggle - migrated from vanhat/src/pages/Home.tsx


  // Temperature icons state - migrated from vanhat/src/pages/Home.tsx
  const [temperatureIcons, setTemperatureIcons] = useState<TemperatureIconModel[]>([]);

  // Handle temperature icon click - migrated from vanhat/src/pages/Home.tsx
  // Temperature modal state
  const [temperatureModalOpen, setTemperatureModalOpen] = useState(false);
  const [selectedTemperatureIcon, setSelectedTemperatureIcon] = useState<TemperatureIconModel | null>(null);

  const handleTemperatureIconClick = useCallback((iconId: string) => {
    console.log('🌡️ Temperature Icon clicked:', iconId);
    
    const icon = temperatureIcons.find(i => i.id === iconId);
    if (icon) {
      setSelectedTemperatureIcon(icon);
      setTemperatureModalOpen(true);
    }
  }, [temperatureIcons]);

  // Wall lights state - migrated from vanhat/src/pages/Home.tsx
  const [wallLights, setWallLights] = useState<WallLightModel[]>([]);

  // Heat pumps state - required for layout persistence
  const [heatPumps, setHeatPumps] = useState<HeatPumpModel[]>([]);

  // Compressors state - required for layout persistence
  const [compressors, setCompressors] = useState<CompressorModel[]>([]);

  // Fans state - required for layout persistence
  const [fans, setFans] = useState<FanModel[]>([]);

  // Heat pump compressors state - required for layout persistence
  const [heatpumpCompressors, setHeatpumpCompressors] = useState<HeatPumpCompressorModel[]>([]);

  // Heat pump indoor units state - required for layout persistence
  const [heatpumpIndoorUnits, setHeatpumpIndoorUnits] = useState<HeatPumpIndoorUnitModel[]>([]);

  // Handle wall light click - migrated from vanhat/src/pages/Home.tsx
  const handleWallLightClick = useCallback(async (wallLightId: string) => {
    const wallLight = wallLights.find(light => light.id === wallLightId);
    if (!wallLight) return;
    
    console.log('💡 Wall Light clicked:', wallLightId, 'Current state:', wallLight.on, 'Admin mode:', admin, 'Relay ID:', wallLight.relayId);
    
    if (admin) {
      // In admin mode, show relay ID assignment dialog (TODO: implement dialog)
      console.log('🔧 Admin mode: Would show relay assignment dialog for wall light', wallLightId);
    } else if (wallLight.relayId !== undefined) {
      // In normal mode, toggle the relay if assigned
      const currentStatus = getRelayStatus(wallLight.relayId);
      console.log('🔌 Toggle wall light relay', wallLight.relayId, 'current status:', currentStatus);
      
      try {
        const newStatus = currentStatus === 1 ? 0 : 1;
        
        // Tarkista että socket on yhdistetty
        if (!isSocketConnected) {
          throw new Error('Socket not connected to backend');
        }
        
        // Use SocketService for controller commands (correct architecture)
        const response = await socketService.sendRequest({
          type: 'controller_command',
          data: {
            id: "relays",
            function: "setRelay", 
            relay: wallLight.relayId.toString(),
            stat: newStatus.toString()
          },
          token: localStorage.getItem('authToken') || undefined
        });

        if (response.success) {
          console.log('✅ Wall light relay command sent successfully:', wallLight.relayId, '->', newStatus === 1 ? 'ON' : 'OFF');
        } else {
          console.error('❌ Wall light relay command failed:', response.error);
        }
      } catch (error) {
        console.error('❌ Error sending wall light relay command:', error);
      }
    } else {
      console.log('💡 Wall light', wallLightId, 'has no relay ID assigned');
    }
  }, [wallLights, admin, socketService, isSocketConnected]);

  // Layout persistence hook - migrated from vanhat/src/pages/Home.tsx
  const { commitChange, undo, redo, canUndo, canRedo, loadFromStorage } = useLayoutPersistence(
    lamps,
    strips,
    heatingPipes,
    temperatureIcons,
    heatPumps,
    compressors,
    fans,
    heatpumpCompressors,
    heatpumpIndoorUnits,
    wallLights,
    setLamps,
    setStrips,
    setHeatingPipes,
    setTemperatureIcons,
    setHeatPumps,
    setCompressors,
    setFans,
    setHeatpumpCompressors,
    setHeatpumpIndoorUnits,
    setWallLights
  );

  // Database sync functionality - migrated from vanhat/src/pages/Home.tsx
  const { loadFromServer } = useLocalStorageSync();

  // Admin toolbar state - migrated from vanhat/src/pages/Home.tsx
  const [selectedTool, setSelectedTool] = useState<ToolType>('lamp');
  const [snap90, setSnap90] = useState(false);
  const [drawing] = useState<DrawingState>({ active: false, stripId: null });

  // Admin toolbar handlers - migrated from vanhat/src/pages/Home.tsx
  const handleToolChange = useCallback((tool: ToolType) => {
    setSelectedTool(tool);
    console.log('🔧 Tool changed to:', tool);
  }, []);

  const handleUndo = useCallback(() => {
    console.log('↶ Undo requested');
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    console.log('↷ Redo requested');
    redo();
  }, [redo]);

  const handleDelete = useCallback(() => {
    console.log('🗑️ Delete requested');
    // TODO: Implement delete functionality
  }, []);

  const handleSaveToCloud = useCallback(() => {
    console.log('☁️ Save to cloud requested');
    // TODO: Implement save to cloud functionality
  }, []);

  const handleLoadFromCloud = useCallback(() => {
    console.log('📥 Load from cloud requested');
    // TODO: Implement load from cloud functionality
  }, []);

  const handleStartDrawing = useCallback(() => {
    console.log('✏️ Start drawing requested');
    // TODO: Implement drawing start functionality
  }, []);

  const handleShortenStrip = useCallback(() => {
    console.log('✂️ Shorten strip requested');
    // TODO: Implement shorten strip functionality
  }, []);

  // Layout persistence - load from localStorage on mount
  useEffect(() => {
    console.log('[Layout] Starting layout load process...');
    loadFromStorage();
  }, [loadFromStorage]);

  // Admin mode keyboard shortcuts - migrated from vanhat/src/pages/Home.tsx
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      // 'A' key toggles admin mode (without modifier keys)
      if (e.key.toLowerCase() === 'a' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setAdmin(prev => {
          console.log('🔧 Admin mode toggled to:', !prev);
          return !prev;
        });
      }
      
      // Escape key exits admin mode
      if (e.key === 'Escape' && admin) {
        setAdmin(false);
        console.log('🔧 Admin mode exited via Escape');
      }
      
      // Z key for undo (when in admin mode)
      if (e.key.toLowerCase() === 'z' && admin && !e.metaKey && !e.ctrlKey) {
        handleUndo();
      }
      
      // Y key for redo (when in admin mode)
      if (e.key.toLowerCase() === 'y' && admin && !e.metaKey && !e.ctrlKey) {
        handleRedo();
      }
      
      // S key for save (when in admin mode)
      if (e.key.toLowerCase() === 's' && admin && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleSaveToCloud();
      }
      
      // L key for load (when in admin mode)
      if (e.key.toLowerCase() === 'l' && admin && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleLoadFromCloud();
      }
      
      // Delete key for delete (when in admin mode)
      if (e.key === 'Delete' && admin) {
        handleDelete();
      }
    };

    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [admin, setAdmin, handleUndo, handleRedo, handleSaveToCloud, handleLoadFromCloud, handleDelete]);

  // Status parsing and relay management - migrated from vanhat/src/pages/Home.tsx
  useEffect(() => {
    console.log('🔄 [Home] KRIITTINEN: Rekisteröidään onUpdateStatusChange callback');
    const unsubscribe = onUpdateStatusChange((status: StatusUpdate) => {
      console.log('🔄 [Home] KRIITTINEN: StatusUpdate callback kutsuttu:', status);
      
      // Parse status data for system monitoring
      const parsedStatusData = parseStatusData(status);
      console.log('[StatusParsing] Parsed status data:', parsedStatusData);
            
      if (status?.relays) {
        console.log('[StatusParsing] Received relay status:', status.relays);        
       
        // Update component states based on relay status using helper function
        updateComponentStatesFromRelays(
          status.relays,
          setLamps,
          setStrips,
          setHeatingPipes,
          setWallLights,
          false // Disable logging by default, enable for debugging
        );
      } else {
        console.log('[StatusParsing] StatusUpdate did not contain relays data');
      }

      // Update temperature icons with current temperatures (always try to update)
      updateTemperatureIconsFromStatus(
        status,
        setTemperatureIcons,
        true // Enable logging for debugging
      );
    });
    
    // Get initial state immediately
    const currentRelays = getAllRelayStatus();
    if (currentRelays.length > 0) {
      console.log('[StatusParsing] Loading initial relay state:', currentRelays);
      
      // Update component states with initial relay data
      updateComponentStatesFromRelays(
        currentRelays,
        setLamps,
        setStrips,
        setHeatingPipes,
        setWallLights,
        false
      );
    }
    
    return () => {
      console.log('[StatusParsing] Removing global statusUpdate listener');
      unsubscribe();
    };
  }, []);

  // Load layout from database first, then localStorage - migrated from vanhat/src/pages/Home.tsx
  useEffect(() => {
    const loadLayout = async () => {
      console.log('[Layout] Starting layout load process...');
      
      // First try to load from server (database)
      const serverSuccess = await loadFromServer();
      if (serverSuccess) {
        console.log('[Layout] Successfully loaded from server, now loading to components...');
        // Server data is now in localStorage, load it into components
        loadFromStorage();
      } else {
        console.log('[Layout] No server data found, loading from local storage...');
        // Fall back to existing localStorage data
        loadFromStorage();
      }
    };
    
    loadLayout();
  }, [loadFromServer, loadFromStorage]);

  // ⚠️ SUOJATTU KOODI - Desktop wheel zoom - ÄLÄR MUUTA! ⚠️
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      
      if (!imgSize) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomIntensity = 0.1;
      const wheel = e.deltaY < 0 ? 1 : -1;
      const zoom = Math.exp(wheel * zoomIntensity);
      
      const newScale = Math.min(Math.max(scale * zoom, 0.5), 3);
      const actualZoom = newScale / scale;
      
      if (actualZoom === 1) return;
      
      const newTranslateX = mouseX - (mouseX - translate.x) * actualZoom;
      const newTranslateY = mouseY - (mouseY - translate.y) * actualZoom;
      

      setScale(newScale);
      setTranslate({ x: newTranslateX, y: newTranslateY });
    };


    container.addEventListener('wheel', wheelHandler, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', wheelHandler);
    };
  }, [scale, translate, imgSize, setScale, setTranslate]); // ⚠️ SUOJATTU riippuvuuslista - TOIMII! ⚠️

  // ⚠️ SUOJATTU KOODI - Mobile touch events - ÄLÄR MUUTA! ⚠️
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let singleTouchStart: { x: number; y: number; translateX: number; translateY: number } | null = null;

    const getDistance = (touch1: Touch, touch2: Touch) => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getCenter = (touch1: Touch, touch2: Touch) => ({
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    });

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        setTranslate(currentTranslate => {
          singleTouchStart = {
            x: touch.clientX,
            y: touch.clientY,
            translateX: currentTranslate.x,
            translateY: currentTranslate.y
          };
          return currentTranslate;
        });
        e.preventDefault();
      } else if (e.touches.length === 2) {
        e.preventDefault();
        singleTouchStart = null;
        
        setScale(currentScale => {
          setTranslate(currentTranslate => {
            touchStartRef.current = {
              touches: Array.from(e.touches),
              scale: currentScale,
              translate: currentTranslate
            };
            return currentTranslate;
          });
          return currentScale;
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      
      if (e.touches.length === 1 && singleTouchStart) {
        const touch = e.touches[0];
        const dx = touch.clientX - singleTouchStart.x;
        const dy = touch.clientY - singleTouchStart.y;
        
        setTranslate({
          x: singleTouchStart.translateX + dx,
          y: singleTouchStart.translateY + dy
        });
      } else if (e.touches.length === 2 && touchStartRef.current) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        const startDistance = getDistance(touchStartRef.current.touches[0], touchStartRef.current.touches[1]);
        const currentDistance = getDistance(touch1, touch2);
        const scaleChange = currentDistance / startDistance;
        
        const newScale = Math.min(Math.max(touchStartRef.current.scale * scaleChange, 0.5), 3);
        
        const startCenter = getCenter(touchStartRef.current.touches[0], touchStartRef.current.touches[1]);
        
        const containerRect = container.getBoundingClientRect();
        const centerX = startCenter.x - containerRect.left;
        const centerY = startCenter.y - containerRect.top;
        
        const actualZoom = newScale / touchStartRef.current.scale;
        const newTranslateX = centerX - (centerX - touchStartRef.current.translate.x) * actualZoom;
        const newTranslateY = centerY - (centerY - touchStartRef.current.translate.y) * actualZoom;
        
        setScale(newScale);
        setTranslate({ x: newTranslateX, y: newTranslateY });
      }
    };

    const handleTouchEnd = () => {
      singleTouchStart = null;
      touchStartRef.current = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [setScale, setTranslate]); // ⚠️ SUOJATTU riippuvuuslista - TOIMII! ⚠️

  // ⚠️ SUOJATTU KOODI - Mouse drag handlers - ÄLÄR MUUTA! ⚠️
  const handleMouseDown = (e: React.MouseEvent) => {
    const pointerEvent = {
      ...e,
      pointerType: 'mouse',
      clientX: e.clientX,
      clientY: e.clientY,
      preventDefault: e.preventDefault.bind(e)
    } as React.PointerEvent;
    handlePointerDown(pointerEvent);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pointerEvent = {
      ...e,
      pointerType: 'mouse',
      clientX: e.clientX,
      clientY: e.clientY
    } as React.PointerEvent;
    handlePointerMove(pointerEvent);
  };

  // Handle container clicks for admin component creation - migrated from vanhat/src/pages/Home.tsx
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (!admin || !imgSize) return;

    // Calculate relative coordinates
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left - translate.x;
    const clickY = e.clientY - rect.top - translate.y;
    const relativeX = clickX / (imgSize.w * scale);
    const relativeY = clickY / (imgSize.h * scale);

    // Only create components if click is within image bounds
    if (relativeX < 0 || relativeX > 1 || relativeY < 0 || relativeY > 1) return;

    const timestamp = Date.now();

    // Create component based on selected tool
    if (selectedTool === 'lamp') {
      const newLamp: Lamp = {
        id: `lamp_${timestamp}`,
        kind: 'lamp',
        x: relativeX,
        y: relativeY,
        on: false,
        label: `Lamppu ${timestamp}`
      };
      commitChange(() => setLamps(prev => [...prev, newLamp]));
    } else if (selectedTool === 'mirror') {
      const newMirror: Lamp = {
        id: `mirror_${timestamp}`,
        kind: 'mirror',
        x: relativeX,
        y: relativeY,
        on: false,
        label: `Peilivalo ${timestamp}`
      };
      commitChange(() => setLamps(prev => [...prev, newMirror]));
    } else if (selectedTool === 'spot') {
      const newSpot: Lamp = {
        id: `spot_${timestamp}`,
        kind: 'spot',
        x: relativeX,
        y: relativeY,
        on: false,
        label: `Spottivalo ${timestamp}`
      };
      commitChange(() => setLamps(prev => [...prev, newSpot]));
    } else if (selectedTool === 'wallLight') {
      const newWallLight: WallLightModel = {
        id: `wall_${timestamp}`,
        x: relativeX,
        y: relativeY,
        direction: 'up',
        on: false,
        label: `Ulkovalo ${timestamp}`
      };
      commitChange(() => setWallLights(prev => [...prev, newWallLight]));
    } else if (selectedTool === 'temperature') {
      const newTempIcon: TemperatureIconModel = {
        id: `temp_${timestamp}`,
        x: relativeX,
        y: relativeY,
        roomId: `room_${timestamp}`,
        roomName: `Huone ${timestamp}`,
        currentTemp: 21.0
      };
      commitChange(() => setTemperatureIcons(prev => [...prev, newTempIcon]));
    }
  }, [admin, imgSize, translate, scale, selectedTool, commitChange, setLamps, setWallLights, setTemperatureIcons]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'fixed',
        top: 64,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        touchAction: 'none'
      }}

      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handlePointerUp}
      onClick={handleContainerClick}
    >

      <Box
        sx={{
          position: 'relative',
          width: imgSize?.w || 1200,
          height: imgSize?.h || 800,
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          cursor: panning ? 'grabbing' : 'grab',
          transition: panning ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        <img
          src="/img/pohjakuva.svg"
          alt="Pohjakuva"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
          onLoad={(e) => {
            const target = e.currentTarget;
            const naturalW = target.naturalWidth || 1200;
            const naturalH = target.naturalHeight || 800;
            setImgSize({ w: naturalW, h: naturalH });

          }}
        />
        
        {/* Lamp Overlay - migrated from vanhat/src/pages/Home.tsx */}
        {imgSize && lamps.map((lamp) => (
          <Box
            key={lamp.id}
            sx={{
              position: 'absolute',
              left: `${lamp.x * 100}%`,
              top: `${lamp.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              pointerEvents: 'auto'
            }}
          >
            {lamp.kind === 'mirror' ? (
              <MirrorLight
                on={lamp.on}
                onChange={() => handleLampClick(lamp)}
                title={lamp.label || `Peilivalo ${lamp.id}`}
              />
            ) : lamp.kind === 'spot' ? (
              <SpotLight
                size={60}
                on={lamp.on}
                onChange={() => handleLampClick(lamp)}
                title={lamp.label || `Spottivalo ${lamp.id}`}
              />
            ) : (
              <LampComponent
                size={60}
                on={lamp.on}
                onChange={() => handleLampClick(lamp)}
                title={lamp.label || `Lamppu ${lamp.id}`}
              />
            )}
          </Box>
        ))}

        {/* Temperature Icon Overlay - migrated from vanhat/src/pages/Home.tsx */}
        {imgSize && temperatureIcons.map((icon) => (
          <Box
            key={icon.id}
            sx={{
              position: 'absolute',
              left: `${icon.x * 100}%`,
              top: `${icon.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 12,
              pointerEvents: 'auto'
            }}
          >
            <TemperatureIcon
              roomId={icon.roomId}
              roomName={icon.roomName}
              currentTemp={icon.currentTemp}
              onClick={() => handleTemperatureIconClick(icon.id)}
            />
          </Box>
        ))}

        {/* Wall Light Overlay - migrated from vanhat/src/pages/Home.tsx */}
        {imgSize && wallLights.map((wallLight) => (
          <Box
            key={wallLight.id}
            sx={{
              position: 'absolute',
              left: `${wallLight.x * 100}%`,
              top: `${wallLight.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 12,
              pointerEvents: 'auto'
            }}
          >
            <WallLight
              x={wallLight.x}
              y={wallLight.y}
              direction={wallLight.direction}
              isOn={wallLight.on}
              onClick={() => handleWallLightClick(wallLight.id)}
              label={wallLight.label || `Ulkovalo ${wallLight.id}`}
            />
            {admin && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -40,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}
              >
                {wallLight.label || wallLight.id}
              </Box>
            )}
          </Box>
        ))}

        {/* Compressor Overlay - migrated from vanhat/src/pages/Home.tsx */}
        {imgSize && compressors.map((compressor) => (
          <Box
            key={compressor.id}
            sx={{
              position: 'absolute',
              left: `${compressor.x * 100}%`,
              top: `${compressor.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              pointerEvents: 'auto'
            }}
          >
            <Compressor
              size={35}
              title={compressor.label || 'Kompressori'}
              compressorId={compressor.compressorId}
            />
            {admin && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  fontSize: '9px',
                  padding: '1px 3px',
                  borderRadius: '2px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}
              >
                {compressor.id} - Kompressori
              </Box>
            )}
          </Box>
        ))}

        {/* Fan Overlay - migrated from vanhat/src/pages/Home.tsx */}
        {imgSize && fans.map((fan) => (
          <Box
            key={fan.id}
            sx={{
              position: 'absolute',
              left: `${fan.x * 100}%`,
              top: `${fan.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              pointerEvents: 'auto'
            }}
          >
            <Fan
              size={35}
              title={fan.label || 'Puhallin'}
              fanId={fan.fanId}
            />
            {admin && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  fontSize: '9px',
                  padding: '1px 3px',
                  borderRadius: '2px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}
              >
                {fan.id} - {fan.fanType === 'outdoor' ? 'Ulkopuhallin' : 'Sisäpuhallin'}
              </Box>
            )}
          </Box>
        ))}

        {/* HeatPump Compressor Overlay - migrated from vanhat/src/pages/Home.tsx */}
        {imgSize && heatpumpCompressors.map((hpCompressor) => (
          <Box
            key={hpCompressor.id}
            sx={{
              position: 'absolute',
              left: `${hpCompressor.x * 100}%`,
              top: `${hpCompressor.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              pointerEvents: 'auto'
            }}
          >
            <HeatPumpCompressor
              size={50}
              title={hpCompressor.label || 'Lämpöpumpun kompressori'}
              compressorId={hpCompressor.compressorId}
            />
            {admin && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  fontSize: '9px',
                  padding: '1px 3px',
                  borderRadius: '2px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}
              >
                {hpCompressor.id} - {hpCompressor.label || 'LP Kompressori'}
              </Box>
            )}
          </Box>
        ))}

        {/* HeatPump Indoor Unit Overlay - migrated from vanhat/src/pages/Home.tsx */}
        {imgSize && heatpumpIndoorUnits.map((hpUnit) => (
          <Box
            key={hpUnit.id}
            sx={{
              position: 'absolute',
              left: `${hpUnit.x * 100}%`,
              top: `${hpUnit.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              pointerEvents: 'auto'
            }}
          >
            <HeatPumpIndoorUnit
              size={60}
              title={hpUnit.label || 'VILP Sisäyksikkö'}
              unitId={hpUnit.unitId}
            />
            {admin && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  fontSize: '9px',
                  padding: '1px 3px',
                  borderRadius: '2px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}
              >
                {hpUnit.id} - {hpUnit.label || 'VILP Sisäyksikkö'}
              </Box>
            )}
          </Box>
        ))}

        {/* Heating Pipes - Bottom layer (status only, no interaction) */}
        {imgSize && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 5  // Lowest layer
            }}
          >
            {heatingPipes.map((pipe) => (
              <HeatingPipe
                key={pipe.id}
                id={pipe.id}
                points={pipe.points}
                baseWidth={imgSize.w}
                baseHeight={imgSize.h}
                admin={false}
                on={pipe.on}
                onChange={() => {}} // No-op since this is status only
                onToggle={() => {}} // No-op since this is status only
                title={pipe.label || `Lattialämmitys ${pipe.id}`}
                style={{ pointerEvents: 'none' }} // No interaction
              />
            ))}
          </svg>
        )}

        {/* LED Strip Overlay - Interactive layer */}
        {imgSize && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 15
            }}
          >
            {/* LED strips - Interactive components */}
            {strips.map((strip) => (
              <LEDStrip
                key={strip.id}
                id={strip.id}
                points={strip.points}
                baseWidth={imgSize.w}
                baseHeight={imgSize.h}
                spacing={40}
                spotRadius={5}
                admin={false} // TODO: Connect to admin mode
                showSpots={true}
                showPath={false}
                on={strip.on}
                onChange={(on) => {
                  setStrips(prevStrips =>
                    prevStrips.map(s =>
                      s.id === strip.id ? { ...s, on } : s
                    )
                  );
                }}
                onToggle={() => handleLEDStripToggle(strip.id)}
                title={strip.label || `LED strip ${strip.id}`}
                style={{ pointerEvents: 'auto' }}
              />
            ))}
          </svg>
        )}
      </Box>

      {/* Admin Toolbar - migrated from vanhat/src/pages/Home.tsx */}
      {admin && (
        <AdminToolbar
          selectedTool={selectedTool}
          onToolChange={handleToolChange}
          snap90={snap90}
          onSnap90Change={setSnap90}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onDelete={handleDelete}
          onSaveToCloud={handleSaveToCloud}
          onLoadFromCloud={handleLoadFromCloud}
          undoAvailable={canUndo}
          redoAvailable={canRedo}
          drawing={drawing}
          selectedStripId={null}
          onStartDrawing={handleStartDrawing}
          onShortenStrip={handleShortenStrip}
        />
      )}

      {/* Temperature Modal */}
      {temperatureModalOpen && selectedTemperatureIcon && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setTemperatureModalOpen(false);
            }
          }}
        >
          <TemperatureCard
            roomId={selectedTemperatureIcon.roomId}
            roomName={selectedTemperatureIcon.roomName || 'Huone'}
            authenticated={true}
            minTemp={18}
            maxTemp={25}
            step={0.5}
            isModal={true}
            onClose={() => setTemperatureModalOpen(false)}
          />
        </div>
      )}
    </Box>
  );
};