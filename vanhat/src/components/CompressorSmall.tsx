import React, { useState, useEffect } from 'react';
import { getUpdateStatus, onUpdateStatusChange } from '../helpers/socketHelper';

interface CompressorSmallProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  compressorId?: string;
}

const ensureStyles = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.dataset.compressorSmallStyles = 'true';
    style.textContent = `
      .compressor-small-root { 
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
      .compressor-small-root:hover {
        transform: scale(1.05);
      }
      .compressor-small-svg {
        width: 40px;
        height: 40px;
        transition: all 0.3s ease;
      }
      
      /* Default state - gray */
      .compressor-small-root .compressor-circle {
        fill: #f5f5f5;
        stroke: #718096;
        stroke-width: 2;
      }
      
      .compressor-small-root .spiral-outer {
        fill: none;
        stroke: #718096;
        stroke-width: 2;
        stroke-linecap: round;
      }
      
      .compressor-small-root .spiral-inner {
        fill: none;
        stroke: #9ca3af;
        stroke-width: 1.5;
        stroke-linecap: round;
      }
      
      /* Running state - green */
      .compressor-small-root.running .compressor-circle {
        fill: #f0fff4;
        stroke: #38a169;
        filter: drop-shadow(0 0 6px rgba(56, 161, 105, 0.4));
      }
      
      .compressor-small-root.running .spiral-outer {
        stroke: #38a169;
        filter: drop-shadow(0 0 3px rgba(56, 161, 105, 0.3));
      }
      
      .compressor-small-root.running .spiral-inner {
        stroke: #48bb78;
        filter: drop-shadow(0 0 2px rgba(72, 187, 120, 0.3));
      }
    `;
    document.head.appendChild(style);
    injected = true;
  };
})();

const CompressorSmall: React.FC<CompressorSmallProps> = ({
  size = 50,
  className = '',
  style,
  title = 'Kompressori',
  compressorId = 'default'
}) => {
  ensureStyles();
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const extractCompressorStatus = (statusData: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (statusData.AirConditioner && Array.isArray(statusData.AirConditioner)) {
        for (const acGroup of statusData.AirConditioner) {
          if (acGroup.paths && Array.isArray(acGroup.paths)) {
            const compressorPath = acGroup.paths.find((path: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
              path.id === `/compressor/${compressorId}/status` || 
              path.id === '/compressor/status' ||
              path.id === '/hvac/compressor/running'
            );
            if (compressorPath) {
              return compressorPath.value === 'running' || compressorPath.value === true || compressorPath.value > 0;
            }
          }
        }
      }
      
      if (statusData.HVAC && statusData.HVAC.compressor) {
        return statusData.HVAC.compressor.running === true;
      }
      
      return false;
    };

    const initialStatus = getUpdateStatus();
    if (initialStatus) {
      setIsRunning(extractCompressorStatus(initialStatus));
    }

    const unsubscribe = onUpdateStatusChange((statusData) => {
      setIsRunning(extractCompressorStatus(statusData));
    });

    return unsubscribe;
  }, [compressorId]);

  return (
    <div
      className={`compressor-small-root${isRunning ? ' running' : ''} ${className}`.trim()}
      style={{ width: size, height: size, ...style }}
      title={`${title} - ${isRunning ? 'Käynnissä' : 'Pysähdyksissä'}`}
    >
      <svg className="compressor-small-svg" viewBox="0 0 70 70" aria-hidden="true">
        {/* Outer circle */}
        <ellipse className="compressor-circle" cx="35.207008" cy="35.10191" rx="34.555912" ry="34.661007" />
        
        {/* First spiral (moved left) */}
        <path className="spiral-outer" 
              d="m 35.203821,32.789808 c 1.201406,0.853631 -0.557945,2.040622 -1.41879,1.996815 -2.332835,-0.118713 -3.181633,-2.937409 -2.57484,-4.834395 1.08541,-3.393263 5.213321,-4.467834 8.25,-3.152865 4.456449,1.929769 5.785564,7.517726 3.730891,11.665605 -2.738556,5.528472 -9.831932,7.11633 -15.081211,4.308916 -6.605682,-3.532844 -8.45376,-12.150734 -4.886941,-18.496816 4.319897,-7.685956 14.472109,-9.795035 21.912422,-5.464966 8.76815,5.102836 11.138719,16.795085 6.04299,25.328027 C 45.294402,53.991747 32.058491,56.62405 22.433991,50.761045 11.498021,44.099134 8.603558,29.317116 15.23495,18.601808 22.674369,6.580851 39.004225,3.424138 50.809792,10.824742 63.916209,19.040814 67.335311,36.919776 59.164883,49.815189" />
        
        {/* Second spiral (moved right, no rotation) */}
        <path className="spiral-inner"
              d="m 37.678341,35.436302 c 1.338408,0.885247 -0.532972,2.240897 -1.471339,2.224522 -2.542915,-0.04438 -3.569054,-3.080832 -2.977704,-5.167199 1.057785,-3.732022 5.510728,-5.051444 8.863059,-3.730888 4.91968,1.937969 6.569177,7.970484 4.484071,12.55892 -2.77912,6.115663 -10.440432,8.101455 -16.25478,5.237254 -7.316764,-3.604306 -9.641152,-12.915139 -5.990437,-19.95064 4.421505,-8.520936 15.392505,-11.185126 23.6465,-6.743621 9.727048,5.23416 12.73178,17.871528 7.496803,27.342361 C 49.930527,58.141463 35.62286,61.487235 24.936294,55.456997 12.793538,48.605058 9.106373,32.624439 15.933124,20.722916 23.591707,7.371207 41.247155,3.34239 54.363065,10.966564 68.924212,19.430842 73.29488,38.762494 64.872601,53.092365" />
      </svg>
    </div>
  );
};

export default CompressorSmall;
