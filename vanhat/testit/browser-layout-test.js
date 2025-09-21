// Yksinkertainen testi uudelle layout tallennukselle
// Tämä voidaan ajaa selaimen konsolissa kodinohjaus.fi sivulla

console.log('🧪 Testing new layout save system...');

// Tarkista että sendRequest funktio on saatavilla
if (typeof sendRequest !== 'undefined') {
  console.log('✅ sendRequest function available');
  
  // Testaa yksinkertainen ping
  sendRequest('ping', {})
    .then(result => {
      console.log('🏓 Ping result:', result);
      
      if (result.success) {
        console.log('✅ New request system works!');
        
        // Testaa layout luku ilman autentikointia
        return sendRequest('sql_query', {
          sql: 'SELECT COUNT(*) as layout_count FROM layout_settings',
          params: []
        });
      }
    })
    .then(result => {
      if (result && result.success) {
        console.log('📊 Layout count query result:', result);
        console.log('🎉 Layout reading works with new system!');
      } else {
        console.log('❌ Layout query failed:', result);
      }
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
    });
    
} else {
  console.log('❌ sendRequest function not available');
  console.log('💡 Make sure you are on a page that has loaded the socketHelper with sendRequest');
}