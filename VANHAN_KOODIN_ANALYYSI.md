# Vanhan Home.tsx Toiminnallinen Analyysi

## YLEISKATSAUS
Vanha Home.tsx (2102 riviä) sisältää täydellisen älykodin hallintasysteemin seuraavilla päätoiminnallisuuksilla:

## 1. ARKKITEHTUURI JA HOOKIT

### Core Hookit:
- `useAppSocket` - Socket.IO yhteys ja autentikointi
- `useZoomAndPan` - Zoom/pan toiminnallisuus pohjakuvalle  
- `useLayoutPersistence` - Layout tallennus localStorage/server sync
- `useDrawingLogic` - Admin-tilan piirtotoiminnot
- `useLocalStorageSync` - Server backup synkronointi

### State Management:
```typescript
- authenticated: boolean (autentikointistatus)
- admin: boolean (admin-tila toggle)
- showStatusModal: boolean (status modal näkyvyys)
- statusData: StatusData (laitteiden status data)
- lamps: Array<Lamp> (lamppu komponentit)
- ledStrips: Array<LEDStripModel> (LED-nauhat)
- heatingPipes: Array<HeatingPipeModel> (lämmitysputket)
- temperatureIcons: Array<TemperatureIconModel> (lämpötila-ikonit)
- heatPumps: Array<HeatPumpModel> (lämpöpumput)
- compressors: Array<CompressorModel> (kompressorit)
- fans: Array<FanModel> (puhaltimet)
- wallLights: Array<WallLightModel> (seinävalot)
```

## 2. TIETOMALLIT (Data Models)

### Komponenttityypit:
- **Lamp**: `{id, kind:'lamp'|'mirror'|'spot', x, y, on, label?, brightness?, color?, relayId?}`
- **LEDStripModel**: `{id, points:[{x,y}], on, label?, brightness?, color?, relayId?}`
- **HeatingPipeModel**: `{id, points:[{x,y}], on, label?, relayId?}`
- **TemperatureIconModel**: `{id, x, y, roomId, roomName?}`
- **HeatPumpModel**: `{id, x, y, label?}`
- **CompressorModel**: `{id, x, y, label?, compressorId?}`
- **FanModel**: `{id, x, y, label?, fanId?, fanType?: 'indoor'|'outdoor'}`
- **WallLightModel**: `{id, x, y, label?, relayId?, direction?: 'up'|'down'}`

## 3. STATUS DATA PARSING

### StatusData Interface:
```typescript
interface StatusData {
  hotWaterTemp?: number;        // Käyttövesi lämpötila (Nilan 5162/10)
  heatingTankTemp?: number;     // Lämmitysvaraaja (Bosch dhw1)
  outsideTemp?: number;         // Ulkolämpötila
  insideTemp?: number;          // Sisälämpötila
  ventilationInTemp?: number;   // IV tuloilma
  ventilationOutTemp?: number;  // IV poistoilma
  heatPumpStatus?: string;      // Lämpöpumpun tila
  solarProduction?: number;     // Aurinkotuotto
  powerConsumption?: number;    // Sähkönkulutus
  powerL1/L2/L3?: number;       // Vaiheiden kulutus
  heatPumpPower?: number;       // Lämpöpumpun teho
  ventilationPower?: number;    // IV teho
  lightingPower?: number;       // Valaistuksen teho
  batteryLevel?: number;        // Akun taso
  gridPower?: number;           // Verkkovirta
  electricityPrice?: number;    // Sähkön hinta
  totalSavings?: number;        // Kokonaissäästöt
}
```

### Data Sources:
- **Nilan**: Ilmanvaihtojärjestelmä (registerit)
- **Bosch**: Lämpöpumppu ja lämmitys (paths)
- **Gw**: Sähkömittarit ja aurinko (registers, slaveId-pohjaiset)

## 4. ADMIN-TILAN TOIMINNOT

### Admin Panel Tools:
```typescript
type ToolType = 'add-lamp' | 'add-led-strip' | 'add-heating-pipe' | 'add-temperature-icon' | 
                'add-heat-pump' | 'add-compressor' | 'add-fan' | 'add-wall-light' | 
                'delete' | 'save' | 'load' | 'reset';
```

### Admin-tilassa:
- Komponenttien lisääminen hiiren klikkauksella
- Komponenttien raahaaminen
- Komponenttien poistaminen
- Layout tallennus/lataus
- Relay-määrityksien muokkaus
- Debug-koordinaattien näyttö

## 5. KOMPONENTTI-KOHTAINEN TOIMINNALLISUUS

### Lamput (Lamps):
- 3 tyyppiä: lamp, mirror, spot
- On/off toggle
- Brightness säätö (slider)
- Värin valinta (color picker)
- Relay-määritys (dropdown)

### LED-Nauhat (LED Strips):
- Multi-point piirtäminen
- On/off toggle
- Brightness + color säätö
- Relay-määritys

### Lämmitysputket (Heating Pipes):
- Multi-point piirtäminen
- On/off toggle based on relay status
- Relay-määritys

### Lämpötila-ikonit (Temperature Icons):
- Room-pohjainen lämpötilan näyttö
- Database haku room ID:llä
- Reaaliaikainen lämpötila päivitys

### Lämpöpumput ja Kompressorit:
- Status näyttö (ON/OFF/AUTO)
- Power consumption display
- Efficiency metrics

### Seinävalot (Wall Lights):
- Suunta: up/down
- On/off toggle
- Relay-määritys

## 6. SOCKET.IO INTEGRAATIO

### Käytetyt Socket Operaatiot:
- `sendDataQuery()` - Tietokyselyt
- `getSocket()` - Socket instanssi
- `onUpdateStatusChange()` - Status päivitysten kuuntelu
- `getAllRelayStatus()` - Relay-tilojen haku

### Status Update Handling:
- Reaaliaikainen data päivitys
- Automaattinen relay-tilojen synkronointi
- Lämpötila-arvojen päivitys

## 7. PERSISTENSSI JA SYNC

### LocalStorage Layout (versio v7):
```typescript
const LAYOUT_DATA = 'homeLayout:v7';
// Sisältää kaikki komponentit ja niiden sijainnit
```

### Server Sync:
- `loadFromServer()` - Lataa layout serveriltä
- `saveToServer()` - Tallentaa layout serverille
- `resetLayoutToEmpty()` - Tyhjentää layoutin

## 8. ZOOM & PAN TOTEUTUS

### Zoom/Pan Features:
- Mouse wheel zoom
- Touch pinch zoom
- Drag panning
- Container resize handling
- Smooth transitions

### Koordinaatisto:
- Relatiiviset koordinaatit (0..1)
- Auto-scaling kuvan koon mukaan
- Touch/mouse event handling

## 9. DEBUG JA LOKITUS

### Debug Flags:
```typescript
var parseStatusDataLogging = false;
var localStorageLogging = false;
var authLogging = false;
var relayLogging = false;
var adminLogging = false;
var dragLogging = false;
var cloudSyncLogging = false;
var socketLogging = false;
var statusUpdateLogging = false;
```

### Global Test Functions:
- `window.testSave()` - Testaa tallennus
- `window.resetLayout()` - Nollaa layout
- `window.localStorageSyncFunctions` - Sync funktiot

## 10. UI KOMPONENTIT

### Pää UI Elementit:
- **StatusBar**: Yläpalkki status tiedoilla
- **AdminToolbar**: Admin-työkalut
- **StatusModal**: Yksityiskohtainen status näkymä
- **RelayAssignmentDialog**: Relay määritykset
- **DirectionChooser**: Suunnan valinta

### Background:
- Pohjakuva: `/img/pohjakuva.svg`
- Zoom/pan container
- Responsive sizing

## 11. KEYBOARD SHORTCUTS

### Näppäin Komennot:
- `'a'` - Toggle admin mode
- `'s'` - Toggle status modal
- Esc - Sulje modalit/admin mode

## 12. PROP-POHJAISET PIILOTUKSET

### HomeProps:
```typescript
interface HomeProps {
  hideHeatingPipes?: boolean;
  hideLEDStrips?: boolean;
  hideLamps?: boolean;
  hideTemperatureIcons?: boolean;
  hideWallLights?: boolean;
  hideHeatPumps?: boolean;
}
```

## YHTEENVETO - SIIRTOJÄRJESTYS

Ehdotettu siirtojärjestys toiminnallisuuksille:
1. **Perus-layout ja zoom/pan** ✅ (jo tehty)
2. **Lamppujen lisäys ja hallinta**
3. **LED-nauhojen piirtäminen**
4. **Lämmitysputkien piirtäminen**
5. **Lämpötila-ikoniit ja room data**
6. **Admin-tilan työkalut**
7. **Status data parsing ja modal**
8. **Layout persistenssi ja sync**
9. **Relay-määritykset ja kontrolli**
10. **Lämpöpumput ja kompressorit**