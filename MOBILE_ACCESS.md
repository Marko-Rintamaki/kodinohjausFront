# 📱 Mobiili & Etäkäyttö - Kehitystila

## 🌐 Dev Server - Ulkoinen Pääsy

Vite dev server on konfiguroitu toimimaan kaikissa verkkoliitännöissä, joten pääset käsiksi sovellukseen myös puhelimella tai muulta koneelta.

### 📍 Käytettävissä olevat osoitteet:

#### Julkinen Internet (WiFi/4G/5G):
```
http://81.88.23.96:5173/
```

#### Paikallisverkko (sama WiFi):
```
http://192.168.x.x:5173/  (riippuu verkosta)
```

#### Palvelimelta (localhost):
```
http://localhost:5173/
```

## 📱 Mobiilitestaus

### Zoom/Pan Toiminnot Mobilissa:
- **Yhden sormen panorointi**: Kosketa ja vedä liikuttaaksesi kuvaa
- **Kahden sormen zoom**: Pinch-to-zoom zoomaukseen
- **Zoom-rajat**: 0.5x - 3x (sama kuin desktop)
- **Smooth animaatiot**: Toimii natiiivisti

### Testattavat ominaisuudet:
1. **Pohjakuvan lataaminen** - Pitäisi näkyä kodinohjauksen pohjapiirros
2. **Touch-panorointi** - Yhden sormen vedolla
3. **Pinch-zoom** - Kahden sormen zoomaus
4. **Layout-komponentit** - Lamput, lämmitysputket, jne.
5. **Socket.IO yhteys** - Backend-yhteys toimii

## 🔧 Dev-tilan Asetukset

### Vite Config (`vite.config.ts`):
```typescript
server: {
  host: '0.0.0.0',  // Kuuntele kaikkia IP-osoitteita
  port: 5173,
  strictPort: true,
  cors: true,       // Salli CORS
  hmr: {
    clientPort: 5173 // Hot reload toimii etäyhteyksillä
  }
}
```

### Ympäristöasetukset (`.env.development`):
```
VITE_BACKEND_URL=https://kodinohjaus.fi
VITE_DEV_MODE=true
```

### Palomuuriasetukset:
```bash
# Portti 5173 on auki:
sudo ufw allow 5173/tcp comment "Vite/React/Dev server"
```

## 🔌 Backend-yhteys

Dev-tila käyttää **tuotantobackendia** (`https://kodinohjaus.fi`):
- Socket.IO toimii samalla tavalla kuin tuotannossa
- Autentikointi toimii (sijainti + salasana)
- Tietokantayhteydet toimivat
- Layout-data ladataan oikeasta tietokannasta

## 🚀 Käynnistys

1. **Käynnistä dev server**:
   ```bash
   npm run dev
   ```

2. **Tarkista verkko-osoitteet** terminalista:
   ```
   ➜  Network: http://81.88.23.96:5173/
   ```

3. **Avaa mobiililaitteella**:
   - Mene osoitteeseen: `http://81.88.23.96:5173/`
   - Kokeile zoom/pan toimintoja
   - Testaa että Socket.IO yhdistää

## 🐛 Vianmääritys

### Jos sivu ei lataa mobiilissa:
1. Varmista että olet samassa verkossa TAI käytät julkista internetiä
2. Tarkista että palomuuriasetukset sallivat liikenteen
3. Kokeile eri selainta (Chrome, Safari, Firefox Mobile)

### Jos zoom/pan ei toimi:
1. Varmista että kosketustapahtumat rekisteröityvät
2. Tarkista console-virheet DevToolsista (mobiili debug)
3. Testaa että useZoomAndPan hook saa oikeat eventi

### Jos Socket.IO ei yhdistä:
1. Tarkista että backend on käynnissä: `https://kodinohjaus.fi/health`
2. Varmista että CORS-asetukset sallivat yhteyden
3. Tarkista network-välilehti DevToolsista

## 🎯 Tuotantoon Siirto

Kun kehitys on valmis:
```bash
npm run build    # Buildaa tuotantoversioon
```

Tuotannossa sovellus toimii osoitteessa: `https://kodinohjaus.fi`