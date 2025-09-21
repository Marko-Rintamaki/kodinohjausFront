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
  layout?: 'horizontal' | 'vertical'; // How to arrange compressor and fan
  showLabels?: boolean;
}

const ensureStyles = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.dataset.airConditionerStyles = 'true';
    style.textContent = `
      .airconditioner-root {
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
        position: relative;
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
        color: #4a5568;
        border-radius: 4px;
        border: 1px solid #e2e8f0;
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
        color: #718096;
        text-transform: uppercase;
        letter-spacing: 0.5px;
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
  showLabels = true
}) => {
  ensureStyles();

  return (
    <div
      className={`airconditioner-root ${layout} ${className}`.trim()}
      style={style}
    >
      {title && <div className="airconditioner-title">{title}</div>}
      
      <div className="airconditioner-component">
        {showLabels && <div className="airconditioner-label">Kompressori</div>}
        <Compressor 
          size={size} 
          compressorId={compressorId}
          title={`${title} - Kompressori`}
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
        />
      </div>
    </div>
  );
};

export default AirConditioner;
