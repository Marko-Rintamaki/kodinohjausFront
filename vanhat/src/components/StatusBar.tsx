import React from 'react';
import './StatusBar.css';

interface StatusBarProps {
  statusData?: {
    hotWaterTemp?: number;
    heatingTankTemp?: number;
    powerConsumption?: number;
    solarProduction?: number;
    heatPumpPower?: number;
    ventilationPower?: number;
    lightingPower?: number;
    ventilationInTemp?: number;
    ventilationOutTemp?: number;
    powerL1?: number;
    powerL2?: number;
    powerL3?: number;
    outsideTemp?: number;
    insideTemp?: number;
    heatPumpStatus?: string;
    batteryLevel?: number;
    gridPower?: number;
  };
  onShowDetails?: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({ statusData, onShowDetails }) => {
  const {
    hotWaterTemp = 0,
    heatingTankTemp = 0,
    powerConsumption = 0,
    solarProduction = 0,
    heatPumpPower = 0,
    ventilationPower = 0,
    lightingPower = 0,
  } = statusData || {};

  return (
    <div className="status-bar">
      <div className="status-bar-cards">
        <div className="status-bar-card">
          <div className="status-bar-icon">🚿</div>
          <div className="status-bar-info">
            <span className="status-bar-label">Käyttövesi</span>
            <span className="status-bar-value">{hotWaterTemp.toFixed(1)}°C</span>
          </div>
        </div>

        <div className="status-bar-card">
          <div className="status-bar-icon">🔥</div>
          <div className="status-bar-info">
            <span className="status-bar-label">Varaaja</span>
            <span className="status-bar-value">{heatingTankTemp.toFixed(1)}°C</span>
          </div>
        </div>

        <div className="status-bar-card">
          <div className="status-bar-icon">⚡</div>
          <div className="status-bar-info">
            <span className="status-bar-label">
              {powerConsumption >= 0 ? 'Kulutus' : 'Syöttö'}
            </span>
            <span 
              className="status-bar-value" 
              style={{color: powerConsumption >= 0 ? '#333' : '#22c55e'}}
            >
              {Math.abs(powerConsumption).toFixed(2)} kW
            </span>
          </div>
        </div>

        <div className="status-bar-card">
          <div className="status-bar-icon">☀️</div>
          <div className="status-bar-info">
            <span className="status-bar-label">Aurinko</span>
            <span className="status-bar-value">{solarProduction.toFixed(2)} kW</span>
          </div>
        </div>

        <div className="status-bar-card">
          <div className="status-bar-icon">🏠</div>
          <div className="status-bar-info">
            <span className="status-bar-label">VILP</span>
            <span className="status-bar-value">{heatPumpPower.toFixed(2)} kW</span>
          </div>
        </div>

        <div className="status-bar-card">
          <div className="status-bar-icon">🌬️</div>
          <div className="status-bar-info">
            <span className="status-bar-label">IV-kone</span>
            <span className="status-bar-value">{ventilationPower.toFixed(2)} kW</span>
          </div>
        </div>

        <div className="status-bar-card">
          <div className="status-bar-icon">💡</div>
          <div className="status-bar-info">
            <span className="status-bar-label">Valaistus</span>
            <span className="status-bar-value">{lightingPower.toFixed(2)} kW</span>
          </div>
        </div>

        {onShowDetails && (
          <button className="status-bar-details-btn" onClick={onShowDetails}>
            <span>Lisää</span>
            <span className="status-bar-arrow">▼</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default StatusBar;
