# 🌞 LightControl Daylight Shutdown & Twilight System - Täydellinen Dokumentaatio

## 📋 **JÄRJESTELMÄN YLEISKUVAUS**

LightControl-järjestelmässä on **kolme eri sääntötyyppiä** jotka ohjaavat valoja automaattisesti tai estävät manuaalisen käytön:

1. **Light Schedules** (Aikataulut) - Aika-pohjaiset säännöt
2. **Twilight Settings** (Hämäräkytkimet) - Lux + aika -pohjaiset säännöt  
3. **Daylight Shutdowns** (Päivänvalo sammutus) - Lux-pohjaiset säännöt

---

## 🗃️ **TIETOKANTARAKENNE**

### 1. **`light_schedules`** - Aikataulutoiminnot
```sql
CREATE TABLE light_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    relay_id INT NOT NULL,              -- Rele numero (1-64)
    action_type ENUM('block','startup','shutdown') NOT NULL,
    weekday TINYINT NOT NULL,           -- C# DayOfWeek: 0=Su, 1=Ma, 2=Ti, 3=Ke, 4=To, 5=Pe, 6=La
    start_time TIME NOT NULL,           -- Alkuaika (HH:MM:SS)
    end_time TIME,                      -- Loppuaika (HH:MM:SS, NULL jos kertaluontoinen)
    enabled TINYINT(1) DEFAULT 1,      -- Käytössä (0/1)
    description VARCHAR(255),           -- Kuvaus
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Action Types:**
- `block`: Estää manuaalisen käytön aikavälillä
- `startup`: Sytyttää valo kerran tiettyyn aikaan  
- `shutdown`: Sammuttaa valo kerran tiettyyn aikaan

### 2. **`twilight_settings`** - Hämäräkytkimet
```sql
CREATE TABLE twilight_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    relay_id INT NOT NULL,              -- Rele numero
    weekday TINYINT NOT NULL,           -- C# DayOfWeek: 0-6
    lux_threshold INT NOT NULL DEFAULT 20,        -- Hämäryysraja (lux)
    allowed_start_time TIME NOT NULL DEFAULT '06:00:00',  -- Aikaikkunan alku
    allowed_end_time TIME NOT NULL DEFAULT '23:00:00',    -- Aikaikkunan loppu
    enabled TINYINT(1) DEFAULT 1,      -- Käytössä (0/1)
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. **`daylight_shutdowns`** - Päivänvalo sammutus
```sql
CREATE TABLE daylight_shutdowns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    relay_id INT NOT NULL,              -- Rele numero
    weekday TINYINT NOT NULL,           -- C# DayOfWeek: 0-6 tai 7=kaikki päivät
    max_lux_threshold INT NOT NULL DEFAULT 100,   -- Sammutusraja (lux)
    enabled TINYINT(1) DEFAULT 1,      -- Käytössä (0/1)
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ⚙️ **TOIMINTALOGIIKKA**

### 🕐 **Light Schedules (Aikataulut)**
- **Tarkistus**: Joka minuutti
- **Ehto**: Weekday + tarkka aika (±30 sekuntia)
- **Block**: Estää manuaalisen käytön aikavälillä `start_time` - `end_time`
- **Startup/Shutdown**: Suoritetaan kerran `start_time` hetkellä

```
Esimerkki:
relay_id=38, action_type='block', weekday=6, start_time='13:00', end_time='13:30'
→ Lauantaisin 13:00-13:30 rele 38 napit eivät toimi
```

### 🌙 **Twilight Settings (Hämäräkytkimet)**
- **Tarkistus**: 2 minuutin välein
- **Ehto**: Weekday + aikaikkunassa + lux-taso
- **Logiikka**:
  - Jos `aikaikkunassa` JA `lux ≤ lux_threshold` → **Sytytä valo**
  - Jos `aikaikkunassa` JA `lux > lux_threshold` → **Sammuta valo**  
  - Jos `EI aikaikkunassa` → **Sammuta valo** (pakkosammutus)

```
Esimerkki:
relay_id=38, weekday=6, lux_threshold=50, allowed_start_time='18:00', allowed_end_time='06:00'
→ Lauantaisin 18:00-06:00 jos lux ≤ 50 → syttyy, jos lux > 50 → sammuu
→ Muina aikoina → sammuu aina
```

### 🌞 **Daylight Shutdowns (Päivänvalo sammutus)**
- **Tarkistus**: 2 minuutin välein (twilight-timerin kanssa)
- **Ehto**: Weekday + lux-taso
- **Logiikka**:
  - Jos `lux > max_lux_threshold` → **Sammuta valo** JA **Estä sytyttäminen**
  - Toimii **24/7** (ei aikaikkunarajoitusta)
  - `weekday=7` tarkoittaa "kaikki päivät"

```
Esimerkki:
relay_id=38, weekday=7, max_lux_threshold=100
→ Joka päivä: jos lux > 100 → sammuu automaattisesti + nappi ei toimi
```

---

## 🔄 **PRIORITEETTIJÄRJESTYS**

Kun nappia painetaan, tarkistetaan **järjestyksessä**:

1. **Light Schedule Block** - Estääkö aikataulublokki?
2. **Daylight Shutdown** - Estääkö liian valoisa (lux > raja)?
3. **Normaali toiminta** - Jos ei estoa → toimi normaalisti

**Automaattitoiminnot** (startup/shutdown/twilight) **ohittavat** kaikki estot!

---

## 📡 **LUX-DATAN HAKU**

**API Endpoint**: `https://kodinohjaus.fi/api/current-lux`

**Vastauksen formaatti**:
```json
{
  "lux": 1200,
  "timestamp": "2025-09-20T10:50:40.771Z",
  "blocked": false,
  "blockTime": "13:30"
}
```

**Koodi lukee**: Vain `lux`-kentän arvo käytetään, muut jätetään huomiotta.

---

## 🎯 **FRONTTI-KÄYTTÖLIITTYMÄN VAATIMUKSET**

### **1. Light Schedules -hallinta**
```typescript
interface LightSchedule {
  id?: number;
  relay_id: number;          // 1-64
  action_type: 'block' | 'startup' | 'shutdown';
  weekday: number;           // 0=Su, 1=Ma, 2=Ti, 3=Ke, 4=To, 5=Pe, 6=La
  start_time: string;        // "HH:MM:SS"
  end_time?: string;         // "HH:MM:SS" tai null startup/shutdown
  enabled: boolean;
  description?: string;
}
```

**Käyttöliittymä tarvitsee**:
- Dropdown: Rele valinta (1-64)
- Radio buttons: Action type (block/startup/shutdown)
- Dropdown: Viikonpäivä (0-6, nimet näkyvissä)
- Time picker: Alkuaika
- Time picker: Loppuaika (vain block-tyypille)
- Checkbox: Enabled
- Text input: Description

### **2. Twilight Settings -hallinta**
```typescript
interface TwilightSettings {
  id?: number;
  relay_id: number;          // 1-64
  weekday: number;           // 0-6
  lux_threshold: number;     // Esim. 20-200 lux
  allowed_start_time: string; // "HH:MM:SS"
  allowed_end_time: string;   // "HH:MM:SS"
  enabled: boolean;
  description?: string;
}
```

**Käyttöliittymä tarvitsee**:
- Dropdown: Rele valinta (1-64)
- Dropdown: Viikonpäivä (0-6)
- Number input: Lux kynnysarvo (0-2000)
- Time picker: Aikaikkunan alku
- Time picker: Aikaikkunan loppu  
- Checkbox: Enabled
- Text input: Description

### **3. Daylight Shutdowns -hallinta**
```typescript
interface DaylightShutdown {
  id?: number;
  relay_id: number;          // 1-64
  weekday: number;           // 0-6 tai 7=kaikki päivät
  max_lux_threshold: number; // Esim. 50-1000 lux
  enabled: boolean;
  description?: string;
}
```

**Käyttöliittymä tarvitsee**:
- Dropdown: Rele valinta (1-64)
- Dropdown: Viikonpäivä (0-6 + "Kaikki päivät"=7)
- Number input: Max lux kynnysarvo (0-2000)
- Checkbox: Enabled
- Text input: Description

---

## 📊 **VIIKONPÄIVIEN KÄSITTELY**

**C# DayOfWeek järjestelmä** (käytössä kaikissa tauluissa):
```
0 = Sunnuntai
1 = Maanantai  
2 = Tiistai
3 = Keskiviikko
4 = Torstai
5 = Perjantai
6 = Lauantai
7 = Kaikki päivät (vain daylight_shutdowns)
```

**Frontend dropdown valinnat**:
```javascript
const weekdays = [
  { value: 1, label: 'Maanantai' },
  { value: 2, label: 'Tiistai' },
  { value: 3, label: 'Keskiviikko' },
  { value: 4, label: 'Torstai' },
  { value: 5, label: 'Perjantai' },
  { value: 6, label: 'Lauantai' },
  { value: 0, label: 'Sunnuntai' }
];

// Daylight shutdowns -taulussa lisäksi:
const daylightWeekdays = [
  ...weekdays,
  { value: 7, label: 'Kaikki päivät' }
];
```

---

## 🔍 **TESTAUSESIMERKKEJÄ**

### **Esimerkki 1: Ulkovalot pois päivällä**
```sql
INSERT INTO daylight_shutdowns (relay_id, weekday, max_lux_threshold, description)
VALUES (15, 7, 100, 'Ulkovalot sammuu jos lux > 100 (kaikki päivät)');
```

### **Esimerkki 2: Hämäräkytkin iltaisin** 
```sql
INSERT INTO twilight_settings (relay_id, weekday, lux_threshold, allowed_start_time, allowed_end_time, description)
VALUES (15, 1, 50, '17:00:00', '23:00:00', 'Ulkovalot maanantaisin 17-23 jos lux < 50');
```

### **Esimerkki 3: Napit estetty öisin**
```sql
INSERT INTO light_schedules (relay_id, action_type, weekday, start_time, end_time, description) 
VALUES (15, 'block', 1, '23:00:00', '06:00:00', 'Ulkovalot estetty ma 23-06');
```

---

## ⚠️ **TÄRKEÄT HUOMIOT**

1. **Weekday**: Käytä aina C# DayOfWeek arvoja (0-6)
2. **Aikaformaatti**: Aina "HH:MM:SS" (24h)  
3. **Lux-arvot**: 0-2000 tyypillinen alue
4. **Prioriteetti**: Daylight > Block > Normal
5. **Automaatti**: Ohittaa aina manuaaliset estot
6. **Reload**: LightControl lataa muutokset 30s välein

---

## 🚀 **BACKEND API ENDPOINTIT (Suositukset)**

Frontend tarvitsee seuraavat API endpointit:

### **Light Schedules**
```
GET    /api/light-schedules          - Hae kaikki
GET    /api/light-schedules/{id}     - Hae yksi
POST   /api/light-schedules          - Luo uusi
PUT    /api/light-schedules/{id}     - Päivitä
DELETE /api/light-schedules/{id}     - Poista
```

### **Twilight Settings**
```
GET    /api/twilight-settings        - Hae kaikki
GET    /api/twilight-settings/{id}   - Hae yksi
POST   /api/twilight-settings        - Luo uusi
PUT    /api/twilight-settings/{id}   - Päivitä
DELETE /api/twilight-settings/{id}   - Poista
```

### **Daylight Shutdowns**
```
GET    /api/daylight-shutdowns       - Hae kaikki
GET    /api/daylight-shutdowns/{id}  - Hae yksi
POST   /api/daylight-shutdowns       - Luo uusi
PUT    /api/daylight-shutdowns/{id}  - Päivitä
DELETE /api/daylight-shutdowns/{id}  - Poista
```

### **Yleiset**
```
GET    /api/relays                   - Hae käytettävissä olevat releet
GET    /api/current-lux              - Hae nykyinen lux-arvo
GET    /api/system/status            - Järjestelmän tila
```

Tämä dokumentaatio antaa täydellisen pohjan frontend-käyttöliittymän rakentamiseen! 🎯