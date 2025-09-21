#!/usr/bin/env node

const io = require('socket.io-client');

console.log('🧪 Testing NEW backend request system directly...\n');

const socket = io('https://kodinohjaus.fi');

socket.on('connect', () => {
  console.log('✅ Connected - testing new backend');
  
  socket.on('response', (data) => {
    console.log('📨 Response:', data);
  });
  
  // Testi 1: Ping
  console.log('\n🏓 Test 1: Ping request...');
  socket.emit('request', {
    type: 'ping'
  });
  
  setTimeout(() => {
    // Testi 2: SQL Query ilman auth
    console.log('\n💾 Test 2: SQL query without auth...');
    socket.emit('request', {
      type: 'sql_query',
      data: {
        sql: 'SELECT COUNT(*) as layout_count FROM layout_settings',
        params: []
      }
    });
  }, 2000);
  
  setTimeout(() => {
    // Testi 3: Autentikoi ensin
    console.log('\n🔐 Test 3: Authenticate first...');
    socket.emit('request', {
      type: 'auth_location',
      location: { latitude: 60.623857, longitude: 22.110013 }
    });
  }, 4000);
  
  setTimeout(() => {
    process.exit(0);
  }, 8000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
});