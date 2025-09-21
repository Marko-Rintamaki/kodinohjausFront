import React, { useState, useEffect } from 'react';
import { getUpdateStatus, onUpdateStatusChange } from '../helpers/socketHelper';

// Debug logging flags - set to true to enable specific logging categories:
// heatPumpLogging: HeatPump component modulation values and status updates
var heatPumpLogging = false;

interface HeatPumpProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

const ensureStyles = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.dataset.heatPumpStyles = 'true';
    style.textContent = `
      .heatpump-root { 
        position: relative; 
        user-select: none; 
        width: 80px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        background: none !important;
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
      .heatpump-fan { 
        fill: #718096; 
        stroke: #2d3748; 
        stroke-width: 1; 
        transform-origin: center;
        transition: all 0.3s ease;
      }
      .heatpump-compressor { 
        fill: #e53e3e; 
        stroke: #c53030; 
        stroke-width: 2; 
        transition: all 0.3s ease;
      }
      .heatpump-pipes { 
        fill: none; 
        stroke: #4a5568; 
        stroke-width: 3; 
        stroke-linecap: round;
        transition: all 0.3s ease;
      }
      
      /* Running state */
      .heatpump-root.running .heatpump-body { 
        fill: #3182ce; 
        stroke: #2c5aa0;
        filter: drop-shadow(0 0 8px #3182ce);
      }
      .heatpump-root.running .heatpump-compressor { 
        fill: #38a169; 
        stroke: #2f855a;
        filter: drop-shadow(0 0 6px #38a169);
      }
      .heatpump-root.running .heatpump-fan { 
        animation: fanRotate 0.8s linear infinite;
        filter: drop-shadow(0 0 4px #718096);
      }
      .heatpump-root.running .heatpump-pipes { 
        stroke: #3182ce;
        filter: drop-shadow(0 0 4px #3182ce);
      }
      
      @keyframes fanRotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .heatpump-status {
        font-size: 10px;
        font-weight: 600;
        text-align: center;
        padding: 2px 6px;
        border-radius: 8px;
        min-width: 50px;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        transition: all 0.3s ease;
      }
      .heatpump-status.off {
        background: #718096;
        color: #f7fafc;
      }
      .heatpump-status.running {
        background: linear-gradient(135deg, #38a169, #3182ce);
        animation: statusPulse 2s ease-in-out infinite;
      }
      
      @keyframes statusPulse {
        0%, 100% { 
          box-shadow: 0 0 6px rgba(56, 161, 105, 0.6);
          transform: scale(1);
        }
        50% { 
          box-shadow: 0 0 12px rgba(56, 161, 105, 0.8);
          transform: scale(1.02);
        }
      }
    `;
    document.head.appendChild(style);
    injected = true;
  };
})();

const HeatPump: React.FC<HeatPumpProps> = ({
  size = 80,
  className = '',
  style,
  title = 'Lämpöpumppu'
}) => {
  ensureStyles();
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Extract heat pump status from update data
    const extractHeatPumpStatus = (statusData: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Look for Bosch heat pump actualModulation value
      if (statusData.Bosch && Array.isArray(statusData.Bosch)) {
        for (const boschGroup of statusData.Bosch) {
          if (boschGroup.paths && Array.isArray(boschGroup.paths)) {
            const modulationPath = boschGroup.paths.find((path: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
              path.id === '/heatSources/actualModulation'
            );
            if (modulationPath && typeof modulationPath.value === 'number') {
              // 0 = off, 100 = on (or any value > 0 means running)
              if (heatPumpLogging) {
                console.log('[HeatPump] actualModulation value:', modulationPath.value);
              }
              return modulationPath.value > 0;
            }
          }
        }
      }
      
      // Fallback: if no Bosch data found, assume not running
      return false;
    };

    // Get initial status
    const initialStatus = getUpdateStatus();
    if (initialStatus) {
      setIsRunning(extractHeatPumpStatus(initialStatus));
    }

    // Subscribe to status updates
    const unsubscribe = onUpdateStatusChange((statusData) => {
      setIsRunning(extractHeatPumpStatus(statusData));
    });

    return unsubscribe;
  }, []);

  return (
    <div
      className={`heatpump-root${isRunning ? ' running' : ''} ${className}`.trim()}
      style={{ width: size, ...style }}
      title={title}
    >
      <div className={`heatpump-status ${isRunning ? 'running' : 'off'}`}>
        {isRunning ? 'KÄYNNISSÄ' : 'PYSÄHDYKSISSÄ'}
      </div>
      
      <div className="heatpump-unit">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {/* Main unit body */}
          <rect className="heatpump-body" x="20" y="30" width="60" height="40" rx="8" />
          
          {/* Fan */}
          <g className="heatpump-fan">
            <circle cx="50" cy="45" r="12" fill="none" stroke="#718096" strokeWidth="1"/>
            <path d="M50,33 L50,57 M38,45 L62,45 M42,37 L58,53 M58,37 L42,53" />
          </g>
          
          {/* Compressor */}
          <circle className="heatpump-compressor" cx="70" cy="55" r="6" />
          
          {/* Pipes */}
          <path className="heatpump-pipes" d="M30,70 Q30,80 40,80 L60,80 Q70,80 70,70" />
          <path className="heatpump-pipes" d="M30,20 Q30,10 40,10 L60,10 Q70,10 70,20" />
          
          {/* Connection lines */}
          <line className="heatpump-pipes" x1="30" y1="70" x2="30" y2="50" />
          <line className="heatpump-pipes" x1="70" y1="20" x2="70" y2="35" />
        </svg>
      </div>
    </div>
  );
};

export default HeatPump;
