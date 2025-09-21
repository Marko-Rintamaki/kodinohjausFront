import React from 'react';

interface MobileNavigationTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const MobileNavigationTabs: React.FC<MobileNavigationTabsProps> = ({
  activeTab,
  onTabChange
}) => {
  const tabs = [
    { id: 'lighting', icon: '💡', label: 'Valaistus' },
    { id: 'temperature', icon: '🌡️', label: 'Lämpötila' },
    { id: 'heating', icon: '🔥', label: 'Lämmitys' },
    { id: 'overview', icon: '📊', label: 'Yleiskuva' }
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      borderTop: '1px solid #e5e5e5',
      display: 'flex',
      height: '60px',
      zIndex: 1000
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: activeTab === tab.id ? '#f0f9ff' : 'transparent',
            color: activeTab === tab.id ? '#0ea5e9' : '#6b7280',
            fontSize: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ fontSize: '20px', marginBottom: '2px' }}>
            {tab.icon}
          </span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default MobileNavigationTabs;
