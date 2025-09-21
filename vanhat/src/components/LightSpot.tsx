import React from 'react';

export interface LightSpotProps {
  id: string;
  name?: string;
  on: boolean;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  size?: number; // px diameter
  dimmable?: boolean;
  brightness?: number;
  updating?: boolean;
  onToggle?: (id: string, currentState: boolean) => void;
  onBrightnessChange?: (id: string, value: number) => void;
}

/**
 * Single LED spot / light location rendered over the home view.
 * Coordinates are percentage values relative to the original (unscaled) home view size.
 */
const LightSpot: React.FC<LightSpotProps> = ({
  id,
  name,
  on,
  x,
  y,
  size = 46,
  dimmable,
  brightness = 100,
  updating,
  onToggle,
  onBrightnessChange,
}) => {
  return (
    <div
      className={`light-spot ${on ? 'on' : ''} ${updating ? 'updating' : ''}`}
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={() => !updating && onToggle?.(id, on)}
      title={`${name || id}${dimmable ? ` (${brightness}%)` : ''}`}
      role="button"
      aria-label={`Light ${name || id} ${on ? 'on' : 'off'}`}
    >
      <svg viewBox="0 0 100 100" className="spot-svg" width={size} height={size}>
        <circle className="spot-glow" cx="50" cy="50" r="42" />
        <circle className="spot-core" cx="50" cy="50" r="30" />
        <circle className="spot-ring" cx="50" cy="50" r="46" />
      </svg>
      {dimmable && (
        <div className="spot-dimmer" onClick={(e) => e.stopPropagation()}>
          <input
            type="range"
            min={1}
            max={100}
            value={brightness}
            onChange={(e) => onBrightnessChange?.(id, Number(e.target.value))}
          />
        </div>
      )}
    </div>
  );
};

export default LightSpot;
