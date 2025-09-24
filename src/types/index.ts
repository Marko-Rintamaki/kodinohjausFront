export * from './socket';

// Component Models
export interface Lamp {
  id: string;
  kind: 'lamp' | 'mirror' | 'spot';
  x: number;
  y: number;
  on: boolean;
  label?: string;
  brightness?: number;
  color?: string;
  relayId?: number;
}

export interface LEDStripModel {
  id: string;
  points: { x: number; y: number; }[];
  on: boolean;
  label?: string;
  brightness?: number;
  color?: string;
  relayId?: number;
}

export interface HeatingPipeModel {
  id: string;
  points: { x: number; y: number; }[];
  on: boolean;
  label?: string;
  relayId?: number;
}

export interface TemperatureIconModel {
  id: string;
  x: number;
  y: number;
  roomId: string;
  roomName?: string;
  currentTemp?: number | null;
}

// Admin toolbar types
export type ToolType = 'strip' | 'heating' | 'lamp' | 'wallLight' | 'mirror' | 'spot' | 'temperature' | 'heatpump' | 'compressor' | 'fan' | 'heatpump-compressor' | 'heatpump-indoor-unit';

export interface DrawingState {
  active: boolean;
  stripId: string | null;
}

export interface AdminToolbarProps {
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
  drawing: DrawingState;
  selectedStripId: string | null;
  onStartDrawing: () => void;
  onShortenStrip: () => void;
}

// Status parsing types
export interface StatusData {
  hotWaterTemp?: number;
  heatingTankTemp?: number;
  outsideTemp?: number;
  insideTemp?: number;
  ventilationInTemp?: number;  // IV in - tuloilma
  ventilationOutTemp?: number; // IV out - poistoilma
  heatPumpStatus?: string;
  solarProduction?: number;
  powerConsumption?: number;
  powerL1?: number;
  powerL2?: number;
  powerL3?: number;
  heatPumpPower?: number;
  ventilationPower?: number;
  lightingPower?: number;
  batteryLevel?: number;
  gridPower?: number;
  electricityPrice?: number;
  totalSavings?: number;
}

export interface RelayStatus {
  relay: number;
  stat: number;
}

export interface StatusUpdate {
  Nilan?: Array<{ registers: Array<{ register: string; value: string }> }>;
  Bosch?: Array<{ paths: Array<{ id: string; value: number }> }>;
  Gw?: Array<{ registers: Array<{ slaveId: string; register: string; value: string }> }>;
  SolarInverter?: { Data: { PAC?: { Value: number } } };
  temperatures?: Array<{ room: string; value: string }>;
  relays?: RelayStatus[];
}