import io from 'socket.io-client';

console.log('🔍 Debug Temperature Modal Issue');
console.log('=====================================');

// Connect to the backend
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('✅ Connected to backend');
  
  // Test SQL query using new request format
  const testQuery = {
    type: 'sql_query',
    data: {
      sql: 'SELECT * FROM ifserver.roomsetpointtemp ORDER BY idroomsetpointtemp DESC LIMIT 1;',
      params: []
    },
    token: 'test-token'  // You might need to replace this with actual token
  };
  
  console.log('📤 Sending test query:', testQuery);
  
  socket.once('response', (response) => {
    console.log('📥 Response received:', response);
    
    if (response && response.success) {
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ Data found:', response.data[0]);
      } else {
        console.log('⚠️  No data in expected format');
      }
    } else {
      console.log('❌ Query failed:', response.error);
    }
    
    socket.disconnect();
  });
  
  socket.emit('request', testQuery);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from backend');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});