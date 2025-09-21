import React, { useState, useEffect } from 'react';
import { getUpdateStatus, onUpdateStatusChange } from '../helpers/socketHelper';

interface CompressorNewProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  compressorId?: string;
}

const CompressorNew: React.FC<CompressorNewProps> = ({ 
  size = 35, 
  className = '', 
  style = {}, 
  title = 'Kompressori',
  compressorId
}) => {
  const [isRunning, setIsRunning] = useState(false); // Aloitus: pois päältä

  useEffect(() => {
    const updateRunning = () => {
      const status = getUpdateStatus();
      //console.log('CompressorNew status update:', status, 'compressorId:', compressorId);
      
      let running = false;
      
      // Kokeillaan hakea Nilan-datasta rekisteri 4706
      if (status?.Nilan && Array.isArray(status.Nilan)) {
        for (const nilanGroup of status.Nilan) {
          if (nilanGroup.registers && Array.isArray(nilanGroup.registers)) {
            const register4706 = nilanGroup.registers.find((reg: any) => reg.register === "4706");
            if (register4706) {
              const value = parseInt(register4706.value);
              //console.log('Found Nilan register 4706 value:', value);
              
              // 0 = pois päältä, 100 = käynnissä
              running = value === 100;
              break;
            }
          }
        }
      }
      
      // Fallback: kokeillaan vanhaa tapaa
      if (!running && compressorId && status?.controllers && status.controllers[compressorId]) {
        running = status.controllers[compressorId].compressor_running || false;
      }
      
      //console.log('CompressorNew setting running to:', running, 'for compressorId:', compressorId);
      setIsRunning(running);
    };

    // Initial check
    updateRunning();

    // Listen to changes
    const unsubscribe = onUpdateStatusChange(updateRunning);
    return unsubscribe;
  }, [compressorId]);

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ...style
  };

  // Skaalauskerroin peruskokoon (50px) verrattuna - mutta minimipaksuus säilyy
  const scaleRatio = Math.max(0.4, size / 100); // Vähintään 0.4 eli 40% paksuus säilyy
  
  const firstSpiralStyle = {
    stroke: isRunning ? '#22c55e' : '#000000',
    strokeWidth: 2.8 * scaleRatio,
    fill: 'none',
    transition: 'all 0.3s ease',
    filter: isRunning ? 'drop-shadow(0 0 2px rgba(34, 197, 94, 0.4))' : 'none'
  };

  const secondSpiralStyle = {
    stroke: isRunning ? '#22c55e' : '#9ca3af',
    strokeWidth: 2.8 * scaleRatio,
    fill: 'none',
    transition: 'all 0.3s ease',
    filter: isRunning ? 'drop-shadow(0 0 2px rgba(34, 197, 94, 0.4))' : 'none'
  };

  const circleStyle = {
    stroke: '#000000',
    strokeWidth: 0.6 * scaleRatio,
    fill: 'none',
    transition: 'all 0.3s ease'
  };

  return (
    <div 
      className={`compressor-new ${className}`}
      style={containerStyle}
      title={`${title} - ${isRunning ? 'Käynnissä' : 'Pysähdyksissä'}`}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 70 70"
        style={{ 
          animation: isRunning ? 'spin 3s linear infinite' : 'none' 
        }}
      >
        {/* Outer circle */}
        <ellipse
          style={circleStyle}
          cx="35.207008"
          cy="35.10191"
          rx="34.555912"
          ry="34.661007"
        />
        
        {/* First spiral - moved to center and adjusted */}
        <path
          style={firstSpiralStyle}
          d="m 37.203821,32.789808 c 1.201406,0.853631 -0.557945,2.040622 -1.41879,1.996815 -2.332835,-0.118713 -3.181633,-2.937409 -2.57484,-4.834395 1.08541,-3.393263 5.213321,-4.467834 8.25,-3.152865 4.456449,1.929769 5.785564,7.517726 3.730891,11.665605 -2.738556,5.528472 -9.831932,7.11633 -15.081211,4.308916 -6.605682,-3.532844 -8.45376,-12.150734 -4.886941,-18.496816 4.319897,-7.685956 14.472109,-9.795035 21.912422,-5.464966 8.76815,5.102836 11.138719,16.795085 6.04299,25.328027 C 47.294402,53.991747 34.058491,56.62405 24.433991,50.761045 13.498021,44.099134 10.603558,29.317116 17.23495,18.601808 24.674369,6.580851 41.004225,3.424138 52.809792,10.824742 65.916209,19.040814 69.335311,36.919776 61.164883,49.815189"
        />
        
        {/* Second spiral - positioned differently and rotated */}
        <path
          style={secondSpiralStyle}
          d="m 33.678341,36.936302 c 1.338408,0.885247 -0.532972,2.240897 -1.471339,2.224522 -2.542915,-0.04438 -3.569054,-3.080832 -2.977704,-5.167199 1.057785,-3.732022 5.510728,-5.051444 8.863059,-3.730888 4.91968,1.937969 6.569177,7.970484 4.484071,12.55892 -2.77912,6.115663 -10.440432,8.101455 -16.25478,5.237254 -7.316764,-3.604306 -9.641152,-12.915139 -5.990437,-19.95064 4.421505,-8.520936 15.392505,-11.185126 23.6465,-6.743621 9.727048,5.23416 12.73178,17.871528 7.496803,27.342361 C 46.430527,59.641463 32.12286,62.987235 21.436294,56.956997 9.293538,50.105058 5.606373,34.124439 12.433124,22.222916 20.091707,8.871207 37.747155,4.84239 50.863065,12.466564 65.424212,20.930842 69.79488,40.262494 61.372601,54.592365"
          transform="rotate(-180, 35, 35)"
        />
      </svg>
      
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default CompressorNew;
