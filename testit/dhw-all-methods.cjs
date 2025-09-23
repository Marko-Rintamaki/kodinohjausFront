#!/usr/bin/env node

const io = require('socket.io-client');

let socket;
let responseHandler;

async function connectAndAuth() {
    return new Promise((resolve, reject) => {
        socket = io('https://kodinohjaus.fi', {
            transports: ['websocket']
        });

        socket.on('connect', () => {
            console.log('🔌 Yhdistetty serveriin');
            
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
            } else if (responseHandler) {
                responseHandler(response);
            } else {
                reject(new Error('Auth failed'));
            }
        });

        socket.on('connect_error', reject);
    });
}

async function sendCommand(path, value, token) {
    return new Promise((resolve) => {
        responseHandler = resolve;
        
        socket.emit('request', {
            type: 'controller_command',
            data: {
                id: 'Bosch',
                function: value ? 'write' : 'read',
                path: path,
                ...(value && { value: value })
            },
            token: token
        });
    });
}

async function testAllDhwMethods() {
    try {
        console.log('🧪 DHW KAIKKI METODIT TESTI');
        console.log('===========================\n');
        
        const token = await connectAndAuth();
        
        // DHW:n kaikki mahdolliset kirjoitettavat parametrit
        const dhwTests = [
            {
                name: 'operationMode: Off → low',
                path: '/dhwCircuits/dhw1/operationMode',
                value: 'low'
            },
            {
                name: 'operationMode: Off → high',  
                path: '/dhwCircuits/dhw1/operationMode',
                value: 'high'
            },
            {
                name: 'operationMode: Off → ownprogram',
                path: '/dhwCircuits/dhw1/operationMode', 
                value: 'ownprogram'
            },
            {
                name: 'temperatureLevels/high: 55 → 65',
                path: '/dhwCircuits/dhw1/temperatureLevels/high',
                value: '65'
            },
            {
                name: 'temperatureLevels/low: 55 → 45',
                path: '/dhwCircuits/dhw1/temperatureLevels/low', 
                value: '45'
            },
            {
                name: 'singleChargeSetpoint: 50 → 60',
                path: '/dhwCircuits/dhw1/singleChargeSetpoint',
                value: '60'
            },
            {
                name: 'chargeDuration: 15 → 45',
                path: '/dhwCircuits/dhw1/chargeDuration',
                value: '45' 
            },
            {
                name: 'charge: stop → start (FINAL TEST)',
                path: '/dhwCircuits/dhw1/charge',
                value: 'start'
            }
        ];
        
        for (const test of dhwTests) {
            console.log(`🔧 ${test.name}`);
            
            // Lue nykyinen arvo
            const before = await sendCommand(test.path, null, token);
            console.log(`   📖 Ennen: ${before.data?.value}`);
            
            // Kirjoita uusi arvo  
            const writeResult = await sendCommand(test.path, test.value, token);
            console.log(`   ✏️ Write: ${writeResult.success ? 'OK' : 'FAIL'}`);
            
            // Odota hetki
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Tarkista tulos
            const after = await sendCommand(test.path, null, token);
            const success = String(after.data?.value) === String(test.value);
            console.log(`   📋 Jälkeen: ${after.data?.value} ${success ? '✅' : '❌'}`);
            
            if (success) {
                console.log(`   🎉 TOIMII! ${test.name} onnistui`);
                
                // Jos operationMode muuttui, kokeile heti charge:a
                if (test.path.includes('operationMode') && success) {
                    console.log(`\n   🚀 KOKEILLAAN CHARGE HETI:`);
                    const chargeResult = await sendCommand('/dhwCircuits/dhw1/charge', 'start', token);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const chargeCheck = await sendCommand('/dhwCircuits/dhw1/charge', null, token);
                    console.log(`      Charge tulos: ${chargeCheck.data?.value} ${chargeCheck.data?.value === 'start' ? '✅ TOIMII!' : '❌'}`);
                }
            }
            
            console.log();
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        socket.disconnect();
        
    } catch (error) {
        console.error('❌ Virhe:', error.message);
        if (socket) socket.disconnect();
        process.exit(1);
    }
}

testAllDhwMethods();