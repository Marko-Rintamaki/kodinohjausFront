import React from 'react';
import TemperatureCard from '../TemperatureCard';

interface MobileTemperatureViewProps {
  temperatureIcons: Array<{id: string; roomId: string; roomName?: string}>;
  authenticated: boolean;
}

const MobileTemperatureView: React.FC<MobileTemperatureViewProps> = ({
  temperatureIcons,
  authenticated
}) => {
  return (
    <div style={{
      padding: '16px',
      paddingBottom: '80px', // Space for navigation tabs
      backgroundColor: '#f9fafb',
      minHeight: '100vh'
    }}>
      <h2 style={{
        margin: '0 0 16px 0',
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: '#1f2937'
      }}>
        🌡️ Lämpötilat
      </h2>

      <div style={{
        display: 'grid',
        gap: '12px'
      }}>
        {temperatureIcons.map(icon => (
          <div key={icon.id} style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <TemperatureCard
              roomId={icon.roomId}
              roomName={icon.roomName || icon.roomId}
              authenticated={authenticated}
              isModal={false}
            />
          </div>
        ))}
      </div>

      {temperatureIcons.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: '#6b7280'
        }}>
          <p>Ei lämpötila-antureita löytynyt</p>
        </div>
      )}
    </div>
  );
};

export default MobileTemperatureView;
