import React from 'react';
import Compressor from './Compressor';
import Fan from './Fan';

interface AirConditionerProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  compressorId?: string;
  fanId?: string;
  layout?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  position: { x: number; y: number }; // Relative position (0..1)
  baseWidth: number;
  baseHeight: number;
  id?: string;
  onPointerDown?: (e: React.PointerEvent) => void;
}

const ensureStyles = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.dataset.airConditionerStyles = 'true';
    style.textContent = `
      .airconditioner-root {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 8px;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        background: linear-gradient(135deg, #f8fafc, #edf2f7);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        cursor: pointer;
        z-index: 10;
      }
      
      .airconditioner-root.vertical {
        flex-direction: column;
        gap: 12px;
      }
      
      .airconditioner-root:hover {
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }
      
      .airconditioner-title {
        position: absolute;
        top: -8px;
        left: 12px;
        background: white;
        padding: 2px 8px;
        font-size: 12px;
        font-weight: 600;
        color: #374151;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      .airconditioner-component {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      
      .airconditioner-label {
        font-size: 10px;
        font-weight: 500;
        color: #6b7280;
        text-align: center;
      }
      
      .airconditioner-separator {
        width: 1px;
        height: 60px;
        background: linear-gradient(to bottom, transparent, #cbd5e0, transparent);
        margin: 0 8px;
      }
      
      .airconditioner-root.vertical .airconditioner-separator {
        width: 60px;
        height: 1px;
        background: linear-gradient(to right, transparent, #cbd5e0, transparent);
        margin: 8px 0;
      }
    `;
    document.head.appendChild(style);
    injected = true;
  };
})();

const AirConditioner: React.FC<AirConditionerProps> = ({
  size = 80,
  className = '',
  style,
  title = 'Ilmastointikone',
  compressorId = 'default',
  fanId = 'default',
  layout = 'horizontal',
  showLabels = true,
  position,
  baseWidth,
  baseHeight,
  id,
  onPointerDown
}) => {
  ensureStyles();

  // Convert relative position to absolute pixels
  const left = position.x * baseWidth;
  const top = position.y * baseHeight;

  return (
    <div
      className={`airconditioner-root ${layout} ${className}`.trim()}
      style={{
        ...style,
        left: `${left}px`,
        top: `${top}px`
      }}
      data-id={id}
      onPointerDown={onPointerDown}
    >
      {title && <div className="airconditioner-title">{title}</div>}
      
      <div className="airconditioner-component">
        {showLabels && <div className="airconditioner-label">Kompressori</div>}
        <Compressor 
          size={size} 
          compressorId={compressorId}
          title={`${title} - Kompressori`}
          position={{ x: 0, y: 0 }}
          baseWidth={100}
          baseHeight={100}
        />
      </div>
      
      {layout === 'horizontal' && <div className="airconditioner-separator" />}
      {layout === 'vertical' && <div className="airconditioner-separator" />}
      
      <div className="airconditioner-component">
        {showLabels && <div className="airconditioner-label">Puhallin</div>}
        <Fan 
          size={size} 
          fanId={fanId}
          fanType="indoor"
          title={`${title} - Puhallin`}
          position={{ x: 0, y: 0 }}
          baseWidth={100}
          baseHeight={100}
        />
      </div>
    </div>
  );
};

export default AirConditioner;