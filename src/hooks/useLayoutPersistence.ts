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
  on?: boolean;
  title?: string;
  // Other properties as needed
}

// Interface for HVAC component position (relative coordinates)
export interface HVACPosition {
  x: number; // 0..1 relative to baseWidth
  y: number; // 0..1 relative to baseHeight
}

// Interface for HeatPump model
export interface HeatPumpModel {
  id: string;
  position: HVACPosition;
  title?: string;
  on?: boolean;
  size?: number;
}

// Interface for AirConditioner model
export interface AirConditionerModel {
  id: string;
  position: HVACPosition;
  title?: string;
  compressorId?: string;
  fanId?: string;
  layout?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  size?: number;
}

// Interface for Fan model
export interface FanModel {
  id: string;
  position: HVACPosition;
  title?: string;
  fanId?: string;
  fanType?: 'indoor' | 'outdoor';
  size?: number;
}

// Interface for Compressor model
export interface CompressorModel {
  id: string;
  position: HVACPosition;
  title?: string;
  compressorId?: string;
  size?: number;
}

// Layout snapshot for persistence
export interface LayoutSnapshot {
  heatingPipes: HeatingPipeModel[];
  heatPumps: HeatPumpModel[];
  airConditioners: AirConditionerModel[];
  fans: FanModel[];
  compressors: CompressorModel[];
}

export const useLayoutPersistence = (
  heatingPipes: HeatingPipeModel[],
  setHeatingPipes: (pipes: HeatingPipeModel[]) => void,
  heatPumps: HeatPumpModel[],
  setHeatPumps: (pumps: HeatPumpModel[]) => void,
  airConditioners: AirConditionerModel[],
  setAirConditioners: (acs: AirConditionerModel[]) => void,
  fans: FanModel[],
  setFans: (fans: FanModel[]) => void,
  compressors: CompressorModel[],
  setCompressors: (compressors: CompressorModel[]) => void,
  storageKey: string = 'homeLayout:v8'
) => {
  const undoStack = useRef<LayoutSnapshot[]>([]);
  const redoStack = useRef<LayoutSnapshot[]>([]);
  const isInitialLoad = useRef(true);
  const skipNextSave = useRef(false);

  const serialize = useCallback(
    (): LayoutSnapshot => ({ 
      heatingPipes,
      heatPumps,
      airConditioners,
      fans,
      compressors
    }),
    [heatingPipes, heatPumps, airConditioners, fans, compressors]
  );

  const applySnapshot = useCallback((snap: LayoutSnapshot) => {
    if (useLayoutPersistenceLogging) {
      console.log('[useLayoutPersistence] Applying snapshot:', {
        heatingPipes: snap.heatingPipes?.length || 0,
        heatPumps: snap.heatPumps?.length || 0,
        airConditioners: snap.airConditioners?.length || 0,
        fans: snap.fans?.length || 0,
        compressors: snap.compressors?.length || 0
      });
    }
    
    skipNextSave.current = true;
    setHeatingPipes(snap.heatingPipes || []);
    setHeatPumps(snap.heatPumps || []);
    setAirConditioners(snap.airConditioners || []);
    setFans(snap.fans || []);
    setCompressors(snap.compressors || []);
    
    if (useLayoutPersistenceLogging) {
      console.log('[useLayoutPersistence] Snapshot applied');
    }
  }, [setHeatingPipes, setHeatPumps, setAirConditioners, setFans, setCompressors]);

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
        heatingPipesLength: heatingPipes.length,
        heatPumpsLength: heatPumps.length,
        airConditionersLength: airConditioners.length,
        fansLength: fans.length,
        compressorsLength: compressors.length,
        isInitialLoad: isInitialLoad.current,
        skipNextSave: skipNextSave.current
      });
    }
    
    // Skip saving if this is a programmatic update (like loading from storage)
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
        data.heatingPipes.length, 'heating pipes,',
        data.heatPumps.length, 'heat pumps,',
        data.airConditioners.length, 'air conditioners,',
        data.fans.length, 'fans,',
        data.compressors.length, 'compressors');
    }
   
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      if (useLayoutPersistenceLogging) {
        console.log('[useLayoutPersistence] Successfully saved to localStorage');
      }
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [heatingPipes, heatPumps, airConditioners, fans, compressors, storageKey, serialize]);

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
      let data = null;
      
      if (saved) {
        data = JSON.parse(saved);
      } else {
        // Try to load from older version and migrate
        const oldSaved = localStorage.getItem('homeLayout:v7');
        if (oldSaved) {
          const oldData = JSON.parse(oldSaved);
          // Migrate old data format to new format
          data = {
            heatingPipes: oldData.heatingPipes || [],
            heatPumps: oldData.heatPumps || [],
            airConditioners: oldData.airConditioners || [],
            fans: oldData.fans || [],
            compressors: oldData.compressors || []
          };
          // Save migrated data to new version
          localStorage.setItem(storageKey, JSON.stringify(data));
          if (useLayoutPersistenceLogging) {
            console.log('[useLayoutPersistence] Migrated layout from v7 to v8');
          }
        }
      }
      
      if (data) {
         if (useLayoutPersistenceLogging) {
          console.log('[loadFromStorage] Raw localStorage value:', saved || 'migrated from v7');
        }
        
        if (useLayoutPersistenceLogging) {
          console.log('[useLayoutPersistence] Loading from localStorage:', 
            data.heatingPipes?.length || 0, 'heating pipes,',
            data.heatPumps?.length || 0, 'heat pumps,',
            data.airConditioners?.length || 0, 'air conditioners,',
            data.fans?.length || 0, 'fans,',
            data.compressors?.length || 0, 'compressors');
          console.log('[loadFromStorage] Actual data structure:', data);
        }
       
        applySnapshot({
          heatingPipes: data.heatingPipes || [],
          heatPumps: data.heatPumps || [],
          airConditioners: data.airConditioners || [],
          fans: data.fans || [],
          compressors: data.compressors || []
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