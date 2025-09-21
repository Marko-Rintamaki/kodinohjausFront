const { io } = require('socket.io-client');

const socket = io('https://kodinohjaus.fi');

socket.on('connect', () => {
  console.log('✅ Connected to server');
  
  let testsCompleted = 0;
  const totalTests = 3;
  const results = {};
  
  const queries = [
    { name: 'Nilan Trend', type: 'nilan_trend' },
    { name: 'Electricity Total', type: 'electricity_total_trend' },  
    { name: 'Electricity Breakdown', type: 'electricity_breakdown_trend' }
  ];
  
  console.log('📊 Testing all 3 trend queries...\n');
  
  queries.forEach((query, index) => {
    const request = {
      type: 'trend_query',
      data: {
        queryType: query.type,
        params: {
          startDate: '2025-09-19 00:00:00',
          endDate: '2025-09-20 23:59:59',
          maxRows: 50
        }
      }
    };
    
    console.log(`${index + 1}. Testing ${query.name}...`);
    
    socket.emit('request', request);
    
    socket.once(`response_${query.type}`, (response) => {
      testsCompleted++;
      
      if (response.success) {
        console.log(`✅ ${query.name} SUCCESS`);
        console.log(`   Results: ${response.data?.results?.length || 0} rows`);
        console.log(`   Metadata: ${JSON.stringify(response.data?.metadata)}`);
        results[query.type] = true;
      } else {
        console.log(`❌ ${query.name} FAILED: ${response.error}`);
        results[query.type] = false;
      }
      
      if (testsCompleted === totalTests) {
        console.log('\n📈 SUMMARY:');
        Object.keys(results).forEach(type => {
          const status = results[type] ? '✅' : '❌';
          console.log(`${status} ${type}`);
        });
        
        const passed = Object.values(results).filter(Boolean).length;
        console.log(`\n🏆 ${passed}/${totalTests} tests passed`);
        socket.disconnect();
      }
    });
  });

  setTimeout(() => {
    console.log('⏰ Timeout - no response received');
    socket.disconnect();
  }, 10000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
});