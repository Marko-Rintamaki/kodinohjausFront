import React, { useState, useEffect } from 'react';
import { getUpdateStatus, onUpdateStatusChange } from '../../helpers/socketHelper';

interface FanProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  fanId?: string; // ID for identifying specific fan in status data
  fanType?: 'indoor' | 'outdoor'; // Type of fan for different styling
}

const ensureStyles = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.dataset.fanStyles = 'true';
    style.textContent = `
      .fan-root { 
        position: relative; 
        user-select: none; 
        width: 80px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        background: none !important;
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
        fill: #718096; 
        stroke: #2d3748; 
        stroke-width: 1; 
        transform-origin: center;
        transition: all 0.3s ease;
      }
      .fan-motor { 
        fill: #e53e3e; 
        stroke: #c53030; 
        stroke-width: 2; 
        transition: all 0.3s ease;
      }
      .fan-grill { 
        fill: none; 
        stroke: #4a5568; 
        stroke-width: 2; 
        transition: all 0.3s ease;
      }
      .fan-airflow {
        fill: none;
        stroke: #718096;
        stroke-width: 1;
        stroke-dasharray: 3,3;
        opacity: 0;
        transition: all 0.3s ease;
      }
      
      /* Running state */
      .fan-root.running .fan-housing { 
        fill: #3182ce; 
        stroke: #2c5aa0;
        filter: drop-shadow(0 0 8px #3182ce);
      }
      .fan-root.running .fan-motor { 
        fill: #38a169; 
        stroke: #2f855a;
        filter: drop-shadow(0 0 6px #38a169);
      }
      .fan-root.running .fan-blades { 
        animation: fanRotate 0.4s linear infinite;
        filter: drop-shadow(0 0 4px #718096);
      }
      .fan-root.running .fan-grill { 
        stroke: #3182ce;
        filter: drop-shadow(0 0 4px #3182ce);
      }
      .fan-root.running .fan-airflow {
        stroke: #38a169;
        opacity: 1;
        animation: airflowMove 1.2s ease-in-out infinite;
      }
      
      /* Outdoor fan styling */
      .fan-root.outdoor.running .fan-blades {
        animation: fanRotate 0.6s linear infinite;
      }
      .fan-root.outdoor .fan-housing {
        fill: #2d3748;
      }
      .fan-root.outdoor.running .fan-housing {
        fill: #1a202c;
        stroke: #2d3748;
      }
      
      @keyframes fanRotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes airflowMove {
        0% { 
          stroke-dashoffset: 0;
          opacity: 0.3;
        }
        50% { 
          stroke-dashoffset: -12;
          opacity: 1;
        }
        100% { 
          stroke-dashoffset: -24;
          opacity: 0.3;
        }
      }
      
      .fan-status {
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
      .fan-status.off {
        background: #718096;
        color: #f7fafc;
      }
      .fan-status.running {
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

const Fan: React.FC<FanProps> = ({
  size = 80,
  className = '',
  style,
  title = 'Puhallin',
  fanId = 'default',
  fanType = 'indoor'
}) => {
  ensureStyles();
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Extract fan status from update data
    const extractFanStatus = (statusData: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Look for AC fan status
      // You can customize this logic based on your actual data structure
      if (statusData.AirConditioner && Array.isArray(statusData.AirConditioner)) {
        for (const acGroup of statusData.AirConditioner) {
          if (acGroup.paths && Array.isArray(acGroup.paths)) {
            const fanPath = acGroup.paths.find((path: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
              path.id === `/fan/${fanId}/status` || 
              path.id === `/fan/${fanType}/status` ||
              path.id === '/fan/status' ||
              path.id === '/hvac/fan/running'
            );
            if (fanPath) {
              //console.log('[Fan] status value:', fanPath.value);
              return fanPath.value === 'running' || fanPath.value === true || fanPath.value > 0;
            }
          }
        }
      }
      
      // Alternative: Look in generic HVAC data
      if (statusData.HVAC && statusData.HVAC.fan) {
        const fanData = statusData.HVAC.fan;
        if (fanType === 'indoor' && fanData.indoor) {
          return fanData.indoor.running === true;
        }
        if (fanType === 'outdoor' && fanData.outdoor) {
          return fanData.outdoor.running === true;
        }
        return fanData.running === true;
      }
      
      // Fallback: if no AC data found, assume not running
      return false;
    };

    // Get initial status
    const initialStatus = getUpdateStatus();
    if (initialStatus) {
      setIsRunning(extractFanStatus(initialStatus));
    }

    // Subscribe to status updates
    const unsubscribe = onUpdateStatusChange((statusData) => {
      setIsRunning(extractFanStatus(statusData));
    });

    return unsubscribe;
  }, [fanId, fanType]);

  const getFanTitle = () => {
    if (fanType === 'outdoor') return `${title} (Ulko)`;
    if (fanType === 'indoor') return `${title} (Sisä)`;
    return title;
  };

  return (
    <div
      className={`fan-root ${fanType}${isRunning ? ' running' : ''} ${className}`.trim()}
      style={{ width: size, ...style }}
      title={getFanTitle()}
    >
      <div className={`fan-status ${isRunning ? 'running' : 'off'}`}>
        {isRunning ? 'KÄYNNISSÄ' : 'PYSÄHDYKSISSÄ'}
      </div>
      
      <div className="fan-unit">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {/* Fan housing */}
          <circle className="fan-housing" cx="50" cy="50" r="35" />
          
          {/* Fan grill */}
          <circle className="fan-grill" cx="50" cy="50" r="32" fill="none" />
          <circle className="fan-grill" cx="50" cy="50" r="28" fill="none" />
          <circle className="fan-grill" cx="50" cy="50" r="24" fill="none" />
          
          {/* Fan blades */}
          <g className="fan-blades">
            {/* Central hub */}
            <circle cx="50" cy="50" r="4" />
            
            {/* Blade 1 */}
            <path d="M50,50 Q45,35 35,40 Q40,45 50,50" />
            {/* Blade 2 */}
            <path d="M50,50 Q65,45 60,35 Q55,40 50,50" />
            {/* Blade 3 */}
            <path d="M50,50 Q55,65 65,60 Q60,55 50,50" />
            {/* Blade 4 */}
            <path d="M50,50 Q35,55 40,65 Q45,60 50,50" />
          </g>
          
          {/* Motor */}
          <circle className="fan-motor" cx="50" cy="80" r="6" />
          
          {/* Motor connection */}
          <line className="fan-grill" x1="50" y1="74" x2="50" y2="85" strokeWidth="2" />
          
          {/* Airflow indicators */}
          <g className="fan-airflow">
            <path d="M20,25 Q25,20 30,25" />
            <path d="M50,15 Q55,10 60,15" />
            <path d="M75,25 Q80,20 85,25" />
            <path d="M20,75 Q15,80 20,85" />
            <path d="M50,85 Q45,90 50,95" />
            <path d="M75,75 Q80,80 85,85" />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default Fan;
