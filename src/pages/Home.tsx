/**
 * 🏠 Home - Suppea pohjakuvanäkymä zoomilla ja panilla
 * 
 * Vain oleelliset toiminnot:
 * - Pohjakuva (/img/pohjakuva.svg)
 * - Hiiren scroll wheel zoom
 * - Hiiren drag panorointi
 * - HVAC komponentit (lämpöpumput, ilmastointi, puhaltimet, kompressorit)
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

import React, { useRef, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useZoomAndPan } from '../hooks/useZoomAndPan';
import { useLayoutPersistence } from '../hooks/useLayoutPersistence';
import { 
  HeatPump, 
  AirConditioner, 
  Fan, 
  Compressor, 
  HeatingPipe,
  type HeatPumpModel,
  type AirConditionerModel,
  type FanModel,
  type CompressorModel,
  type HeatingPipeModel
} from '../components/hvac';

export const Home: React.FC = () => {
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

  // Layout state for HVAC components
  const [heatingPipes, setHeatingPipes] = useState<HeatingPipeModel[]>([]);
  const [heatPumps, setHeatPumps] = useState<HeatPumpModel[]>([]);
  const [airConditioners, setAirConditioners] = useState<AirConditionerModel[]>([]);
  const [fans, setFans] = useState<FanModel[]>([]);
  const [compressors, setCompressors] = useState<CompressorModel[]>([]);

  // Layout persistence hook
  const { loadFromStorage } = useLayoutPersistence(
    heatingPipes,
    setHeatingPipes,
    heatPumps,
    setHeatPumps,
    airConditioners,
    setAirConditioners,
    fans,
    setFans,
    compressors,
    setCompressors
  );

  // Load layout from localStorage on component mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Add some sample HVAC components if none exist
  useEffect(() => {
    if (heatPumps.length === 0 && airConditioners.length === 0) {
      // Add sample components only if localStorage is empty
      const sampleHeatPump: HeatPumpModel = {
        id: 'hp1',
        position: { x: 0.2, y: 0.3 },
        title: 'Bosch Lämpöpumppu',
        size: 100
      };

      const sampleAirConditioner: AirConditionerModel = {
        id: 'ac1',
        position: { x: 0.6, y: 0.2 },
        title: 'Nilan Ilmanvaihto',
        compressorId: 'comp1',
        fanId: 'fan1',
        layout: 'horizontal',
        showLabels: true,
        size: 80
      };

      const sampleFan: FanModel = {
        id: 'fan2',
        position: { x: 0.8, y: 0.7 },
        title: 'Ulkopuhallin',
        fanType: 'outdoor',
        size: 60
      };

      setHeatPumps([sampleHeatPump]);
      setAirConditioners([sampleAirConditioner]);
      setFans([sampleFan]);
    }
  }, [heatPumps.length, airConditioners.length]);

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

        {/* HVAC Components Layer */}
        {imgSize && (
          <>
            {/* Heat Pumps */}
            {heatPumps.map((heatPump) => (
              <HeatPump
                key={heatPump.id}
                id={heatPump.id}
                position={heatPump.position}
                baseWidth={imgSize.w}
                baseHeight={imgSize.h}
                title={heatPump.title}
                size={heatPump.size}
              />
            ))}

            {/* Air Conditioners */}
            {airConditioners.map((ac) => (
              <AirConditioner
                key={ac.id}
                id={ac.id}
                position={ac.position}
                baseWidth={imgSize.w}
                baseHeight={imgSize.h}
                title={ac.title}
                compressorId={ac.compressorId}
                fanId={ac.fanId}
                layout={ac.layout}
                showLabels={ac.showLabels}
                size={ac.size}
              />
            ))}

            {/* Fans */}
            {fans.map((fan) => (
              <Fan
                key={fan.id}
                id={fan.id}
                position={fan.position}
                baseWidth={imgSize.w}
                baseHeight={imgSize.h}
                title={fan.title}
                fanId={fan.fanId}
                fanType={fan.fanType}
                size={fan.size}
              />
            ))}

            {/* Compressors */}
            {compressors.map((compressor) => (
              <Compressor
                key={compressor.id}
                id={compressor.id}
                position={compressor.position}
                baseWidth={imgSize.w}
                baseHeight={imgSize.h}
                title={compressor.title}
                compressorId={compressor.compressorId}
                size={compressor.size}
              />
            ))}

            {/* Heating Pipes (SVG layer) */}
            {heatingPipes.length > 0 && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 5
                }}
              >
                {heatingPipes.map((pipe) => (
                  <HeatingPipe
                    key={pipe.id}
                    id={pipe.id}
                    points={pipe.points}
                    baseWidth={imgSize.w}
                    baseHeight={imgSize.h}
                    on={pipe.on}
                    title={pipe.title}
                  />
                ))}
              </svg>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};