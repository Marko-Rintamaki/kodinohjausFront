import React from 'react';

export type ToolType = 'strip' | 'heating' | 'lamp' | 'wallLight' | 'mirror' | 'spot' | 'temperature' | 'heatpump' | 'compressor' | 'fan' | 'heatpump-compressor' | 'heatpump-indoor-unit';

interface AdminToolbarProps {
  selectedTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  snap90: boolean;
  onSnap90Change: (snap90: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onSaveToCloud: () => void;
  onLoadFromCloud: () => void;
  undoAvailable: boolean;
  redoAvailable: boolean;
  // Drawing functionality
  drawing: { active: boolean; stripId: string | null };
  selectedStripId: string | null;
  onStartDrawing: () => void;
  onShortenStrip: () => void;
}

const AdminToolbar: React.FC<AdminToolbarProps> = ({
  selectedTool,
  onToolChange,
  snap90,
  onSnap90Change,
  onUndo,
  onRedo,
  onDelete,
  onSaveToCloud,
  onLoadFromCloud,
  undoAvailable,
  redoAvailable,
  drawing,
  selectedStripId,
  onStartDrawing,
  onShortenStrip
}) => {
  const toolButtons = [
    { id: 'strip' as const, label: 'LED Strip', color: '#10b981' },
    { id: 'heating' as const, label: 'Lämmitys', color: '#ef4444' },
    { id: 'lamp' as const, label: 'Lamppu', color: '#f59e0b' },
    { id: 'wallLight' as const, label: 'Seinävalo', color: '#fbbf24' },
    { id: 'mirror' as const, label: 'Peili', color: '#8b5cf6' },
    { id: 'spot' as const, label: 'Spotti', color: '#06b6d4' },
    { id: 'temperature' as const, label: 'Lämpötila', color: '#dc2626' },
    { id: 'heatpump' as const, label: 'Lämpöpumppu', color: '#3182ce' },
    { id: 'compressor' as const, label: 'Kompressori', color: '#22c55e' },
    { id: 'fan' as const, label: 'Puhallin', color: '#0ea5e9' },
    { id: 'heatpump-compressor' as const, label: 'LP Kompressori', color: '#16a34a' },
    { id: 'heatpump-indoor-unit' as const, label: 'VILP Sisäyksikkö', color: '#7c3aed' }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: '12px',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        ADMIN MODE
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontWeight: '500', marginBottom: '4px' }}>Työkalut:</div>
        {toolButtons.map(tool => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            style={{
              padding: '6px 12px',
              backgroundColor: selectedTool === tool.id ? tool.color : '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: selectedTool === tool.id ? 'bold' : 'normal'
            }}
          >
            {tool.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
        <label style={{ fontSize: '12px' }}>
          <input
            type="checkbox"
            checked={snap90}
            onChange={(e) => onSnap90Change(e.target.checked)}
            style={{ marginRight: '4px' }}
          />
          90° snap
        </label>
      </div>

      {/* Drawing tools for strip and heating */}
      {(selectedTool === 'strip' || selectedTool === 'heating') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
          <button
            onClick={onStartDrawing}
            disabled={drawing.active}
            style={{
              padding: '6px 12px',
              backgroundColor: drawing.active ? '#facc15' : '#059669',
              color: drawing.active ? '#000' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: drawing.active ? 'default' : 'pointer',
              fontSize: '12px',
              fontWeight: drawing.active ? 'bold' : 'normal'
            }}
          >
            {drawing.active 
              ? `Piirtää ${selectedTool === 'heating' ? 'lämmitysputkea' : 'stripiä'} (Enter lopettaa)` 
              : `+ ${selectedTool === 'heating' ? 'Lämmitys' : 'Strip'}`
            }
          </button>
          <button
            onClick={onShortenStrip}
            disabled={!selectedStripId || drawing.active}
            style={{
              padding: '4px 8px',
              backgroundColor: (!selectedStripId || drawing.active) ? '#374151' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!selectedStripId || drawing.active) ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            Shorten
          </button>
        </div>
      )}

      {/* Instructions for non-drawing tools */}
      {(selectedTool !== 'strip' && selectedTool !== 'heating') && (
        <div style={{
          color: '#94a3b8', 
          fontSize: '11px', 
          padding: '8px 0',
          lineHeight: '1.4'
        }}>
          Klikkaa kohtaa kuvassa lisätäksesi {selectedTool === 'lamp' ? 'lamppua' : selectedTool === 'wallLight' ? 'seinävaloa' : selectedTool === 'mirror' ? 'peilivaloja' : selectedTool === 'spot' ? 'spottivaloa' : selectedTool === 'temperature' ? 'lämpötilaikonia' : 'elementtiä'}
          <br/>
          Klikkaa lamppua asettaaksesi rele ID
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={onUndo}
            disabled={!undoAvailable}
            style={{
              padding: '4px 8px',
              backgroundColor: undoAvailable ? '#6b7280' : '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: undoAvailable ? 'pointer' : 'not-allowed',
              fontSize: '12px'
            }}
          >
            Undo (Z)
          </button>
          <button
            onClick={onRedo}
            disabled={!redoAvailable}
            style={{
              padding: '4px 8px',
              backgroundColor: redoAvailable ? '#6b7280' : '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: redoAvailable ? 'pointer' : 'not-allowed',
              fontSize: '12px'
            }}
          >
            Redo (Y)
          </button>
        </div>
        
        <button
          onClick={onDelete}
          style={{
            padding: '6px 12px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Delete (Del)
        </button>

        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
          <button
            onClick={onSaveToCloud}
            style={{
              padding: '4px 8px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Save (S)
          </button>
          <button
            onClick={onLoadFromCloud}
            style={{
              padding: '4px 8px',
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Load (L)
          </button>
        </div>
      </div>

      <div style={{
        fontSize: '11px',
        color: '#9ca3af',
        marginTop: '8px',
        lineHeight: '1.3'
      }}>
        <div>ESC: Exit admin</div>
        <div>Click: Add point/lamp</div>
        <div>Right-click: Remove point</div>
        <div>Enter: Finish strip</div>
        <div>Drag: Move items</div>
      </div>
    </div>
  );
};

export default AdminToolbar;
