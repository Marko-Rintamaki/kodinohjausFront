#!/usr/bin/env node

const io = require('socket.io-client');

let socket;

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
            } else {
                reject(new Error('Auth failed'));
            }
        });

        socket.on('connect_error', reject);
    });
}

async function readBoschData() {
    try {
        console.log('📊 BOSCH JÄRJESTELMÄN TILA');
        console.log('==========================\n');
        
        const token = await connectAndAuth();
        
        // Lista mielenkiintoisia luettavia arvoja
        const readPaths = [
            '/dhwCircuits/dhw1/actualTemp',
            '/dhwCircuits/dhw1/status', 
            '/dhwCircuits/dhw1/currentSetpoint',
            '/dhwCircuits/dhw1/operationMode',
            '/heatSources/actualSupplyTemperature',
            '/heatSources/flameStatus',
            '/heatSources/actualModulation',
            '/heatingCircuits/hc1/operationMode',
            '/heatingCircuits/hc1/temperatureLevels/comfort2'
        ];
        
        for (const path of readPaths) {
            await new Promise((resolve) => {
                console.log(`📖 ${path}`);
                
                socket.emit('request', {
                    type: 'controller_command',
                    data: {
                        id: 'Bosch',
                        function: 'read',
                        path: path
                    },
                    token: token
                });
                
                socket.on('response', (response) => {
                    if (response.success && response.data) {
                        const value = response.data.value;
                        const unit = response.data.unitOfMeasure || '';
                        console.log(`   ✅ ${value}${unit ? ' ' + unit : ''}`);
                    } else {
                        console.log(`   ❌ Ei saatu arvoa`);
                    }
                    console.log();
                    resolve();
                });
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        socket.disconnect();
        
    } catch (error) {
        console.error('❌ Virhe:', error.message);
        if (socket) socket.disconnect();
        process.exit(1);
    }
}

readBoschData();