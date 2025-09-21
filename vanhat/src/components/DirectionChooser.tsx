import React, { useEffect, useRef } from 'react';

export interface DirectionChooserProps {
  anchor: { x: number; y: number }; // viewport (client) coordinates
  onSelect: (dir: 'up' | 'down' | 'left' | 'right') => void;
  onCancel: () => void;
  stripId?: string;
  end?: 'start' | 'end';
}

// Lightweight overlay with four arrow buttons for choosing extension direction.
const DirectionChooser: React.FC<DirectionChooserProps> = ({ anchor, onSelect, onCancel, stripId, end }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancel(); }
      else if (e.key === 'ArrowUp') { onSelect('up'); }
      else if (e.key === 'ArrowDown') { onSelect('down'); }
      else if (e.key === 'ArrowLeft') { onSelect('left'); }
      else if (e.key === 'ArrowRight') { onSelect('right'); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onSelect, onCancel]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onCancel();
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [onCancel]);

  const size = 42;
  const offset = 4; // small offset so menu not directly under cursor
  const style: React.CSSProperties = {
    position: 'fixed',
    left: anchor.x + offset,
    top: anchor.y + offset,
    zIndex: 200,
    background: 'rgba(18,20,24,0.92)',
    border: '1px solid #374151',
    borderRadius: 12,
    padding: '8px 10px 10px',
    display: 'grid',
    gridTemplateAreas: '". up ." "left center right" ". down ."',
    gap: 6,
    boxShadow: '0 4px 18px -2px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)'
  };

  const btnBase: React.CSSProperties = {
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(145deg,#1e2530,#11161d)',
    color: '#f3f4f6',
    border: '1px solid #334155',
    borderRadius: 10,
    fontSize: 18,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background .15s, transform .12s, border-color .15s',
  };

  const label = stripId ? `${stripId}${end === 'start' ? ' (alku)' : end === 'end' ? ' (loppu)' : ''}` : '';

  return (
    <div ref={ref} style={style} className="direction-chooser" role="dialog" aria-label="Valitse suunta">
      {label && <div style={{ gridArea: 'center', fontSize: 10, textAlign: 'center', color: '#94a3b8', marginBottom: 2 }}>{label}</div>}
      <button style={{ ...btnBase, gridArea: 'up' }} onClick={() => onSelect('up')} aria-label="Ylös">↑</button>
      <button style={{ ...btnBase, gridArea: 'left' }} onClick={() => onSelect('left')} aria-label="Vasen">←</button>
      <button style={{ ...btnBase, gridArea: 'right' }} onClick={() => onSelect('right')} aria-label="Oikea">→</button>
      <button style={{ ...btnBase, gridArea: 'down' }} onClick={() => onSelect('down')} aria-label="Alas">↓</button>
      <style>{`
        .direction-chooser button:hover { background:#253041; }
        .direction-chooser button:active { background:#334155; transform:translateY(1px); }
        .direction-chooser button:focus { outline:2px solid #fbbf24; outline-offset:2px; }
      `}</style>
    </div>
  );
};

export default DirectionChooser;
