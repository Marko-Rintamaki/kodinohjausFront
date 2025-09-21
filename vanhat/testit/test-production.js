#!/usr/bin/env node

const io = require('socket.io-client');

console.log('🧪 Testing what works on production kodinohjaus.fi...\n');

const socket = io('https://kodinohjaus.fi');

socket.on('connect', async () => {
  console.log('✅ Connected to kodinohjaus.fi server');
  console.log(`   Socket ID: ${socket.id}`);
  
  // Testi 1: Overview (vanha systeemi - pitäisi toimia)
  console.log('\n📊 Test 1: Overview dataQuery (old system)...');
  
  socket.emit('dataQuery', {
    queryType: 'overview',
    params: { ts: Date.now() }
  }, (response) => {
    console.log('📋 Overview response:', response ? Object.keys(response) : 'null');
    
    // Testi 2: Yritä sql_query (uusi systeemi - ei pitäisi toimia)
    console.log('\n💾 Test 2: sql_query dataQuery (new system - should fail)...');
    
    socket.emit('dataQuery', {
      queryType: 'sql_query',
      params: {
        query: 'SELECT COUNT(*) as test_count FROM layout_settings',
        parameters: []
      }
    }, (response) => {
      console.log('📋 SQL query response:', response);
      
      // Testi 3: Yritä uusi request event (ei pitäisi toimia)
      console.log('\n🔧 Test 3: New request event (should not work)...');
      
      socket.emit('request', {
        requestType: 'ping'
      }, (response) => {
        console.log('📋 Request response:', response);
        
        console.log('\n=== PRODUCTION ANALYSIS ===');
        console.log('Overview works: Old backend is running');
        console.log('SQL query result tells us what backend supports');
        console.log('Request event tells us if new backend is deployed');
        
        process.exit(0);
      });
      
      // Timeout jos ei vastaa
      setTimeout(() => {
        console.log('⏰ Request event timeout - old backend confirmed');
        process.exit(0);
      }, 5000);
    });
  });
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('⏰ Overall timeout');
  process.exit(1);
}, 15000);