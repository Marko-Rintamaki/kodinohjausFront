// Testidataa layout-toiminnallisuuden testaamiseen
// Kopioi tämä selaimeen console:ssa ja suorita

const testLayoutData = {
  lamps: [
    {
      id: "lamp_1",
      kind: "lamp",
      x: 0.3,
      y: 0.4,
      on: true,
      label: "Olohuoneen lamppu",
      relayId: 1
    },
    {
      id: "lamp_2", 
      kind: "spot",
      x: 0.7,
      y: 0.2,
      on: false,
      label: "Spottivalo",
      relayId: 2
    },
    {
      id: "lamp_3",
      kind: "mirror", 
      x: 0.8,
      y: 0.6,
      on: true,
      label: "Peilivalo",
      relayId: 3
    }
  ],
  strips: [
    {
      id: "strip_1",
      points: [
        { x: 0.1, y: 0.9 },
        { x: 0.4, y: 0.9 },
        { x: 0.4, y: 0.7 }
      ],
      on: true,
      label: "LED nauha 1",
      relayId: 4
    }
  ],
  heatingPipes: [
    {
      id: "heating_1",
      points: [
        { x: 0.2, y: 0.8 },
        { x: 0.6, y: 0.8 },
        { x: 0.6, y: 0.5 },
        { x: 0.9, y: 0.5 }
      ],
      on: false,
      title: "Lattialämmitys makuuhuone"
    }
  ],
  temperatureIcons: [
    {
      id: "temp_1",
      x: 0.5,
      y: 0.3,
      roomId: "living_room",
      roomName: "Olohuone",
      currentTemp: 22.5
    },
    {
      id: "temp_2", 
      x: 0.8,
      y: 0.8,
      roomId: "bedroom",
      roomName: "Makuuhuone",
      currentTemp: 20.1
    }
  ],
  wallLights: [
    {
      id: "wall_1",
      x: 0.1,
      y: 0.3,
      direction: "down",
      on: true,
      label: "Ulkovalo etupiha"
    }
  ]
};

// Tallenna localStorage:iin
localStorage.setItem('homeLayout:v8', JSON.stringify(testLayoutData));
console.log('✅ Test layout data saved to localStorage!');
console.log('📊 Saved:', 
  testLayoutData.lamps.length, 'lamps,',
  testLayoutData.strips.length, 'strips,', 
  testLayoutData.heatingPipes.length, 'heating pipes,',
  testLayoutData.temperatureIcons.length, 'temperature icons,',
  testLayoutData.wallLights.length, 'wall lights'
);

// Lataa sivu uudelleen nähdäksesi komponentit
console.log('🔄 Refresh the page to see the components!');