const { io } = require('socket.io-client');

// Test configuration
const TEST_CONFIG = {
  server: 'https://kodinohjaus.fi',
  // Oikeat koordinaatit (alle 1000m kotoa) - AuthService defaultit
  validLocation: {
    latitude: 60.623857,  // AuthService home coordinates
    longitude: 22.110013
  },
  // Väärät koordinaatit (liian kaukana)
  invalidLocation: {
    latitude: 60.1699,
    longitude: 24.9384  // Helsinki
  },
  // Salasana autentikointiin - AuthService default
  password: 'koti2025',
  wrongPassword: 'VäärsSalasana'
};

let socket;
let currentToken = null;
let testResults = {};

console.log('🔐 COMPREHENSIVE AUTHENTICATION & CONTROLLER TEST');
console.log('================================================\n');

async function runComprehensiveTests() {
  // 1. YHDISTÄ SOCKET
  console.log('📡 STEP 1: Connecting to Socket.IO server...');
  await connectSocket();
  
  // 2. TESTAA CONTROLLER KOMENTO ILMAN AUTENTIKOINTIA
  console.log('\n🎮 STEP 2: Testing controller command WITHOUT authentication...');
  await testControllerCommandWithoutAuth();
  
  // 3. TESTAA LOCATION AUTENTIKOINTI (OIKEAT KOORDINAATIT)
  console.log('\n🌍 STEP 3: Testing location authentication (VALID coordinates)...');
  await testValidLocationAuth();
  
  // 4. TESTAA CONTROLLER KOMENTO OIKEALLA TOKENILLA
  console.log('\n✅ STEP 4: Testing controller command WITH valid token...');
  await testControllerCommandWithAuth();
  
  // 5. TESTAA VÄÄRÄT KOORDINAATIT
  console.log('\n❌ STEP 5: Testing location authentication (INVALID coordinates - too far)...');
  await testInvalidLocationAuth();
  
  // 6. TESTAA SALASANA AUTENTIKOINTI FALLBACKINA
  console.log('\n🔑 STEP 6: Testing password authentication as fallback...');
  await testPasswordAuth();
  
  // 7. TESTAA UUSILLA CREDENTIALEILLA
  console.log('\n🔄 STEP 7: Testing controller with new password token...');
  await testControllerCommandWithAuth();
  
  // 8. TESTAA VANHENTUNUT TOKEN
  console.log('\n⏰ STEP 8: Testing with expired/invalid token...');
  await testExpiredToken();
  
  // 9. TESTAA TOKEN UUSINTA
  console.log('\n🆕 STEP 9: Testing token refresh...');
  await testTokenRefresh();
  
  // 10. LOPPUTULOKSET
  console.log('\n📊 FINAL RESULTS:');
  console.log('==================');
  displayResults();
  
  process.exit(0);
}

function connectSocket() {
  return new Promise((resolve, reject) => {
    socket = io(TEST_CONFIG.server, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      console.log(`   Socket ID: ${socket.id}`);
      testResults.socketConnection = true;
      resolve();
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection failed:', error.message);
      testResults.socketConnection = false;
      reject(error);
    });

    // Listen for status updates
    socket.on('statusUpdate', (status) => {
      console.log('📊 Status update received:', Object.keys(status).join(', '));
    });

    setTimeout(() => {
      if (!socket.connected) {
        reject(new Error('Connection timeout'));
      }
    }, 10000);
  });
}

function testControllerCommandWithoutAuth() {
  return new Promise((resolve) => {
    const request = {
      type: 'controller_command',
      data: {
        id: "stat",
        function: "getStat"
      }
    };

    console.log('   📤 Sending controller command without token...');
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (!response.success && response.requiresAuth) {
        console.log('   ✅ CORRECT: Controller command blocked without authentication');
        console.log(`   📋 Error message: "${response.error}"`);
        testResults.controllerBlocked = true;
      } else {
        console.log('   ❌ WRONG: Controller command should require auth but didn\'t');
        console.log('   📋 Response:', JSON.stringify(response, null, 2));
        testResults.controllerBlocked = false;
      }
      resolve();
    });

    setTimeout(() => {
      console.log('   ⏰ Timeout - no response received');
      testResults.controllerBlocked = false;
      resolve();
    }, 5000);
  });
}

function testValidLocationAuth() {
  return new Promise((resolve) => {
    const request = {
      type: 'auth_location',
      location: TEST_CONFIG.validLocation
    };

    console.log(`   📍 Testing with coordinates: ${TEST_CONFIG.validLocation.latitude}, ${TEST_CONFIG.validLocation.longitude}`);
    console.log('   🏠 These should be WITHIN 500m of home');
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (response.success && response.data && response.data.token) {
        console.log('   ✅ SUCCESS: Location authentication worked!');
        console.log(`   🎫 Token received: ${response.data.token.substring(0, 20)}...`);
        console.log(`   👤 User type: ${response.data.userType || 'unknown'}`);
        
        currentToken = response.data.token;
        testResults.validLocationAuth = true;
      } else {
        console.log('   ❌ FAILED: Location authentication should work with home coordinates');
        console.log('   📋 Error:', response.error || 'No token received');
        console.log('   📋 Full response:', JSON.stringify(response, null, 2));
        testResults.validLocationAuth = false;
      }
      resolve();
    });

    setTimeout(() => {
      console.log('   ⏰ Timeout - no response received');
      testResults.validLocationAuth = false;
      resolve();
    }, 5000);
  });
}

function testControllerCommandWithAuth() {
  return new Promise((resolve) => {
    if (!currentToken) {
      console.log('   ⚠️ SKIPPED: No valid token available');
      testResults.controllerWithAuth = false;
      resolve();
      return;
    }

    const request = {
      type: 'controller_command',
      token: currentToken,
      data: {
        id: "stat", 
        function: "getStat"
      }
    };

    console.log('   📤 Sending controller command WITH token...');
    console.log(`   🎫 Using token: ${currentToken.substring(0, 20)}...`);
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (response.success) {
        console.log('   ✅ SUCCESS: Authenticated controller command worked!');
        console.log('   📋 Response data keys:', Object.keys(response.data || {}).join(', '));
        testResults.controllerWithAuth = true;
      } else {
        console.log('   ❌ FAILED: Authenticated controller command failed');
        console.log('   📋 Error:', response.error || 'Unknown error');
        console.log('   📋 Full response:', JSON.stringify(response, null, 2));
        testResults.controllerWithAuth = false;
      }
      resolve();
    });

    setTimeout(() => {
      console.log('   ⏰ Timeout - no response received (controller commands can take 10-15 seconds)');
      testResults.controllerWithAuth = false;
      resolve();
    }, 15000);
  });
}

function testInvalidLocationAuth() {
  return new Promise((resolve) => {
    const request = {
      type: 'auth_location',
      location: TEST_CONFIG.invalidLocation
    };

    console.log(`   📍 Testing with coordinates: ${TEST_CONFIG.invalidLocation.latitude}, ${TEST_CONFIG.invalidLocation.longitude}`);
    console.log('   🌆 These should be TOO FAR from home (Helsinki)');
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (!response.success && response.error && response.error.includes('too far')) {
        console.log('   ✅ CORRECT: Location authentication correctly rejected distant location');
        console.log(`   📋 Error message: "${response.error}"`);
        testResults.invalidLocationAuth = true;
      } else if (!response.success) {
        console.log('   ✅ CORRECT: Location authentication rejected (different error)');
        console.log(`   📋 Error message: "${response.error}"`);
        testResults.invalidLocationAuth = true;
      } else {
        console.log('   ❌ WRONG: Location authentication should reject distant location');
        console.log('   📋 Response:', JSON.stringify(response, null, 2));
        testResults.invalidLocationAuth = false;
      }
      resolve();
    });

    setTimeout(() => {
      console.log('   ⏰ Timeout - no response received');
      testResults.invalidLocationAuth = false;
      resolve();
    }, 5000);
  });
}

function testPasswordAuth() {
  return new Promise((resolve) => {
    const request = {
      type: 'auth_password',
      password: TEST_CONFIG.password
    };

    console.log(`   🔑 Testing password authentication with: "${TEST_CONFIG.password}"`);
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (response.success && response.data && response.data.token) {
        console.log('   ✅ SUCCESS: Password authentication worked!');
        console.log(`   🎫 New token received: ${response.data.token.substring(0, 20)}...`);
        console.log(`   👤 User type: ${response.data.userType || 'unknown'}`);
        
        currentToken = response.data.token;
        testResults.passwordAuth = true;
      } else {
        console.log('   ❌ FAILED: Password authentication failed');
        console.log('   📋 Error:', response.error || 'No token received');
        console.log('   📋 Full response:', JSON.stringify(response, null, 2));
        testResults.passwordAuth = false;
      }
      resolve();
    });

    setTimeout(() => {
      console.log('   ⏰ Timeout - no response received');
      testResults.passwordAuth = false;
      resolve();
    }, 5000);
  });
}

function testExpiredToken() {
  return new Promise((resolve) => {
    // Käytä vanhaa/virheellistä tokenia
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJhdXRoZW50aWNhdGVkIjp0cnVlLCJpYXQiOjE2MzA0NTUyMDAsImV4cCI6MTYzMDQ1ODgwMH0.invalid';
    
    const request = {
      type: 'verify_token',
      token: fakeToken
    };

    console.log('   🕐 Testing with expired/invalid token...');
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (!response.success && (response.error.includes('expired') || response.error.includes('invalid'))) {
        console.log('   ✅ CORRECT: Expired token correctly rejected');
        console.log(`   📋 Error message: "${response.error}"`);
        testResults.expiredTokenRejected = true;
      } else if (!response.success) {
        console.log('   ✅ CORRECT: Invalid token rejected (generic error)');
        console.log(`   📋 Error message: "${response.error}"`);
        testResults.expiredTokenRejected = true;
      } else {
        console.log('   ❌ WRONG: Invalid token should be rejected');
        console.log('   📋 Response:', JSON.stringify(response, null, 2));
        testResults.expiredTokenRejected = false;
      }
      resolve();
    });

    setTimeout(() => {
      console.log('   ⏰ Timeout - no response received');
      testResults.expiredTokenRejected = false;
      resolve();
    }, 5000);
  });
}

function testTokenRefresh() {
  return new Promise((resolve) => {
    console.log('   🔄 Testing token refresh by re-authenticating...');
    
    // Uusi autentikointi location:lla
    const request = {
      type: 'auth_location',
      location: TEST_CONFIG.validLocation
    };
    
    socket.emit('request', request);
    
    socket.once('response', (response) => {
      if (response.success && response.data && response.data.token) {
        console.log('   ✅ SUCCESS: Token refresh worked!');
        console.log(`   🎫 New token: ${response.data.token.substring(0, 20)}...`);
        
        // Testaa uutta tokenia heti
        testControllerWithNewToken(response.data.token, resolve);
      } else {
        console.log('   ❌ FAILED: Token refresh failed');
        console.log('   📋 Error:', response.error || 'No token received');
        testResults.tokenRefresh = false;
        resolve();
      }
    });

    setTimeout(() => {
      console.log('   ⏰ Timeout - no response received');
      testResults.tokenRefresh = false;
      resolve();
    }, 5000);
  });
}

function testControllerWithNewToken(token, callback) {
  const request = {
    type: 'controller_command',
    token: token,
    data: {
      id: "stat",
      function: "getStat"
    }
  };

  console.log('   📤 Testing controller command with refreshed token...');
  
  socket.emit('request', request);
  
  socket.once('response', (response) => {
    if (response.success) {
      console.log('   ✅ SUCCESS: Refreshed token works for controller commands!');
      testResults.tokenRefresh = true;
    } else {
      console.log('   ❌ FAILED: Refreshed token doesn\'t work');
      console.log('   📋 Error:', response.error);
      testResults.tokenRefresh = false;
    }
    callback();
  });

  setTimeout(() => {
    console.log('   ⏰ Timeout - no response for refreshed token test (controller commands can take 10-15 seconds)');
    testResults.tokenRefresh = false;
    callback();
  }, 15000);
}

function displayResults() {
  const tests = [
    { name: 'Socket Connection', key: 'socketConnection' },
    { name: 'Controller Blocked (no auth)', key: 'controllerBlocked' },
    { name: 'Valid Location Auth', key: 'validLocationAuth' },
    { name: 'Controller With Auth', key: 'controllerWithAuth' },
    { name: 'Invalid Location Rejected', key: 'invalidLocationAuth' },
    { name: 'Password Auth', key: 'passwordAuth' },
    { name: 'Expired Token Rejected', key: 'expiredTokenRejected' },
    { name: 'Token Refresh', key: 'tokenRefresh' }
  ];

  let passed = 0;
  let total = tests.length;

  tests.forEach(test => {
    const result = testResults[test.key];
    const status = result === true ? '✅ PASS' : result === false ? '❌ FAIL' : '⚠️  SKIP';
    console.log(`${status} ${test.name}`);
    if (result === true) passed++;
  });

  console.log(`\n🏆 SUMMARY: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Authentication system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the authentication configuration.');
  }

  console.log('\n📋 FRONTEND INTEGRATION GUIDE:');
  console.log('1. Always try location authentication first');
  console.log('2. If location fails (too far), fall back to password');
  console.log('3. Store token and use it for controller commands');
  console.log('4. Handle token expiration by re-authenticating');
  console.log('5. Controller commands require valid authentication');
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\nTest interrupted');
  process.exit(0);
});

// Start tests
runComprehensiveTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});