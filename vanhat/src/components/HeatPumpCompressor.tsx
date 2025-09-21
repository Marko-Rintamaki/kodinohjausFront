import React, { useState, useEffect } from 'react';
import { getUpdateStatus, onUpdateStatusChange } from '../helpers/socketHelper';

// Debug logging flags - set to true to enable specific logging categories:
// heatPumpCompressorLogging: HeatPumpCompressor status updates and modulation values
var heatPumpCompressorLogging = false;

interface HeatPumpCompressorProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  compressorId?: string;
}

const HeatPumpCompressor: React.FC<HeatPumpCompressorProps> = ({ 
  size = 50, 
  className = '', 
  style = {}, 
  title = 'Lämpöpumpun kompressori',
  compressorId
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [modulation, setModulation] = useState(0);

  useEffect(() => {
    const updateRunning = () => {
      const status = getUpdateStatus();
      if (heatPumpCompressorLogging) {
        console.log('HeatPumpCompressor status update:', status, 'compressorId:', compressorId);
      }
      
      let running = false;
      let currentModulation = 0;
      
      // Lue Bosch lämpöpumpun actualModulation data
      if (status?.Bosch && status.Bosch.length > 0 && status.Bosch[0]?.paths) {
        const boschPaths = status.Bosch[0].paths;
        const modulationData = boschPaths.find((item: any) => item.id === '/heatSources/actualModulation');
        if (modulationData && typeof modulationData.value === 'number') {
          currentModulation = modulationData.value;
          running = currentModulation > 0; // Jos modulaatio > 0, kompressori käy
          if (heatPumpCompressorLogging) {
            console.log('HeatPumpCompressor Bosch actualModulation:', currentModulation, '% - running:', running);
          }
        }
      }
      
      // Fallback: jos Bosch-dataa ei löydy, käytä controllereita
      if (!running && compressorId && status?.controllers && status.controllers[compressorId]) {
        running = status.controllers[compressorId].heatpump_running || false;
      }
      
      if (heatPumpCompressorLogging) {
        console.log('HeatPumpCompressor setting running to:', running, 'modulation:', currentModulation, '% for compressorId:', compressorId);
      }
      setIsRunning(running);
      setModulation(currentModulation);
    };

    // Initial check
    updateRunning();

    // Listen to changes
    const unsubscribe = onUpdateStatusChange(updateRunning);
    return unsubscribe;
  }, [compressorId]);

  // Lämpöpumppu on leveämpi kuin korkea (esim. 4:3 suhde)
  const width = size;
  const height = size * 0.75;

  const containerStyle = {
    width: `${width}px`,
    height: `${height}px`,
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ...style
  };

  // Skaalauskerroin
  const scaleRatio = Math.max(0.4, size / 100);
  
  const spiralStyle = {
    stroke: isRunning ? '#22c55e' : '#6b7280',
    strokeWidth: 2.0 * scaleRatio,
    fill: 'none',
    transition: 'all 0.3s ease',
    filter: isRunning ? 'drop-shadow(0 0 2px rgba(34, 197, 94, 0.4))' : 'none'
  };

  const frameStyle = {
    stroke: '#374151',
    strokeWidth: 1.5 * scaleRatio,
    fill: isRunning ? 'rgba(34, 197, 94, 0.1)' : 'rgba(156, 163, 175, 0.1)',
    transition: 'all 0.3s ease',
    filter: isRunning ? 'drop-shadow(0 0 3px rgba(34, 197, 94, 0.3))' : 'none'
  };

  return (
    <div 
      className={`heatpump-compressor ${className}`}
      style={containerStyle}
      title={`${title} - ${isRunning ? `Käynnissä (${modulation}%)` : 'Pysähdyksissä'}`}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <svg 
        width={width} 
        height={height} 
        viewBox="0 0 100 75"
      >
        {/* Ulkoyksikön kehys - pyöristetyt kulmat */}
        <rect
          style={frameStyle}
          x="5"
          y="7.5"
          width="90"
          height="60"
          rx="8"
          ry="6"
        />
        
        {/* Scroll spiraalit keskellä - uudelleen keskitetty suorakulmaiseen kehykseen */}
        <g transform="translate(50, 37.5) scale(0.6)">
          <g>
            {isRunning && (
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                from="0 0 0"
                to="360 0 0"
                dur="4s"
                repeatCount="indefinite"
              />
            )}
            {/* First spiral - keskitetty origosta */}
            <path
              style={spiralStyle}
              d="m 2,0 c 1.201406,0.853631 -0.557945,2.040622 -1.41879,1.996815 -2.332835,-0.118713 -3.181633,-2.937409 -2.57484,-4.834395 1.08541,-3.393263 5.213321,-4.467834 8.25,-3.152865 4.456449,1.929769 5.785564,7.517726 3.730891,11.665605 -2.738556,5.528472 -9.831932,7.11633 -15.081211,4.308916 -6.605682,-3.532844 -8.45376,-12.150734 -4.886941,-18.496816 4.319897,-7.685956 14.472109,-9.795035 21.912422,-5.464966 8.76815,5.102836 11.138719,16.795085 6.04299,25.328027 C 12.094402,21.191747 -1.141509,23.82405 -10.766009,17.961045 -21.701979,11.299134 -24.596442,-3.482884 -17.96505,-14.198192 -10.525631,-26.219149 5.804225,-29.375862 17.609792,-21.975258 30.716209,-13.759186 34.135311,3.119776 25.964883,16.015189"
            />
            
            {/* Second spiral - keskitetty ja käännetty */}
            <path
              style={spiralStyle}
              d="m -1.5,2 c 1.338408,0.885247 -0.532972,2.240897 -1.471339,2.224522 -2.542915,-0.04438 -3.569054,-3.080832 -2.977704,-5.167199 1.057785,-3.732022 5.510728,-5.051444 8.863059,-3.730888 4.91968,1.937969 6.569177,7.970484 4.484071,12.55892 -2.77912,6.115663 -10.440432,8.101455 -16.25478,5.237254 -7.316764,-3.604306 -9.641152,-12.915139 -5.990437,-19.95064 4.421505,-8.520936 15.392505,-11.185126 23.6465,-6.743621 9.727048,5.23416 12.73178,17.871528 7.496803,27.342361 C 11.230527,24.841463 -3.07714,28.187235 -13.763706,22.156997 -25.906462,15.305058 -29.593627,-0.675561 -22.766876,-12.577084 -15.108293,-25.928793 2.547155,-29.95761 15.663065,-22.333436 30.224212,-13.869158 34.59488,5.462494 26.172601,19.792365"
              transform="rotate(-180, 0, 0)"
            />
          </g>
        </g>
        
        {/* Tuuletusritilä yläosassa */}
        <g>
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1={20 + i * 12}
              y1="15"
              x2={20 + i * 12}
              y2="25"
              stroke={isRunning ? '#16a34a' : '#9ca3af'}
              strokeWidth={0.8 * scaleRatio}
              opacity="0.6"
            />
          ))}
        </g>
        
        {/* Tuuletusritilä alaosassa */}
        <g>
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1={20 + i * 12}
              y1="50"
              x2={20 + i * 12}
              y2="60"
              stroke={isRunning ? '#16a34a' : '#9ca3af'}
              strokeWidth={0.8 * scaleRatio}
              opacity="0.6"
            />
          ))}
        </g>
        
        {/* Merkkilogo/teksti (valinnainen) */}
        <text
          x="85"
          y="67"
          fontSize={6 * scaleRatio}
          fill={isRunning ? '#16a34a' : '#6b7280'}
          textAnchor="end"
          opacity="0.7"
        >
          HP
        </text>
      </svg>
      
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      
      {/* Status-indikaattori */}
      <div 
        style={{
          position: 'absolute',
          top: -2,
          right: -2,
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isRunning ? '#22c55e' : '#6b7280',
          transition: 'all 0.3s ease',
          boxShadow: isRunning ? '0 0 4px rgba(34, 197, 94, 0.6)' : 'none'
        }}
      />
    </div>
  );
};

export default HeatPumpCompressor;
