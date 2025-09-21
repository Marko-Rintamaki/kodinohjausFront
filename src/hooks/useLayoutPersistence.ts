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

// Layout snapshot for persistence
export interface LayoutSnapshot {
  heatingPipes: HeatingPipeModel[];
  // Other component arrays will be added later as needed
  // lamps: Lamp[];
  // strips: LEDStripModel[];
  // temperatureIcons: TemperatureIconModel[];
  // ... etc
}

export const useLayoutPersistence = (
  heatingPipes: HeatingPipeModel[],
  setHeatingPipes: (pipes: HeatingPipeModel[]) => void,
  storageKey: string = 'homeLayout:v7'
) => {
  const undoStack = useRef<LayoutSnapshot[]>([]);
  const redoStack = useRef<LayoutSnapshot[]>([]);
  const isInitialLoad = useRef(true);
  const skipNextSave = useRef(false);

  const serialize = useCallback(
    (): LayoutSnapshot => ({ 
      heatingPipes
    }),
    [heatingPipes]
  );

  const applySnapshot = useCallback((snap: LayoutSnapshot) => {
    if (useLayoutPersistenceLogging) {
      console.log('[useLayoutPersistence] Applying snapshot:', {
        heatingPipes: snap.heatingPipes?.length || 0
      });
    }
    
    skipNextSave.current = true;
    setHeatingPipes(snap.heatingPipes || []);
    
    if (useLayoutPersistenceLogging) {
      console.log('[useLayoutPersistence] Snapshot applied');
    }
  }, [setHeatingPipes]);

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
        data.heatingPipes.length, 'heating pipes');
    }
   
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      if (useLayoutPersistenceLogging) {
        console.log('[useLayoutPersistence] Successfully saved to localStorage');
      }
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [heatingPipes, storageKey, serialize]);

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
            data.heatingPipes?.length || 0, 'heating pipes');
          console.log('[loadFromStorage] Actual data structure:', data);
        }
       
        applySnapshot({
          heatingPipes: data.heatingPipes || []
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