import React, { useState } from 'react';

interface FanProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  fanId?: string;
  fanType?: 'indoor' | 'outdoor';
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
    style.dataset.fanStyles = 'true';
    style.textContent = `
      .fan-root { 
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
      .fan-root::before {
        display: none !important;
      }
      .fan-unit {
        position: relative;
        z-index: 1;
        transition: all 0.3s ease;
      }
      .fan-unit svg { 
        width: 100%; 
        height: auto; 
        overflow: visible; 
        display: block;
      }
      .fan-housing { 
        fill: #4a5568; 
        stroke: #2d3748; 
        stroke-width: 2; 
        transition: all 0.3s ease; 
      }
      .fan-blades {
        fill: #cbd5e0;
        stroke: #a0aec0;
        stroke-width: 1;
        transform-origin: center;
        transition: all 0.3s ease;
        animation: spin 1s linear infinite;
      }
      .fan-root.off .fan-blades {
        animation: none;
      }
      .fan-root.outdoor .fan-housing {
        fill: #2d3748;
      }
      .fan-root.outdoor .fan-blades {
        fill: #a0aec0;
      }
      .fan-title {
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

const Fan: React.FC<FanProps> = ({
  size = 80,
  className = '',
  style = {},
  title = 'Puhallin',
  fanId: _fanId,
  fanType = 'indoor',
  position,
  baseWidth,
  baseHeight,
  id,
  onPointerDown
}) => {
  ensureStyles();
  
  const [on] = useState(true);

  // Convert relative position to absolute pixels
  const left = position.x * baseWidth;
  const top = position.y * baseHeight;

  return (
    <div
      className={`fan-root ${fanType} ${!on ? 'off' : ''} ${className}`.trim()}
      style={{
        ...style,
        left: `${left}px`,
        top: `${top}px`,
        width: `${size}px`
      }}
      data-id={id}
      onPointerDown={onPointerDown}
    >
      <div className="fan-unit">
        <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
          {/* Fan housing */}
          <circle className="fan-housing" cx="40" cy="40" r="35" strokeWidth="3" fill="none" />
          
          {/* Fan blades */}
          <g className="fan-blades">
            <path d="M40,40 L25,20 A20,20 0 0,1 55,20 Z" />
            <path d="M40,40 L60,25 A20,20 0 0,1 60,55 Z" />
            <path d="M40,40 L55,60 A20,20 0 0,1 25,60 Z" />
            <path d="M40,40 L20,55 A20,20 0 0,1 20,25 Z" />
          </g>
          
          {/* Center hub */}
          <circle cx="40" cy="40" r="6" fill="#374151" />
        </svg>
      </div>
      {title && <div className="fan-title">{title}</div>}
    </div>
  );
};

export default Fan;