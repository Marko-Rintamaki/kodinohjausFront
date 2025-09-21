import { useState, useCallback } from 'react';

export type ToolType = 'strip' | 'heating' | 'lamp' | 'wallLight' | 'mirror' | 'spot' | 'temperature' | 'heatpump' | 'compressor' | 'fan' | 'heatpump-compressor' | 'heatpump-indoor-unit';

interface DrawingState {
  active: boolean;
  stripId: string | null;
}

interface Point {
  x: number;
  y: number;
}

interface LEDStripModel {
  id: string;
  points: Point[];
  on: boolean;
  label?: string;
  brightness?: number;
  color?: string;
  relayId?: number;
}

interface HeatingPipeModel {
  id: string;
  points: Point[];
  on: boolean;
  label?: string;
  relayId?: number;
}

export const useDrawingLogic = (
  selectedTool: ToolType,
  setStrips: (updater: (prev: LEDStripModel[]) => LEDStripModel[]) => void,
  setHeatingPipes: (updater: (prev: HeatingPipeModel[]) => HeatingPipeModel[]) => void,
  imgSize: { w: number; h: number } | null,
  scale: number,
  translate: { x: number; y: number },
  commitChange: (updater: () => void) => void
) => {
  const [drawing, setDrawing] = useState<DrawingState>({ active: false, stripId: null });

  const startDrawing = useCallback(() => {
    if (drawing.active || (selectedTool !== 'strip' && selectedTool !== 'heating')) return null;
    
    const newId = selectedTool === 'heating' ? `H${Date.now()}` : `S${Date.now()}`;
    
    commitChange(() => {
      if (selectedTool === 'heating') {
        const newPipe: HeatingPipeModel = { id: newId, points: [], on: false, relayId: undefined };
        setHeatingPipes(prev => [...prev, newPipe]);
      } else {
        const newStrip: LEDStripModel = { id: newId, points: [], on: false, relayId: undefined };
        setStrips(prev => [...prev, newStrip]);
      }
    });
    
    setDrawing({ active: true, stripId: newId });
    return newId;
  }, [drawing.active, selectedTool, commitChange, setStrips, setHeatingPipes]);

  const addPointToStrip = useCallback((stripId: string, clientX: number, clientY: number, containerRect: DOMRect) => {
    if (!imgSize) return;
    
    // Translate client to image space
    const xImg = (clientX - containerRect.left - translate.x) / scale;
    const yImg = (clientY - containerRect.top - translate.y) / scale;
    const relX = Math.min(1, Math.max(0, xImg / imgSize.w));
    const relY = Math.min(1, Math.max(0, yImg / imgSize.h));
    
    const isHeatingPipe = stripId.startsWith('H');
    
    commitChange(() => {
      if (isHeatingPipe) {
        setHeatingPipes(prev => prev.map(p => {
          if (p.id !== stripId) return p;
          
          // First point - just add it
          if (p.points.length === 0) {
            return { ...p, points: [{ x: parseFloat(relX.toFixed(4)), y: parseFloat(relY.toFixed(4)) }] };
          }
          
          // Subsequent points - add as-is (no snapping for heating pipes)
          const newX = parseFloat(relX.toFixed(4));
          const newY = parseFloat(relY.toFixed(4));
          
          // Don't add if no movement
          const last = p.points[p.points.length - 1];
          if (newX === last.x && newY === last.y) return p;
          
          return { ...p, points: [...p.points, { x: newX, y: newY }] };
        }));
      } else {
        setStrips(prev => prev.map(s => {
          if (s.id !== stripId) return s;
          
          // First point - just add it
          if (s.points.length === 0) {
            return { ...s, points: [{ x: parseFloat(relX.toFixed(4)), y: parseFloat(relY.toFixed(4)) }] };
          }
          
          // Subsequent points - add as-is (no snapping)
          const newX = parseFloat(relX.toFixed(4));
          const newY = parseFloat(relY.toFixed(4));
          
          // Don't add if no movement
          const last = s.points[s.points.length - 1];
          if (newX === last.x && newY === last.y) return s;
          
          return { ...s, points: [...s.points, { x: newX, y: newY }] };
        }));
      }
    });
  }, [imgSize, scale, translate, commitChange, setStrips, setHeatingPipes]);

  const finishDrawing = useCallback((stripId: string) => {
    commitChange(() => {
      if (stripId.startsWith('H')) {
        setHeatingPipes(prev => prev.map(p => {
          if (p.id !== stripId) return p;
          if (p.points.length < 2) return { ...p, points: [] };
          return p;
        }));
        setHeatingPipes(prev => prev.filter(p => !(p.id === stripId && p.points.length === 0)));
      } else {
        setStrips(prev => prev.map(s => {
          if (s.id !== stripId) return s;
          if (s.points.length < 2) return { ...s, points: [] };
          return s;
        }));
        setStrips(prev => prev.filter(s => !(s.id === stripId && s.points.length === 0)));
      }
    });
    setDrawing({ active: false, stripId: null });
  }, [commitChange, setStrips, setHeatingPipes]);

  const cancelDrawing = useCallback((stripId: string) => {
    commitChange(() => {
      if (stripId.startsWith('H')) {
        setHeatingPipes(prev => prev.filter(p => p.id !== stripId));
      } else {
        setStrips(prev => prev.filter(s => s.id !== stripId));
      }
    });
    setDrawing({ active: false, stripId: null });
  }, [commitChange, setStrips, setHeatingPipes]);

  const shortenStrip = useCallback((stripId: string) => {
    commitChange(() => {
      if (stripId.startsWith('H')) {
        setHeatingPipes(prev => prev.map(p => {
          if (p.id !== stripId || p.points.length <= 1) return p;
          return { ...p, points: p.points.slice(0, -1) };
        }));
      } else {
        setStrips(prev => prev.map(s => {
          if (s.id !== stripId || s.points.length <= 1) return s;
          return { ...s, points: s.points.slice(0, -1) };
        }));
      }
    });
  }, [commitChange, setStrips, setHeatingPipes]);

  return {
    drawing,
    startDrawing,
    addPointToStrip,
    finishDrawing,
    cancelDrawing,
    shortenStrip
  };
};
