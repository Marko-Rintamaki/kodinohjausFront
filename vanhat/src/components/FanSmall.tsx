import React, { useState, useEffect } from 'react';
import { getUpdateStatus, onUpdateStatusChange } from '../helpers/socketHelper';

interface FanSmallProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  fanId?: string;
  fanType?: 'indoor' | 'outdoor';
}

const ensureStyles = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.dataset.fanSmallStyles = 'true';
    style.textContent = `
      .fan-small-root { 
        position: relative; 
        user-select: none; 
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none !important;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .fan-small-root:hover {
        transform: scale(1.05);
      }
      .fan-small-housing {
        width: 40px;
        height: 40px;
        border: 3px solid #4a5568;
        border-radius: 50%;
        position: relative;
        transition: all 0.3s ease;
        background: #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .fan-small-blades {
        width: 24px;
        height: 24px;
        position: relative;
        transform-origin: center;
        transition: all 0.3s ease;
      }
      .fan-small-blade {
        position: absolute;
        width: 10px;
        height: 2px;
        background: #718096;
        border-radius: 1px;
        top: 50%;
        left: 50%;
        transform-origin: center;
        transition: all 0.3s ease;
      }
      .fan-small-blade:nth-child(1) {
        transform: translate(-50%, -50%) rotate(0deg);
      }
      .fan-small-blade:nth-child(2) {
        transform: translate(-50%, -50%) rotate(90deg);
      }
      .fan-small-center {
        position: absolute;
        width: 4px;
        height: 4px;
        background: #4a5568;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1;
      }
      
      /* Running state */
      .fan-small-root.running .fan-small-housing {
        border-color: #3182ce;
        background: #3182ce;
        box-shadow: 0 0 12px rgba(49, 130, 206, 0.8);
      }
      .fan-small-root.running .fan-small-blades {
        animation: fanSmallRotate 0.4s linear infinite;
      }
      .fan-small-root.running .fan-small-blade {
        background: #fff;
      }
      .fan-small-root.running .fan-small-center {
        background: #fff;
      }
      
      /* Outdoor fan styling */
      .fan-small-root.outdoor .fan-small-housing {
        background: #2d3748;
        border-color: #1a202c;
      }
      .fan-small-root.outdoor.running .fan-small-blades {
        animation: fanSmallRotate 0.6s linear infinite;
      }
      .fan-small-root.outdoor.running .fan-small-housing {
        background: #1a202c;
        border-color: #2d3748;
        box-shadow: 0 0 12px rgba(45, 55, 72, 0.8);
      }
      
      @keyframes fanSmallRotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    injected = true;
  };
})();

const FanSmall: React.FC<FanSmallProps> = ({
  size = 50,
  className = '',
  style,
  title = 'Puhallin',
  fanId = 'default',
  fanType = 'indoor'
}) => {
  ensureStyles();
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const extractFanStatus = (statusData: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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
              return fanPath.value === 'running' || fanPath.value === true || fanPath.value > 0;
            }
          }
        }
      }
      
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
      
      return false;
    };

    const initialStatus = getUpdateStatus();
    if (initialStatus) {
      setIsRunning(extractFanStatus(initialStatus));
    }

    const unsubscribe = onUpdateStatusChange((statusData) => {
      setIsRunning(extractFanStatus(statusData));
    });

    return unsubscribe;
  }, [fanId, fanType]);

  const getFanTitle = () => {
    const status = isRunning ? 'Käynnissä' : 'Pysähdyksissä';
    if (fanType === 'outdoor') return `${title} (Ulko) - ${status}`;
    if (fanType === 'indoor') return `${title} (Sisä) - ${status}`;
    return `${title} - ${status}`;
  };

  return (
    <div
      className={`fan-small-root ${fanType}${isRunning ? ' running' : ''} ${className}`.trim()}
      style={{ width: size, height: size, ...style }}
      title={getFanTitle()}
    >
      <div className="fan-small-housing">
        <div className="fan-small-blades">
          <div className="fan-small-blade" />
          <div className="fan-small-blade" />
        </div>
        <div className="fan-small-center" />
      </div>
    </div>
  );
};

export default FanSmall;
