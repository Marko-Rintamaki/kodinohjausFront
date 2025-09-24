import React, { useState, useEffect } from 'react';
import { getUpdateStatus, onUpdateStatusChange } from '../../helpers/socketHelper';

interface CompressorProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  compressorId?: string; // ID for identifying specific compressor in status data
}

const ensureStyles = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.dataset.compressorStyles = 'true';
    style.textContent = `
      .compressor-root { 
        position: relative; 
        user-select: none; 
        width: 80px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        background: none !important;
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
        fill: #718096; 
        stroke: #2d3748; 
        stroke-width: 1; 
        transition: all 0.3s ease;
      }
      .compressor-motor { 
        fill: #e53e3e; 
        stroke: #c53030; 
        stroke-width: 2; 
        transition: all 0.3s ease;
      }
      .compressor-pipes { 
        fill: none; 
        stroke: #4a5568; 
        stroke-width: 3; 
        stroke-linecap: round;
        transition: all 0.3s ease;
      }
      .compressor-pressure-lines {
        fill: none;
        stroke: #718096;
        stroke-width: 1;
        stroke-dasharray: 2,2;
        opacity: 0.5;
        transition: all 0.3s ease;
      }
      
      /* Running state */
      .compressor-root.running .compressor-body { 
        fill: #3182ce; 
        stroke: #2c5aa0;
        filter: drop-shadow(0 0 8px #3182ce);
      }
      .compressor-root.running .compressor-motor { 
        fill: #38a169; 
        stroke: #2f855a;
        filter: drop-shadow(0 0 6px #38a169);
      }
      .compressor-root.running .compressor-piston { 
        animation: pistonMove 0.6s linear infinite;
        filter: drop-shadow(0 0 4px #718096);
      }
      .compressor-root.running .compressor-pipes { 
        stroke: #3182ce;
        filter: drop-shadow(0 0 4px #3182ce);
      }
      .compressor-root.running .compressor-pressure-lines {
        stroke: #38a169;
        opacity: 1;
        animation: pressurePulse 0.8s ease-in-out infinite;
      }
      
      @keyframes pistonMove {
        0%, 50% { transform: translateY(0px); }
        25% { transform: translateY(-2px); }
        75% { transform: translateY(2px); }
      }
      
      @keyframes pressurePulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
      }
      
      .compressor-status {
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
      .compressor-status.off {
        background: #718096;
        color: #f7fafc;
      }
      .compressor-status.running {
        background: linear-gradient(135deg, #e53e3e, #3182ce);
        animation: statusPulse 2s ease-in-out infinite;
      }
      
      @keyframes statusPulse {
        0%, 100% { 
          box-shadow: 0 0 6px rgba(229, 62, 62, 0.6);
          transform: scale(1);
        }
        50% { 
          box-shadow: 0 0 12px rgba(229, 62, 62, 0.8);
          transform: scale(1.02);
        }
      }
    `;
    document.head.appendChild(style);
    injected = true;
  };
})();

const Compressor: React.FC<CompressorProps> = ({
  size = 80,
  className = '',
  style,
  title = 'Kompressori',
  compressorId = 'default'
}) => {
  ensureStyles();
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Extract compressor status from update data
    const extractCompressorStatus = (statusData: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Look for AC compressor status
      // You can customize this logic based on your actual data structure
      if (statusData.AirConditioner && Array.isArray(statusData.AirConditioner)) {
        for (const acGroup of statusData.AirConditioner) {
          if (acGroup.paths && Array.isArray(acGroup.paths)) {
            const compressorPath = acGroup.paths.find((path: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
              path.id === `/compressor/${compressorId}/status` || 
              path.id === '/compressor/status' ||
              path.id === '/hvac/compressor/running'
            );
            if (compressorPath) {
              //console.log('[Compressor] status value:', compressorPath.value);
              return compressorPath.value === 'running' || compressorPath.value === true || compressorPath.value > 0;
            }
          }
        }
      }
      
      // Alternative: Look in generic HVAC data
      if (statusData.HVAC && statusData.HVAC.compressor) {
        return statusData.HVAC.compressor.running === true;
      }
      
      // Fallback: if no AC data found, assume not running
      return false;
    };

    // Get initial status
    const initialStatus = getUpdateStatus();
    if (initialStatus) {
      setIsRunning(extractCompressorStatus(initialStatus));
    }

    // Subscribe to status updates
    const unsubscribe = onUpdateStatusChange((statusData) => {
      setIsRunning(extractCompressorStatus(statusData));
    });

    return unsubscribe;
  }, [compressorId]);

  return (
    <div
      className={`compressor-root${isRunning ? ' running' : ''} ${className}`.trim()}
      style={{ width: size, ...style }}
      title={title}
    >
      <div className={`compressor-status ${isRunning ? 'running' : 'off'}`}>
        {isRunning ? 'KÄYNNISSÄ' : 'PYSÄHDYKSISSÄ'}
      </div>
      
      <div className="compressor-unit">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {/* Main compressor body */}
          <rect className="compressor-body" x="25" y="35" width="50" height="35" rx="5" />
          
          {/* Motor housing */}
          <circle className="compressor-motor" cx="50" cy="75" r="10" />
          
          {/* Piston chamber */}
          <rect className="compressor-piston" x="40" y="25" width="20" height="15" rx="2" />
          
          {/* Piston */}
          <rect className="compressor-piston" x="47" y="28" width="6" height="9" rx="1" />
          
          {/* Intake pipe */}
          <path className="compressor-pipes" d="M25,45 L15,45 Q10,45 10,40 L10,30" />
          
          {/* Discharge pipe */}
          <path className="compressor-pipes" d="M75,45 L85,45 Q90,45 90,40 L90,30" />
          
          {/* Pressure lines (visual effect) */}
          <g className="compressor-pressure-lines">
            <circle cx="50" cy="52" r="8" />
            <circle cx="50" cy="52" r="12" />
            <circle cx="50" cy="52" r="16" />
          </g>
          
          {/* Connection to motor */}
          <line className="compressor-pipes" x1="50" y1="70" x2="50" y2="65" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
};

export default Compressor;
