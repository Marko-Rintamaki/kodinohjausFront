/**
 * Suppea ZoomPan hook - vain oleelliset toiminnot
 * - Hiiren scroll wheel zoomaus
 * - Hiiren drag panorointi  
 * - EI touch/pinch tukea (ei ylimääräistä)
 */
import { useState, useRef, useCallback } from 'react';

export const useZoomAndPan = () => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [panning, setPanning] = useState(false);

  const panStart = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);

  // Zoom rajat






  // Hiiren drag aloitus (toimii myös touchilla)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    panStart.current = { 
      x: e.clientX, 
      y: e.clientY, 
      origX: translate.x, 
      origY: translate.y 
    };
    setPanning(true);
  }, [translate]);

  // Hiiren drag liike (toimii myös touchilla)
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!panning || !panStart.current) return;

    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    
    setTranslate({
      x: panStart.current.origX + dx,
      y: panStart.current.origY + dy
    });
  }, [panning]);

  // Hiiren drag lopetus (toimii myös touchilla)
  const handlePointerUp = useCallback(() => {
    setPanning(false);
    panStart.current = null;
  }, []);

  return {
    scale,
    translate,
    imgSize,
    panning,
    setImgSize,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    // Suorat setterit wheel-handlerille
    setScale,
    setTranslate
  };
};