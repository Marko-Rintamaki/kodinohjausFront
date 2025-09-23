#!/usr/bin/env node

const io = require('socket.io-client');

// LUETTAVAT ARVOT - Mielenkiintoiset järjestelmän tiedot
const READ_PATHS = [
    // DHW (Lämmin käyttövesi)
    {
        path: '/dhwCircuits/dhw1/actualTemp',
        name: 'DHW lämpötila nyt'
    },
    {
        path: '/dhwCircuits/dhw1/status',
        name: 'DHW tila'
    },
    {
        path: '/dhwCircuits/dhw1/currentSetpoint',
        name: 'DHW asetettu lämpötila'
    },
    {
        path: '/dhwCircuits/dhw1/operationMode',
        name: 'DHW toimintatila'
    },
    {
        path: '/dhwCircuits/dhw1/charge',
        name: 'DHW kertalataus'
    },
    
    // Lämmönlähde (Kattila/lämpöpumppu)
    {
        path: '/heatSources/actualSupplyTemperature',
        name: 'Menoveden lämpötila'
    },
    {
        path: '/heatSources/flameStatus',
        name: 'Poltin'
    },
    {
        path: '/heatSources/actualModulation',
        name: 'Teho %'
    },
    {
        path: '/heatSources/CHpumpModulation', 
        name: 'Lämmityspumppu %'
    },
    
    // Lämmityspiiri
    {
        path: '/heatingCircuits/hc1/actualSupplyTemperature',
        name: 'Lämmityspiiri meno'
    },
    {
        path: '/heatingCircuits/hc1/actualRoomTemperature',
        name: 'Huonelämpötila'
    },
    {
        path: '/heatingCircuits/hc1/operationMode',
        name: 'Lämmitys tila'
    },
    {
        path: '/heatingCircuits/hc1/temperatureLevels/comfort2',
        name: 'Comfort2 asetus'
    },
    
    // Järjestelmä
    {
        path: '/system/appliance/actualOutdoorTemperature',
        name: 'Ulkolämpötila'
    },
    {
        path: '/system/appliance/workingTime/totalSystem',
        name: 'Käyttötunnit yhteensä'
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

async function readValue(path, token) {
    return new Promise((resolve) => {
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
                const type = response.data.type || '';
                
                resolve({
                    success: true,
                    value: value,
                    unit: unit,
                    type: type
                });
            } else {
                resolve({
                    success: false,
                    error: 'Ei saatu arvoa'
                });
            }
        });
    });
}

async function readAllValues() {
    try {
        const token = await connectAndAuth();
        
        console.log('📊 BOSCH JÄRJESTELMÄN TILA');
        console.log('==========================\n');
        
        for (const item of READ_PATHS) {
            const result = await readValue(item.path, token);
            
            if (result.success) {
                const displayValue = result.value + (result.unit ? ` ${result.unit}` : '');
                console.log(`✅ ${item.name}: ${displayValue}`);
                
                results.push({
                    path: item.path,
                    name: item.name,
                    value: result.value,
                    unit: result.unit,
                    type: result.type
                });
            } else {
                console.log(`❌ ${item.name}: ${result.error}`);
            }
            
            testIndex++;
            await new Promise(resolve => setTimeout(resolve, 500)); // Pieni tauko
        }
        
        console.log('\n📊 YHTEENVETO:');
        console.log('==============');
        console.log(`Luettu yhteensä: ${results.length}/${READ_PATHS.length} arvoa`);
        
        socket.disconnect();
        
    } catch (error) {
        console.error('❌ Virhe:', error.message);
        if (socket) socket.disconnect();
        process.exit(1);
    }
}

readAllValues();