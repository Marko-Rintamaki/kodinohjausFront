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

async function readValue(path, token) {
    return new Promise((resolve) => {
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
            resolve(response.data?.value);
        });
    });
}

async function writeValue(path, value, token) {
    return new Promise((resolve) => {
        socket.emit('request', {
            type: 'controller_command',
            data: {
                id: 'Bosch',
                function: 'write',
                path: path,
                value: value
            },
            token: token
        });

        socket.on('response', (response) => {
            resolve(response.success);
        });
    });
}

async function dhwChargeSequence() {
    try {
        console.log('🔥 DHW KERTALATAUS SEKVENSSI');
        console.log('============================\n');
        
        const token = await connectAndAuth();
        
        // 1. Tarkista nykyiset arvot
        console.log('📊 NYKYINEN TILANNE:');
        const currentTemp = await readValue('/dhwCircuits/dhw1/actualTemp', token);
        const setpoint = await readValue('/dhwCircuits/dhw1/singleChargeSetpoint', token);
        const charge = await readValue('/dhwCircuits/dhw1/charge', token);
        const operationMode = await readValue('/dhwCircuits/dhw1/operationMode', token);
        const duration = await readValue('/dhwCircuits/dhw1/chargeDuration', token);
        
        console.log(`   Nykyinen lämpötila: ${currentTemp}°C`);
        console.log(`   Kertalataus asetus: ${setpoint}°C`);
        console.log(`   Lataus tila: ${charge}`);
        console.log(`   Toimintatila: ${operationMode}`);
        console.log(`   Latausaika: ${duration} min\n`);
        
        // 2. Nosta kertalatauksen lämpötilaa jos tarpeen
        if (parseFloat(setpoint) <= parseFloat(currentTemp)) {
            const newSetpoint = parseFloat(currentTemp) + 5;
            console.log(`🔥 Nostetaan kertalatauslämpötila ${setpoint}°C → ${newSetpoint}°C`);
            
            const success1 = await writeValue('/dhwCircuits/dhw1/singleChargeSetpoint', newSetpoint, token);
            console.log(`   ${success1 ? '✅' : '❌'} Lämpötila-asetus ${success1 ? 'onnistui' : 'epäonnistui'}`);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 3. Aseta latausaika lyhyeksi testiksi
        console.log(`⏰ Asetetaan latausaika 10 minuutiksi`);
        const success2 = await writeValue('/dhwCircuits/dhw1/chargeDuration', '10', token);
        console.log(`   ${success2 ? '✅' : '❌'} Latausaika ${success2 ? 'onnistui' : 'epäonnistui'}`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 4. Yritä käynnistää kertalataus
        console.log(`🚀 Käynnistetään kertalataus...`);
        const success3 = await writeValue('/dhwCircuits/dhw1/charge', 'start', token);
        console.log(`   ${success3 ? '✅' : '❌'} Latauksen käynnistys ${success3 ? 'onnistui' : 'epäonnistui'}`);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 5. Tarkista tulos
        console.log(`\n🔍 LOPPUTILANNE:`);
        const finalCharge = await readValue('/dhwCircuits/dhw1/charge', token);
        const finalSetpoint = await readValue('/dhwCircuits/dhw1/singleChargeSetpoint', token);
        const finalDuration = await readValue('/dhwCircuits/dhw1/chargeDuration', token);
        
        console.log(`   Lataus tila: ${finalCharge}`);
        console.log(`   Asetettu lämpötila: ${finalSetpoint}°C`);
        console.log(`   Latausaika: ${finalDuration} min`);
        
        if (finalCharge === 'start') {
            console.log('\n🎉 KERTALATAUS KÄYNNISSÄ!');
        } else {
            console.log('\n❌ Kertalataus ei käynnistynyt - järjestelmä estää sen');
        }
        
        socket.disconnect();
        
    } catch (error) {
        console.error('❌ Virhe:', error.message);
        if (socket) socket.disconnect();
        process.exit(1);
    }
}

dhwChargeSequence();