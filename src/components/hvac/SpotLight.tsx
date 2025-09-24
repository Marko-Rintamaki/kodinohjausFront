import React, { useState, useCallback } from 'react';

export interface SpotLightProps {
  size?: number;
  on?: boolean;
  defaultOn?: boolean;
  onChange?: (on: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
  tabIndex?: number;
  title?: string;
}

const SpotLight: React.FC<SpotLightProps> = ({
  size = 24,
  on: controlledOn,
  defaultOn = false,
  onChange,
  className = '',
  style = {},
  tabIndex,
  title,
}) => {
  const [internalOn, setInternalOn] = useState(defaultOn);
  const isOn = controlledOn !== undefined ? controlledOn : internalOn;

  const toggle = useCallback(() => {
    const newState = !isOn;
    if (onChange) {
      onChange(newState);
    } else {
      setInternalOn(newState);
    }
  }, [isOn, onChange]);

  const handleTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent double-firing with onClick
    toggle();
  }, [toggle]);

  const handlePointer = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      e.preventDefault(); // Prevent double-firing with onClick
    }
    toggle();
  }, [toggle]);

  return (
    <div
      className={`spot-light ${isOn ? 'on' : 'off'} ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid #475569',
        backgroundColor: isOn ? '#fbbf24' : 'transparent',
        boxShadow: isOn 
          ? '0 0 8px #fbbf24, 0 0 16px rgba(251, 191, 36, 0.6), inset 0 0 4px rgba(255, 255, 255, 0.3)'
          : 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'manipulation',
        ...style,
      }}
      onClick={toggle}
      onTouchStart={handleTouch}
      onPointerDown={handlePointer}
      tabIndex={tabIndex}
      title={title}
      role="button"
      aria-label={`Spottivalo ${isOn ? 'päällä' : 'pois päältä'}`}
    >
      {isOn && (
        <div
          style={{
            width: '60%',
            height: '60%',
            borderRadius: '50%',
            backgroundColor: '#fff',
            opacity: 0.8,
          }}
        />
      )}
    </div>
  );
};

export default SpotLight;
