import React, { useState } from 'react';

interface HeatPumpProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  position: { x: number; y: number }; // Relative position (0..1)
  baseWidth: number;
  baseHeight: number;
  id?: string;
  onPointerDown?: (e: React.PointerEvent) => void;
}

const ensureStyles = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.dataset.heatPumpStyles = 'true';
    style.textContent = `
      .heatpump-root { 
        position: absolute; 
        user-select: none; 
        width: 80px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        background: none !important;
        cursor: pointer;
        z-index: 10;
      }
      .heatpump-root::before {
        display: none !important;
      }
      .heatpump-unit {
        position: relative;
        z-index: 1;
        transition: all 0.3s ease;
      }
      .heatpump-unit svg { 
        width: 100%; 
        height: auto; 
        overflow: visible; 
        display: block;
      }
      .heatpump-body { 
        fill: #4a5568; 
        stroke: #2d3748; 
        stroke-width: 2; 
        transition: all 0.3s ease; 
      }
      .heatpump-coil { 
        fill: #e53e3e; 
        stroke: #c53030; 
        stroke-width: 1.5; 
      }
      .heatpump-fan { 
        fill: #cbd5e0; 
        stroke: #a0aec0; 
        stroke-width: 1; 
        transform-origin: center; 
        animation: spin 2s linear infinite; 
      }
      .heatpump-root.off .heatpump-fan { 
        animation: none; 
      }
      .heatpump-title {
        font-size: 10px;
        font-weight: 500;
        color: #2d3748;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 80px;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    injected = true;
  };
})();

const HeatPump: React.FC<HeatPumpProps> = ({
  size = 80,
  className = '',
  style = {},
  title = 'Lämpöpumppu',
  position,
  baseWidth,
  baseHeight,
  id,
  onPointerDown
}) => {
  ensureStyles();
  
  const [on] = useState(false);

  // Convert relative position to absolute pixels
  const left = position.x * baseWidth;
  const top = position.y * baseHeight;

  return (
    <div
      className={`heatpump-root ${!on ? 'off' : ''} ${className}`.trim()}
      style={{
        ...style,
        left: `${left}px`,
        top: `${top}px`,
        width: `${size}px`
      }}
      data-id={id}
      onPointerDown={onPointerDown}
    >
      <div className="heatpump-unit">
        <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
          {/* Heat pump body */}
          <rect className="heatpump-body" x="5" y="10" width="70" height="40" rx="8" />
          
          {/* Coils/heat exchanger */}
          <rect className="heatpump-coil" x="15" y="20" width="12" height="20" rx="2" />
          <rect className="heatpump-coil" x="35" y="20" width="12" height="20" rx="2" />
          <rect className="heatpump-coil" x="55" y="20" width="12" height="20" rx="2" />
          
          {/* Fan */}
          <circle className="heatpump-fan" cx="40" cy="30" r="8" />
          <path className="heatpump-fan" d="M40,22 L40,38 M32,30 L48,30 M34,24 L46,36 M46,24 L34,36" strokeWidth="2" />
        </svg>
      </div>
      {title && <div className="heatpump-title">{title}</div>}
    </div>
  );
};

export default HeatPump;