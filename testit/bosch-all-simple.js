import { io } from 'socket.io-client';
import fs from 'fs';
import path from 'path';

const socket = io('https://kodinohjaus.fi');
let authToken = null;

// Tulokset
const results = [];
// Kaikki Bosch API polut
const allPaths = [
    '/application',
    '/dhwCircuits', 
    '/gateway',
    '/heatingCircuits',
    '/heatSources',
    '/recordings',
    '/solarCircuits',
    '/system'
];

let currentPathIndex = 0;

// Location for home authentication (Turku coordinates)
const HOME_LOCATION = {
  latitude: 60.623857,
  longitude: 22.110013
};

console.log('🔥 Bosch Controller - Kaikki polut');
console.log('==================================');
console.log(`Käsitellään ${allPaths.length} polkua`);

socket.on('connect', async () => {
  console.log('🔌 Yhdistetty serveriin');
  
  try {
    // Autentikoi ensin
    console.log('\n🔐 Autentikoidaan...');
    await authenticate();
    
    // Käy läpi kaikki polut
    console.log('\n🎮 Aloitetaan polkujen käsittely...');
    await processAllPaths();
    
  } catch (error) {
    console.error('❌ Testi epäonnistui:', error);
  } finally {
    saveResults();
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

async function processAllPaths() {
  for (let i = 0; i < allPaths.length; i++) {
    const path = allPaths[i];
    console.log(`\n[${i + 1}/${allPaths.length}] Käsitellään: ${path}`);
    
    try {
      const data = await sendBoschCommand(path);
      results.push({
        path: path,
        success: true,
        data: data
      });
      console.log(`   ✅ Onnistui: ${path}`);
    } catch (error) {
      console.error(`   ❌ Epäonnistui: ${path} - ${error.message}`);
      results.push({
        path: path,
        success: false,
        error: error.message
      });
    }
    
    // Odota hetki seuraavan komennon välissä
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

function sendBoschCommand(commandPath) {
  return new Promise((resolve, reject) => {
    if (!authToken) {
      reject(new Error('Ei autentikointitokenia'));
      return;
    }
    
    console.log(`   🎯 Lähetetään komento: ${commandPath}`);
    
    const request = {
      type: 'controller_command',
      data: {
        id: "Bosch",
        function: "get", 
        path: commandPath
      },
      token: authToken
    };
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (response.success) {
        console.log(`   📦 Vastaus saatu: ${JSON.stringify(response.data).length} merkkiä`);
        resolve(response.data);
      } else {
        console.error(`   ❌ Virhe: ${response.error || 'Tuntematon virhe'}`);
        reject(new Error(response.error || 'Komento epäonnistui'));
      }
    });
    
    setTimeout(() => reject(new Error('Komento timeout')), 15000);
  });
}

function saveResults() {
  console.log('\n💾 Tallennetaan tulokset...');
  
  // Luo bosch_data kansio
  const dataDir = path.join(process.cwd(), 'bosch_data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Tallenna kaikki data JSON-muodossa
  const allData = JSON.stringify(results, null, 2);
  fs.writeFileSync(path.join(dataDir, 'bosch_all_data.json'), allData);
  
  // Tallenna myös teksti-muodossa
  let textOutput = 'BOSCH CONTROLLER - KAIKKI POLUT\n';
  textOutput += '=================================\n\n';
  
  results.forEach((result, index) => {
    textOutput += `${index + 1}. ${result.path}\n`;
    textOutput += `Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
    
    if (result.success && result.data) {
      textOutput += `Data: ${JSON.stringify(result.data, null, 2)}\n`;
    } else if (result.error) {
      textOutput += `Error: ${result.error}\n`;
    }
    textOutput += '\n---\n\n';
  });
  
  fs.writeFileSync(path.join(dataDir, 'bosch_all_data.txt'), textOutput);
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Onnistuneet: ${successCount}/${results.length}`);
  console.log(`📁 Tallennettu: bosch_data/bosch_all_data.json ja .txt`);
}

socket.on('disconnect', () => {
  console.log('🔌 Yhteys katkaistu');
});

socket.on('connect_error', (error) => {
  console.error('❌ Yhdistysvirhe:', error);
});

// Timeout 5 minuuttia
setTimeout(() => {
  console.log('⏰ Timeout - lopetetaan');
  saveResults();
  process.exit(0);
}, 5 * 60 * 1000);