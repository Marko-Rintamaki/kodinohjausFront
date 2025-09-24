// HVAC (Heating, Ventilation, Air Conditioning) Components
// Exported from /src/components/hvac/

export { default as Lamp } from './Lamp';
export { default as LEDStrip } from './LEDStrip';
export { default as HeatingPipe } from './HeatingPipe';
export { default as TemperatureIcon } from './TemperatureIcon';
export { default as Compressor } from './Compressor';
export { default as Fan } from './Fan';
export { default as HeatPumpCompressor } from './HeatPumpCompressor';
export { default as HeatPumpIndoorUnit } from './HeatPumpIndoorUnit';
export { default as WallLight } from './WallLight';
export { default as MirrorLight } from './MirrorLight';
export { default as SpotLight } from './SpotLight';

// Component type mapping for layout system
export const COMPONENT_TYPES = {
  lamp: 'Lamp',
  strip: 'LEDStrip', 
  heatingPipe: 'HeatingPipe',
  temperatureIcon: 'TemperatureIcon',
  compressor: 'Compressor',
  fan: 'Fan',
  heatpumpCompressor: 'HeatPumpCompressor',
  heatpumpIndoorUnit: 'HeatPumpIndoorUnit',
  wallLight: 'WallLight',
  mirror: 'MirrorLight',
  spot: 'SpotLight'
} as const;

export type ComponentType = keyof typeof COMPONENT_TYPES;