import React from 'react';

interface MobileLightingControlsProps {
  lamps: Array<{id: string; kind: string; relayId?: number}>;
  strips: Array<{id: string; relayId?: number}>;
  wallLights: Array<{id: string; direction?: string; relayId?: number}>;
  getRelayStatus: (relayId: number) => number;
  onToggleRelay: (relayId: number, currentStatus: number) => void;
}

const MobileLightingControls: React.FC<MobileLightingControlsProps> = ({
  lamps,
  strips,
  wallLights,
  getRelayStatus,
  onToggleRelay
}) => {
  const allLights = [
    ...lamps.map(l => ({ ...l, type: 'lamp', name: `${l.id} (${l.kind})` })),
    ...strips.map(s => ({ ...s, type: 'strip', name: `${s.id} (LED)` })),
    ...wallLights.map(w => ({ ...w, type: 'wall', name: `${w.id} (${w.direction})` }))
  ].filter(light => light.relayId);

  const lightsByRoom = allLights.reduce((acc, light) => {
    // Simple room detection from ID
    const room = light.id.split('_')[0] || 'Muut';
    if (!acc[room]) acc[room] = [];
    acc[room].push(light);
    return acc;
  }, {} as Record<string, any[]>);

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
        💡 Valaistuksen ohjaus
      </h2>

      {Object.entries(lightsByRoom).map(([room, lights]) => (
        <div key={room} style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#374151',
            textTransform: 'capitalize'
          }}>
            {room}
          </h3>

          <div style={{
            display: 'grid',
            gap: '8px'
          }}>
            {lights.map(light => {
              const isOn = light.relayId ? getRelayStatus(light.relayId) === 1 : false;
              
              return (
                <button
                  key={light.id}
                  onClick={() => {
                    if (light.relayId) {
                      onToggleRelay(light.relayId, getRelayStatus(light.relayId));
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    border: '2px solid',
                    borderColor: isOn ? '#10b981' : '#d1d5db',
                    borderRadius: '8px',
                    backgroundColor: isOn ? '#f0fdf4' : '#ffffff',
                    color: isOn ? '#065f46' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  <span>{light.name}</span>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: isOn ? '#10b981' : '#d1d5db',
                    border: '2px solid white',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                  }} />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {allLights.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: '#6b7280'
        }}>
          <p>Ei kytkettyjä valoja löytynyt</p>
        </div>
      )}
    </div>
  );
};

export default MobileLightingControls;
