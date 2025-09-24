#!/bin/bash

# Lisää SocketService mock kaikkiin Home testeihin estämään yhteydet oikeaan serveriin

SOCKET_MOCK='
// Mock SocketService to prevent real connections during tests
vi.mock("../services/SocketService", () => ({
  SocketService: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockReturnValue({
      connected: false,
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    }),
    disconnect: vi.fn(),
    isConnected: false,
    sendRequest: vi.fn().mockResolvedValue({ success: true }),
    authenticate: vi.fn(),
  })),
}));'

FIX_TESTS=("Home.admintoolbar.test.tsx" "Home.heatingpipes.test.tsx" "Home.ledstrips.test.tsx" "Home.statusparsing.test.tsx" "Home.temperatureicons.test.tsx")

for test_file in "${FIX_TESTS[@]}"
do
    echo "Lisätään SocketService mock: $test_file"
    
    # Lisää mock heti importtien jälkeen
    sed -i '/import.*SocketProvider/a\\n'"$SOCKET_MOCK" "src/tests/$test_file"
    
    echo "✅ $test_file - SocketService mockattu"
done

echo "🎉 Kaikki testit suojattu äärettömiltä yhteyksiltä!"