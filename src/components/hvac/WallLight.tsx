import React from 'react';

interface WallLightProps {
  x: number;
  y: number;
  onClick?: () => void;
  scaleRatio?: number;
  direction?: 'up' | 'down'; // ylöspäin vai alaspäin suuntautuva
  label?: string; // Poistettu käytöstä mutta pidetään API-yhteensopivuuden vuoksi
  isOn?: boolean; // Lisätään prop jolla voidaan kertoa onko päällä
}

const WallLight: React.FC<WallLightProps> = ({ 
  x, 
  y, 
  onClick, 
  scaleRatio = 1,
  direction = 'up',
  label, // Pidetään API-yhteensopivuuden vuoksi mutta ei käytetä
  isOn = false // Oletuksena pois päältä
}) => {
  // Mark label as used to avoid TypeScript warnings
  void label;
  
  // Värit
  const fillColor = isOn ? '#FFE135' : '#FFFFFF'; // Keltainen päällä, valkoinen pois
  const strokeColor = '#000000'; // Mustat ääriviivat aina
  
  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent double-firing with onClick
    onClick?.();
  };

  const handlePointer = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      e.preventDefault(); // Prevent double-firing with onClick
    }
    onClick?.();
  };
  
  return (
    <svg
      x={x}
      y={y}
      width={20 * scaleRatio}
      height={28 * scaleRatio}
      overflow="visible"
      onClick={onClick}
      onTouchStart={handleTouch}
      onPointerDown={handlePointer}
      style={{ cursor: onClick ? 'pointer' : 'default', touchAction: 'manipulation' }}
    >
      <g transform={`scale(${scaleRatio})`}>
        {/* Pieni kiinnike-neliö */}
        <rect
          x="4"
          y={direction === 'up' ? "16" : "0"}
          width="8"
          height="4"
          fill="#666666"
          stroke={strokeColor}
          strokeWidth="1"
        />
        
        {/* Suurempi valaisin-neliö */}
        <rect
          x="0"
          y={direction === 'up' ? "0" : "4"}
          width="16"
          height="16"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="1"
        />
        
        {/* Teksti-label - poistettu käyttäjän pyynnöstä
        {label && (
          <text
            x="8"
            y={direction === 'up' ? "27" : "-3"}
            textAnchor="middle"
            fontSize={8}
            fill="#333333"
            fontFamily="Arial, sans-serif"
          >
            {label}
          </text>
        )}
        */}
      </g>
    </svg>
  );
};

export default WallLight;
