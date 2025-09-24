const { io } = require('socket.io-client');

console.log('🔍 Debugging Nilan data from get_global_data...');

// Yhdistä socketin
const socket = io('http://localhost:3001', {
  timeout: 5000,
  autoConnect: false
});

socket.on('connect', () => {
  console.log('✅ Socket yhdistetty!');
  
  // Pyydä get_global_data
  socket.emit('request', {
    type: 'get_global_data'
  });
});

socket.on('response', (response) => {
  console.log('📦 Response saatu:', response.success ? '✅ Onnistui' : '❌ Epäonnistui');
  
  if (response.success && response.data) {
    console.log('\n🔍 Nilan data analysis:');
    
    if (response.data.Nilan && Array.isArray(response.data.Nilan)) {
      console.log('✅ Nilan array löytyi, pituus:', response.data.Nilan.length);
      
      response.data.Nilan.forEach((nilanGroup, index) => {
        console.log(`\n[${index}] Nilan group:`, JSON.stringify(nilanGroup, null, 2));
        
        if (nilanGroup.registers && Array.isArray(nilanGroup.registers)) {
          console.log(`  📊 Registers (${nilanGroup.registers.length} kpl):`);
          
          // Etsi rekisteri 4747
          const register4747 = nilanGroup.registers.find(reg => reg.register === "4747");
          if (register4747) {
            console.log('🎯 LÖYDETTY register 4747:', register4747);
          } else {
            console.log('❌ Register 4747 ei löytynyt');
            console.log('   Saatavilla registers:', nilanGroup.registers.map(r => r.register).sort());
          }
        } else {
          console.log('  ❌ Ei registers array:ta');
        }
      });
    } else {
      console.log('❌ Nilan data puuttuu tai ei ole array');
      console.log('   Data keys:', Object.keys(response.data));
    }
  } else {
    console.log('❌ Ei dataa tai epäonnistui:', response);
  }
  
  socket.disconnect();
  process.exit(0);
});

socket.on('disconnect', () => {
  console.log('👋 Socket katkaisi');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
  process.exit(1);
});

// Yhdistä
socket.connect();