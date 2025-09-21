# Kodinohjaus Frontend 2.0

Uudistettu versio Kodinohjaus-älykodin frontend-sovelluksesta.

## Ominaisuudet

- React 18 + TypeScript
- Socket.IO reaaliaikainen kommunikaatio
- Vite kehitysympäristö
- Puhdas CSS-tyylittely
- Responsiivinen mobiilisuunnittelu

## Kehitysympäristö

```bash
# Asenna riippuvuudet
npm install

# Käynnistä kehityspalvelin
npm run dev

# Rakenna tuotantoversio
npm run build

# Esikatselu tuotantoversiota
npm run preview

# Aja testit
npm run test

# Lint koodi
npm run lint
```

## Arkkitehtuuri

### Backend-kommunikaatio
- Socket.IO -yhteydellä `kodinohjausBack`-palvelimeen
- JWT-pohjainen autentikaatio paikannustiedolla tai salasanalla
- RequestHandler-pohjainen pyyntöjen käsittely

### Komponenttirakenne
- Modulaarinen komponenttikirjasto
- Context-pohjaiset globaalit tilat (Auth, Socket)
- Custom hookit yhteiskäyttöiselle logiikalle

### Vanhat tiedostot
Edellisen version kaikki tiedostot löytyvät `vanhat/` -kansiosta.

## Tuotantoympäristö

Sovellus toimii osoitteessa: https://kodinohjaus.fi