import { io } from 'socket.io-client';

console.log('🔥 Bosch Controller - PUT Method Tests');
console.log('=====================================');
console.log('Kokeillaan muitakin arvoja PUT-metodilla!');

const socket = io('https://kodinohjaus.fi');
let authToken = null;

const HOME_LOCATION = {
  latitude: 60.623857,
  longitude: 22.110013
};

// Testattavat polut PUT-metodilla
const PUT_TESTS = [
    {
        path: '/dhwCircuits/dhw1/operationMode',
        value: 'high',
        name: 'DHW operation mode'
    },
    {
        path: '/dhwCircuits/dhw1/charge', 
        value: 'start',
        name: 'DHW charge'
    },
    {
        path: '/heatingCircuits/hc1/operationMode',
        value: 'auto',
        name: 'Heating operation mode'
    },
    {
        path: '/heatingCircuits/hc1/temporaryRoomSetpoint',
        value: '24.0',
        name: 'Temporary room setpoint'
    }
];

async function main() {
  try {
    await connectAndAuth();
    
    console.log('\n🧪 TESTAAMAAN ERILAISIA ARVOJA PUT-METODILLA:');
    console.log('=============================================\n');
    
    for (const test of PUT_TESTS) {
        console.log(`🔧 Testataan: ${test.name}`);
        console.log(`   Polku: ${test.path}`);
        console.log(`   Uusi arvo: ${test.value}`);
        
        try {
            // Lue nykyinen
            const current = await readValue(test.path);
            console.log(`   📖 Nykyinen: ${current}`);
            
            // Kirjoita PUT:lla
            const writeResult = await writeValuePUT(test.path, test.value);
            console.log(`   ✏️ PUT tulos: ${writeResult.success ? 'OK' : 'FAIL'}`);
            
            // Tarkista
            await new Promise(resolve => setTimeout(resolve, 1000));
            const newValue = await readValue(test.path);
            const success = String(newValue) === String(test.value);
            
            console.log(`   📋 Uusi arvo: ${newValue}`);
            console.log(`   ${success ? '✅ TOIMII!' : '❌ Ei toiminut'}\n`);
            
        } catch (error) {
            console.log(`   ❌ Virhe: ${error.message}\n`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    socket.disconnect();
    
  } catch (error) {
    console.error('❌ Päävirhe:', error.message);
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

function readValue(path) {
  return new Promise((resolve, reject) => {
    socket.emit('request', {
      type: 'controller_command',
      data: {
        id: 'Bosch',
        function: 'read',
        path: path
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

function writeValuePUT(path, value) {
  return new Promise((resolve, reject) => {
    socket.emit('request', {
      type: 'controller_command',
      data: {
        id: 'Bosch',
        function: 'write',
        method: 'PUT',
        path: path,
        value: value
      },
      token: authToken
    });

    socket.on('response', (response) => {
      resolve(response);
    });
  });
}

main();