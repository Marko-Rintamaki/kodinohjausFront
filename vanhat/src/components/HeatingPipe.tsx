import React, { useMemo } from 'react';

export interface HeatingPipePoint { x:number; y:number; }
export interface HeatingPipeProps {
  points: HeatingPipePoint[]; // relative 0..1 coordinates
  on?: boolean;
  defaultOn?: boolean;
  onChange?: (on:boolean)=>void;
  baseWidth: number;
  baseHeight: number;
  admin?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  id?: string;
  onToggle?: ()=>void;
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
    style.dataset.heatingPipeStyles = 'true';
    style.textContent = `
      .heating-pipe-root { }
      .heating-pipe-root.selected { filter:drop-shadow(0 0 4px #3b82f6); }
      .heating-pipe-path { 
        stroke:#3b82f6; 
        stroke-width:2; 
        fill:none; 
        stroke-linecap:round; 
        stroke-linejoin:round; 
        stroke-dasharray:12,8;
        transition: stroke .35s;
        pointer-events:none;
      }
      .heating-pipe-root.on .heating-pipe-path { 
        stroke:#dc2626; 
        stroke-dasharray:none;
      }
      .heating-pipe-handle { 
        fill:#1e293b; 
        stroke:#3b82f6; 
        stroke-width:1.5; 
        cursor:move; 
      }
      .heating-pipe-root:not(.admin) .heating-pipe-handle { display:none; }
    `;
    document.head.appendChild(style);
    injected = true;
  };
})();

const HeatingPipe: React.FC<HeatingPipeProps> = ({
  points,
  on = false,
  baseWidth,
  baseHeight,
  admin = false,
  className = '',
  style = {},
  title = '',
  id,
  onHandlePointerDown,
  onRootPointerDown,
  onRootContextMenu,
  selected = false,
}) => {
  ensureStyles();

  const active = on;

  // Convert relative coordinates to absolute pixel coordinates
  const absPts = useMemo(() => 
    points.map(p => ({ x: p.x * baseWidth, y: p.y * baseHeight })), 
    [points, baseWidth, baseHeight]
  );

  // Create path - straight lines between points for now
  const pathD = useMemo(() => {
    if (absPts.length < 2) return '';
    
    let d = `M${absPts[0].x},${absPts[0].y}`;
    
    for (let i = 1; i < absPts.length; i++) {
      const curr = absPts[i];
      d += ` L${curr.x},${curr.y}`;
    }
    
    return d;
  }, [absPts]);

  return (
    <g
      className={`heating-pipe-root${active?' on':''}${admin?' admin':''}${selected?' selected':''} ${className}`.trim()}
      onPointerDown={(e)=> { if(admin && e.button===0){ e.stopPropagation(); onRootPointerDown?.(e); } }}
      onContextMenu={(e)=> { if(admin){ e.preventDefault(); e.stopPropagation(); onRootContextMenu?.(e); } }}
      data-id={id}
      style={style}
    >
      {/* Visible heating pipe path */}
      <path className="heating-pipe-path" d={pathD} />
      
      {/* Admin handles for each point */}
      {admin && absPts.map((p,i)=>(
        <rect
          key={i}
          className="heating-pipe-handle"
          x={p.x-7}
          y={p.y-7}
          width={14}
          height={14}
          data-index={i}
          onPointerDown={(e)=>{ e.stopPropagation(); onHandlePointerDown?.(e, i); }}
          onClick={(e)=> e.stopPropagation()}
        />
      ))}
      
      <title>{title}</title>
    </g>
  );
};

export default HeatingPipe;
