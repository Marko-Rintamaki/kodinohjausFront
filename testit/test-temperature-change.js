import { io } from 'socket.io-client';

console.log('🌡️ Bosch Controller - Manual Room Setpoint (PUT)');
console.log('===============================================');

const socket = io('https://kodinohjaus.fi');
let authToken = null;

const HOME_LOCATION = {
  latitude: 60.623857,
  longitude: 22.110013
};

// TEST PARAMETERS - Manual room setpoint PUT-metodilla
const TEST_PATH = '/heatingCircuits/hc1/manualRoomSetpoint';
const OLD_VALUE = '-1';
const NEW_VALUE = '22.5';

console.log('� Bosch Controller - DHW Kertalataus');
console.log('====================================');
console.log(`Luetaan: ${TEST_PATH}`);

socket.on('connect', async () => {
  console.log('🔌 Yhdistetty serveriin');
  
  try {
    // 1. Autentikoi
    console.log('\n🔐 Autentikoidaan...');
    await authenticate();
    
    // 2. Lue arvo
    console.log('\n📖 Luetaan arvo...');
    const currentValue = await readValue();
    console.log(`   💧 DHW lämpötila: ${currentValue}°C`);
    
    // Lopetetaan tähän - vain lukeminen
    console.log('\n✅ Lukeminen valmis!');
    socket.disconnect();
    return;
    
    // 4. Varmista muutos
    console.log('\n✅ Varmistetaan muutos...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Odota 2 sekuntia
    const newValue = await readValue();
    console.log(`   Uusi tila: ${newValue}`);
    
    if (newValue == NEW_VALUE) {
      console.log('🎉 ONNISTUI! Lämmin käyttövesi laitettu päälle!');
    } else {
      console.log('❌ EPÄONNISTUI! Tila ei muuttunut.');
    }
    
  } catch (error) {
    console.error('❌ Virhe:', error.message);
  } finally {
    socket.disconnect();
  }
});

function authenticate() {
  return new Promise((resolve, reject) => {
    socket.emit('request', {
      type: 'auth_location',
      location: HOME_LOCATION
    });
    
    socket.once('response', (response) => {
      if (response.success && response.data && response.data.token) {
        authToken = response.data.token;
        console.log('   ✅ Autentikointi onnistui');
        resolve();
      } else {
        reject(new Error('Autentikointi epäonnistui'));
      }
    });
    
    setTimeout(() => reject(new Error('Autentikointi timeout')), 10000);
  });
}

function readValue() {
  return new Promise((resolve, reject) => {
    socket.emit('request', {
      type: 'controller_command',
      data: {
        id: "Bosch",
        function: "get", 
        path: TEST_PATH
      },
      token: authToken
    });
    
    socket.once('response', (response) => {
      if (response.success && response.data && response.data.value !== undefined) {
        resolve(response.data.value);
      } else {
        reject(new Error('Lukeminen epäonnistui: ' + (response.error || 'Ei arvoa')));
      }
    });
    
    setTimeout(() => reject(new Error('Lukeminen timeout')), 10000);
  });
}

function writeValue(newValue) {
  return new Promise((resolve, reject) => {
    const request = {
      type: 'controller_command',
      data: {
        id: "Bosch",
        function: "write",
        path: TEST_PATH,
        value: newValue
      },
      token: authToken
    };
    
    console.log('   📤 Lähetetään:', JSON.stringify(request, null, 2));
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      console.log('   📥 Vastaus:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('   ✅ Kirjoitus onnistui');
        resolve();
      } else {
        reject(new Error('Kirjoitus epäonnistui: ' + (response.error || 'Tuntematon virhe')));
      }
    });
    
    setTimeout(() => reject(new Error('Kirjoitus timeout')), 15000);
  });
}

socket.on('disconnect', () => {
  console.log('🔌 Yhteys katkaistu');
});

socket.on('connect_error', (error) => {
  console.error('❌ Yhdistysvirhe:', error);
});