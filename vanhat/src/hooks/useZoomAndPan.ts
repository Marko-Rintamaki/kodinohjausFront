import { useState, useRef, useCallback, useEffect } from 'react';

export const useZoomAndPan = () => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [panning, setPanning] = useState(false);
  const [pinching, setPinching] = useState(false);

  const panStart = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ 
    dist: number; 
    scale: number; 
    world: { x: number; y: number }; 
    midpoint: { x: number; y: number } 
  } | null>(null);
  const userInteractedRef = useRef(false);
  const pinchThreshold = 10; // pixels before pinch starts

  // Prevent double-tap zoom (but allow pinch gestures)
  useEffect(() => {
    const preventDoubleTapZoom = (e: Event) => {
      const touchEvent = e as TouchEvent;
      // Only prevent single touch events (double-tap), allow multi-touch (pinch)
      if (touchEvent.touches && touchEvent.touches.length === 1) {
        e.preventDefault();
      }
      // Allow multi-touch gestures (pinch) to pass through to our handler
    };

    // Prevent default touch behavior only on the floorplan area
    const floorplanElement = document.querySelector('.floorplan-outer');
    if (floorplanElement) {
      floorplanElement.addEventListener('touchstart', preventDoubleTapZoom, { passive: false });
      // Don't prevent touchmove for multi-touch to allow smooth pinch
    }

    return () => {
      if (floorplanElement) {
        floorplanElement.removeEventListener('touchstart', preventDoubleTapZoom);
      }
    };
  }, []);

  // Auto-center image when it loads and no user interaction yet
  useEffect(() => {
    if (!imgSize || !containerSize.w || !containerSize.h || userInteractedRef.current) return;

    const scaleX = containerSize.w / imgSize.w;
    const scaleY = containerSize.h / imgSize.h;
    const autoScale = Math.min(scaleX, scaleY, 1);

    const imgDisplayW = imgSize.w * autoScale;
    const imgDisplayH = imgSize.h * autoScale;
    const centerX = (containerSize.w - imgDisplayW) / 2;
    const centerY = (containerSize.h - imgDisplayH) / 2;

    setScale(autoScale);
    setTranslate({ x: centerX, y: centerY });
  }, [imgSize, containerSize]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Don't prevent default on mobile to allow native zoom
    if (e.pointerType !== 'touch') {
      e.preventDefault();
    }
    userInteractedRef.current = true;
    const pointer = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, pointer);

    if (pointers.current.size === 1) {
      // Single pointer - start panning
      panStart.current = { x: e.clientX, y: e.clientY, origX: translate.x, origY: translate.y };
      setPanning(true);
      setPinching(false);
    } else if (pointers.current.size === 2) {
      // Two pointers - prepare for pinch (but wait for threshold)
      const pointerArray = Array.from(pointers.current.values());
      const [p1, p2] = pointerArray;
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      
      pinchStart.current = {
        dist,
        scale,
        world: { x: translate.x, y: translate.y },
        midpoint
      };
      setPanning(false); // Stop panning when second finger touches
    }
  }, [translate, scale]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1 && panStart.current && panning && !pinching) {
      // Single pointer panning (only if not pinching)
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setTranslate({
        x: panStart.current.origX + dx,
        y: panStart.current.origY + dy
      });
    } else if (pointers.current.size === 2 && pinchStart.current) {
      // Two pointer pinch/zoom for all devices
      const pointerArray = Array.from(pointers.current.values());
      const [p1, p2] = pointerArray;
      const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const currentMidpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      // Check if we've moved enough to start pinching
      const distChange = Math.abs(currentDist - pinchStart.current.dist);
      if (!pinching && distChange > pinchThreshold) {
        setPinching(true);
      }

      if (pinching && pinchStart.current.dist > 0) {
        const scaleRatio = currentDist / pinchStart.current.dist;
        const newScale = Math.max(0.1, Math.min(5, pinchStart.current.scale * scaleRatio));

        // Get container for proper coordinate calculation
        const container = document.querySelector('.floorplan-outer') as HTMLElement;
        if (container) {
          const rect = container.getBoundingClientRect();
          
          // Convert pinch midpoint to container-relative coordinates
          const containerMidpointX = currentMidpoint.x - rect.left;
          const containerMidpointY = currentMidpoint.y - rect.top;
          
          // Zoom towards pinch midpoint (same logic as wheel zoom)
          const scaleChange = newScale / scale;
          const newTranslateX = containerMidpointX - (containerMidpointX - translate.x) * scaleChange;
          const newTranslateY = containerMidpointY - (containerMidpointY - translate.y) * scaleChange;

          setScale(newScale);
          setTranslate({ x: newTranslateX, y: newTranslateY });
        }
      }
    }
  }, [panning, pinching, pinchThreshold]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);

    if (pointers.current.size === 0) {
      panStart.current = null;
      setPanning(false);
      pinchStart.current = null;
      setPinching(false);
    } else if (pointers.current.size === 1) {
      // Back to single pointer from pinch
      pinchStart.current = null;
      setPinching(false);
      const remainingPointer = Array.from(pointers.current.values())[0];
      panStart.current = {
        x: remainingPointer.x,
        y: remainingPointer.y,
        origX: translate.x,
        origY: translate.y
      };
      setPanning(true);
    }
  }, [translate]);

  // Handle wheel events with native event listener
  useEffect(() => {
    const handleNativeWheel = (e: Event) => {
      const wheelEvent = e as WheelEvent;
      wheelEvent.preventDefault();
      userInteractedRef.current = true;

      const zoomSpeed = 0.1;
      const delta = -wheelEvent.deltaY * zoomSpeed;
      const newScale = Math.max(0.1, Math.min(5, scale * Math.exp(delta * 0.01)));

      // Get container element
      const container = document.querySelector('.floorplan-outer') as HTMLElement;
      if (!container) return;

      // Zoom towards mouse cursor
      const rect = container.getBoundingClientRect();
      const mouseX = wheelEvent.clientX - rect.left;
      const mouseY = wheelEvent.clientY - rect.top;

      const scaleRatio = newScale / scale;
      const newTranslateX = mouseX - (mouseX - translate.x) * scaleRatio;
      const newTranslateY = mouseY - (mouseY - translate.y) * scaleRatio;

      setScale(newScale);
      setTranslate({ x: newTranslateX, y: newTranslateY });
    };

    const container = document.querySelector('.floorplan-outer');
    if (container) {
      // Add passive: false to allow preventDefault
      container.addEventListener('wheel', handleNativeWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleNativeWheel);
    }
  }, [scale, translate]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // This is now just a fallback - the real handling is done by native listener
    e.stopPropagation();
  }, []);

  // Convert client coordinates to image coordinates
  const clientToImageCoords = useCallback((clientX: number, clientY: number, containerRect: DOMRect) => {
    if (!imgSize) return null;
    
    const xImg = (clientX - containerRect.left - translate.x) / scale;
    const yImg = (clientY - containerRect.top - translate.y) / scale;
    const relX = Math.min(1, Math.max(0, xImg / imgSize.w));
    const relY = Math.min(1, Math.max(0, yImg / imgSize.h));
    
    return {
      imageX: xImg,
      imageY: yImg,
      relativeX: parseFloat(relX.toFixed(4)),
      relativeY: parseFloat(relY.toFixed(4))
    };
  }, [imgSize, scale, translate]);

  return {
    scale,
    translate,
    imgSize,
    containerSize,
    panning,
    setImgSize,
    setContainerSize,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    clientToImageCoords
  };
};
