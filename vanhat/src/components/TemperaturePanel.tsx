import React, { useState, useEffect } from 'react';
import TemperatureCard from './TemperatureCard';
import { useAppSocket } from '../hooks/useAppSocket';
import './TemperaturePanel.css';

// Debug logging flags - set to true to enable specific logging categories:
// temperaturePanelLogging: TemperaturePanel authentication status changes
var temperaturePanelLogging = false;

interface Room {
  id: string;
  name: string;
  displayName: string;
}

const TemperaturePanel: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  
  // Use the existing socket hook for authentication status
  const { authStatus } = useAppSocket({
    autoAuth: true,
    authRetries: 2,
    fallbackMs: 5000,
    useStatusAsInitial: true,
    overviewQuery: false
  });

  // Room definitions matching the old Heating.js structure
  const rooms: Room[] = [
    { id: '1', name: 'mh1', displayName: 'Makuuhuone 1' },
    { id: '2', name: 'mh2', displayName: 'Makuuhuone 2' },
    { id: '3', name: 'mh3', displayName: 'Makuuhuone 3' },
    { id: '4', name: 'ohetkt', displayName: 'Olohuone' },
    { id: '5', name: 'phkhh', displayName: 'Pesuhuone' }
  ];

  // Monitor authentication status
  useEffect(() => {
    if (temperaturePanelLogging) {
      console.log('[TemperaturePanel] Auth status changed:', authStatus, 'type:', typeof authStatus);
    }
    const isAuthenticated = authStatus === 'authenticated';
    if (temperaturePanelLogging) {
      console.log('[TemperaturePanel] Setting authenticated to:', isAuthenticated);
    }
    setAuthenticated(isAuthenticated);
  }, [authStatus]);

  return (
    <div className="temperature-panel">
      <div className="temperature-panel-header">
        <h2>Huonelämpötilat</h2>
        {!authenticated && (
          <div className="auth-status">
            <span className="auth-indicator offline" />
            <span>Vain lukutila - kirjaudu sisään säätääksesi</span>
          </div>
        )}
        {authenticated && (
          <div className="auth-status">
            <span className="auth-indicator online" />
            <span>Yhdistetty - voit säätää lämpötiloja</span>
          </div>
        )}
      </div>
      
      <div className="temperature-cards-grid">
        {rooms.map(room => (
          <TemperatureCard
            key={room.id}
            roomId={room.id}
            roomName={room.displayName}
            authenticated={authenticated}
             
            minTemp={18}
            maxTemp={25}
            step={0.5}
          />
        ))}
      </div>
      
      <div className="temperature-panel-info">
        <p>
          Nykyiset lämpötilat päivittyvät automaattisesti. 
          {authenticated 
            ? ' Tavoitelämpötilat tallentuvat tietokantaan automaattisesti liukusäätimen muutosten jälkeen.'
            : ' Kirjaudu sisään muuttaaksesi tavoitelämpötiloja.'
          }
        </p>
      </div>
    </div>
  );
};

export default TemperaturePanel;
