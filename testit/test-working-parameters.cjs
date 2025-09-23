#!/usr/bin/env node

const io = require('socket.io-client');

// TESTATTAVAT PARAMETRIT - Etsitään mikä oikeasti toimii
const WORKING_TESTS = [
    // Lämpötilat (nämä tiedämme toimivan)
    {
        path: '/heatingCircuits/hc1/temperatureLevels/comfort2',
        from: '21.5',
        to: '22.0',
        name: 'Comfort2 temp'
    },
    {
        path: '/dhwCircuits/dhw1/singleChargeSetpoint',
        from: '55',
        to: '50',
        name: 'DHW setpoint'
    },
    
    // Numeeriset arvot
    {
        path: '/heatingCircuits/hc1/fastHeatupFactor',
        from: '0',
        to: '1',
        name: 'Fast heatup'
    },
    {
        path: '/heatingCircuits/hc1/suWiThreshold',
        from: '19',
        to: '20',
        name: 'SuWi threshold'
    },
    {
        path: '/dhwCircuits/dhw1/chargeDuration',
        from: '60',
        to: '30',
        name: 'Charge duration'
    },
    
    // Switch program ja string-arvot
    {
        path: '/heatingCircuits/hc1/activeSwitchProgram',
        from: 'A',
        to: 'B',
        name: 'Switch program'
    },
    {
        path: '/heatingCircuits/hc1/switchProgramMode',
        from: 'levels',
        to: 'absolute',
        name: 'Switch mode'
    },
    {
        path: '/heatingCircuits/hc1/suWiSwitchMode',
        from: 'automatic',
        to: 'manual',
        name: 'SuWi mode'
    }
];

let socket;
let testIndex = 0;
const results = [];

async function connectAndAuth() {
    return new Promise((resolve, reject) => {
        socket = io('https://kodinohjaus.fi', {
            transports: ['websocket']
        });

        socket.on('connect', () => {
            console.log('🔌 Yhdistetty serveriin');
            
            // Autentikointi sijainnilla
            socket.emit('request', {
                type: 'auth_location',
                location: {
                    latitude: 60.623857,
                    longitude: 22.110013
                }
            });
        });

        socket.on('response', (response) => {
            if (response.success && response.data?.token) {
                console.log('🔐 Autentikointi onnistui\n');
                resolve(response.data.token);
            } else {
                reject(new Error('Auth failed'));
            }
        });

        socket.on('connect_error', reject);
    });
}

async function testParameter(test, token) {
    return new Promise((resolve) => {
        console.log(`📝 TESTI ${testIndex + 1}/${WORKING_TESTS.length}: ${test.name}`);
        console.log(`   Polku: ${test.path}`);
        console.log(`   ${test.from} → ${test.to}`);

        let responseCount = 0;
        
        // 1. Lue nykyinen arvo
        socket.emit('request', {
            type: 'controller_command',
            data: {
                id: 'Bosch',
                function: 'read',
                path: test.path
            },
            token: token
        });

        socket.on('response', (response) => {
            responseCount++;
            
            if (responseCount === 1) {
                // Ensimmäinen vastaus - nykyinen arvo
                const currentValue = response.data?.value;
                console.log(`   📖 Nykyinen: ${currentValue}`);
                
                // 2. Yritä muuttaa arvoa
                socket.emit('request', {
                    type: 'controller_command',
                    data: {
                        id: 'Bosch',
                        function: 'write',
                        path: test.path,
                        value: test.to
                    },
                    token: token
                });
                
            } else if (responseCount === 2) {
                // Toinen vastaus - write-operaatio
                console.log(`   ✏️ Write success: ${response.success}`);
                
                // 3. Varmista muutos
                setTimeout(() => {
                    socket.emit('request', {
                        type: 'controller_command',
                        data: {
                            id: 'Bosch',
                            function: 'read',
                            path: test.path
                        },
                        token: token
                    });
                }, 500);
                
            } else if (responseCount === 3) {
                // Kolmas vastaus - varmistus
                const newValue = response.data?.value;
                const success = String(newValue) === String(test.to);
                
                console.log(`   📋 Uusi arvo: ${newValue}`);
                console.log(`   ${success ? '✅ TOIMII!' : '❌ Ei toiminut'}\n`);
                
                results.push({
                    test: test,
                    success: success,
                    oldValue: test.from,
                    newValue: newValue
                });
                
                resolve();
            }
        });
    });
}

async function runTests() {
    try {
        const token = await connectAndAuth();
        
        console.log('🚀 ALOITETAAN PARAMETRITESTIT');
        console.log('================================\n');
        
        for (const test of WORKING_TESTS) {
            await testParameter(test, token);
            testIndex++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Pieni tauko
        }
        
        // Tulokset
        console.log('📊 TESTIEN TULOKSET:');
        console.log('=====================');
        
        const working = results.filter(r => r.success);
        const notWorking = results.filter(r => !r.success);
        
        console.log(`✅ TOIMIVAT (${working.length}/${results.length}):`);
        working.forEach(r => {
            console.log(`   • ${r.test.name}: ${r.test.path}`);
        });
        
        console.log(`\n❌ EI TOIMI (${notWorking.length}/${results.length}):`);
        notWorking.forEach(r => {
            console.log(`   • ${r.test.name}: ${r.test.path}`);
        });
        
        socket.disconnect();
        
    } catch (error) {
        console.error('❌ Virhe:', error.message);
        if (socket) socket.disconnect();
        process.exit(1);
    }
}

runTests();