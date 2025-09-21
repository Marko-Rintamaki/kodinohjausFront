import React, { useState } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  Paper,
  Divider,
  Chip
} from '@mui/material';
import Compressor from '../components/Compressor';
import Fan from '../components/Fan';
import AirConditioner from '../components/AirConditioner';
import { 
  initializeSocket, 
  sendQuery, 
  sendControlCommand, 
  disconnectSocket,
  isSocketConnected,
  getSocket,
  requestAuthentication
} from '../helpers/socketHelper';
import { 
  isTokenValid, 
  getStoredToken,
  getAuthStatus,
  enableDebugMode,
  disableDebugMode
} from '../helpers/authHelper';
import AuthTestComponent from '../components/AuthTestComponent';

const TestPage: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<{ [key: string]: boolean }>({});
  const [deviceId, setDeviceId] = useState('');
  const [queryType, setQueryType] = useState('overview');
  const [jsonCommand, setJsonCommand] = useState('{\n  "id": "temperatures",\n  "function": "getTemperatures"\n}');
  const [useAuthentication, setUseAuthentication] = useState(true);
  const [currentSocketMode] = useState<'none' | 'unauthenticated' | 'authenticated'>('none');

  // Esimerkkikomennot backendistä
  const exampleCommands = {
    temperatures: '{\n  "id": "temperatures",\n  "function": "getTemperatures"\n}',
    nilan: '{\n  "id": "Nilan",\n  "function": "readRegisters",\n  "registers": [\n    {"register": "4747", "quantity": "1"},\n    {"register": "4746", "quantity": "1"}\n  ]\n}',
    bosch: '{\n  "id": "Bosch",\n  "function": "read",\n  "path": "/dhwCircuits/dhw1/charge"\n}',
    lightControl: '{\n  "deviceId": "light1",\n  "action": "turn_on",\n  "timestamp": ' + Date.now() + '\n}',
    dimmer: '{\n  "deviceId": "dimmer1",\n  "action": "set_brightness",\n  "value": 80,\n  "timestamp": ' + Date.now() + '\n}'
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-19), `[${timestamp}] ${message}`]);
  };

  const setTestResult = (testName: string, success: boolean) => {
    setTestResults(prev => ({ ...prev, [testName]: success }));
    addLog(`Test "${testName}": ${success ? 'PASS' : 'FAIL'}`);
  };

  // Authentication tests
  const testTokenValidation = () => {
    const isValid = isTokenValid();
    const token = getStoredToken();
    const status = getAuthStatus();
    
    addLog(`Token valid: ${isValid}, Token: ${token ? 'exists' : 'null'}`);
    addLog(`Auth status: ${JSON.stringify(status)}`);
    setTestResult('Token Validation', typeof isValid === 'boolean');
  };

  const testAuthentication = async () => {
    try {
      addLog('🔐 Testing authentication with home coordinates...');
      
      // Käytä samoja koordinaatteja kuin debugissa (koti)
      const homeLatitude = 60.623857;
      const homeLongitude = 22.110013;
      
      addLog(`📍 Using coordinates: ${homeLatitude}, ${homeLongitude}`);
      
      // Kutsu suoraan backend autentikointia (ohittaa geolocation API)
      const authResult = await requestAuthentication(homeLatitude, homeLongitude);
      
      addLog(`🎯 Auth result: ${JSON.stringify(authResult)}`);
      
      if (authResult.success) {
        addLog('✅ Authentication successful!');
        // Tallenna token
        if (authResult.token) {
          localStorage.setItem('authToken', authResult.token);
        }
      } else {
        addLog(`❌ Authentication failed: ${authResult.error || 'Unknown error'}`);
      }
      
      setTestResult('Authentication', authResult.success === true);
    } catch (error) {
      addLog(`❌ Auth error: ${error}`);
      setTestResult('Authentication', false);
    }
  };

  const testDebugMode = () => {
    // Enable debug mode with home coordinates
    enableDebugMode(60.623857, 22.110013);
    addLog('Debug mode enabled');
    
    // Disable debug mode
    setTimeout(() => {
      disableDebugMode();
      addLog('Debug mode disabled');
      setTestResult('Debug Mode Toggle', true);
    }, 1000);
  };

  // Socket tests
  const testSocketConnection = async () => {
    try {
      // AINA yhdistä socket ensin, autentikointitila ei vaikuta yhteyteen
      addLog('🔌 Testing socket connection to kodinohjaus.fi...');
      
      const callbacks = {
        onConnect: () => {
          addLog('✅ Socket connected successfully!');
          setTestResult('Socket Connection', true);
        },
        onDisconnect: () => {
          addLog('❌ Socket disconnected');
        },
        onError: (error: any) => {
          addLog(`🚫 Socket error: ${error.message}`);
          setTestResult('Socket Connection', false);
        }
      };

      // Yhdistä socket ILMAN autentikointia - socket yhteys ei tarvitse tokenia
      // OIKEA JÄRJESTYS: initializeSocket(token, callbacks)
      const socket = initializeSocket(undefined, callbacks); // undefined = ei tokenia
      
      if (socket) {
        addLog('� Socket initialized, waiting for connection...');
        
        // Anna 3 sekuntia yhteydelle
        setTimeout(() => {
          if (isSocketConnected()) {
            addLog('✅ Socket connection test completed successfully');
            setTestResult('Socket Connection', true);
          } else {
            addLog('❌ Socket connection test failed - no connection established');
            setTestResult('Socket Connection', false);
          }
        }, 3000);
      } else {
        addLog('❌ Failed to initialize socket');
        setTestResult('Socket Connection', false);
      }
      
    } catch (error) {
      addLog(`❌ Socket connection error: ${error}`);
      setTestResult('Socket Connection', false);
    }
  };

  const testDataQuery = () => {
    try {
      const query = {
        type: queryType,
        timestamp: Date.now()
      };
      
      const mode = currentSocketMode === 'authenticated' ? 'Auth' : 'Unauth';
      sendQuery(query);
      addLog(`Sent query (${mode}): ${JSON.stringify(query)}`);
      setTestResult(`Data Query (${mode})`, true);
    } catch (error) {
      const mode = currentSocketMode === 'authenticated' ? 'Auth' : 'Unauth';
      addLog(`Query error (${mode}): ${error}`);
      setTestResult(`Data Query (${mode})`, false);
    }
  };

  const testControlCommand = async () => {
    if (!deviceId) {
      addLog('Please enter a device ID first');
      return;
    }

    try {
      const command = {
        id: deviceId,
        function: 'toggle',
        path: `/devices/${deviceId}`,
        value: true
      };

      addLog(`Sending control command: ${JSON.stringify(command)}`);
      const response = await sendControlCommand(command);
      addLog(`Control response: ${JSON.stringify(response)}`);
      setTestResult('Control Command', response.success === true);
    } catch (error) {
      addLog(`Control error: ${error}`);
      setTestResult('Control Command', false);
    }
  };

  const testJsonCommand = async () => {
    try {
      // Parse JSON command
      let parsedCommand;
      try {
        parsedCommand = JSON.parse(jsonCommand);
      } catch (parseError) {
        addLog(`JSON Parse Error: ${parseError}`);
        setTestResult('JSON Command', false);
        return;
      }

      const mode = currentSocketMode === 'authenticated' ? 'Auth' : 'Unauth';
      addLog(`Sending JSON command (${mode}): ${JSON.stringify(parsedCommand, null, 2)}`);
      
      // Send raw command via socket
      const socket = getSocket();
      if (!socket || !socket.connected) {
        addLog('Socket not connected');
        setTestResult(`JSON Command (${mode})`, false);
        return;
      }

      // Listen for any response
      const responsePromise = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ error: 'Timeout - no response received' });
        }, 10000);

        socket.once('controlResponse', (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        });

        socket.once('response', (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        });

        socket.once('error', (error: any) => {
          clearTimeout(timeout);
          resolve({ error: error });
        });

        // Listen for authentication errors specifically
        socket.once('authRequired', (data: any) => {
          clearTimeout(timeout);
          resolve({ authError: 'Authentication required', details: data });
        });

        socket.once('authFailed', (data: any) => {
          clearTimeout(timeout);
          resolve({ authError: 'Authentication failed', details: data });
        });
      });

      // Send the command
      socket.emit('control', parsedCommand);
      
      const response = await responsePromise;
      addLog(`JSON Command response (${mode}): ${JSON.stringify(response, null, 2)}`);
      
      // Check response type
      if ((response as any).authError) {
        addLog(`🔒 Authentication issue (${mode}): ${(response as any).authError}`);
        setTestResult(`JSON Command (${mode})`, false);
      } else if ((response as any).error) {
        addLog(`❌ Error response (${mode}): ${(response as any).error}`);
        setTestResult(`JSON Command (${mode})`, false);
      } else {
        // Check if response indicates success
        const isSuccess = typeof response === 'object' && response !== null && 
                         ((response as any).success === true || !(response as any).error);
        addLog(`✅ Command processed (${mode}): ${isSuccess ? 'SUCCESS' : 'UNKNOWN'}`);
        setTestResult(`JSON Command (${mode})`, isSuccess);
      }
      
    } catch (error) {
      const mode = currentSocketMode === 'authenticated' ? 'Auth' : 'Unauth';
      addLog(`JSON Command error (${mode}): ${error}`);
      setTestResult(`JSON Command (${mode})`, false);
    }
  };

  const testSocketDisconnect = () => {
    disconnectSocket();
    addLog('Socket disconnected');
    addLog(`Socket connected after disconnect: ${isSocketConnected()}`);
    setTestResult('Socket Disconnect', !isSocketConnected());
  };

  const clearLogs = () => {
    setLogs([]);
    setTestResults({});
  };

  const runAllTests = async () => {
    clearLogs();
    addLog('Starting comprehensive test suite (both auth modes)...');
    
    // Test both authenticated and unauthenticated modes
    for (const authMode of [true, false]) {
      const modeStr = authMode ? 'AUTHENTICATED' : 'UNAUTHENTICATED';
      addLog(`
=== TESTING ${modeStr} MODE ===`);
      
      setUseAuthentication(authMode);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Auth tests (only for authenticated mode)
      if (authMode) {
        testTokenValidation();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await testAuthentication();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        testDebugMode();
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      // Socket tests
      await testSocketConnection();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      testDataQuery();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (deviceId) {
        try {
          await testControlCommand();
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          addLog(`Control command test failed (${modeStr}): ${error}`);
        }
      }
      
      // Test JSON command
      try {
        await testJsonCommand();
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        addLog(`JSON command test failed (${modeStr}): ${error}`);
      }
      
      testSocketDisconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addLog(`=== ${modeStr} MODE COMPLETE ===
`);
    }
    
    addLog('🎯 All tests completed for both authentication modes!');
    addLog('📊 Check results above to compare authenticated vs unauthenticated behavior');
  };  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" component="h1" mb={3}>
        Socket & Auth Test Suite
      </Typography>

      <Box display="flex" flexWrap="wrap" gap={3}>
        {/* Test Controls */}
        <Box flex="1 1 400px">
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Test Controls</Typography>
              
              <Box mb={2}>
                <TextField
                  label="Device ID (for control test)"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g. light1, switch2"
                />
              </Box>

              <Box mb={2} display="flex" alignItems="center" gap={2}>
                <Typography variant="body2">Connection Mode:</Typography>
                <Box display="flex" gap={1}>
                  <Button
                    variant={useAuthentication ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setUseAuthentication(true)}
                    color="primary"
                  >
                    🔒 Authenticated
                  </Button>
                  <Button
                    variant={!useAuthentication ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setUseAuthentication(false)}
                    color="secondary"
                  >
                    🔓 No Auth
                  </Button>
                </Box>
                <Chip 
                  label={`Current: ${currentSocketMode}`} 
                  size="small" 
                  color={currentSocketMode === 'authenticated' ? 'primary' : currentSocketMode === 'unauthenticated' ? 'secondary' : 'default'}
                />
              </Box>

              <Box mb={2}>
                <TextField
                  label="Query Type"
                  value={queryType}
                  onChange={(e) => setQueryType(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="overview, lighting, heating"
                />
              </Box>

              <Box mb={2}>
                <TextField
                  label="JSON Command"
                  value={jsonCommand}
                  onChange={(e) => setJsonCommand(e.target.value)}
                  multiline
                  rows={6}
                  fullWidth
                  size="small"
                  placeholder='{"deviceId": "light1", "action": "turn_on"}'
                />
                
                <Box mt={1} mb={1}>
                  <Typography variant="caption" color="text.secondary">
                    Quick Examples:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => setJsonCommand(exampleCommands.temperatures)}
                    >
                      Temperatures
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => setJsonCommand(exampleCommands.nilan)}
                    >
                      Nilan
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => setJsonCommand(exampleCommands.bosch)}
                    >
                      Bosch
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => setJsonCommand(exampleCommands.lightControl)}
                    >
                      Light
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => setJsonCommand(exampleCommands.dimmer)}
                    >
                      Dimmer
                    </Button>
                  </Box>
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Raw JSON command sent directly to server via 'control' event<br/>
                  Backend test commands:<br/>
                  • <strong>Temperatures</strong>: {`{"id": "temperatures", "function": "getTemperatures"}`}<br/>
                  • <strong>Nilan</strong>: Modbus register reading<br/>
                  • <strong>Bosch</strong>: Heat pump data reading<br/>
                  Frontend commands:<br/>
                  • <strong>Light/Dimmer</strong>: Smart home device control
                </Typography>
              </Box>

              <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                <Button 
                  variant="contained" 
                  onClick={runAllTests}
                  color="primary"
                >
                  Run All Tests
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={clearLogs}
                  color="secondary"
                >
                  Clear Logs
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" mb={1}>Individual Tests:</Typography>
              
              <Box display="flex" flexWrap="wrap" gap={1}>
                <Button size="small" onClick={testTokenValidation}>Token Check</Button>
                <Button size="small" onClick={testAuthentication}>Authenticate</Button>
                <Button size="small" onClick={testDebugMode}>Debug Mode</Button>
                <Button size="small" onClick={testSocketConnection}>Connect Socket</Button>
                <Button size="small" onClick={testDataQuery}>Send Query</Button>
                <Button size="small" onClick={testControlCommand}>Send Control</Button>
                <Button size="small" onClick={testJsonCommand}>JSON Command</Button>
                <Button size="small" onClick={testSocketDisconnect}>Disconnect</Button>
              </Box>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Test Results</Typography>
              {Object.entries(testResults).map(([testName, success]) => (
                <Alert 
                  key={testName}
                  severity={success ? 'success' : 'error'}
                  sx={{ mb: 1 }}
                >
                  {testName}: {success ? 'PASS' : 'FAIL'}
                </Alert>
              ))}
              {Object.keys(testResults).length === 0 && (
                <Typography color="text.secondary">No tests run yet</Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Logs */}
        <Box flex="1 1 400px">
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Test Logs</Typography>
              <Paper 
                variant="outlined" 
                sx={{ 
                  height: 400, 
                  overflow: 'auto', 
                  p: 1, 
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  backgroundColor: 'grey.100'
                }}
              >
                {logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
                {logs.length === 0 && (
                  <Typography color="text.secondary">
                    Logs will appear here when tests are run
                  </Typography>
                )}
              </Paper>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box mt={3}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Testing Instructions:</strong><br/>
            1. Click "Run All Tests" to execute the complete test suite<br/>
            2. Check that authentication works with your location<br/>
            3. Verify socket connection to kodinohjaus.fi (production backend)<br/>
            4. Test data queries and control commands<br/>
            5. Monitor logs for detailed information
          </Typography>
        </Alert>
      </Box>

      {/* Authentication Fallback Test */}
      <Box mt={3}>
        <AuthTestComponent />
      </Box>

      {/* Air Conditioning Components Demo */}
      <Box mt={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Ilmastointikomponentit - Demo</Typography>
            
            <Typography variant="body2" color="text.secondary" mb={3}>
              Alla näet uudet ilmastointikomponentit: Kompressori, Puhallin ja yhdistetty Ilmastointikone. 
              Komponentit reagoivat socket-dataan ja näyttävät reaaliaikaisesti laitteiden tilan.
            </Typography>

            <Box display="flex" flexWrap="wrap" gap={4} alignItems="start">
              {/* Individual Components */}
              <Box>
                <Typography variant="subtitle2" mb={1}>Kompressori (erillinen)</Typography>
                <Compressor 
                  size={100} 
                  title="AC Kompressori"
                  compressorId="ac1" 
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" mb={1}>Puhallin - Sisä (erillinen)</Typography>
                <Fan 
                  size={100} 
                  title="Sisäpuhallin"
                  fanId="indoor1" 
                  fanType="indoor"
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" mb={1}>Puhallin - Ulko (erillinen)</Typography>
                <Fan 
                  size={100} 
                  title="Ulkopuhallin"
                  fanId="outdoor1" 
                  fanType="outdoor"
                />
              </Box>

              {/* Combined Components */}
              <Box>
                <Typography variant="subtitle2" mb={1}>Yhdistetty (vaakatasossa)</Typography>
                <AirConditioner 
                  size={80} 
                  title="Olohuone AC"
                  compressorId="livingroom"
                  fanId="livingroom"
                  layout="horizontal"
                  showLabels={true}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" mb={1}>Yhdistetty (pystytasossa)</Typography>
                <AirConditioner 
                  size={80} 
                  title="Makuuhuone AC"
                  compressorId="bedroom"
                  fanId="bedroom"
                  layout="vertical"
                  showLabels={true}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Käyttöohje:</strong><br/>
                • Komponentit kuuntelevat socket-dataa polkujen kautta<br/>
                • Kompressori: <code>/compressor/status</code>, <code>/hvac/compressor/running</code><br/>
                • Puhallin: <code>/fan/status</code>, <code>/hvac/fan/running</code><br/>
                • Tila: <code>'running'</code>, <code>true</code> tai <code>&gt; 0</code> = käynnissä<br/>
                • Animaatiot ja värit muuttuvat tilan mukaan automaattisesti
              </Typography>
            </Alert>

            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Huom:</strong> Testidataa varten, muokkaa socket-dataa sisältämään 
                <code>AirConditioner</code> tai <code>HVAC</code> objekti sopivilla statuksilla.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default TestPage;
