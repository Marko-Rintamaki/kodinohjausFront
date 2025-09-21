import React, { useState } from 'react';
import './StatusModal.css';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
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
    // Lisätiedot
    outsideTemp?: number;
    insideTemp?: number;
    heatPumpStatus?: string;
    batteryLevel?: number;
    gridPower?: number;
  };
}

const StatusModal: React.FC<StatusModalProps> = ({ 
  isOpen, 
  onClose, 
  statusData 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const {
    hotWaterTemp = 0,
    heatingTankTemp = 0,
    powerConsumption = 0,
    solarProduction = 0,
    heatPumpPower = 0,
    ventilationPower = 0,
    lightingPower = 0,
    ventilationInTemp = 0,
    ventilationOutTemp = 0,
    outsideTemp = 0,
    insideTemp = 20,
    gridPower = 0
  } = statusData || {};

  return (
    <div className="status-modal-overlay" onClick={onClose}>
      <div className="status-modal" onClick={(e) => e.stopPropagation()}>
        <div className="status-modal-header">
          <h2>Järjestelmätilanne</h2>
          <button className="status-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="status-modal-content">
          {/* Oleelliset tiedot */}
          <div className="status-main-grid">
            <div className="status-card">
              <div className="status-icon">🚿</div>
              <div className="status-info">
                <span className="status-label">Käyttövesi</span>
                <span className="status-value">{hotWaterTemp.toFixed(1)}°C</span>
              </div>
            </div>

            <div className="status-card">
              <div className="status-icon">🔥</div>
              <div className="status-info">
                <span className="status-label">Lämmitysvaraaja</span>
                <span className="status-value">{heatingTankTemp.toFixed(1)}°C</span>
              </div>
            </div>

            <div className="status-card">
              <div className="status-icon">⚡</div>
              <div className="status-info">
                <span className="status-label">
                  {powerConsumption >= 0 ? 'Sähkön kulutus' : 'Syöttö verkkoon'}
                </span>
                <span className="status-value" style={{color: powerConsumption >= 0 ? '#333' : '#22c55e'}}>
                  {Math.abs(powerConsumption).toFixed(2)} kW
                </span>
              </div>
            </div>

            <div className="status-card">
              <div className="status-icon">☀️</div>
              <div className="status-info">
                <span className="status-label">Aurinkotuotto</span>
                <span className="status-value">{solarProduction.toFixed(2)} kW</span>
              </div>
            </div>
          </div>

          {/* Näytä lisätiedot painike */}
          <button 
            className="show-details-btn"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Piilota lisätiedot' : 'Näytä lisätiedot'} 
            <span className={`arrow ${showDetails ? 'up' : 'down'}`}>▼</span>
          </button>

          {/* Lisätiedot */}
          {showDetails && (
            <div className="status-details">
              <div className="status-details-grid">
                <div className="status-detail-card">
                  <span className="detail-label">Ulkolämpötila</span>
                  <span className="detail-value">{outsideTemp.toFixed(1)}°C</span>
                </div>

                <div className="status-detail-card">
                  <span className="detail-label">Sisälämpötila</span>
                  <span className="detail-value">{insideTemp.toFixed(1)}°C</span>
                </div>

                <div className="status-detail-card">
                  <span className="detail-label">IV tuloilma</span>
                  <span className="detail-value">{ventilationInTemp.toFixed(1)}°C</span>
                </div>

                <div className="status-detail-card">
                  <span className="detail-label">IV poistoilma</span>
                  <span className="detail-value">{ventilationOutTemp.toFixed(1)}°C</span>
                </div>

                <div className="status-detail-card">
                  <span className="detail-label">Verkkovirta</span>
                  <span className="detail-value">{gridPower.toFixed(2)} kW</span>
                </div>

                {/* Sähkönkulutus breakdown */}
                <div className="status-detail-card">
                  <span className="detail-label">VILP kulutus</span>
                  <span className="detail-value">{heatPumpPower.toFixed(2)} kW</span>
                </div>

                <div className="status-detail-card">
                  <span className="detail-label">IV-kone</span>
                  <span className="detail-value">{ventilationPower.toFixed(2)} kW</span>
                </div>

                <div className="status-detail-card">
                  <span className="detail-label">Valaistus</span>
                  <span className="detail-value">{lightingPower.toFixed(2)} kW</span>
                </div>

                {/* Vaihetehot jos ne on olemassa */}
                {statusData?.powerL1 !== undefined && (
                  <>
                    <div className="status-detail-card">
                      <span className="detail-label">Vaihe L1</span>
                      <span className="detail-value" style={{color: (statusData.powerL1 || 0) >= 0 ? '#333' : '#22c55e'}}>
                        {(statusData.powerL1 || 0) >= 0 ? '+' : ''}{statusData.powerL1?.toFixed(2) || '0.00'} kW
                      </span>
                    </div>
                    <div className="status-detail-card">
                      <span className="detail-label">Vaihe L2</span>
                      <span className="detail-value" style={{color: (statusData.powerL2 || 0) >= 0 ? '#333' : '#22c55e'}}>
                        {(statusData.powerL2 || 0) >= 0 ? '+' : ''}{statusData.powerL2?.toFixed(2) || '0.00'} kW
                      </span>
                    </div>
                    <div className="status-detail-card">
                      <span className="detail-label">Vaihe L3</span>
                      <span className="detail-value" style={{color: (statusData.powerL3 || 0) >= 0 ? '#333' : '#22c55e'}}>
                        {(statusData.powerL3 || 0) >= 0 ? '+' : ''}{statusData.powerL3?.toFixed(2) || '0.00'} kW
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusModal;
