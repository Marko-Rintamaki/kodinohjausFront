import React, { useState } from 'react';
import MobileNavigationTabs from '../../components/mobile/MobileNavigationTabs';
import MobileLightingControls from '../../components/mobile/MobileLightingControls';
import MobileTemperatureView from '../../components/mobile/MobileTemperatureView';
import StatusModal from '../../components/StatusModal';

interface MobileHomeProps {
  // Props passed from main Home component
  lamps: Array<{id: string; kind: string; relayId?: number}>;
  strips: Array<{id: string; relayId?: number}>;
  wallLights: Array<{id: string; direction?: string; relayId?: number}>;
  heatingPipes: Array<{id: string; relayId?: number}>;
  temperatureIcons: Array<{id: string; roomId: string; roomName?: string}>;
  authenticated: boolean;
  getRelayStatus: (relayId: number) => number;
  handleToggleRelay: (relayId: number, currentStatus: number) => void;
}

const MobileHome: React.FC<MobileHomeProps> = ({
  lamps,
  strips,
  wallLights,
  heatingPipes,
  temperatureIcons,
  authenticated,
  getRelayStatus,
  handleToggleRelay
}) => {
  const [activeTab, setActiveTab] = useState('lighting');
  const [showStatusModal, setShowStatusModal] = useState(false);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'lighting':
        return (
          <MobileLightingControls
            lamps={lamps}
            strips={strips}
            wallLights={wallLights}
            getRelayStatus={getRelayStatus}
            onToggleRelay={handleToggleRelay}
          />
        );
      
      case 'temperature':
        return (
          <MobileTemperatureView
            temperatureIcons={temperatureIcons}
            authenticated={authenticated}
          />
        );
      
      case 'heating':
        return (
          <div style={{
            padding: '16px',
            paddingBottom: '80px',
            backgroundColor: '#f9fafb',
            minHeight: '100vh'
          }}>
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              🔥 Lämmitys
            </h2>
            
            <div style={{
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
                color: '#374151'
              }}>
                Lämmitysputket
              </h3>
              
              <div style={{ display: 'grid', gap: '8px' }}>
                {heatingPipes.filter(pipe => pipe.relayId).map(pipe => {
                  const isOn = getRelayStatus(pipe.relayId!) === 1;
                  
                  return (
                    <button
                      key={pipe.id}
                      onClick={() => handleToggleRelay(pipe.relayId!, getRelayStatus(pipe.relayId!))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        border: '2px solid',
                        borderColor: isOn ? '#ef4444' : '#d1d5db',
                        borderRadius: '8px',
                        backgroundColor: isOn ? '#fef2f2' : '#ffffff',
                        color: isOn ? '#991b1b' : '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      <span>{pipe.id}</span>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: isOn ? '#ef4444' : '#d1d5db',
                        border: '2px solid white',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                      }} />
                    </button>
                  );
                })}
              </div>
              
              {heatingPipes.filter(pipe => pipe.relayId).length === 0 && (
                <p style={{ color: '#6b7280', textAlign: 'center', margin: '16px 0' }}>
                  Ei kytkettyjä lämmitysputkia
                </p>
              )}
            </div>
          </div>
        );
      
      case 'overview':
        return (
          <div style={{
            padding: '16px',
            paddingBottom: '80px',
            backgroundColor: '#f9fafb',
            minHeight: '100vh'
          }}>
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              📊 Yleiskuva
            </h2>
            
            <button
              onClick={() => setShowStatusModal(true)}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '16px'
              }}
            >
              📈 Avaa järjestelmän tila
            </button>
            
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                Tilastot
              </h3>
              
              <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Valoja:</span>
                  <span>{lamps.filter(l => l.relayId).length + strips.filter(s => s.relayId).length + wallLights.filter(w => w.relayId).length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Lämpötila-antureita:</span>
                  <span>{temperatureIcons.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Lämmitysputkia:</span>
                  <span>{heatingPipes.filter(h => h.relayId).length}</span>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '16px',
        borderBottom: '1px solid #e5e5e5',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: '#1f2937'
        }}>
          🏠 Kodin ohjaus
        </h1>
      </div>

      {/* Tab content */}
      {renderTabContent()}

      {/* Bottom navigation */}
      <MobileNavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Status Modal */}
      {showStatusModal && (
        <StatusModal 
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)} 
        />
      )}
    </div>
  );
};

export default MobileHome;
