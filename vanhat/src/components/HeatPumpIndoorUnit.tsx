import React, { useState, useEffect } from 'react';
import { getUpdateStatus, onUpdateStatusChange } from '../helpers/socketHelper';

// Logging control
const heatPumpIndoorUnitLogging = false;

interface HeatPumpIndoorUnitProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  unitId?: string;
}

const HeatPumpIndoorUnit: React.FC<HeatPumpIndoorUnitProps> = ({ 
  size = 60, 
  className = '', 
  style = {}, 
  title = 'Lämpöpumpun sisäyksikkö',
  unitId
}) => {
  const [supplyTemp, setSupplyTemp] = useState<number | null>(null);
  const [returnTemp, setReturnTemp] = useState<number | null>(null);

  useEffect(() => {
    const updateTemperatures = () => {
      const status = getUpdateStatus();
      if (heatPumpIndoorUnitLogging) {
        console.log('HeatPumpIndoorUnit status update:', status, 'unitId:', unitId);
      }
      
      let supply: number | null = null;
      let returnValue: number | null = null;
      
      // Lue Bosch lämpöpumpun lämpötila-data
      if (status?.Bosch && status.Bosch.length > 0 && status.Bosch[0]?.paths) {
        const boschPaths = status.Bosch[0].paths;
        if (heatPumpIndoorUnitLogging) {
          console.log('HeatPumpIndoorUnit Bosch paths found:', boschPaths.length, 'items');
        }
        
        // Menolämpötila: /heatingCircuits/hc1/actualSupplyTemperature
        const supplyData = boschPaths.find((item: any) => item.id === '/heatingCircuits/hc1/actualSupplyTemperature');
        if (supplyData && typeof supplyData.value === 'number') {
          supply = supplyData.value;
          if (heatPumpIndoorUnitLogging) {
            console.log('HeatPumpIndoorUnit Supply temp found:', supply, '°C');
          }
        } else {
          if (heatPumpIndoorUnitLogging) {
            console.log('HeatPumpIndoorUnit Supply temp NOT found, supplyData:', supplyData);
          }
        }
        
        // Paluulämpötila: /heatSources/returnTemperature
        const returnData = boschPaths.find((item: any) => item.id === '/heatSources/returnTemperature');
        if (returnData && typeof returnData.value === 'number') {
          returnValue = returnData.value;
          if (heatPumpIndoorUnitLogging) {
            console.log('HeatPumpIndoorUnit Return temp found:', returnValue, '°C');
          }
        } else {
          if (heatPumpIndoorUnitLogging) {
            console.log('HeatPumpIndoorUnit Return temp NOT found, returnData:', returnData);
          }
        }
        
        // Debug: näytä kaikki Bosch ID:t
        if (heatPumpIndoorUnitLogging) {
          console.log('HeatPumpIndoorUnit Available Bosch IDs:', boschPaths.map((item: any) => item.id));
        }
      } else {
        if (heatPumpIndoorUnitLogging) {
          console.log('HeatPumpIndoorUnit No Bosch data in status');
        }
      }
      
      if (heatPumpIndoorUnitLogging) {
        console.log('HeatPumpIndoorUnit setting temps - Supply:', supply, 'Return:', returnValue, 'for unitId:', unitId);
      }
      setSupplyTemp(supply);
      setReturnTemp(returnValue);
    };

    // Initial check
    updateTemperatures();

    // Listen to changes
    const unsubscribe = onUpdateStatusChange(updateTemperatures);
    return unsubscribe;
  }, [unitId]);

  // Sisäyksikkö on neliömäinen
  const width = size;
  const height = size;

  const containerStyle = {
    width: `${width}px`,
    height: `${height}px`,
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ...style
  };

  // Skaalauskerroin
  const scaleRatio = Math.max(0.4, size / 100);
  
  const boxStyle = {
    stroke: '#374151',
    strokeWidth: 2 * scaleRatio,
    fill: 'rgba(156, 163, 175, 0.1)',
    transition: 'all 0.3s ease'
  };

  return (
    <div 
      className={`heatpump-indoor-unit ${className}`}
      style={containerStyle}
      title={`${title}${supplyTemp !== null ? ` - Meno (alas): ${supplyTemp.toFixed(1)}°C` : ''}${returnTemp !== null ? ` - Paluu (ylös): ${returnTemp.toFixed(1)}°C` : ''}`}
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
        viewBox="0 0 100 100"
        style={{ overflow: 'visible' }}
      >
        {/* Päälaatikko */}
        <rect
          x="20"
          y="20"
          width="60"
          height="60"
          rx="4"
          ry="4"
          style={boxStyle}
        />
        
        {/* Sisäinen symboli (lämmönvaihdin) keskellä */}
        <g stroke="#6b7280" strokeWidth={1 * scaleRatio} fill="none">
          <circle cx="50" cy="50" r="12" />
          <line x1="42" y1="42" x2="58" y2="58" />
          <line x1="58" y1="42" x2="42" y2="58" />
        </g>
        
        {/* Sininen nuoli ylöspäin (paluu) vasemmalla - kiinni laatikossa */}
        <g stroke="#2563eb" fill="#2563eb">
          <line x1="35" y1="80" x2="35" y2="88" strokeWidth="3" />
          <polygon points="30,82 35,80 40,82" strokeWidth="2" strokeLinejoin="round"/>
          {/* Paluulämpötila yläreunassa vasemmalla */}
          <text x="37" y="32" textAnchor="middle" fontSize={`${16 * scaleRatio}px`} fill="#2563eb" fontWeight="normal">
            {returnTemp !== null ? `${returnTemp.toFixed(1)}°C` : '---'}
          </text>
        </g>
        
        {/* Punainen nuoli alaspäin (meno) oikealla - kiinni laatikossa */}
        <g stroke="#dc2626" fill="#dc2626">
          <line x1="65" y1="80" x2="65" y2="88" strokeWidth="3" />
          <polygon points="60,86 65,88 70,86" strokeWidth="2" strokeLinejoin="round"/>
          {/* Menolämpötila alareunassa oikealla */}
          <text x="63" y="73" textAnchor="middle" fontSize={`${16 * scaleRatio}px`} fill="#dc2626" fontWeight="normal">
            {supplyTemp !== null ? `${supplyTemp.toFixed(1)}°C` : '---'}
          </text>
        </g>
      </svg>
    </div>
  );
};

export default HeatPumpIndoorUnit;
