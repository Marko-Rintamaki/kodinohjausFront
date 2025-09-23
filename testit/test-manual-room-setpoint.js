import { io } from 'socket.io-client';

console.log('🌡️ Bosch Controller - Manual Room Setpoint (PUT)');
console.log('===============================================');
console.log('Kokeillaan C# koodin tapaa: manualRoomSetpoint + PUT-metodi');

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

async function main() {
  try {
    // 1. Yhdistä ja autentikoi
    await connectAndAuth();
    
    // 2. Lue nykyinen arvo
    console.log('\n📖 Luetaan nykyinen arvo...');
    const currentValue = await readValue();
    console.log(`   Nykyinen arvo: ${currentValue}`);
    
    // 3. Kirjoita uusi arvo PUT-metodilla
    console.log(`\n✏️ Kirjoitetaan uusi arvo PUT-metodilla: ${NEW_VALUE}`);
    await writeValuePUT(NEW_VALUE);
    
    // 4. Varmista muutos
    console.log('\n✅ Varmistetaan muutos...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const newValue = await readValue();
    console.log(`   Uusi arvo: ${newValue}`);
    
    if (String(newValue) === String(NEW_VALUE)) {
      console.log('\n🎉 ONNISTUI! Manual room setpoint asetettu PUT-metodilla!');
    } else {
      console.log('\n❌ EPÄONNISTUI! Arvo ei muuttunut.');
    }
    
    socket.disconnect();
    
  } catch (error) {
    console.error('❌ Virhe:', error.message);
    socket.disconnect();
    process.exit(1);
  }
}

function connectAndAuth() {
  return new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log('🔌 Yhdistetty serveriin');
      
      socket.emit('request', {
        type: 'auth_location',
        location: HOME_LOCATION
      });
    });

    socket.on('response', (response) => {
      if (response.success && response.data?.token) {
        console.log('   ✅ Autentikointi onnistui');
        authToken = response.data.token;
        resolve();
      } else {
        reject(new Error('Autentikointi epäonnistui'));
      }
    });

    socket.on('connect_error', (error) => {
      reject(new Error(`Yhteys epäonnistui: ${error.message}`));
    });
  });
}

function readValue() {
  return new Promise((resolve, reject) => {
    socket.emit('request', {
      type: 'controller_command',
      data: {
        id: 'Bosch',
        function: 'read',
        path: TEST_PATH
      },
      token: authToken
    });

    socket.on('response', (response) => {
      if (response.success && response.data) {
        resolve(response.data.value);
      } else {
        reject(new Error('Lukeminen epäonnistui'));
      }
    });
  });
}

function writeValuePUT(value) {
  return new Promise((resolve, reject) => {
    console.log('   📤 Lähetetään PUT-pyyntö:');
    const requestData = {
      type: 'controller_command',
      data: {
        id: 'Bosch',
        function: 'write',
        method: 'PUT',  // Uusi method-parametri!
        path: TEST_PATH,
        value: value
      },
      token: authToken
    };
    
    console.log('   ', JSON.stringify(requestData, null, 2));
    
    socket.emit('request', requestData);

    socket.on('response', (response) => {
      console.log('   📥 Vastaus:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('   ✅ Kirjoitus onnistui');
        resolve();
      } else {
        reject(new Error(`Kirjoitus epäonnistui: ${response.error || 'Tuntematon virhe'}`));
      }
    });
  });
}

main();