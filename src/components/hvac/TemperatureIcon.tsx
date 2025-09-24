import React, { useState, useEffect } from 'react';
import { getUpdateStatus, onUpdateStatusChange } from '../../helpers/socketHelper';
import TemperatureCard from './TemperatureCard';

interface TemperatureIconProps {
  roomId: string;
  roomName: string;
  authenticated?: boolean;
  minTemp?: number;
  maxTemp?: number;
  step?: number;
  scale?: number; // Lisätään scale prop
}

const TemperatureIcon: React.FC<TemperatureIconProps> = ({
  roomId,
  roomName,
  authenticated = false,
  minTemp = 18,
  maxTemp = 25,
  step = 0.5,
  scale = 1 // Oletus skaali
}) => {
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      
      // Add escape key listener
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsModalOpen(false);
        }
      };
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
  }, [isModalOpen]);

  // Format temperature
  const formatTemperature = (temp: number | null): string => {
    if (temp == null) return '--';
    return parseFloat(temp.toString()).toFixed(1);
  };

  useEffect(() => {
    // Room ID to name mapping
    const roomIdToName: Record<number, string> = {
      1: 'mh1',     // Makuuhuone 1
      2: 'mh2',     // Makuuhuone 2
      3: 'mh3',     // Makuuhuone 3
      4: 'ohetkt',  // Olohuone/etupihan takkahuone
      5: 'phkhh'    // Pesuhuone/kodinhoitohuone
    };

    // Get room key for temperature lookup
    const getRoomKey = (id: string): string => {
      const numId = parseInt(id);
      return roomIdToName[numId] || id.toLowerCase();
    };

    const roomKey = getRoomKey(roomId);

    const extractCurrentTemperature = (statusData: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (Array.isArray(statusData.temperatures)) {
        const tempEntry = statusData.temperatures.find((t: any) =>  // eslint-disable-line @typescript-eslint/no-explicit-any
          t.room && t.room.toLowerCase() === roomKey
        );
        if (tempEntry) {
          return typeof tempEntry.value === 'number' 
            ? tempEntry.value 
            : parseFloat(tempEntry.value) || null;
        }
      } else if (statusData.temperatures && typeof statusData.temperatures === 'object') {
        // Handle object format temperatures
        const entries = Object.entries(statusData.temperatures);
        for (const [key, value] of entries) {
          if (key.toLowerCase() === roomKey && typeof value === 'number') {
            return value;
          }
        }
      }
      return null;
    };

    // Get initial temperature
    const initialStatus = getUpdateStatus();
    if (initialStatus) {
      setCurrentTemp(extractCurrentTemperature(initialStatus));
    }

    // Subscribe to temperature updates
    const unsubscribe = onUpdateStatusChange((statusData) => {
      setCurrentTemp(extractCurrentTemperature(statusData));
    });

    return unsubscribe;
  }, [roomId]);

  const handleClick = () => setIsModalOpen(true);
  
  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent double-firing with onClick
    setIsModalOpen(true);
  };
  
  const handlePointer = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      e.preventDefault(); // Prevent double-firing with onClick
    }
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Temperature Icon */}
      <div 
        onClick={handleClick}
        onTouchStart={handleTouch}
        onPointerDown={handlePointer}
        style={{ 
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: 'rgba(240, 249, 255, 0.95)', // Light blue background with transparency
          padding: `${4 * scale}px ${6 * scale}px`,
          borderRadius: `${8 * scale}px`,
          border: `${2 * scale}px solid #0ea5e9`,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)', // Shadow for better visibility
          backdropFilter: 'blur(2px)', // Subtle blur effect
          minWidth: `${40 * scale}px`,
          transition: 'all 0.2s ease',
          transform: `scale(${scale})`,
          touchAction: 'manipulation' // Improves touch responsiveness
        }}
        className="temperature-icon"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = `scale(${scale * 1.05})`;
          e.currentTarget.style.backgroundColor = 'rgba(219, 234, 254, 0.95)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = `scale(${scale})`;
          e.currentTarget.style.backgroundColor = 'rgba(240, 249, 255, 0.95)';
        }}
      >
        {/* Thermometer SVG icon */}
        <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16">
          {/* Thermometer body */}
          <rect
            x="6"
            y="1"
            width="4"
            height="10"
            rx="2"
            fill="#0ea5e9"
          />
          {/* Thermometer bulb */}
          <circle
            cx="8"
            cy="13"
            r="2.5"
            fill="#ef4444"
          />
          {/* Temperature lines */}
          <line x1="10.5" y1="3" x2="12" y2="3" stroke="#0ea5e9" strokeWidth="1"/>
          <line x1="10.5" y1="5" x2="12" y2="5" stroke="#0ea5e9" strokeWidth="1"/>
          <line x1="10.5" y1="7" x2="12" y2="7" stroke="#0ea5e9" strokeWidth="1"/>
        </svg>

        {/* Temperature text */}
        <div
          style={{
            fontSize: `${10 * scale}px`,
            color: '#374151',
            fontWeight: '600',
            marginTop: `${2 * scale}px`
          }}
        >
          {formatTemperature(currentTemp)}°
        </div>
      </div>

      {/* Modal with full TemperatureCard */}
      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999 // Very high z-index to ensure it's above everything
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <TemperatureCard
            roomId={roomId}
            roomName={roomName}
            authenticated={authenticated}
            minTemp={minTemp}
            maxTemp={maxTemp}
            step={step}
            isModal={true}
            onClose={() => setIsModalOpen(false)}
          />
        </div>
      )}
    </>
  );
};

export default TemperatureIcon;
