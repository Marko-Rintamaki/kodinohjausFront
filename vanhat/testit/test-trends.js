const io = require('socket.io-client');

/**
 * Testaa TrendService:n kaikki kyselyt
 */

const SERVER_URL = 'https://kodinohjaus.fi';
const TEST_LOCATION = { latitude: 60.623857, longitude: 22.110013 };
const TEST_PASSWORD = 'koti2025';

// Date formatting (sama kuin frontendissä)
function formatDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

// Luo testidatat (viimeiset 7 päivää)
function createTestParams() {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 päivää taaksepäin
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    maxRows: 500
  };
}

class TrendTester {
  constructor() {
    this.socket = null;
    this.token = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to server...');
      this.socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        timeout: 5000
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection failed:', error.message);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Disconnected from server');
      });
    });
  }

  async authenticate() {
    return new Promise((resolve, reject) => {
      console.log('🔐 Authenticating with location...');
      
      const authData = {
        type: 'authenticate',
        location: TEST_LOCATION
      };

      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 5000);

      this.socket.emit('request', authData, (response) => {
        clearTimeout(timeout);
        if (response.success && response.token) {
          this.token = response.token;
          console.log('✅ Authentication successful');
          resolve(response);
        } else {
          console.log('🔐 Location auth failed, trying password...');
          
          const passwordAuth = {
            type: 'authenticate',
            password: TEST_PASSWORD
          };

          this.socket.emit('request', passwordAuth, (response) => {
            clearTimeout(timeout);
            if (response.success && response.token) {
              this.token = response.token;
              console.log('✅ Password authentication successful');
              resolve(response);
            } else {
              console.error('❌ Authentication failed:', response.error);
              reject(new Error(response.error || 'Authentication failed'));
            }
          });
        }
      });
    });
  }

  async testTrendQuery(queryType, params) {
    return new Promise((resolve, reject) => {
      console.log(`\n📊 Testing ${queryType}...`);
      console.log('Parameters:', params);

      const request = {
        type: 'trend_query',
        token: this.token,
        data: {
          queryType: queryType,
          params: params
        }
      };

      const startTime = Date.now();

      this.socket.emit('request', request, (response) => {
        const duration = Date.now() - startTime;
        
        if (response.success) {
          console.log(`✅ ${queryType} SUCCESS (${duration}ms)`);
          console.log(`   Results: ${response.data?.results?.length || 0} rows`);
          console.log(`   Query type: ${response.data?.queryType}`);
          
          if (response.data?.metadata) {
            console.log(`   Metadata:`, response.data.metadata);
          }

          // Näytä muutama ensimmäinen rivi
          if (response.data?.results && response.data.results.length > 0) {
            console.log(`   Sample data (first 2 rows):`);
            response.data.results.slice(0, 2).forEach((row, i) => {
              console.log(`     Row ${i + 1}:`, JSON.stringify(row));
            });
          }
          
          resolve(response);
        } else {
          console.error(`❌ ${queryType} FAILED (${duration}ms):`, response.error);
          reject(new Error(response.error || `${queryType} failed`));
        }
      });
    });
  }

  async runAllTests() {
    const params = createTestParams();
    console.log('\n🧪 Starting trend tests...');
    console.log('Test period:', params);

    const tests = [
      'nilan_trend',
      'electricity_total_trend', 
      'electricity_breakdown_trend'
    ];

    let passed = 0;
    let failed = 0;

    for (const queryType of tests) {
      try {
        await this.testTrendQuery(queryType, params);
        passed++;
      } catch (error) {
        console.error(`💥 Test ${queryType} failed:`, error.message);
        failed++;
      }
    }

    console.log('\n📈 Test Summary:');
    console.log(`✅ Passed: ${passed}/${tests.length}`);
    console.log(`❌ Failed: ${failed}/${tests.length}`);

    return { passed, failed, total: tests.length };
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

async function main() {
  const tester = new TrendTester();
  
  try {
    await tester.connect();
    await tester.authenticate();
    const results = await tester.runAllTests();
    
    if (results.failed === 0) {
      console.log('\n🎉 All trend tests passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Some tests failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Test runner failed:', error.message);
    process.exit(1);
  } finally {
    tester.disconnect();
  }
}

main();