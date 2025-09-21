const { io } = require('socket.io-client');

// Yhdistä Socket.IO serveriin
const socket = io('https://kodinohjaus.fi', {
  transports: ['websocket', 'polling'],
  timeout: 5000
});

let testResults = {
  connection: false,
  authentication: false,
  databaseQuery: false,
  controllerCommand: false,
  statusUpdates: false
};

console.log('🚀 Starting Socket.IO TypeScript Backend Tests...\n');

// 1. CONNECTION TEST
socket.on('connect', () => {
  console.log('✅ CONNECTION: Connected to Socket.IO server');
  console.log('   Socket ID:', socket.id);
  testResults.connection = true;
  
  // Aloita testit
  setTimeout(() => runTests(), 1000);
});

socket.on('connect_error', (error) => {
  console.error('❌ CONNECTION: Failed to connect:', error.message);
  process.exit(1);
});

// 2. STATUS UPDATE TEST
socket.on('statusUpdate', (status) => {
  console.log('✅ STATUS UPDATE: Received status update from controller');
  console.log('   Status keys:', Object.keys(status).join(', '));
  testResults.statusUpdates = true;
});

// Test functions
async function runTests() {
  console.log('\n📋 Running RequestHandler Tests...\n');
  
  // Test 1: Database query without authentication (should work)
  await testDatabaseQueryWithoutAuth();
  
  // Test 2: Controller command without authentication (should fail)
  await testControllerCommandWithoutAuth();
  
  // Test 3: Authentication with location
  await testAuthentication();
  
  // Test 4: Database query with authentication (should work)
  await testDatabaseQueryWithAuth();
  
  // Test 5: Controller command with authentication (should work)
  await testControllerCommandWithAuth();
  
  // Results
  setTimeout(() => {
    console.log('\n📊 TEST RESULTS:');
    console.log('================');
    Object.entries(testResults).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test.toUpperCase()}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const passedCount = Object.values(testResults).filter(Boolean).length;
    const totalCount = Object.keys(testResults).length;
    console.log(`\n🏆 TOTAL: ${passedCount}/${totalCount} tests passed`);
    
    process.exit(0);
  }, 5000);
}

function testDatabaseQueryWithoutAuth() {
  return new Promise((resolve) => {
    console.log('🔍 TEST 1: Database query without authentication...');
    
    const request = {
      type: 'database_query',
      data: {
        query: 'SELECT COUNT(*) as count FROM server_logs LIMIT 1'
      }
    };
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (response.success) {
        console.log('   ✅ Database query worked without auth (read-only access)');
        testResults.databaseQuery = true;
      } else {
        console.log('   ❌ Database query failed:', response.error);
      }
      resolve();
    });
  });
}

function testControllerCommandWithoutAuth() {
  return new Promise((resolve) => {
    console.log('🎮 TEST 2: Controller command without authentication...');
    
    const request = {
      type: 'controller_command',
      data: {
        command: 'status'
      }
    };
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (!response.success && response.requiresAuth) {
        console.log('   ✅ Controller command correctly blocked without auth');
      } else {
        console.log('   ❌ Controller command should require auth but didn\'t');
      }
      resolve();
    });
  });
}

function testAuthentication() {
  return new Promise((resolve) => {
    console.log('🔐 TEST 3: Authentication with password...');
    
    // Kokeillaan salasana-autentikointia
    const request = {
      type: 'auth_password',
      password: 'Salasana123'
    };
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (response.success && response.data && response.data.token) {
        console.log('   ✅ Authentication successful');
        console.log('   Token received:', response.data.token.substring(0, 20) + '...');
        testResults.authentication = true;
        
        // Tallenna token seuraavia testejä varten
        global.authToken = response.data.token;
      } else {
        console.log('   ❌ Authentication failed:', response.error || 'No token received');
        
        // Jos salasana ei toimi, kokeillaan locationia
        console.log('   🔄 Trying location authentication as fallback...');
        const locationRequest = {
          type: 'auth_location',
          location: {
            latitude: 61.4511,
            longitude: 21.8127
          }
        };
        
        socket.emit('request', locationRequest);
        
        socket.once('response', (locationResponse) => {
          if (locationResponse.success && locationResponse.data && locationResponse.data.token) {
            console.log('   ✅ Location authentication successful');
            testResults.authentication = true;
            global.authToken = locationResponse.data.token;
          } else {
            console.log('   ❌ Both authentication methods failed');
          }
          resolve();
        });
        
        return; // Älä kutsu resolve() tässä
      }
      resolve();
    });
  });
}

function testDatabaseQueryWithAuth() {
  return new Promise((resolve) => {
    if (!global.authToken) {
      console.log('🔍 TEST 4: Skipping authenticated database query (no token)');
      resolve();
      return;
    }
    
    console.log('🔍 TEST 4: Database query with authentication...');
    
    const request = {
      type: 'database_query',
      token: global.authToken,
      data: {
        query: 'SELECT COUNT(*) as count FROM server_logs LIMIT 1'
      }
    };
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (response.success) {
        console.log('   ✅ Authenticated database query worked (write access available)');
      } else {
        console.log('   ❌ Authenticated database query failed:', response.error);
      }
      resolve();
    });
  });
}

function testControllerCommandWithAuth() {
  return new Promise((resolve) => {
    if (!global.authToken) {
      console.log('🎮 TEST 5: Skipping authenticated controller command (no token)');
      resolve();
      return;
    }
    
    console.log('🎮 TEST 5: Controller command with authentication...');
    
    const request = {
      type: 'controller_command',
      token: global.authToken,
      data: {
        command: 'status'
      }
    };
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (response.success) {
        console.log('   ✅ Authenticated controller command worked');
        testResults.controllerCommand = true;
      } else {
        console.log('   ❌ Authenticated controller command failed:', response.error);
      }
      resolve();
    });
  });
}

// Error handling
socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected from server:', reason);
});

// Timeout fallback
setTimeout(() => {
  console.log('⏰ Test timeout reached');
  process.exit(1);
}, 30000);