#!/bin/bash

# Korjaa kaikki Home testit käyttämään SocketProvider:iä

FIX_TESTS=("Home.heatingpipes.test.tsx" "Home.ledstrips.test.tsx" "Home.statusparsing.test.tsx" "Home.temperatureicons.test.tsx")

for test_file in "${FIX_TESTS[@]}"
do
    echo "Korjataan: $test_file"
    
    # Lisää SocketProvider import
    sed -i '/import { Home } from/a import { SocketProvider } from '\''../contexts/SocketContext'\'';' "src/tests/$test_file"
    
    # Lisää MockSocketProvider component
    sed -i '/import { SocketProvider } from/a \
\
// Mock socket context for testing - use simple SocketProvider without socket mocking\
const MockSocketProvider = ({ children }: { children: React.ReactNode }) => {\
  return (\
    <SocketProvider>\
      {children}\
    </SocketProvider>\
  )\
}' "src/tests/$test_file"
    
    # Etsi ensimmäinen describe ja lisää renderHome ennen sitä
    sed -i '/describe(/i \
const renderHome = () => {\
  // Mock getBoundingClientRect\
  Element.prototype.getBoundingClientRect = vi.fn(() => ({\
    width: 800,\
    height: 600,\
    top: 0,\
    left: 0,\
    bottom: 600,\
    right: 800,\
  } as DOMRect))\
\
  return render(\
    <MockSocketProvider>\
      <Home />\
    </MockSocketProvider>\
  )\
}\
' "src/tests/$test_file"
    
    # Korvaa kaikki render(<Home />) kutsut renderHome() kutsuilla
    sed -i 's/render(<Home \/>);/renderHome();/g' "src/tests/$test_file"
    
    echo "✅ $test_file korjattu"
done

echo "🎉 Kaikki testit korjattu!"