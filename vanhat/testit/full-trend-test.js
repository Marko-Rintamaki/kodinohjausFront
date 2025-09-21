const { io } = require('socket.io-client');

const socket = io('https://kodinohjaus.fi');

const queries = [
  { name: 'Nilan Trend', type: 'nilan_trend' },
  { name: 'Electricity Total', type: 'electricity_total_trend' },  
  { name: 'Electricity Breakdown', type: 'electricity_breakdown_trend' }
];

let currentTest = 0;
const results = {};

function runNextTest() {
  if (currentTest >= queries.length) {
    console.log('\n📈 FINAL RESULTS:');
    console.log('================');
    
    let passed = 0;
    queries.forEach(query => {
      const status = results[query.type] ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${query.name}`);
      if (results[query.type]) passed++;
    });
    
    console.log(`\n🏆 ${passed}/${queries.length} trend tests passed`);
    
    if (passed === queries.length) {
      console.log('🎉 ALL TREND SERVICES WORKING PERFECTLY!');
    }
    
    socket.disconnect();
    return;
  }
  
  const query = queries[currentTest];
  console.log(`\n${currentTest + 1}. Testing ${query.name}...`);
  
  const request = {
    type: 'trend_query',
    data: {
      queryType: query.type,
      params: {
        startDate: '2025-09-19 00:00:00',
        endDate: '2025-09-20 23:59:59',
        maxRows: 5  // Vähän dataa testiin
      }
    }
  };
  
  socket.emit('request', request);
  
  const timeout = setTimeout(() => {
    console.log(`   ⏰ TIMEOUT: ${query.name}`);
    results[query.type] = false;
    currentTest++;
    runNextTest();
  }, 10000);
  
  socket.once('response', (response) => {
    clearTimeout(timeout);
    
    if (response.success) {
      console.log(`   ✅ SUCCESS: ${response.data?.results?.length || 0} rows`);
      console.log(`   📊 Bucket: ${response.data?.metadata?.bucketMs}ms`);
      console.log(`   📅 Period: ${response.data?.metadata?.intervalDays} days`);
      
      // Näytä muutama sample rivi
      if (response.data?.results?.length > 0) {
        console.log(`   📋 Sample:`, response.data.results[0]);
      }
      
      results[query.type] = true;
    } else {
      console.log(`   ❌ FAILED: ${response.error}`);
      results[query.type] = false;
    }
    
    currentTest++;
    setTimeout(runNextTest, 1000); // 1s välissä testien välillä
  });
}

socket.on('connect', () => {
  console.log('🔌 Connected to server');
  console.log('🧪 Testing all TrendService queries...');
  runNextTest();
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
});