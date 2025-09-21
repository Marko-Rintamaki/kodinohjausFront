import React, { useState, useEffect } from 'react';
import { getUpdateStatus, onUpdateStatusChange, getSocket } from '../helpers/socketHelper';

// Debug logging flags - set to true to enable specific logging categories:
// fanIconLogging: FanIcon component speed changes and commands
var fanIconLogging = false;

interface FanIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  fanId?: string;
}

const FanIcon: React.FC<FanIconProps> = ({ 
  size = 35, 
  className = '', 
  style = {}, 
  title = 'Puhallin',
  fanId
}) => {
  const [fanSpeed, setFanSpeed] = useState(0); // 0 = pois, 1-4 = tehot

  useEffect(() => {
    const updateFanSpeed = () => {
      const status = getUpdateStatus();
      //console.log('FanIcon status update:', status, 'fanId:', fanId);
      
      let speed = 0;
      
      // Kokeillaan hakea Nilan-datasta rekisteri 4747
      if (status?.Nilan && Array.isArray(status.Nilan)) {
        for (const nilanGroup of status.Nilan) {
          if (nilanGroup.registers && Array.isArray(nilanGroup.registers)) {
            const register4747 = nilanGroup.registers.find((reg: any) => reg.register === "4747");
            if (register4747) {
              const value = parseInt(register4747.value);
              //console.log('Found Nilan register 4747 value:', value);
              
              // Muunna Nilan arvot 101-104 asteikoksi 1-4 (0=pois päältä)
              if (value == 101) {
                speed = 1; // Teho 1
              } else if (value == 102) {
                speed = 2; // Teho 2
              } else if (value == 103) {
                speed = 3; // Teho 3
              } else if (value == 104) {
                speed = 4; // Teho 4
              } else {
                speed = 0; // Pois päältä tai tuntematon arvo
              }
              break;
            }
          }
        }
      }
      
      // Fallback: kokeillaan vanhaa tapaa
      if (speed === 0 && fanId && status?.controllers && status.controllers[fanId]) {
        const fanData = status.controllers[fanId];
        speed = fanData.fan_speed || 0;
      }
      
      //console.log('FanIcon setting speed to:', speed, 'for fanId:', fanId);
      setFanSpeed(speed);
    };

    // Initial check
    updateFanSpeed();

    // Listen to changes
    const unsubscribe = onUpdateStatusChange(updateFanSpeed);
    return unsubscribe;
  }, [fanId]);

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

  // Värit eri tehoille
  const getColor = () => {
    switch (fanSpeed) {
      case 0: return '#9ca3af'; // Harmaa - pois päältä
      case 1: return '#3b82f6'; // Sininen - matala teho
      case 2: return '#eab308'; // Keltainen - keskiteho
      case 3: return '#f97316'; // Oranssi - korkea teho
      case 4: return '#ef4444'; // Punainen - maksimiteho
      default: return '#9ca3af';
    }
  };

  // Pyörimisnopeus eri tehoille
  const getAnimationDuration = () => {
    switch (fanSpeed) {
      case 0: return 'none';
      case 1: return 'spin 3s linear infinite';
      case 2: return 'spin 2s linear infinite';
      case 3: return 'spin 1.5s linear infinite';
      case 4: return 'spin 1s linear infinite';
      default: return 'none';
    }
  };

  // Puhaltimen nopeuden muuttaminen
  const changeFanSpeed = async (newSpeed: number) => {
    // Varmista että nopeus on aina 1-4 välillä (ei koskaan 0)
    if (newSpeed < 1 || newSpeed > 4) {
      console.warn('Invalid fan speed:', newSpeed, 'Must be 1-4');
      return;
    }
    
    if (fanIconLogging) {
      console.log('Changing fan speed to:', newSpeed);
    }
    
    // Muunna speed (1-4) Nilan arvoiksi (101-104)
    const nilanValue = (100 + newSpeed).toString(); // 101, 102, 103, 104
    
    try {
      const socket = getSocket();
      if (!socket || !socket.connected) {
        console.error('❌ Socket ei ole yhdistetty');
        return;
      }

      // 1. Kirjoita uusi arvo rekisteriin 4747
      if (fanIconLogging) {
        console.log('Writing Nilan register 4747 value:', nilanValue);
      }
      const writeCommand = {
        "id": "Nilan", 
        "function": "writeRegister", 
        "registers": [{"register": "4747", "value": nilanValue}],
        "token": localStorage.getItem('authToken')
      };
      
      if (fanIconLogging) {
        console.log('=== PUHALLIN KOMENTO LÄHTEE (WRITE) ===');
        console.log('Write komento objekti:', JSON.stringify(writeCommand, null, 2));
      }
      socket.emit('control', writeCommand);
      if (fanIconLogging) {
        console.log('✅ Write komento lähetetty');
      }
      
      // 2. Lue rekisteri takaisin datastore-päivitystä varten
      setTimeout(() => {
        if (fanIconLogging) {
          console.log('Reading Nilan register 4747 for datastore update');
        }
        const readCommand = {
          "id": "Nilan", 
          "function": "readRegisters", 
          "registers": [{"register": "4747", "quantity": "1"}], 
          "datastore": "yes",
          "token": localStorage.getItem('authToken')
        };
        
        if (fanIconLogging) {
          console.log('=== PUHALLIN KOMENTO LÄHTEE (READ) ===');
          console.log('Read komento objekti:', JSON.stringify(readCommand, null, 2));
        }
        socket.emit('control', readCommand);
        if (fanIconLogging) {
          console.log('✅ Read komento lähetetty');
        }
      }, 200); // Pieni viive ennen lukemista
      
    } catch (error) {
      console.error('Error changing fan speed:', error);
    }
  };

  // Tehotekstit
  const getSpeedText = () => {
    switch (fanSpeed) {
      case 0: return 'Huoltotila'; // Ei pitäisi tapahtua normaalissa käytössä
      case 1: return 'Teho 1';
      case 2: return 'Teho 2';
      case 3: return 'Teho 3';
      case 4: return 'Teho 4';
      default: return 'Tuntematon';
    }
  };

  // Touch event handlers for mobile support
  const handleClick = () => {
    const nextSpeed = fanSpeed === 4 ? 1 : fanSpeed + 1; // Kierrä 1-4 välillä, ei koskaan 0
    changeFanSpeed(nextSpeed);
  };

  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent double firing
    handleClick();
  };

  const handlePointer = (e: React.PointerEvent) => {
    e.preventDefault(); // Prevent double firing
    handleClick();
  };

  return (
    <div 
      className={`fan-icon ${className}`}
      style={{ ...containerStyle, touchAction: 'manipulation' }}
      title={`${title} - ${getSpeedText()} (Klikkaa vaihtaaksesi 1-4)`}
      onClick={handleClick}
      onTouchStart={handleTouch}
      onPointerDown={handlePointer}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24"
        style={{ 
          animation: getAnimationDuration(),
          filter: fanSpeed > 0 ? `drop-shadow(0 0 3px ${getColor()})` : 'none'
        }}
      >
        {/* Ulkokehä */}
        <path 
          fillRule="evenodd" 
          clipRule="evenodd" 
          d="M12 3.48154C7.29535 3.48154 3.48148 7.29541 3.48148 12.0001C3.48148 16.7047 7.29535 20.5186 12 20.5186C16.7046 20.5186 20.5185 16.7047 20.5185 12.0001C20.5185 7.29541 16.7046 3.48154 12 3.48154ZM2 12.0001C2 6.47721 6.47715 2.00006 12 2.00006C17.5228 2.00006 22 6.47721 22 12.0001C22 17.5229 17.5228 22.0001 12 22.0001C6.47715 22.0001 2 17.5229 2 12.0001Z"
          fill={getColor()}
          opacity="0.3"
        />
        
        {/* Keskipiste */}
        <path 
          d="M12 11.3C11.8616 11.3 11.7262 11.3411 11.6111 11.418C11.496 11.4949 11.4063 11.6042 11.3533 11.7321C11.3003 11.86 11.2864 12.0008 11.3134 12.1366C11.3405 12.2724 11.4071 12.3971 11.505 12.495C11.6029 12.5929 11.7277 12.6596 11.8634 12.6866C11.9992 12.7136 12.14 12.6997 12.2679 12.6467C12.3958 12.5937 12.5051 12.504 12.582 12.3889C12.6589 12.2738 12.7 12.1385 12.7 12C12.7 11.8144 12.6262 11.6363 12.495 11.505C12.3637 11.3738 12.1857 11.3 12 11.3Z"
          fill={getColor()}
        />
        
        {/* Puhallinterät */}
        <path 
          d="M12.35 5.00002C15.5 5.00002 15.57 7.49902 13.911 8.32502C13.6028 8.50778 13.3403 8.75856 13.1438 9.05822C12.9473 9.35787 12.8218 9.69847 12.777 10.054C13.1117 10.1929 13.4073 10.4116 13.638 10.691C16.2 9.29102 19 9.84401 19 12.35C19 15.5 16.494 15.57 15.675 13.911C15.4869 13.6029 15.232 13.341 14.9291 13.1448C14.6262 12.9485 14.283 12.8228 13.925 12.777C13.7844 13.1108 13.566 13.406 13.288 13.638C14.688 16.221 14.128 19 11.622 19C8.5 19 8.423 16.494 10.082 15.668C10.3852 15.4828 10.644 15.2332 10.84 14.9368C11.036 14.6404 11.1644 14.3046 11.216 13.953C10.8729 13.8188 10.5711 13.5967 10.341 13.309C7.758 14.695 5 14.149 5 11.65C5 8.50002 7.478 8.42302 8.304 10.082C8.48945 10.3888 8.74199 10.6496 9.04265 10.8448C9.34332 11.0399 9.68431 11.1645 10.04 11.209C10.1748 10.8721 10.3971 10.5772 10.684 10.355C9.291 7.80001 9.844 5.00002 12.336 5.00002H12.35Z"
          fill={getColor()}
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
      
      {/* Teho-indikaattori (pienet pallot 1-4) */}
      <div 
        style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          display: 'flex',
          gap: '1px'
        }}
      >
        {[1, 2, 3, 4].map(level => (
          <div
            key={level}
            style={{
              width: '3px',
              height: '3px',
              borderRadius: '50%',
              backgroundColor: fanSpeed >= level ? getColor() : '#e5e7eb',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default FanIcon;
