import { io } from 'socket.io-client';
import fs from 'fs';
import path from 'path';

const socket = io('https://kodinohjaus.fi');
let authToken = null;

// Tulokset
const allData = new Map(); // path -> data
const processedPaths = new Set();
const pendingPaths = [];

// Aloituspolut
const startPaths = [
    '/application',
    '/dhwCircuits', 
    '/gateway',
    '/heatingCircuits',
    '/heatSources',
    '/recordings',
    '/solarCircuits',
    '/system'
];

// Location for home authentication
const HOME_LOCATION = {
  latitude: 60.623857,
  longitude: 22.110013
};

console.log('🔥 Bosch Controller - KAIKKI POLUT REKURSIIVISESTI');
console.log('=================================================');
console.log(`Aloitetaan ${startPaths.length} pääpolulla ja seurataan kaikki viittaukset loppuun asti`);

socket.on('connect', async () => {
  console.log('🔌 Yhdistetty serveriin');
  
  try {
    // Autentikoi ensin
    console.log('\n🔐 Autentikoidaan...');
    await authenticate();
    
    // Lisää aloituspolut jonoon
    startPaths.forEach(path => {
      if (!processedPaths.has(path)) {
        pendingPaths.push(path);
      }
    });
    
    console.log(`\n🎮 Aloitetaan rekursiivinen haku...`);
    console.log(`Jonossa ${pendingPaths.length} polkua`);
    
    // Käsittele kaikki polut rekursiivisesti
    await processAllPathsRecursively();
    
  } catch (error) {
    console.error('❌ Virhe:', error);
  } finally {
    await saveResults();
    socket.disconnect();
  }
});

function authenticate() {
  return new Promise((resolve, reject) => {
    console.log('   🌍 Sijainti-autentikointi...');
    
    const request = {
      type: 'auth_location',
      location: HOME_LOCATION
    };
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (response.success && response.data && response.data.token) {
        authToken = response.data.token;
        console.log('   ✅ Autentikointi onnistui');
        resolve();
      } else {
        console.error('   ❌ Autentikointi epäonnistui:', response);
        reject(new Error('Autentikointi epäonnistui'));
      }
    });
    
    setTimeout(() => reject(new Error('Autentikointi timeout')), 10000);
  });
}

async function processAllPathsRecursively() {
  let processed = 0;
  
  while (pendingPaths.length > 0) {
    const currentPath = pendingPaths.shift();
    
    if (processedPaths.has(currentPath)) {
      continue;
    }
    
    processed++;
    processedPaths.add(currentPath);
    
    console.log(`\n[${processed}] Käsitellään: ${currentPath} (jäljellä: ${pendingPaths.length})`);
    
    try {
      const data = await sendBoschCommand(currentPath);
      allData.set(currentPath, {
        path: currentPath,
        success: true,
        data: data
      });
      
      // Etsi uudet polut datasta
      const newPaths = extractReferencePaths(data);
      let addedCount = 0;
      
      newPaths.forEach(newPath => {
        if (!processedPaths.has(newPath) && !pendingPaths.includes(newPath)) {
          pendingPaths.push(newPath);
          addedCount++;
        }
      });
      
      console.log(`   ✅ Onnistui: ${JSON.stringify(data).length} merkkiä`);
      if (addedCount > 0) {
        console.log(`   → Lisättiin ${addedCount} uutta polkua jonoon`);
      }
      
    } catch (error) {
      console.error(`   ❌ Epäonnistui: ${error.message}`);
      allData.set(currentPath, {
        path: currentPath,
        success: false,
        error: error.message
      });
    }
    
    // Odota hetki seuraavan komennon välissä
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n🎉 VALMIS! Käsiteltiin yhteensä ${processed} polkua`);
}

function extractReferencePaths(data) {
  const paths = [];
  
  if (!data || typeof data !== 'object') {
    return paths;
  }
  
  // Etsi references-taulukoita rekursiivisesti
  function searchReferences(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    if (Array.isArray(obj)) {
      obj.forEach(item => searchReferences(item));
    } else {
      Object.keys(obj).forEach(key => {
        if (key === 'references' && Array.isArray(obj[key])) {
          obj[key].forEach(ref => {
            if (ref && ref.id && typeof ref.id === 'string' && ref.id.startsWith('/')) {
              paths.push(ref.id);
            }
          });
        } else if (typeof obj[key] === 'object') {
          searchReferences(obj[key]);
        }
      });
    }
  }
  
  searchReferences(data);
  return [...new Set(paths)]; // Poista duplikaatit
}

function sendBoschCommand(commandPath) {
  return new Promise((resolve, reject) => {
    if (!authToken) {
      reject(new Error('Ei autentikointitokenia'));
      return;
    }
    
    const request = {
      type: 'controller_command',
      data: {
        id: "Bosch",
        function: "read", 
        path: commandPath
      },
      token: authToken
    };
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error || 'Komento epäonnistui'));
      }
    });
    
    setTimeout(() => reject(new Error('Komento timeout')), 15000);
  });
}

async function saveResults() {
  console.log('\n💾 Tallennetaan tulokset...');
  
  // Luo bosch_data kansio
  const dataDir = path.join(process.cwd(), 'bosch_data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Muunna Map takaisin arrayiksi
  const resultsArray = Array.from(allData.values());
  
  // Tallenna JSON
  const jsonData = JSON.stringify(resultsArray, null, 2);
  fs.writeFileSync(path.join(dataDir, 'bosch_complete_recursive.json'), jsonData);
  
  // Tallenna teksti-muoto
  let textOutput = 'BOSCH CONTROLLER - REKURSIIVINEN HAKU\n';
  textOutput += '====================================\n\n';
  textOutput += `Käsitelty yhteensä: ${resultsArray.length} polkua\n\n`;
  
  resultsArray.forEach((result, index) => {
    textOutput += `${index + 1}. ${result.path}\n`;
    textOutput += `Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
    
    if (result.success && result.data) {
      // Näytä tiivis versio datasta
      const dataStr = JSON.stringify(result.data, null, 2);
      if (dataStr.length > 500) {
        textOutput += `Data: ${dataStr.substring(0, 500)}...[KATKAISTU]\n`;
      } else {
        textOutput += `Data: ${dataStr}\n`;
      }
    } else if (result.error) {
      textOutput += `Error: ${result.error}\n`;
    }
    textOutput += '\n---\n\n';
  });
  
  fs.writeFileSync(path.join(dataDir, 'bosch_complete_recursive.txt'), textOutput);
  
  // Tallenna myös yhteenveto
  const successCount = resultsArray.filter(r => r.success).length;
  const summary = `
BOSCH CONTROLLER - REKURSIIVINEN HAKU YHTEENVETO
==============================================

Käsitelty polkuja yhteensä: ${resultsArray.length}
Onnistuneet: ${successCount}
Epäonnistuneet: ${resultsArray.length - successCount}

Onnistuneet polut:
${resultsArray.filter(r => r.success).map(r => r.path).join('\n')}

Epäonnistuneet polut:
${resultsArray.filter(r => !r.success).map(r => `${r.path} - ${r.error}`).join('\n')}

Suoritettu: ${new Date().toISOString()}
`;
  
  fs.writeFileSync(path.join(dataDir, 'bosch_summary_recursive.txt'), summary);
  
  console.log(`✅ Onnistuneet: ${successCount}/${resultsArray.length}`);
  console.log(`📁 Tallennettu: bosch_complete_recursive.json, .txt ja summary`);
}

socket.on('disconnect', () => {
  console.log('🔌 Yhteys katkaistu');
});

socket.on('connect_error', (error) => {
  console.error('❌ Yhdistysvirhe:', error);
});

// Timeout 20 minuuttia
setTimeout(() => {
  console.log('⏰ Timeout - lopetetaan pakotetusti');
  saveResults().then(() => process.exit(0));
}, 20 * 60 * 1000);