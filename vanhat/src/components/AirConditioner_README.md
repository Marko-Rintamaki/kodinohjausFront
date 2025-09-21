# Ilmastointikomponentit

Tämä kansio sisältää ilmastointijärjestelmälle kolme uutta komponenttia:

## Komponentit

### 1. Kompressori (`Compressor.tsx`)
Näyttää kompressorin tilan visuaalisten indikaattoreiden avulla.

**Ominaisuudet:**
- Kompressorin runko animoituu käydessä
- Männät liikkuvat ylös-alas käynnissä ollessa
- Paineviivat pulssaavat käynnin aikana
- Statusviesti: "KÄYNNISSÄ" / "PYSÄHDYKSISSÄ"

**Props:**
```typescript
interface CompressorProps {
  size?: number;              // Koko pikseleinä (default: 80)
  className?: string;         // CSS-luokat
  style?: React.CSSProperties; // Inline-tyylit
  title?: string;             // Tooltip-teksti (default: "Kompressori")
  compressorId?: string;      // Tunniste socket-datassa (default: "default")
}
```

### 2. Puhallin (`Fan.tsx`)
Näyttää puhaltimen tilan pyörimisanimaatiolla ja ilmavirtauksella.

**Ominaisuudet:**
- Siipien pyörimisanimaatio käynnissä ollessa
- Ilmavirta-indikaattorit animoituvat
- Sisä- ja ulkopuhallin tyylejä
- Eri pyörintänopeudet sisä/ulko

**Props:**
```typescript
interface FanProps {
  size?: number;              // Koko pikseleinä (default: 80)
  className?: string;         // CSS-luokat
  style?: React.CSSProperties; // Inline-tyylit
  title?: string;             // Tooltip-teksti (default: "Puhallin")
  fanId?: string;             // Tunniste socket-datassa (default: "default")
  fanType?: 'indoor' | 'outdoor'; // Puhaltimen tyyppi (default: "indoor")
}
```

### 3. Ilmastointikone (`AirConditioner.tsx`)
Yhdistää kompressorin ja puhaltimen yhdeksi komponentiksi.

**Ominaisuudet:**
- Kompressori ja puhallin samassa yksikössä
- Vaakasuora tai pystysuora asettelu
- Nimitaulut komponenteille
- Yhtenäinen muotoilu

**Props:**
```typescript
interface AirConditionerProps {
  size?: number;              // Koko pikseleinä (default: 80)
  className?: string;         // CSS-luokat
  style?: React.CSSProperties; // Inline-tyylit
  title?: string;             // Otsikko (default: "Ilmastointikone")
  compressorId?: string;      // Kompressorin tunniste
  fanId?: string;             // Puhaltimen tunniste
  layout?: 'horizontal' | 'vertical'; // Asettelu (default: "horizontal")
  showLabels?: boolean;       // Näytä komponenttinimet (default: true)
}
```

## Käyttöesimerkit

### Yksittäiset komponentit
```tsx
import Compressor from '../components/Compressor';
import Fan from '../components/Fan';

// Kompressori
<Compressor 
  size={100} 
  title="Olohuoneen AC Kompressori"
  compressorId="livingroom_ac" 
/>

// Sisäpuhallin
<Fan 
  size={100} 
  title="Sisäyksikön puhallin"
  fanId="indoor_unit" 
  fanType="indoor"
/>

// Ulkopuhallin
<Fan 
  size={100} 
  title="Ulkoyksikön puhallin"
  fanId="outdoor_unit" 
  fanType="outdoor"
/>
```

### Yhdistetty komponentti
```tsx
import AirConditioner from '../components/AirConditioner';

// Vaakasuora asettelu
<AirConditioner 
  title="Olohuone AC"
  compressorId="living_room"
  fanId="living_room"
  layout="horizontal"
  showLabels={true}
/>

// Pystysuora asettelu
<AirConditioner 
  title="Makuuhuone AC"
  compressorId="bedroom"
  fanId="bedroom"
  layout="vertical"
  showLabels={false}
/>
```

## Socket-data rakenne

Komponentit kuuntelevat socket-dataa seuraavista poluista:

### AirConditioner-data (ensisijainen)
```json
{
  "AirConditioner": [
    {
      "paths": [
        {
          "id": "/compressor/[compressorId]/status",
          "value": "running" // tai true, tai > 0
        },
        {
          "id": "/fan/[fanId]/status", 
          "value": "running" // tai true, tai > 0
        }
      ]
    }
  ]
}
```

### HVAC-data (vaihtoehtoinen)
```json
{
  "HVAC": {
    "compressor": {
      "running": true
    },
    "fan": {
      "indoor": {
        "running": true
      },
      "outdoor": {
        "running": false
      }
    }
  }
}
```

## Animaatiot

### Kompressori käynnissä:
- Sininen sävy ja hehku
- Männän liike ylös-alas (0.6s)
- Paineviivat pulssaavat (0.8s)

### Puhallin käynnissä:
- Siivet pyörivät (0.4s sisä, 0.6s ulko)
- Ilmavirta-animaatio (1.2s)
- Sininen sävy ja hehku

### Pysähdyksissä:
- Harmaa väritys
- Ei animaatioita
- "PYSÄHDYKSISSÄ" status

## Testaus

Testaa komponentteja TestPage-sivulla (`/test`):
1. Avaa TestPage selaimessa
2. Vieritä alas "Ilmastointikomponentit - Demo" osioon
3. Näet kaikki komponentit eri asetteluilla
4. Lähetä socket-dataa sisältäen AC-statuksia

## Integrointi projektiisi

1. Importtaa tarvittavat komponentit:
```tsx
import Compressor from '../components/Compressor';
import Fan from '../components/Fan';
import AirConditioner from '../components/AirConditioner';
```

2. Varmista että socket-data sisältää AC-statuksia
3. Käytä komponentteja UI:ssasi sopivilla propsseilla
4. Komponentit päivittyvät automaattisesti kun socket-data muuttuu
