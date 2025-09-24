import React, { useMemo, useState, useCallback } from 'react';

export interface LEDStripPoint { 
  x: number; 
  y: number; 
}

export interface LEDStripProps {
  points: LEDStripPoint[]; // relative 0..1 coordinates
  on?: boolean;
  defaultOn?: boolean;
  onChange?: (on: boolean) => void;
  spacing?: number; // spacing in px along path in image coordinate space
  spotRadius?: number; // radius of each LED spot (px in image space)
  baseWidth: number;
  baseHeight: number;
  pulse?: boolean;
  admin?: boolean;
  showSpots?: boolean; // render LED spots
  showPath?: boolean;  // render path stroke (for admin editing)
  pathColor?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  id?: string;
  onToggle?: () => void;
  onHandlePointerDown?: (e: React.PointerEvent, pointIndex: number) => void;
  onRootPointerDown?: (e: React.PointerEvent) => void;
  onRootContextMenu?: (e: React.MouseEvent) => void;
  selected?: boolean;
}

const ensureStyles = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.dataset.ledStripStyles = 'true';
    style.textContent = `
      .ledstrip-root { cursor: pointer; }
      .ledstrip-root.selected .ledstrip-spot { stroke: #fbbf24; }
      .ledstrip-root.selected { filter: drop-shadow(0 0 4px #fbbf24); }
      .ledstrip-path { stroke: transparent; stroke-width: 16; fill: none; stroke-linecap: round; stroke-linejoin: round; pointer-events: stroke; }
      .ledstrip-spot { fill: #444; stroke: #777; stroke-width: 2; transition: fill .35s, stroke .35s, filter .5s; }
      .ledstrip-root.on .ledstrip-spot { fill: #fbbf24; stroke: #fcd34d; filter: drop-shadow(0 0 5px #fcd34d) drop-shadow(0 0 20px #f59e0b); }
      .ledstrip-root.on.pulse-enabled .ledstrip-spot { animation: ledSpotPulse 2.3s ease-in-out infinite; }
      @keyframes ledSpotPulse { 0%, 100% { filter: drop-shadow(0 0 6px #fcd34d) drop-shadow(0 0 22px #f59e0b); } 50% { filter: drop-shadow(0 0 10px #fcd34d) drop-shadow(0 0 32px #f59e0b); } }
      .ledstrip-handle { fill: #1e293b; stroke: #facc15; stroke-width: 1.5; cursor: move; }
      .ledstrip-root:not(.admin) .ledstrip-handle { display: none; }
    `;
    document.head.appendChild(style);
    injected = true;
  };
})();

export const LEDStrip: React.FC<LEDStripProps> = ({
  points,
  on,
  defaultOn = false,
  onChange,
  spacing = 60,
  spotRadius = 6,
  baseWidth,
  baseHeight,
  pulse = true,
  admin = false,
  className = '',
  style,
  title = 'LED strip',
  id,
  onToggle,
  onHandlePointerDown,
  onRootPointerDown,
  onRootContextMenu,
  selected = false,
  showSpots = true,
  showPath = true,
  pathColor = '#475569'
}) => {
  ensureStyles();
  
  const [internalOn, setInternalOn] = useState(defaultOn);
  const controlled = typeof on === 'boolean';
  const active = controlled ? (on as boolean) : internalOn;
  
  const toggle = useCallback(() => { 
    const next = !active; 
    if (!controlled) setInternalOn(next); 
    onChange?.(next); 
    onToggle?.(); 
  }, [active, controlled, onChange, onToggle]);

  // Touch and pointer handlers for better mobile support
  const handleTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent double-firing with onClick
    e.stopPropagation();
    toggle();
  }, [toggle]);

  const handlePointer = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      e.preventDefault(); // Prevent double-firing with onClick
    }
    e.stopPropagation();
    toggle();
  }, [toggle]);

  // Convert relative to absolute coordinates
  const absPts = useMemo(() => 
    points.map(p => ({ x: p.x * baseWidth, y: p.y * baseHeight })), 
    [points, baseWidth, baseHeight]
  );

  const { pathD, spots } = useMemo(() => {
    if (absPts.length < 2) return { pathD: '', spots: [] as { x: number; y: number; }[] };
    
    const d = absPts.map((p, i) => i ? `L ${p.x} ${p.y}` : `M ${p.x} ${p.y}`).join(' ');
    
    const out: { x: number; y: number; }[] = [];
    
    // Process each segment individually with even spacing and corner points
    for (let i = 0; i < absPts.length - 1; i++) {
      const from = absPts[i];
      const to = absPts[i + 1];
      const segLen = Math.hypot(to.x - from.x, to.y - from.y);
      
      if (segLen === 0) continue;
      
      // Always include start point (corner) for first segment or if not already added
      if (i === 0 || out.length === 0 || 
         Math.hypot(out[out.length - 1].x - from.x, out[out.length - 1].y - from.y) > 1) {
        out.push({ x: from.x, y: from.y });
      }
      
      // Calculate how many intermediate spots fit with even spacing
      const maxSpots = Math.floor(segLen / spacing);
      if (maxSpots > 1) {
        // Distribute spots evenly along this segment (excluding endpoints)
        const actualSpacing = segLen / maxSpots;
        for (let j = 1; j < maxSpots; j++) {
          const t = j * actualSpacing / segLen;
          out.push({
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t
          });
        }
      }
      
      // Always include end point (corner) for last segment
      if (i === absPts.length - 2) {
        out.push({ x: to.x, y: to.y });
      }
    }
    
    return { pathD: d, spots: out };
  }, [absPts, spacing]);

  return (
    <g
      className={`ledstrip-root${active ? ' on' : ''}${pulse ? ' pulse-enabled' : ''}${admin ? ' admin' : ''}${selected ? ' selected' : ''} ${className}`.trim()}
      onClick={(e) => { e.stopPropagation(); toggle(); }}
      onTouchStart={handleTouch}
      onPointerDown={(e) => { 
        if (admin && e.button === 0) { 
          e.stopPropagation(); 
          onRootPointerDown?.(e); 
        } else if (!admin) {
          // In normal mode, handle pointer for touch/click
          handlePointer(e);
        }
      }}
      onContextMenu={(e) => { 
        if (admin) { 
          e.preventDefault(); 
          e.stopPropagation(); 
          onRootContextMenu?.(e); 
        } 
      }}
      data-id={id}
      style={{ ...style, touchAction: 'manipulation' }}
    >
      {/* Transparent path just for larger click area (no visible connecting line) */}
      <path 
        className="ledstrip-path" 
        d={pathD} 
        style={{ stroke: showPath ? pathColor : 'transparent' }} 
      />
      
      {/* LED spots along the path */}
      {showSpots && spots.map((s, i) => (
        <circle 
          key={i} 
          className="ledstrip-spot" 
          cx={s.x} 
          cy={s.y} 
          r={spotRadius} 
        />
      ))}
      
      {/* Admin handles for editing */}
      {admin && absPts.map((p, i) => (
        <rect
          key={i}
          className="ledstrip-handle"
          x={p.x - 7}
          y={p.y - 7}
          width={14}
          height={14}
          data-index={i}
          onPointerDown={(e) => { 
            e.stopPropagation(); 
            onHandlePointerDown?.(e, i); 
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ))}
      
      <title>{title}</title>
    </g>
  );
};

export default LEDStrip;