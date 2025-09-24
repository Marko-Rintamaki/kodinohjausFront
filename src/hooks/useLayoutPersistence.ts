import { useRef, useCallback, useEffect } from 'react';

// Logging control
const useLayoutPersistenceLogging = false;

// Interface for HeatingPipe points (relative coordinates)
export interface HeatingPipePoint { 
  x: number; 
  y: number; 
}

// Interface for HeatingPipe model
export interface HeatingPipeModel {
  id: string;
  points: HeatingPipePoint[];
  on: boolean;
  title?: string;
  // Other properties as needed
}

// Interface for Lamp model - migrated from vanhat/src/pages/Home.tsx
export interface Lamp {
  id: string;
  kind: 'lamp' | 'mirror' | 'spot';
  x: number;
  y: number;
  on: boolean;
  label?: string;
  relayId?: number;
}

// Interface for LED Strip point
export interface LEDStripPoint {
  x: number;
  y: number;
}

// Interface for LED Strip model
export interface LEDStripModel {
  id: string;
  points: LEDStripPoint[];
  on: boolean;
  label?: string;
  relayId?: number;
}

// Interface for Temperature Icon model
export interface TemperatureIconModel {
  id: string;
  x: number;
  y: number;
  roomId: string;
  roomName?: string;
  currentTemp?: number | null;
}

// Interface for Wall Light model
export interface WallLightModel {
  id: string;
  x: number;
  y: number;
  direction: 'up' | 'down';
  on: boolean;
  label?: string;
  relayId?: number;
}

// Layout snapshot for persistence
export interface LayoutSnapshot<Lamp = unknown, LEDStripModel = unknown, HeatingPipeModel = unknown, TemperatureIconModel = unknown, HeatPumpModel = unknown, CompressorModel = unknown, FanModel = unknown, HeatPumpCompressorModel = unknown, HeatPumpIndoorUnitModel = unknown, WallLightModel = unknown> {
  lamps: Lamp[];
  strips: LEDStripModel[];
  heatingPipes: HeatingPipeModel[];
  temperatureIcons: TemperatureIconModel[];
  heatPumps: HeatPumpModel[];
  compressors: CompressorModel[];
  fans: FanModel[];
  heatpumpCompressors: HeatPumpCompressorModel[];
  heatpumpIndoorUnits: HeatPumpIndoorUnitModel[];
  wallLights: WallLightModel[];
}

export const useLayoutPersistence = <Lamp, LEDStripModel, HeatingPipeModel, TemperatureIconModel, HeatPumpModel, CompressorModel, FanModel, HeatPumpCompressorModel, HeatPumpIndoorUnitModel, WallLightModel>(
  lamps: Lamp[],
  strips: LEDStripModel[],
  heatingPipes: HeatingPipeModel[],
  temperatureIcons: TemperatureIconModel[],
  heatPumps: HeatPumpModel[],
  compressors: CompressorModel[],
  fans: FanModel[],
  heatpumpCompressors: HeatPumpCompressorModel[],
  heatpumpIndoorUnits: HeatPumpIndoorUnitModel[],
  wallLights: WallLightModel[],
  setLamps: (lamps: Lamp[]) => void,
  setStrips: (strips: LEDStripModel[]) => void,
  setHeatingPipes: (pipes: HeatingPipeModel[]) => void,
  setTemperatureIcons: (icons: TemperatureIconModel[]) => void,
  setHeatPumps: (pumps: HeatPumpModel[]) => void,
  setCompressors: (compressors: CompressorModel[]) => void,
  setFans: (fans: FanModel[]) => void,
  setHeatpumpCompressors: (heatpumpCompressors: HeatPumpCompressorModel[]) => void,
  setHeatpumpIndoorUnits: (heatpumpIndoorUnits: HeatPumpIndoorUnitModel[]) => void,
  setWallLights: (wallLights: WallLightModel[]) => void,
  storageKey: string = 'homeLayout:v7'
) => {
  const undoStack = useRef<LayoutSnapshot<Lamp, LEDStripModel, HeatingPipeModel, TemperatureIconModel, HeatPumpModel, CompressorModel, FanModel, HeatPumpCompressorModel, HeatPumpIndoorUnitModel, WallLightModel>[]>([]);
  const redoStack = useRef<LayoutSnapshot<Lamp, LEDStripModel, HeatingPipeModel, TemperatureIconModel, HeatPumpModel, CompressorModel, FanModel, HeatPumpCompressorModel, HeatPumpIndoorUnitModel, WallLightModel>[]>([]);
  const isInitialLoad = useRef(true);
  const skipNextSave = useRef(false);

  const serialize = useCallback(
    (): LayoutSnapshot<Lamp, LEDStripModel, HeatingPipeModel, TemperatureIconModel, HeatPumpModel, CompressorModel, FanModel, HeatPumpCompressorModel, HeatPumpIndoorUnitModel, WallLightModel> => ({ 
      lamps, strips, heatingPipes, temperatureIcons, heatPumps, compressors, fans, heatpumpCompressors, heatpumpIndoorUnits, wallLights 
    }),
    [lamps, strips, heatingPipes, temperatureIcons, heatPumps, compressors, fans, heatpumpCompressors, heatpumpIndoorUnits, wallLights]
  );

  const applySnapshot = useCallback((snap: LayoutSnapshot<Lamp, LEDStripModel, HeatingPipeModel, TemperatureIconModel, HeatPumpModel, CompressorModel, FanModel, HeatPumpCompressorModel, HeatPumpIndoorUnitModel, WallLightModel>) => {
    if (useLayoutPersistenceLogging) {
      console.log('[useLayoutPersistence] Applying snapshot:', {
        lamps: snap.lamps?.length || 0,
        strips: snap.strips?.length || 0,
        heatingPipes: snap.heatingPipes?.length || 0,
        temperatureIcons: snap.temperatureIcons?.length || 0,
        heatPumps: snap.heatPumps?.length || 0,
        compressors: snap.compressors?.length || 0,
        fans: snap.fans?.length || 0,
        heatpumpCompressors: snap.heatpumpCompressors?.length || 0,
        heatpumpIndoorUnits: snap.heatpumpIndoorUnits?.length || 0,
        wallLights: snap.wallLights?.length || 0
      });
    }
    
    skipNextSave.current = true;
    setLamps(snap.lamps || []);
    setStrips(snap.strips || []);
    setHeatingPipes(snap.heatingPipes || []);
    setTemperatureIcons(snap.temperatureIcons || []);
    setHeatPumps(snap.heatPumps || []);
    setCompressors(snap.compressors || []);
    setFans(snap.fans || []);
    setHeatpumpCompressors(snap.heatpumpCompressors || []);
    setHeatpumpIndoorUnits(snap.heatpumpIndoorUnits || []);
    setWallLights(snap.wallLights || []);
    
    if (useLayoutPersistenceLogging) {
      console.log('[useLayoutPersistence] Snapshot applied');
    }
  }, [setLamps, setStrips, setHeatingPipes, setTemperatureIcons, setHeatPumps, setCompressors, setFans, setHeatpumpCompressors, setHeatpumpIndoorUnits, setWallLights]);

  const pushUndo = useCallback((snap: LayoutSnapshot) => {
    undoStack.current.push(JSON.parse(JSON.stringify(snap)));
    if (undoStack.current.length > 30) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const commitChange = useCallback((updater: () => void) => {
    const before = serialize();
    pushUndo(before);
    updater();
  }, [serialize, pushUndo]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (useLayoutPersistenceLogging) {
      console.log('[useLayoutPersistence] useEffect called with:', {
        lampsLength: lamps.length,
        stripsLength: strips.length,
        heatingPipesLength: heatingPipes.length,
        temperatureIconsLength: temperatureIcons.length,
        wallLightsLength: wallLights.length,
        isInitialLoad: isInitialLoad.current,
        skipNextSave: skipNextSave.current
      });
    }    // Skip saving if this is a programmatic update (like loading from storage)
    if (skipNextSave.current) {
      if (useLayoutPersistenceLogging) {
        console.log('[useLayoutPersistence] Skipping save - programmatic update');
      }
      skipNextSave.current = false;
      return;
    }
    
    // Skip saving on initial load until loadFromStorage has been called
    if (isInitialLoad.current) {
      if (useLayoutPersistenceLogging) {
        console.log('[useLayoutPersistence] Skipping save - initial load not complete');
      }
      return;
    }
    
    const data = serialize();

    if (useLayoutPersistenceLogging) {
       console.log('[useLayoutPersistence] Saving to localStorage:', 
        data.lamps.length, 'lamps,',
        data.strips.length, 'strips,', 
        data.heatingPipes.length, 'heating pipes,',
        data.temperatureIcons.length, 'temperature icons,',
        data.wallLights.length, 'wall lights');
    }
   
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      if (useLayoutPersistenceLogging) {
        console.log('[useLayoutPersistence] Successfully saved to localStorage');
      }
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [lamps, strips, heatingPipes, temperatureIcons, wallLights, storageKey, serialize]);

  const undo = useCallback(() => {
    const current = serialize();
    const prev = undoStack.current.pop();
    if (prev) {
      redoStack.current.push(current);
      applySnapshot(prev);
    }
  }, [serialize, applySnapshot]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (next) {
      const current = serialize();
      undoStack.current.push(current);
      applySnapshot(next);
    }
  }, [serialize, applySnapshot]);

  const loadFromStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
         if (useLayoutPersistenceLogging) {
          console.log('[loadFromStorage] Raw localStorage value:', saved);
        }
        
        const data = JSON.parse(saved);
        if (useLayoutPersistenceLogging) {
          console.log('[useLayoutPersistence] Loading from localStorage:', 
            data.lamps?.length || 0, 'lamps,',
            data.strips?.length || 0, 'strips,',
            data.heatingPipes?.length || 0, 'heating pipes,',
            data.temperatureIcons?.length || 0, 'temperature icons,',
            data.wallLights?.length || 0, 'wall lights');
          console.log('[loadFromStorage] Actual data structure:', data);
        }
       
        applySnapshot({
          lamps: data.lamps || [],
          strips: data.strips || [],
          heatingPipes: data.heatingPipes || [],
          temperatureIcons: data.temperatureIcons || [],
          heatPumps: data.heatPumps || [],
          compressors: data.compressors || [],
          fans: data.fans || [],
          heatpumpCompressors: data.heatpumpCompressors || [],
          heatpumpIndoorUnits: data.heatpumpIndoorUnits || [],
          wallLights: data.wallLights || []
        });
      }
      // Mark initial load as complete
      isInitialLoad.current = false;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      isInitialLoad.current = false;
    }
  }, [storageKey, applySnapshot]);

  return {
    commitChange,
    undo,
    redo,
    loadFromStorage,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    serialize
  };
};