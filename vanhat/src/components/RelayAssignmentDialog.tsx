import React from 'react';

interface RelayAssignmentDialogProps {
  itemId: string;
  itemType: 'lamp' | 'strip';
  currentRelayId?: number;
  onAssign: (itemId: string, itemType: 'lamp' | 'strip', relayId: number | null) => void;
  onClose: () => void;
}

const RelayAssignmentDialog: React.FC<RelayAssignmentDialogProps> = ({
  itemId,
  itemType,
  currentRelayId,
  onAssign,
  onClose
}) => {
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget;
      const relayId = parseInt(input.value);
      if (relayId >= 1 && relayId <= 48) {
        onAssign(itemId, itemType, relayId);
      } else {
        alert('Rele ID täytyy olla välillä 1-48');
      }
    }
  };

  const handleSave = () => {
    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
    const relayId = parseInt(input.value);
    if (relayId >= 1 && relayId <= 48) {
      onAssign(itemId, itemType, relayId);
    } else {
      alert('Rele ID täytyy olla välillä 1-48');
    }
  };

  const handleRemove = () => {
    onAssign(itemId, itemType, null);
  };

  const typeLabel = itemType === 'lamp' ? 'Lamppu' : 'LED Strip';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        minWidth: '300px'
      }}>
        <h3>Aseta rele ID</h3>
        <p>{typeLabel} ID: {itemId}</p>
        <p>Nykyinen rele ID: {currentRelayId || 'Ei asetettu'}</p>
        
        <input
          type="number"
          min="1"
          max="48"
          defaultValue={currentRelayId || ''}
          placeholder="Syötä rele ID (1-48)"
          style={{
            width: '100%',
            padding: '8px',
            margin: '10px 0',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
          onKeyDown={handleInputKeyDown}
        />
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ccc',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Peruuta
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Tallenna
          </button>
          <button
            onClick={handleRemove}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Poista rele
          </button>
        </div>
      </div>
    </div>
  );
};

export default RelayAssignmentDialog;
