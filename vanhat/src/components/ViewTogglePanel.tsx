import React from 'react';
import './ViewTogglePanel.css';

interface ViewTogglePanelProps {
  hideHeatingPipes: boolean;
  onHideHeatingPipesChange: (hide: boolean) => void;
  hideLEDStrips: boolean;
  onHideLEDStripsChange: (hide: boolean) => void;
  hideLamps: boolean;
  onHideLampsChange: (hide: boolean) => void;
  hideTemperatureIcons: boolean;
  onHideTemperatureIconsChange: (hide: boolean) => void;
  hideWallLights: boolean;
  onHideWallLightsChange: (hide: boolean) => void;
  hideHeatPumps: boolean;
  onHideHeatPumpsChange: (hide: boolean) => void;
}

const ViewTogglePanel: React.FC<ViewTogglePanelProps> = ({
  hideHeatingPipes,
  onHideHeatingPipesChange,
  hideLEDStrips,
  onHideLEDStripsChange,
  hideLamps,
  onHideLampsChange,
  hideTemperatureIcons,
  onHideTemperatureIconsChange,
  hideWallLights,
  onHideWallLightsChange,
  hideHeatPumps,
  onHideHeatPumpsChange,
}) => {
  return (
    <div className="view-toggle-panel">
      <div className="view-toggle-header">
        <span>👁️</span>
        <span>Näkyvyys</span>
      </div>
      
      <div className="view-toggle-options">
        <label className="view-toggle-option">
          <input
            type="checkbox"
            checked={!hideHeatingPipes}
            onChange={(e) => onHideHeatingPipesChange(!e.target.checked)}
          />
          <span className="view-toggle-icon">🔥</span>
          <span>Lämmitys</span>
        </label>

        <label className="view-toggle-option">
          <input
            type="checkbox"
            checked={!hideLEDStrips}
            onChange={(e) => onHideLEDStripsChange(!e.target.checked)}
          />
          <span className="view-toggle-icon">💡</span>
          <span>LED-nauhat</span>
        </label>

        <label className="view-toggle-option">
          <input
            type="checkbox"
            checked={!hideLamps}
            onChange={(e) => onHideLampsChange(!e.target.checked)}
          />
          <span className="view-toggle-icon">🏮</span>
          <span>Lamput</span>
        </label>

        <label className="view-toggle-option">
          <input
            type="checkbox"
            checked={!hideWallLights}
            onChange={(e) => onHideWallLightsChange(!e.target.checked)}
          />
          <span className="view-toggle-icon">💡</span>
          <span>Seinävalot</span>
        </label>

        <label className="view-toggle-option">
          <input
            type="checkbox"
            checked={!hideTemperatureIcons}
            onChange={(e) => onHideTemperatureIconsChange(!e.target.checked)}
          />
          <span className="view-toggle-icon">🌡️</span>
          <span>Lämpötilat</span>
        </label>

        <label className="view-toggle-option">
          <input
            type="checkbox"
            checked={!hideHeatPumps}
            onChange={(e) => onHideHeatPumpsChange(!e.target.checked)}
          />
          <span className="view-toggle-icon">❄️</span>
          <span>Lämpöpumput</span>
        </label>
      </div>
    </div>
  );
};

export default ViewTogglePanel;
