#!/usr/bin/env node

const io = require('socket.io-client');

console.log('🧪 Testing production backend capabilities...\n');

const socket = io('https://kodinohjaus.fi');

socket.on('connect', () => {
  console.log('✅ Connected to production server');
  console.log(`   Socket ID: ${socket.id}`);
  
  // Kuuntele erilaisia vastaustyyppejä
  socket.on('dataQueryResponse', (data) => {
    console.log('📨 dataQueryResponse:', Object.keys(data || {}));
  });
  
  socket.on('response', (data) => {
    console.log('📨 response event:', Object.keys(data || {}));
  });
  
  socket.on('statusUpdate', (data) => {
    console.log('📊 statusUpdate:', Object.keys(data || {}));
  });
  
  // Testi 1: Lähetä overview dataQuery
  console.log('\n📊 Sending overview dataQuery...');
  socket.emit('dataQuery', {
    queryType: 'overview',
    params: { ts: Date.now() }
  });
  
  setTimeout(() => {
    // Testi 2: Lähetä sql_query 
    console.log('\n💾 Sending sql_query dataQuery...');
    socket.emit('dataQuery', {
      queryType: 'sql_query',
      params: {
        query: 'SELECT 1 as test',
        parameters: []
      }
    });
  }, 3000);
  
  setTimeout(() => {
    // Testi 3: Lähetä request event
    console.log('\n🔧 Sending request event...');
    socket.emit('request', {
      requestType: 'ping'
    });
  }, 6000);
  
  setTimeout(() => {
    console.log('\n=== TIMEOUT - ENDING TEST ===');
    process.exit(0);
  }, 10000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
});