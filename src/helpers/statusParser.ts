/**
 * Status parsing utilities for processing system status data
 * Migrated from vanhat/src/pages/Home.tsx parseStatusData function
 */

import { StatusData, StatusUpdate, TemperatureIconModel } from '../types';

// Enable/disable detailed logging for status parsing
const PARSE_STATUS_DATA_LOGGING = false;

/**
 * Parses status update data into structured StatusData format
 * Handles temperature data, power consumption, relay status, and system information
 * 
 * @param statusUpdate - Raw status update object from backend
 * @returns Parsed status data object
 */
export const parseStatusData = (statusUpdate: StatusUpdate): StatusData => {
  const data: StatusData = {};

  // Käyttövesi lämpötila (Nilan register 5162, value/10)
  const nilanData = statusUpdate?.Nilan?.[0]?.registers;
  if (nilanData) {
    const hotWaterReg = nilanData.find((reg) => reg.register === "5162");
    if (hotWaterReg) {
      data.hotWaterTemp = parseFloat(hotWaterReg.value) / 10;
    }
  }

  // Lämmitysvaraaja lämpötila (Bosch dhw1 actualTemp)
  const boschData = statusUpdate?.Bosch?.[0]?.paths;
  if (boschData) {
    const dhwTemp = boschData.find((path) => path.id === "/dhwCircuits/dhw1/actualTemp");
    if (dhwTemp) {
      data.heatingTankTemp = dhwTemp.value;
    }
  }

  // Sähkön kulutus (Gw slaveId 2, registers 18,20,22 = L1,L2,L3) ja aurinkotuotto
  const gwData = statusUpdate?.Gw?.[0]?.registers;
  if (gwData) {
    // Etsi slaveId 2 register:it (sähkönkulutus vaiheet)
    const slave2Registers = gwData.filter((reg) => reg.slaveId === "2");
    
    const L1 = slave2Registers.find((reg) => reg.register === "18");
    const L2 = slave2Registers.find((reg) => reg.register === "20");
    const L3 = slave2Registers.find((reg) => reg.register === "22");

    if (L1 && L2 && L3) {
      // Muuta decimaaliksi (säilytä etumerkki: + = kulutus, - = syöttö verkkoon)
      const l1Power = parseFloat(L1.value) / 10; // W -> desimaalimukaan
      const l2Power = parseFloat(L2.value) / 10; // W -> desimaalimukaan  
      const l3Power = parseFloat(L3.value) / 10; // W -> desimaalimukaan
      
      data.powerConsumption = (l1Power + l2Power + l3Power) / 1000; // W -> kW
      data.powerL1 = l1Power / 1000; // kW
      data.powerL2 = l2Power / 1000; // kW
      data.powerL3 = l3Power / 1000; // kW
    }

    // Sähkönkulutus breakdown (slaveId 1, registers 18,20,22)
    const slave1Registers = gwData.filter((reg) => reg.slaveId === "1");
    
    const vilp = slave1Registers.find((reg) => reg.register === "18"); // VILP
    const ventilation = slave1Registers.find((reg) => reg.register === "20"); // Ilmanvaihto
    const lighting = slave1Registers.find((reg) => reg.register === "22"); // Valaistus

    if (vilp) {
      data.heatPumpPower = parseFloat(vilp.value) / 10 / 1000; // W -> kW (olettaen desimaalimukaisuus)
    }
    if (ventilation) {
      data.ventilationPower = parseFloat(ventilation.value) / 10 / 1000; // W -> kW
    }
    if (lighting) {
      data.lightingPower = parseFloat(lighting.value) / 10 / 1000; // W -> kW
    }
  }

  // Aurinkotuotto
  const solarData = statusUpdate?.SolarInverter?.Data;
  if (solarData) {
    // Aurinkotuotto (PAC)
    if (solarData.PAC) {
      data.solarProduction = solarData.PAC.Value / 1000; // W -> kW
    }
  }

  // Ulkolämpötila Bosch-datasta (outdoor_t1)
  if (boschData) {
    const outdoorSensor = boschData.find((path) => 
      path.id === "/system/sensors/temperatures/outdoor_t1"
    );
    if (outdoorSensor) {
      data.outsideTemp = outdoorSensor.value;
      if (PARSE_STATUS_DATA_LOGGING) {
        console.log('[parseStatusData] Outdoor temperature from Bosch:', outdoorSensor.value + '°C');
      }
    }
  }

  // Lämpötilat (temperatures array)
  const temperatures = statusUpdate?.temperatures;
  if (temperatures && Array.isArray(temperatures)) {
    // Ulkolämpötila (ei ole mukana IV lämpötiloissa, mutta jätetään varalle)
    const outsideTemp = temperatures.find((temp) => temp.room === "IV out");
    if (outsideTemp) {
      data.ventilationOutTemp = parseFloat(outsideTemp.value); // Poistoilma
    }

    // Tuloilma lämpötila (IV in)
    const inletTemp = temperatures.find((temp) => temp.room === "IV in");
    if (inletTemp) {
      data.ventilationInTemp = parseFloat(inletTemp.value);
    }

    // Sisälämpötila (keskiarvo huoneista: MH1, MH2, MH3, OHETKT, PHKHH jne.)
    const roomTemps = temperatures.filter((temp) => 
      temp.room !== "IV out" && temp.room !== "IV in"
    );
    if (roomTemps.length > 0) {
      if (PARSE_STATUS_DATA_LOGGING) {
        console.log('[parseStatusData] Room temperatures:', roomTemps.map(t => `${t.room}: ${t.value}°C`));
      }
      const avgTemp = roomTemps.reduce((sum, temp) => 
        sum + parseFloat(temp.value), 0) / roomTemps.length;
      data.insideTemp = avgTemp;
      if (PARSE_STATUS_DATA_LOGGING) {
        console.log('[parseStatusData] Average inside temperature:', avgTemp.toFixed(1) + '°C');
        console.log('[parseStatusData] Ventilation temps - In:', data.ventilationInTemp?.toFixed(1) + '°C', 'Out:', data.ventilationOutTemp?.toFixed(1) + '°C');
      }
    }
  }

  // Lämpöpumppu status (Bosch modulation)
  if (boschData) {
    const modulation = boschData.find((path) => path.id === "/heatSources/actualModulation");
    if (modulation) {
      data.heatPumpStatus = modulation.value > 0 ? `Toiminnassa (${modulation.value}%)` : 'Ei käytössä';
    }
  }

  // Placeholder arvot puuttuville tiedoille
  data.powerConsumption = data.powerConsumption || 2.1; // TODO: Laske oikeasti
  data.batteryLevel = data.batteryLevel || 85; // TODO: Jos on akku järjestelmä
  data.gridPower = data.gridPower || (data.solarProduction ? data.solarProduction - data.powerConsumption : 0);

  return data;
};

// Import proper types for components
import { Lamp, LEDStripModel, HeatingPipeModel } from '../types/index';
import type { WallLightModel } from '../hooks/useLayoutPersistence';

/**
 * Updates component states based on relay status - supports all component types
 * @param relayStatus - Array of relay status objects
 * @param updateLamps - Callback to update lamp states
 * @param updateStrips - Callback to update LED strip states  
 * @param updateHeatingPipes - Callback to update heating pipe states
 * @param updateWallLights - Callback to update wall light states
 * @param logging - Enable/disable logging for relay updates
 */
/**
 * Updates temperature icon current temperatures from status update
 */
export const updateTemperatureIconsFromStatus = (
  statusUpdate: StatusUpdate,
  updateTemperatureIcons: (updater: (icons: TemperatureIconModel[]) => TemperatureIconModel[]) => void,
  logging = false
) => {
  const temperatures = statusUpdate?.temperatures;
  if (!temperatures || !Array.isArray(temperatures)) return;

  // Room ID to room key mapping for temperature matching
  const roomIdToName: Record<number, string> = {
    1: 'MH1',     // Makuuhuone 1
    2: 'MH2',     // Makuuhuone 2
    3: 'MH3',     // Makuuhuone 3
    4: 'OHETKT',  // Olohuone/etupihan takkahuone
    5: 'PHKHH'    // Pesuhuone/kodinhoitohuone
  };

  updateTemperatureIcons(prev => prev.map(icon => {
    const numId = parseInt(icon.roomId);
    const roomKey = (roomIdToName[numId] || icon.roomId).toLowerCase();
    
    // Find temperature data for this room
    const tempEntry = temperatures.find((t: { room?: string; value?: number | string }) =>
      t.room && t.room.toLowerCase() === roomKey
    );
    
    if (tempEntry) {
      const newTemp = typeof tempEntry.value === 'number' 
        ? tempEntry.value 
        : parseFloat(tempEntry.value) || null;
      
      if (logging) {
        console.log(`[Temperature] Icon ${icon.id} (room ${roomKey}) temp: ${newTemp}°C`);
      }
      
      return { ...icon, currentTemp: newTemp };
    }
    
    return icon;
  }));
};

export const updateComponentStatesFromRelays = (
  relayStatus: Array<{ relay: number; stat: number }>,
  updateLamps: (updater: (lamps: Lamp[]) => Lamp[]) => void,
  updateStrips: (updater: (strips: LEDStripModel[]) => LEDStripModel[]) => void,
  updateHeatingPipes: (updater: (pipes: HeatingPipeModel[]) => HeatingPipeModel[]) => void,
  updateWallLights?: (updater: (wallLights: WallLightModel[]) => WallLightModel[]) => void,
  logging = false
) => {
  // Update lamp states based on relay status
  updateLamps(prev => prev.map(lamp => {
    if (!lamp.relayId) return lamp;
    const relay = relayStatus.find(r => r.relay === lamp.relayId);
    if (relay) {
      if (logging) {
        console.log(`[Relay] Lamppu ${lamp.id} (rele ${lamp.relayId}) tila: ${relay.stat === 1 ? 'ON' : 'OFF'}`);
      }
      return { ...lamp, on: relay.stat === 1 };
    }
    return lamp;
  }));

  // Update strip states based on relay status
  updateStrips(prev => prev.map(strip => {
    if (!strip.relayId) return strip;
    const relay = relayStatus.find(r => r.relay === strip.relayId);
    if (relay) {
      if (logging) {
        console.log(`[Relay] Strip ${strip.id} (rele ${strip.relayId}) tila: ${relay.stat === 1 ? 'ON' : 'OFF'}`);
      }
      return { ...strip, on: relay.stat === 1 };
    }
    return strip;
  }));

  // Update heating pipe states based on relay status  
  updateHeatingPipes(prev => prev.map(pipe => {
    if (!pipe.relayId) return pipe;
    const relay = relayStatus.find(r => r.relay === pipe.relayId);
    if (relay) {
      if (logging) {
        console.log(`[Relay] Lämmitysputki ${pipe.id} (rele ${pipe.relayId}) tila: ${relay.stat === 1 ? 'ON' : 'OFF'}`);
      }
      return { ...pipe, on: relay.stat === 1 };
    }
    return pipe;
  }));

  // Update wall light states based on relay status
  if (updateWallLights) {
    updateWallLights(prev => prev.map(wallLight => {
      if (!wallLight.relayId) return wallLight;
      const relay = relayStatus.find(r => r.relay === wallLight.relayId);
      if (relay) {
        if (logging) {
          console.log(`[Relay] Seinävalo ${wallLight.id} (rele ${wallLight.relayId}) tila: ${relay.stat === 1 ? 'ON' : 'OFF'}`);
        }
        return { ...wallLight, on: relay.stat === 1 };
      }
      return wallLight;
    }));
  }
};