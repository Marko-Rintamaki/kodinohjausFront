import React, { useState, useCallback } from 'react';

export interface MirrorLightProps {
  length?: number; // width in px
  on?: boolean;
  defaultOn?: boolean;
  onChange?: (on: boolean) => void;
  pulse?: boolean;
  className?: string;
  style?: React.CSSProperties;
  tabIndex?: number;
  title?: string;
}

const ensureStyles = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.dataset.mirrorLightStyles = 'true';
    style.textContent = `
      .mirror-light-root { position:relative; cursor:pointer; user-select:none; width:160px; height:30px; display:flex; align-items:center; justify-content:center; }
      .mirror-light-root svg { width:100%; height:100%; display:block; overflow:visible; }
      .mirror-light-root .bar { stroke:#d4d4d4; stroke-width:10; stroke-linecap:round; fill:none; filter:none; transition: stroke .35s, filter .5s, opacity .4s; }
      .mirror-light-root .glow { stroke:#facc15; stroke-width:10; stroke-linecap:round; fill:none; opacity:0; filter:none; transition: opacity .4s, filter .6s; }
      .mirror-light-root.on .bar { stroke:#fbbf24; filter:drop-shadow(0 0 4px #fbbf24) drop-shadow(0 0 8px #f59e0b); }
      .mirror-light-root.on.pulse-enabled .glow { opacity:.9; filter:drop-shadow(0 0 10px #facc15) drop-shadow(0 0 26px #f59e0b); animation: mirrorPulse 2.2s ease-in-out infinite; }
      @keyframes mirrorPulse { 0%,100% { filter:drop-shadow(0 0 6px #facc15) drop-shadow(0 0 20px #f59e0b); opacity:.85; } 50% { filter:drop-shadow(0 0 10px #facc15) drop-shadow(0 0 34px #f59e0b); opacity:1; } }
      .mirror-light-root.toggle-anim.on .glow { animation: mirrorFlashOn .42s ease; }
      .mirror-light-root.toggle-anim:not(.on) .glow { animation: mirrorFlashOff .42s ease; }
      @keyframes mirrorFlashOn { 0% { opacity:0; } 50% { opacity:1; } 100% { opacity:.9; } }
      @keyframes mirrorFlashOff { 0% { opacity:.8; } 100% { opacity:0; } }
      .mirror-light-root:focus-visible { outline:2px solid #fcd34d; outline-offset:4px; }
    `;
    document.head.appendChild(style);
    injected = true;
  };
})();

export const MirrorLight: React.FC<MirrorLightProps> = ({
  length = 160,
  on,
  defaultOn = false,
  onChange,
  pulse = true,
  className = '',
  style,
  tabIndex = 0,
  title = 'Peilivalo'
}) => {
  ensureStyles();
  const [internalOn, setInternalOn] = useState(defaultOn);
  const isControlled = typeof on === 'boolean';
  const effectiveOn = isControlled ? (on as boolean) : internalOn;

  const toggle = useCallback(() => {
    const next = !effectiveOn;
    if (!isControlled) setInternalOn(next);
    onChange?.(next);
  }, [effectiveOn, isControlled, onChange]);

  const handleClick = (e: React.MouseEvent) => {
    toggle();
    const el = e.currentTarget as HTMLDivElement;
    el.classList.add('toggle-anim');
    setTimeout(()=> el.classList.remove('toggle-anim'), 420);
  };

  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent double-firing with onClick
    toggle();
    const el = e.currentTarget as HTMLDivElement;
    el.classList.add('toggle-anim');
    setTimeout(()=> el.classList.remove('toggle-anim'), 420);
  };

  const handlePointer = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      e.preventDefault(); // Prevent double-firing with onClick
    }
    toggle();
    const el = e.currentTarget as HTMLDivElement;
    el.classList.add('toggle-anim');
    setTimeout(()=> el.classList.remove('toggle-anim'), 420);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { 
      e.preventDefault(); 
      handleClick(e as unknown as React.MouseEvent); 
    }
  };

  const height = 12; // drawing height
  return (
    <div
      className={`mirror-light-root${effectiveOn ? ' on' : ''}${pulse ? ' pulse-enabled' : ''} ${className}`.trim()}
      role="button"
      aria-pressed={effectiveOn}
      tabIndex={tabIndex}
      title={title}
      onClick={handleClick}
      onTouchStart={handleTouch}
      onPointerDown={handlePointer}
      onKeyDown={handleKey}
      style={{ width: length, height: height + 18, touchAction: 'manipulation', ...style }}
    >
      <svg viewBox={`0 0 ${length} ${height}`} aria-hidden="true" focusable="false">
        <line className="bar" x1={6} y1={height/2} x2={length-6} y2={height/2} />
        <line className="glow" x1={6} y1={height/2} x2={length-6} y2={height/2} />
      </svg>
    </div>
  );
};

export default MirrorLight;
