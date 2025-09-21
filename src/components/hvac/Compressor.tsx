import React, { useState } from 'react';

interface CompressorProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  compressorId?: string;
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
    style.dataset.compressorStyles = 'true';
    style.textContent = `
      .compressor-root { 
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
      .compressor-root::before {
        display: none !important;
      }
      .compressor-unit {
        position: relative;
        z-index: 1;
        transition: all 0.3s ease;
      }
      .compressor-unit svg { 
        width: 100%; 
        height: auto; 
        overflow: visible; 
        display: block;
      }
      .compressor-body { 
        fill: #4a5568; 
        stroke: #2d3748; 
        stroke-width: 2; 
        transition: all 0.3s ease; 
      }
      .compressor-piston { 
        fill: #e53e3e; 
        stroke: #c53030; 
        stroke-width: 1.5; 
      }
      .compressor-cooling { 
        fill: none; 
        stroke: #3182ce; 
        stroke-width: 2; 
        stroke-linecap: round; 
      }
      .compressor-root.on .compressor-body {
        fill: #2d3748;
      }
      .compressor-root.on .compressor-piston {
        fill: #fc8181;
      }
      .compressor-title {
        font-size: 10px;
        font-weight: 500;
        color: #2d3748;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 80px;
      }
    `;
    document.head.appendChild(style);
    injected = true;
  };
})();

const Compressor: React.FC<CompressorProps> = ({
  size = 80,
  className = '',
  style = {},
  title = 'Kompressori',
  compressorId: _compressorId,
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
      className={`compressor-root ${on ? 'on' : ''} ${className}`.trim()}
      style={{
        ...style,
        left: `${left}px`,
        top: `${top}px`,
        width: `${size}px`
      }}
      data-id={id}
      onPointerDown={onPointerDown}
    >
      <div className="compressor-unit">
        <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
          {/* Compressor body */}
          <rect className="compressor-body" x="10" y="15" width="60" height="30" rx="8" />
          
          {/* Piston cylinders */}
          <rect className="compressor-piston" x="20" y="10" width="8" height="40" rx="4" />
          <rect className="compressor-piston" x="36" y="10" width="8" height="40" rx="4" />
          <rect className="compressor-piston" x="52" y="10" width="8" height="40" rx="4" />
          
          {/* Cooling lines */}
          <path className="compressor-cooling" d="M15,20 Q20,15 25,20 Q30,25 35,20" />
          <path className="compressor-cooling" d="M45,20 Q50,15 55,20 Q60,25 65,20" />
          
          {/* Intake and outlet ports */}
          <circle cx="15" cy="30" r="3" fill="#63b3ed" stroke="#3182ce" strokeWidth="1" />
          <circle cx="65" cy="30" r="3" fill="#fc8181" stroke="#e53e3e" strokeWidth="1" />
        </svg>
      </div>
      {title && <div className="compressor-title">{title}</div>}
    </div>
  );
};

export default Compressor;