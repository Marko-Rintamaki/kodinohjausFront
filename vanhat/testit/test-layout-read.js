#!/usr/bin/env node

const io = require('socket.io-client');

console.log('🧪 Testing layout READ functionality via kodinohjaus.fi...\n');

// Yhdistä socket.io palvelimeen kodinohjaus.fi:n kautta
const socket = io('https://kodinohjaus.fi');

let testsPassed = 0;
let testsTotal = 0;

socket.on('connect', async () => {
  console.log('✅ Connected to kodinohjaus.fi server');
  
  try {
    // Testi 1: Layout lataus vanhalla dataQuery systeemillä (tuotanto)
    testsTotal++;
    console.log('\n📖 Test 1: Layout load with dataQuery (production system)...');
    
    const loadResult = await new Promise((resolve) => {
      socket.emit('dataQuery', {
        queryType: 'sql_query',
        params: {
          query: 'SELECT layout_name, layout_data, created_at, updated_at FROM layout_settings',
          parameters: []
        }
      }, resolve);
    });
    
    console.log('Load result:', loadResult);
    
    if (loadResult && loadResult.success && loadResult.result && loadResult.result.length > 0) {
      console.log('✅ Layout read successful');
      console.log(`📊 Found ${loadResult.result.length} layout(s):`);
      
      loadResult.result.forEach((layout, index) => {
        console.log(`   ${index + 1}. ${layout.layout_name} (updated: ${layout.updated_at})`);
        try {
          const parsedData = JSON.parse(layout.layout_data);
          console.log(`      Components: ${Object.keys(parsedData).length} keys`);
        } catch (e) {
          console.log(`      Data length: ${layout.layout_data ? layout.layout_data.length : 0} chars`);
        }
      });
      testsPassed++;
    } else if (loadResult && !loadResult.success) {
      console.log('❌ Layout read failed:', loadResult.error || 'SQL query failed');
    } else {
      console.log('❌ Layout read failed: No valid response');
    }
    
    // Testi 2: Vanha dataQuery overview (toimii varmasti)
    testsTotal++;
    console.log('\n🏓 Test 2: DataQuery overview test...');
    
    const overviewResult = await new Promise((resolve) => {
      socket.emit('dataQuery', {
        queryType: 'overview',
        params: { ts: Date.now() }
      }, resolve);
    });
    
    console.log('Overview result keys:', overviewResult ? Object.keys(overviewResult) : 'null');
    
    if (overviewResult && overviewResult.success !== false) {
      console.log('✅ DataQuery overview successful');
      testsPassed++;
    } else {
      console.log('❌ DataQuery overview failed:', overviewResult);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
  
  // Tulokset
  console.log('\n' + '='.repeat(50));
  console.log(`🧪 LAYOUT READ TEST RESULTS: ${testsPassed}/${testsTotal} passed`);
  console.log('='.repeat(50));
  
  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed! Layout read functionality works via kodinohjaus.fi!');
  } else {
    console.log('⚠️  Some tests failed. Check the results above.');
  }
  
  process.exit(testsPassed === testsTotal ? 0 : 1);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
});

// Timeout
setTimeout(() => {
  console.error('⏰ Test timeout - server not responding');
  process.exit(1);
}, 15000);