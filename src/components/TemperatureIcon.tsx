import React, { useState, useEffect } from 'react';
import { getUpdateStatus, onUpdateStatusChange } from '../helpers/socketHelper';
import type { StatusUpdate } from '../types';

interface TemperatureIconProps {
  roomId: string;
  roomName?: string;
  currentTemp?: number | null;
  scale?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const TemperatureIcon: React.FC<TemperatureIconProps> = ({
  roomId,
  roomName,
  currentTemp: currentTempProp = null,
  scale = 1,
  onClick,
  style = {}
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [liveTemp, setLiveTemp] = useState<number | null>(currentTempProp);

  useEffect(() => {
    // Room ID to name mapping for temperature lookup
    const roomIdToName: Record<number, string> = {
      1: 'MH1',     // Makuuhuone 1
      2: 'MH2',     // Makuuhuone 2
      3: 'MH3',     // Makuuhuone 3
      4: 'OHETKT',  // Olohuone/etupihan takkahuone
      5: 'PHKHH'    // Pesuhuone/kodinhoitohuone
    };

    // Get room key for temperature lookup
    const getRoomKey = (id: string): string => {
      const numId = parseInt(id);
      return (roomIdToName[numId] || id).toLowerCase();
    };

    const extractCurrentTemperature = (statusData: StatusUpdate) => {
      const roomKey = getRoomKey(roomId);
      if (Array.isArray(statusData.temperatures)) {
        const tempEntry = statusData.temperatures.find((t: { room?: string; value?: number | string }) =>
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

    // Get initial temperature from current status
    const initialStatus = getUpdateStatus();
    if (initialStatus) {
      const temp = extractCurrentTemperature(initialStatus);
      if (temp !== null) {
        setLiveTemp(temp);
      }
    }

    // Subscribe to temperature updates
    const unsubscribe = onUpdateStatusChange((statusData) => {
      const temp = extractCurrentTemperature(statusData);
      if (temp !== null) {
        setLiveTemp(temp);
      }
    });

    return unsubscribe;
  }, [roomId]);

  // Use liveTemp if available, fallback to prop
  const displayTemp = liveTemp !== null ? liveTemp : currentTempProp;

  // Format temperature
  const formatTemperature = (temp: number | null): string => {
    if (temp == null) return '--';
    return parseFloat(temp.toString()).toFixed(1);
  };

  const handleClick = () => {
    onClick?.();
  };

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
    <div 
      onClick={handleClick}
      onTouchStart={handleTouch}
      onPointerDown={handlePointer}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: isHovered 
          ? 'rgba(219, 234, 254, 0.95)' 
          : 'rgba(240, 249, 255, 0.95)',
        padding: `${4 * scale}px ${6 * scale}px`,
        borderRadius: `${8 * scale}px`,
        border: `${2 * scale}px solid #0ea5e9`,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(2px)',
        minWidth: `${40 * scale}px`,
        transition: 'all 0.2s ease',
        transform: `scale(${isHovered ? scale * 1.05 : scale})`,
        touchAction: 'manipulation',
        ...style
      }}
      className="temperature-icon"
      title={`${roomName || roomId}: ${formatTemperature(displayTemp)}°C`}
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
        {formatTemperature(displayTemp)}°
      </div>
    </div>
  );
};

export default TemperatureIcon;