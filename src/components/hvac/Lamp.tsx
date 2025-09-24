import React, { useState, useCallback } from 'react';

// Debug logging flags - set to true to enable specific logging categories:
// lampLogging: Lamp component toggle events and state changes
const lampLogging = false;

/**
 * Lamp component converted from lamppu.html demo.
 * Props:
 *  - size: width in px (default 140)
 *  - on: controlled on/off (if provided)
 *  - defaultOn: initial uncontrolled state
 *  - onChange: callback when toggled (newState)
 *  - pulse: enable pulsing glow animation when on (default true)
 */
export interface LampProps {
  size?: number;
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
    style.dataset.lampStyles = 'true';
    style.textContent = `
      .lamp-root { position:relative; cursor:pointer; user-select:none; width:140px; }
      .lamp-root::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 120%;
        height: 120%;
        background: radial-gradient(circle, rgba(255, 255, 255, 1) 40%, rgba(255, 255, 255, 0.8) 70%, rgba(255, 255, 255, 0) 100%);
        border-radius: 50%;
        z-index: -1;
        transition: opacity 0.3s ease;
      }
      .lamp-root svg { width:100%; height:auto; overflow:visible; display:block; position: relative; z-index: 1; transform: translateY(3px); }
      .lamp-root .outline, .lamp-root .core, .lamp-root .glow { transition: fill .35s, stroke .35s, opacity .4s, filter .6s; }
  .lamp-root .outline { fill:transparent; stroke:#444; stroke-width:14; stroke-linejoin:round; }
      .lamp-root .core { fill:#2d3748; stroke:#facc15; stroke-width:4; opacity:.8; }
      .lamp-root .glow { fill:#fde68a; opacity:0; filter:none; }
      .lamp-root.on .outline { stroke:#fbbf24; filter:drop-shadow(0 0 6px #fbbf24) drop-shadow(0 0 18px #f59e0b); }
      .lamp-root.on .core { fill:#fde68a; opacity:1; stroke:#fcd34d; }
      .lamp-root.on.pulse-enabled .glow { opacity:.9; animation: lampPulse 2.4s ease-in-out infinite; filter:drop-shadow(0 0 10px #fcd34d) drop-shadow(0 0 28px #f59e0b); }
      @keyframes lampPulse { 0%,100% { filter:drop-shadow(0 0 6px #fcd34d) drop-shadow(0 0 20px #f59e0b); opacity:.85; } 50% { filter:drop-shadow(0 0 10px #fcd34d) drop-shadow(0 0 34px #f59e0b); opacity:1; } }
      .lamp-root:focus-visible { outline:2px solid #fcd34d; outline-offset:4px; }
      .lamp-root.toggle-anim.on .core { animation: coreFlashOn .42s ease; }
      .lamp-root.toggle-anim.on .glow { animation: glowFlashOn .42s ease; }
      .lamp-root.toggle-anim:not(.on) .core { animation: coreFlashOff .42s ease; }
      .lamp-root.toggle-anim:not(.on) .glow { animation: glowFlashOff .42s ease; }
      @keyframes coreFlashOn { 0% { transform:scale(.6); filter:brightness(1.2); } 40% { transform:scale(1.08); filter:brightness(1.6); } 100% { transform:scale(1); filter:none; } }
      @keyframes glowFlashOn { 0% { opacity:0; transform:scale(.4); } 50% { opacity:1; transform:scale(1.05); } 100% { opacity:.9; transform:scale(1); } }
      @keyframes coreFlashOff { 0% { opacity:1; transform:scale(1); } 100% { opacity:.2; transform:scale(.85); } }
      @keyframes glowFlashOff { 0% { opacity:.9; } 100% { opacity:0; } }
    `;
    document.head.appendChild(style);
    injected = true;
  };
})();

export const Lamp: React.FC<LampProps> = ({
  size = 140,
  on,
  defaultOn = false,
  onChange,
  pulse = true,
  className = '',
  style,
  tabIndex = 0,
  title = 'Lamppu'
}) => {
  ensureStyles();
  const [internalOn, setInternalOn] = useState(defaultOn);
  const isControlled = typeof on === 'boolean';
  const effectiveOn = isControlled ? (on as boolean) : internalOn;

  const toggle = useCallback(() => {
    const next = !effectiveOn;
  // Debug: log toggle attempt
   
  if (lampLogging) {
    console.log('[Lamp] toggle click: current=', effectiveOn, 'next=', next, 'controlled=', isControlled);
  }
    if (!isControlled) setInternalOn(next);
    onChange?.(next);
  }, [effectiveOn, isControlled, onChange]);

  const handleClick = (e: React.MouseEvent) => {
   
  if (lampLogging) {
    console.log('[Lamp] handleClick event target=', e.target);
  }
    toggle();
    const el = (e.currentTarget as HTMLDivElement);
    el.classList.add('toggle-anim');
    setTimeout(()=> el.classList.remove('toggle-anim'), 420);
  };

  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent double-firing with onClick
    if (lampLogging) {
      console.log('[Lamp] handleTouch event target=', e.target);
    }
    toggle();
    const el = (e.currentTarget as HTMLDivElement);
    el.classList.add('toggle-anim');
    setTimeout(()=> el.classList.remove('toggle-anim'), 420);
  };

  const handlePointer = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      e.preventDefault(); // Prevent double-firing with onClick
    }
    if (lampLogging) {
      console.log('[Lamp] handlePointer event target=', e.target, 'type=', e.pointerType);
    }
    toggle();
    const el = (e.currentTarget as HTMLDivElement);
    el.classList.add('toggle-anim');
    setTimeout(()=> el.classList.remove('toggle-anim'), 420);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { 
      e.preventDefault(); 
      toggle();
      const el = e.currentTarget as HTMLDivElement;
      el.classList.add('toggle-anim');
      setTimeout(() => el.classList.remove('toggle-anim'), 420);
    }
  };

  return (
    <div
      className={`lamp-root${effectiveOn ? ' on' : ''}${pulse ? ' pulse-enabled' : ''} ${className}`.trim()}
      role="button"
      aria-pressed={effectiveOn}
      tabIndex={tabIndex}
      title={title}
      onClick={handleClick}
      onTouchStart={handleTouch}
      onPointerDown={handlePointer}
      onKeyDown={handleKey}
      style={{ width: size, touchAction: 'manipulation', ...style }}
    >
      <svg viewBox="0 0 512 512" aria-hidden="false" focusable="false">
        <path className="outline" d="M381.983,49.895c-37.391-35.141-86.367-52.742-137.734-49.52C150.639,6.2,75.014,84.286,72.092,178.149 c-2.156,69.547,34.375,133.578,95.344,167.117c15.156,8.344,24.57,24.367,24.57,41.828v60.914c0,17.648,14.352,32,32,32h64 c17.648,0,32-14.352,32-32v-60.914c0-17.445,9.484-33.508,24.766-41.93c58.742-32.406,95.234-94.156,95.234-161.156 C440.006,133.43,418.858,84.547,381.983,49.895z" />
        <circle className="core" cx="256" cy="184" r="128" />
        <circle className="glow" cx="256" cy="184" r="75" />
      </svg>
    </div>
  );
};

export default Lamp;
